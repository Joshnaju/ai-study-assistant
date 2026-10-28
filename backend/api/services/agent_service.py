# api/services/agent_service.py

import json
import logging

from django.conf import settings
from openai import OpenAI

logger = logging.getLogger(__name__)

client = OpenAI(api_key=settings.OPENAI_API_KEY)

MODEL = getattr(settings, "OPENAI_MODEL", "gpt-4o-mini")
MAX_TOOL_CALLS = 6


# --------------------------------------------------
# Agent tools
# --------------------------------------------------

TOOLS = [
    {
        "type": "function",
        "name": "search_notes",
        "description": (
            "Search the authenticated user's uploaded study documents "
            "for relevant information. Use this tool to answer questions "
            "about uploaded documents. Always search before answering "
            "questions that may depend on the user's notes."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "The question or topic to search for.",
                }
            },
            "required": ["query"],
            "additionalProperties": False,
        },
        "strict": True,
    },
    {
        "type": "function",
        "name": "create_summary",
        "description": (
            "Create a clear, structured summary of relevant study content "
            "retrieved from the user's uploaded documents."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "topic": {
                    "type": "string",
                    "description": "The topic to summarize.",
                },
                "content": {
                    "type": "string",
                    "description": "The study content to summarize.",
                },
            },
            "required": ["topic", "content"],
            "additionalProperties": False,
        },
        "strict": True,
    },
    {
        "type": "function",
        "name": "generate_mcqs",
        "description": (
            "Generate multiple-choice questions from study content "
            "retrieved from the user's uploaded documents."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "topic": {
                    "type": "string",
                    "description": "The topic for the questions.",
                },
                "content": {
                    "type": "string",
                    "description": "The study content used for the questions.",
                },
                "count": {
                    "type": "integer",
                    "description": "The number of questions to generate.",
                },
            },
            "required": ["topic", "content", "count"],
            "additionalProperties": False,
        },
        "strict": True,
    },
    {
        "type": "web_search",
        "search_context_size": "medium",
    },
]


# --------------------------------------------------
# Agent instructions
# --------------------------------------------------

SYSTEM_PROMPT = """
You are an AI study assistant.

Only answer questions related to studying, education,
academic subjects, and learning.

Use search_notes to retrieve relevant information from
the user's uploaded study documents.

Use web_search when the question needs current information,
external sources, or information unavailable in the uploaded
documents.

Use both tools when the question benefits from both
uploaded documents and external sources.

Do not search the web unnecessarily for questions that can
be answered adequately from the uploaded documents.

Use create_summary or generate_mcqs only when appropriate
and when those tools are available.

Never invent source links or claim a source supports a fact
unless the retrieved information supports it.
"""


SYSTEM_PROMPT += """
When including web sources in your answer:
- Use standard Markdown links only.
- Correct format: [Google announcement](https://blog.google/example/)
- Never nest Markdown links.
- Never wrap a Markdown link in extra parentheses.
- Use the complete URL, including https://.
"""
# --------------------------------------------------
# Main agent function
# --------------------------------------------------

def run_agent(query, tool_handlers, conversation_history=None):
    """
    Run the agent using the OpenAI Responses API.

    Parameters:
        query:
            The current user question.

        tool_handlers:
            A dictionary mapping tool names to Python handler functions.

        conversation_history:
            Previous user and assistant messages.

    Returns:
        {
            "answer": str,
            "actions": list,
            "results": list
        }
    """

    if not settings.OPENAI_API_KEY:
        raise ValueError("OpenAI API key is not configured.")

    # Build conversation input.
    input_items = []

    if conversation_history:
        for message in conversation_history[-10:]:
            role = message.get("role")
            content = message.get("content")

            if role in ("user", "assistant") and content:
                input_items.append(
                    {
                        "role": role,
                        "content": str(content),
                    }
                )

    # Add the current question.
    input_items.append(
        {
            "role": "user",
            "content": query,
        }
    )

    actions = []
    retrieved_chunks = []
    tool_call_count = 0

    # Avoid returning the same source chunk multiple times.
    seen_chunks = set()

    while True:
        # Once the tool-call limit is reached, let the model produce
        # a final answer without requesting additional tools.
        available_tools = (
            TOOLS if tool_call_count < MAX_TOOL_CALLS else []
        )

        response = client.responses.create(
            model=MODEL,
            instructions=SYSTEM_PROMPT,
            input=input_items,
            tools=available_tools,
            tool_choice="auto",
        )

        # Preserve the model output for the next Responses API request.
        input_items.extend(response.output)

        # Find function calls in this response.
        function_calls = [
            item
            for item in response.output
            if item.type == "function_call"
        ]

        # No more tool calls: return the final answer and sources.
        # if not function_calls:
        #     return {
        #         "answer": response.output_text
        #         or "I could not generate an answer. Please try again.",
        #         "actions": actions,
        #         "results": retrieved_chunks,
        #     }
        if not function_calls:
            web_sources = extract_web_sources(response)

            if web_sources:
                actions.append({
                    "tool": "web_search",
                    "status": "success",
                })

            return {
                "answer": response.output_text
                or "I could not generate an answer. Please try again.",
                "actions": actions,
                "results": retrieved_chunks,
                "web_sources": web_sources,
            }

        # Execute each requested tool.
        for tool_call in function_calls:

            if tool_call_count >= MAX_TOOL_CALLS:
                break

            tool_call_count += 1

            tool_name = tool_call.name

            try:
                arguments = json.loads(tool_call.arguments)

                handler = tool_handlers.get(tool_name)

                if handler is None:
                    raise ValueError(
                        f"Unknown agent tool: {tool_name}"
                    )

                # Execute the corresponding Django handler.
                result = handler(**arguments)

                # Collect retrieved chunks so RAGSearchView can
                # return source documents to the React frontend.
                if (
                    tool_name == "search_notes"
                    and isinstance(result, dict)
                ):
                    chunks = result.get("chunks", [])

                    if isinstance(chunks, list):
                        for chunk in chunks:
                            if not isinstance(chunk, dict):
                                continue

                            # Deduplicate source chunks when the agent
                            # searches more than once.
                            chunk_key = (
                                chunk.get("document_id"),
                                chunk.get("chunk_index"),
                                chunk.get("page_number"),
                                chunk.get("text"),
                            )

                            if chunk_key not in seen_chunks:
                                seen_chunks.add(chunk_key)
                                retrieved_chunks.append(chunk)

                actions.append(
                    {
                        "tool": tool_name,
                        "status": "success",
                    }
                )

                logger.info(
                    "Agent tool executed successfully: %s",
                    tool_name,
                )

            except Exception:
                logger.exception(
                    "Agent tool execution failed: %s",
                    tool_name,
                )

                result = {
                    "error": (
                        "This action could not be completed. "
                        "Please try again."
                    )
                }

                actions.append(
                    {
                        "tool": tool_name,
                        "status": "failed",
                    }
                )

            # Send the tool result back to the model.
            input_items.append(
                {
                    "type": "function_call_output",
                    "call_id": tool_call.call_id,
                    "output": json.dumps(
                        result,
                        ensure_ascii=False,
                        default=str,
                    ),
                }
            )

def extract_web_sources(response):
    """
    Extract clickable web citations from an OpenAI response.
    """
    sources = []
    seen_urls = set()

    for item in response.output:
        if getattr(item, "type", None) != "message":
            continue

        for content in getattr(item, "content", []) or []:
            annotations = getattr(content, "annotations", []) or []

            for annotation in annotations:
                if getattr(annotation, "type", None) != "url_citation":
                    continue

                citation = getattr(
                    annotation, "url_citation", None
                )

                if citation is None:
                    continue

                url = getattr(citation, "url", None)

                if not url or url in seen_urls:
                    continue

                seen_urls.add(url)

                sources.append({
                    "title": getattr(citation, "title", None)
                        or url,
                    "url": url,
                })

    return sources
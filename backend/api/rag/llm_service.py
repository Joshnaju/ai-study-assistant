from openai import OpenAI
from django.conf import settings

def rewrite_followup_query(query, conversation_history=None):
    """
    Convert a follow-up question into a standalone search query.
    """
    if not conversation_history:
        return query

    history_lines = []

    for message in conversation_history[-10:]:
        role = message.get("role", "")
        content = message.get("content", "")

        if role in ("user", "assistant") and content:
            # Avoid sending excessively long previous answers.
            history_lines.append(
                f"{role.upper()}: {content[:1500]}"
            )

    if not history_lines:
        return query

    history = "\n".join(history_lines)

    client = OpenAI(api_key=settings.OPENAI_API_KEY)

    response = client.responses.create(
        model=settings.OPENAI_MODEL,
        instructions=(
            "You rewrite student follow-up questions into standalone "
            "search queries for retrieving educational information "
            "from uploaded study documents. Use conversation history "
            "to resolve references such as 'it', 'that', or 'explain "
            "briefly'. Preserve the student's intended topic. "
            "Return only the rewritten search query. Do not answer "
            "the question. Do not introduce unrelated topics."
        ),
        input=(
            f"RECENT CONVERSATION:\n{history}\n\n"
            f"FOLLOW-UP QUESTION:\n{query}\n\n"
            "Standalone search query:"
        ),
    )

    rewritten_query = response.output_text.strip()

    return rewritten_query or query

def generate_rag_answer(query, chunks, conversation_history=None):
    """
    Generate a study answer using retrieved document chunks
    and recent conversation history.
    """

    context_parts = []

    for index, chunk in enumerate(chunks or [], start=1):
        context_parts.append(
            f"Source {index}: {chunk.get('filename', 'Unknown document')}\n"
            f"Content:\n{chunk.get('text', '')}"
        )

    context = "\n\n---\n\n".join(context_parts)

    history_parts = []

    for message in (conversation_history or [])[-10:]:
        role = message.get("role", "user")
        content = message.get("content", "")

        if role in ("user", "assistant") and content:
            history_parts.append(f"{role.upper()}: {content}")

    history = "\n".join(history_parts) or "No previous messages."

    client = OpenAI(api_key=settings.OPENAI_API_KEY)

    response = client.responses.create(
        model=settings.OPENAI_MODEL,
        instructions=(
            "You are an AI study assistant. Only answer questions "
            "related to studying, education, academic subjects, and "
            "learning. Politely decline unrelated requests. "
            "Use conversation history to understand follow-up questions "
            "and references such as 'explain that again'. "
            "Use uploaded document context as the primary source. "
            "Never claim that a fact appears in the documents unless "
            "the supplied context supports it. "
            "If the supplied context is insufficient, clearly state "
            "that more information is needed. Do not invent facts."
        ),
        input=(
            f"RECENT CONVERSATION:\n{history}\n\n"
            f"CURRENT STUDENT QUESTION:\n{query}\n\n"
            f"UPLOADED DOCUMENT CONTEXT:\n"
            f"{context if context else 'No relevant document context retrieved.'}\n\n"
            "Answer the current question, using conversation history "
            "to understand its meaning. Do not treat previous answers "
            "as verified facts unless supported by the document context."
        ),
    )

    answer = response.output_text.strip()

    if not answer:
        raise ValueError("The AI returned an empty answer.")

    return answer

def generate_mcq_answer(prompt):
    """
    Generate MCQs directly from a prompt containing
    the study material. Does not require RAG chunks.
    """
    client = OpenAI(api_key=settings.OPENAI_API_KEY)

    response = client.responses.create(
        model=settings.OPENAI_MODEL,
        instructions=(
            "You are an educational MCQ generator. "
            "Follow the user's instructions exactly. "
            "Return only valid JSON without Markdown "
            "code fences or additional text."
        ),
        input=prompt,
    )

    answer = response.output_text.strip()

    if not answer:
        raise ValueError("The AI returned an empty MCQ response.")

    return answer
from openai import OpenAI
from django.conf import settings

def generate_rag_answer(query, chunks):
    """
    Generate an answer using the student's question
    and relevant chunks retrieved from ChromaDB.
    """

    if not chunks:
        return (
            "I couldn't find relevant information in your "
            "uploaded documents. Try asking another question "
            "or uploading relevant notes."
        )

    context_parts = []

    for index, chunk in enumerate(chunks, start=1):
        context_parts.append(
            f"Source {index}: {chunk.get('filename', 'Unknown document')}\n"
            f"Content:\n{chunk.get('text', '')}"
        )

    context = "\n\n---\n\n".join(context_parts)

    client = OpenAI(api_key=settings.OPENAI_API_KEY)

    response = client.responses.create(
        model=settings.OPENAI_MODEL,
        instructions=(
            "You are an AI study assistant. Answer the student's "
            "question using the supplied document context. "
            "Explain concepts clearly in simple language. "
            "Do not invent facts or claim that something appears "
            "in the notes if the context does not support it. "
            "If the context is insufficient, say so clearly. "
            "You may use general knowledge to clarify a concept, "
            "but distinguish it from information found in the notes."
        ),
        input=(
            f"STUDENT QUESTION:\n{query}\n\n"
            f"RETRIEVED DOCUMENT CONTEXT:\n{context}\n\n"
            "Answer the question using this context."
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
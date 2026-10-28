
import chromadb
from chromadb.utils.embedding_functions import (SentenceTransformerEmbeddingFunction)
from django.conf import settings
from .chunking import split_text
from rest_framework.views import APIView

client = chromadb.PersistentClient(path=str(settings.BASE_DIR / "chroma_db"))

embedding_function = SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")

collection = client.get_or_create_collection(
    name="study_document_chunks",
    embedding_function=embedding_function,
    metadata={"hnsw:space": "cosine"},
)

def index_document(document_id, user_id, filename, pages):
    """
    Index page-aware extracted content.
    `pages` is a list of dictionaries containing text
    and page_number.
    """
    # Remove old chunks if this document is being re-indexed.
    collection.delete(
        where={"document_id": str(document_id)}
    )

    ids = []
    documents = []
    metadatas = []
    chunk_index = 0

    for page in pages:
        page_text = page.get("text", "")
        page_number = page.get("page_number")

        for chunk in split_text(page_text):
            ids.append(
                f"doc_{document_id}_chunk_{chunk_index}"
            )
            documents.append(chunk)

            metadata = {
                "document_id": str(document_id),
                "user_id": str(user_id),
                "filename": filename,
                "chunk_index": chunk_index,
            }

            # Chroma metadata must not contain None values.
            if page_number is not None:
                metadata["page_number"] = int(page_number)

            metadatas.append(metadata)
            chunk_index += 1

    if not documents:
        raise ValueError(
            "No readable text was found to index."
        )

    collection.upsert(
        ids=ids,
        documents=documents,
        metadatas=metadatas,
    )


def search_relevant_chunks(query, user_id, n_results=4):
    """
    Return relevant chunks belonging only to this user.
    Ignore chunks whose distance exceeds the configured threshold.
    """

    MAX_DISTANCE = 0.70

    result = collection.query(
        query_texts=[query],
        n_results=n_results,
        where={"user_id": str(user_id)},
        include=["documents", "metadatas", "distances"],
    )

    chunks = []

    texts = result.get("documents", [[]])[0]
    metadatas = result.get("metadatas", [[]])[0]
    distances = result.get("distances", [[]])[0]

    for text, metadata, distance in zip(
        texts, metadatas, distances
    ):
        # Skip results without a usable distance.
        if distance is None:
            continue

        # Skip results that are not sufficiently similar.
        if distance > MAX_DISTANCE:
            continue

        chunks.append({
            "text": text,
            "document_id": metadata.get("document_id"),
            "filename": metadata.get("filename"),
            "chunk_index": metadata.get("chunk_index"),
            "page_number": metadata.get("page_number"),
            "distance": distance,
        })

    return chunks


def delete_document_vectors(document_id):
    """Delete all chunks belonging to one document."""
    collection.delete(
        where={"document_id": str(document_id)}
    )


def get_document_chunks(document_id, user_id):
    """
    Retrieve all chunks belonging to one document
    owned by the authenticated user.
    """
    result = collection.get(
        where={
            "$and": [
                {"document_id": str(document_id)},
                {"user_id": str(user_id)},
            ]
        },
        include=["documents", "metadatas"],
    )

    chunks = []

    texts = result.get("documents") or []
    metadatas = result.get("metadatas") or []

    for text, metadata in zip(texts, metadatas):
        chunks.append({
            "text": text,
            "document_id": metadata.get("document_id"),
            "filename": metadata.get("filename"),
            "chunk_index": metadata.get("chunk_index", 0),
            "page_number": metadata.get("page_number"),
        })

    # ChromaDB doesn't guarantee the order of returned records.
    chunks.sort(key=lambda chunk: chunk["chunk_index"])

    return chunks
import logging

from openai import OpenAIError
from rest_framework import generics, status,viewsets
from rest_framework.response import Response
from rest_framework.views import APIView, settings
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated

from pathlib import Path

from api.rag.llm_service import generate_mcq_answer, generate_rag_answer
from .models import Document

from .serializers import DocumentSerializer, LoginSerializer
from .serializers import RegisterSerializer
from .rag.chroma_store import index_document, search_relevant_chunks,get_document_chunks
from .models import Document
from .serializers import DocumentSerializer
from .utils import extract_document_pages
from .rag.chroma_store import (index_document,delete_document_vectors)
from .models import ChatConversation,ChatMessage
from .serializers import ChatConversationSerializer
import re
import json

logger = logging.getLogger(__name__)

class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True) #validation starts from here
        user = serializer.save() #create() is called in serializer to create user

        return Response(
            {
                "message": "Registration successful.",
                "user": {
                    "id": user.id,
                    "full_name": (
                        f"{user.first_name} {user.last_name}"
                    ).strip(),
                    "email": user.email,
                },
            },
            status=status.HTTP_201_CREATED,
        )

class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data["user"]

        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "message": "Login successful.",
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": {
                    "id": user.id,
                    "full_name": (
                        f"{user.first_name} {user.last_name}"
                    ).strip(),
                    "email": user.email,
                },
            },
            status=status.HTTP_200_OK,
        )

class DocumentViewSet(viewsets.ModelViewSet):
    serializer_class = DocumentSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    http_method_names = ["get", "post", "delete", "head", "options"]

    def get_queryset(self):
        # Users can access only their own documents.
        return Document.objects.filter(
            owner=self.request.user
        ).order_by("-uploaded_at")

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        uploaded_file = serializer.validated_data["file"]

        # Step 1: Extract page-aware content.
        try:
            pages = extract_document_pages(uploaded_file)

            if not any(page.get("text", "").strip() for page in pages):
                raise ValidationError({
                    "file": (
                        "No extractable text found. "
                        "Scanned or image-only PDFs are not supported yet."
                    )
                })

        except ValidationError:
            raise

        except Exception:
            logger.exception("Document text extraction failed")
            raise ValidationError({
                "file": (
                    "Could not read this file. "
                    "Please upload a valid PDF, TXT, or DOCX."
                )
            })

        finally:
            uploaded_file.seek(0)

        # Step 2: Determine the document title.
        title = serializer.validated_data.get("title")

        if not title:
            title = Path(uploaded_file.name).name

        # Step 3: Save the document and original file.
        # Extracted text is NOT saved in the Django database.
        document = serializer.save(
            owner=request.user,
            title=title,
        )

        # Step 4: Split text, generate embeddings and index in ChromaDB.
        try:
            chunk_count = index_document(
                document_id=document.id,
                user_id=request.user.id,
                filename=document.title,
                pages=pages,
            )

            document.is_indexed = True
            document.save(update_fields=["is_indexed"])

            logger.info(
                "Document %s indexed successfully: %s chunks",
                document.id,
                chunk_count,
            )

        except Exception:
            # Keep the document, but report indexing failure.
            logger.exception(
                "Indexing failed for document %s",
                document.id,
            )

            document.is_indexed = False
            document.save(update_fields=["is_indexed"])

        # Step 5: Return the saved document to React.
        return Response(
            self.get_serializer(document).data,
            status=status.HTTP_201_CREATED,
        )

    def destroy(self, request, *args, **kwargs):
        # get_object() uses get_queryset(), so users can only
        # delete documents they own.
        document = self.get_object()

        # Step 1: Remove all chunks belonging to this document.
        try:
            delete_document_vectors(document.id)

        except Exception:
            logger.exception(
                "Could not delete vectors for document %s",
                document.id,
            )

            return Response(
                {
                    "detail": (
                        "Could not remove the document's indexed "
                        "data. The document was not deleted."
                    )
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # Step 2: Delete the original uploaded file.
        if document.file:
            document.file.delete(save=False)

        # Step 3: Delete the Django database record.
        document.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)

class RAGSearchView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        query = request.data.get("query", "")
        conversation_id = request.data.get("conversation_id")

        if not isinstance(query, str) or not query.strip():
            return Response(
                {"error": "Please enter a question."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        query = query.strip()

        if not settings.OPENAI_API_KEY:
            return Response(
                {"error": "OpenAI API key is not configured."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # Get an existing conversation or create a new one.
        if conversation_id:
            try:
                conversation = ChatConversation.objects.get(
                    id=conversation_id,
                    owner=request.user,
                )
            except ChatConversation.DoesNotExist:
                return Response(
                    {"error": "Conversation not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )
        else:
            conversation = ChatConversation.objects.create(
                owner=request.user,
                title=query[:50],
            )

        # Save the user's question.
        ChatMessage.objects.create(
            conversation=conversation,
            role="user",
            content=query,
        )

        try:
            chunks = search_relevant_chunks(
                query=query,
                user_id=request.user.id,
                n_results=4,
            )

            answer = generate_rag_answer(
                query=query,
                chunks=chunks,
            )

            # Prepare source information BEFORE saving the answer.
            results = [
                {
                    "text": chunk.get("text", ""),
                    "document_id": chunk.get("document_id"),
                    "filename": chunk.get("filename"),
                    "chunk_index": chunk.get("chunk_index"),
                    "page_number": chunk.get("page_number"),
                    "distance": chunk.get("distance"),
                }
                for chunk in chunks
            ]

            # Save the answer and its sources.
            ChatMessage.objects.create(
                conversation=conversation,
                role="assistant",
                content=answer,
                sources=results,
            )

            conversation.save(update_fields=["updated_at"])

            return Response(
                {
                    "conversation_id": conversation.id,
                    "query": query,
                    "answer": answer,
                    "results": results,
                    "count": len(results),
                },
                status=status.HTTP_200_OK,
            )

        except OpenAIError:
            logging.getLogger(__name__).exception(
                "OpenAI API request failed"
            )
            return Response(
                {"error": "The AI service could not generate an answer."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        except Exception:
            logging.getLogger(__name__).exception(
                "RAG chat request failed"
            )
            return Response(
                {"error": "Unable to process your question."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

class ChatConversationListCreateView(generics.ListCreateAPIView):
    serializer_class = ChatConversationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ChatConversation.objects.filter(
            owner=self.request.user
        ).order_by("-updated_at")

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

class ChatConversationDetailView(generics.RetrieveDestroyAPIView):
    serializer_class = ChatConversationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ChatConversation.objects.filter(
            owner=self.request.user
        )


class SummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        document_id = request.data.get("document_id")

        if not document_id:
            return Response(
                {"error": "Please select a document."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            document = Document.objects.get(
                id=document_id,
                owner=request.user,
                is_indexed=True,
            )
        except (Document.DoesNotExist, ValueError, TypeError):
            return Response(
                {
                    "error": (
                        "Document not found, not indexed, "
                        "or you do not have access to it."
                    )
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        if not settings.OPENAI_API_KEY:
            return Response(
                {"error": "OpenAI API key is not configured."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        try:
            chunks = get_document_chunks(
                document_id=document.id,
                user_id=request.user.id,
            )

            if not chunks:
                return Response(
                    {
                        "error": (
                            "No indexed text was found for this document."
                        )
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

            prompt = (
                f"Create a clear, well-structured study summary "
                f"of the document '{document.title}'.\n\n"
                "Instructions:\n"
                "- Cover the main topics and important concepts.\n"
                "- Organize the summary with headings and bullet points.\n"
                "- Explain important terms clearly.\n"
                "- Preserve important facts and definitions.\n"
                "- Do not introduce unsupported information.\n"
                "- Summarize the provided document content rather "
                "than answering an unrelated question.\n"
            )

            summary = generate_rag_answer(
                query=prompt,
                chunks=chunks,
            )

            return Response(
                {
                    "document_id": document.id,
                    "document_title": document.title,
                    "summary": summary,
                    "chunk_count": len(chunks),
                },
                status=status.HTTP_200_OK,
            )

        except OpenAIError:
            logger.exception("Summary generation failed")
            return Response(
                {"error": "The AI service could not generate the summary."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        except Exception:
            logger.exception(
                "Could not summarize document %s", document.id
            )
            return Response(
                {"error": "Unable to generate the document summary."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

class MCQGenerationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        document_id = request.data.get("document_id")
        number_of_questions = request.data.get(
            "number_of_questions", 5
        )

        # 1. Validate document ID
        if not document_id:
            return Response(
                {"detail": "Please select a document."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 2. Validate question count
        try:
            number_of_questions = int(number_of_questions)
        except (TypeError, ValueError):
            return Response(
                {"detail": "Question count must be a number."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if number_of_questions not in [5, 10, 15]:
            return Response(
                {"detail": "Choose 5, 10, or 15 questions."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 3. Check document ownership and indexing
        try:
            document = Document.objects.get(
                id=document_id,
                owner=request.user,
                is_indexed=True,
            )
        except Document.DoesNotExist:
            return Response(
                {
                    "detail": (
                        "Document not found or it has not been indexed."
                    )
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        # 4. Retrieve indexed chunks
        try:
            chunks = get_document_chunks(
                document_id=document.id,
                user_id=request.user.id,
            )
        except Exception:
            logger.exception(
                "Failed to retrieve chunks for document %s",
                document.id,
            )
            return Response(
                {"detail": "Failed to retrieve document content."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        if not chunks:
            return Response(
                {
                    "detail": (
                        "No indexed content found for this document. "
                        "Please upload and index the document again."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 5. Extract text from the retrieved chunks
        chunk_texts = []

        for chunk in chunks:
            if isinstance(chunk, str):
                text_content = chunk

            elif isinstance(chunk, dict):
                text_content = (
                    chunk.get("text")
                    or chunk.get("document")
                    or chunk.get("content")
                    or chunk.get("page_content")
                    or ""
                )

            else:
                text_content = getattr(
                    chunk, "page_content", ""
                )

            if (
                isinstance(text_content, str)
                and text_content.strip()
            ):
                chunk_texts.append(text_content.strip())

        if not chunk_texts:
            return Response(
                {
                    "detail": (
                        "No readable text was found in the document."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 6. Build the study context
        context = "\n\n".join(chunk_texts)[:30000]

        prompt = f"""
You are an educational multiple-choice question generator.

Generate exactly {number_of_questions} MCQs using ONLY
the study material provided below.

Rules:
1. Every question must have four options: A, B, C, and D.
2. Exactly one option must be correct.
3. Questions must be based on the provided material.
4. Do not repeat questions.
5. Provide a short explanation for each answer.
6. Return valid JSON only. No Markdown or extra text.

Use this exact structure:
{{
  "questions": [
    {{
      "question": "Question text",
      "options": {{
        "A": "Option A",
        "B": "Option B",
        "C": "Option C",
        "D": "Option D"
      }},
      "correct_answer": "A",
      "explanation": "Explanation from the study material"
    }}
  ]
}}

Study material:
{context}
"""

        # 7. Generate and parse the MCQs
        try:
            result = generate_mcq_answer(prompt)
            print("result:::::::::::::::::::;",result)
            # Support common service return formats.
            if isinstance(result, dict):
                result = result.get(
                    "answer",
                    result.get("content", ""),
                )

            if not isinstance(result, str) or not result.strip():
                raise ValueError(
                    "The LLM service returned an empty response."
                )

            result = result.strip()

            # Remove Markdown fences if present.
            result = re.sub(
                r"^\s*```(?:json)?\s*",
                "",
                result,
                flags=re.IGNORECASE,
            )
            result = re.sub(r"\s*```\s*$", "", result)

            # Extract the JSON object if the model added extra text.
            start = result.find("{")
            end = result.rfind("}")

            if start == -1 or end == -1 or end < start:
                raise ValueError(
                    "The LLM response did not contain a JSON object."
                )

            json_text = result[start:end + 1]
            data = json.loads(json_text)

            if not isinstance(data, dict):
                raise ValueError("The response must be a JSON object.")

            questions = data.get("questions")

            if not isinstance(questions, list):
                raise ValueError(
                    "The response does not contain a questions list."
                )

            if len(questions) != number_of_questions:
                raise ValueError(
                    f"Requested {number_of_questions} questions, "
                    f"but received {len(questions)}."
                )

            # 8. Validate each generated question
            for index, question in enumerate(questions, start=1):
                if not isinstance(question, dict):
                    raise ValueError(
                        f"Question {index} is not a JSON object."
                    )

                question_text = question.get("question")
                options = question.get("options")
                correct_answer = question.get("correct_answer")
                explanation = question.get("explanation")

                if (
                    not isinstance(question_text, str)
                    or not question_text.strip()
                ):
                    raise ValueError(
                        f"Question {index} has no question text."
                    )

                if not isinstance(options, dict):
                    raise ValueError(
                        f"Question {index} has invalid options."
                    )

                if set(options.keys()) != {"A", "B", "C", "D"}:
                    raise ValueError(
                        f"Question {index} must have options A, B, C, D."
                    )

                if not all(
                    isinstance(options[key], str)
                    and options[key].strip()
                    for key in ["A", "B", "C", "D"]
                ):
                    raise ValueError(
                        f"Question {index} contains an empty option."
                    )

                if correct_answer not in {"A", "B", "C", "D"}:
                    raise ValueError(
                        f"Question {index} has an invalid correct answer."
                    )

                if (
                    not isinstance(explanation, str)
                    or not explanation.strip()
                ):
                    raise ValueError(
                        f"Question {index} has no explanation."
                    )

            # 9. Return the questions to React
            return Response(
                {
                    "document_id": document.id,
                    "document_title": document.title,
                    "questions": questions,
                },
                status=status.HTTP_200_OK,
            )

        except (json.JSONDecodeError, ValueError, TypeError) as exc:
            logger.exception(
                "MCQ response validation failed for document %s",
                document.id,
            )

            # Temporary debugging detail; remove before deployment.
            return Response(
                {
                    "detail": "Could not generate valid MCQs.",
                    "error": str(exc),
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        except Exception as exc:
            logger.exception(
                "MCQ generation failed for document %s",
                document.id,
            )

            # Temporary debugging detail; remove before deployment.
            return Response(
                {
                    "detail": "An error occurred while generating MCQs.",
                    "error": str(exc),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
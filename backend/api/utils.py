
from pypdf import PdfReader
from docx import Document as DocxDocument

def extract_document_pages(uploaded_file):
    """
    Extract text while preserving PDF page numbers.
    For TXT and DOCX, page_number is None because
    these formats do not have reliable PDF-style pages.
    """
    filename = uploaded_file.name.lower()

    if filename.endswith(".pdf"):
        reader = PdfReader(uploaded_file)

        return [
            {
                "text": page.extract_text() or "",
                "page_number": page_number,
            }
            for page_number, page in enumerate(reader.pages, start=1)
        ]

    if filename.endswith(".txt"):
        text = uploaded_file.read().decode(
            "utf-8-sig", errors="replace"
        )
        return [{"text": text, "page_number": None}]

    if filename.endswith(".docx"):
        doc = DocxDocument(uploaded_file)
        text = "\n".join(
            paragraph.text
            for paragraph in doc.paragraphs
            if paragraph.text.strip()
        )
        return [{"text": text, "page_number": None}]

    raise ValueError("Unsupported document format.")


def extract_text(uploaded_file):
    """Keep compatibility with code expecting one text string."""
    pages = extract_document_pages(uploaded_file)
    return "\n".join(page["text"] for page in pages).strip()

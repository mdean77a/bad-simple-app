import pymupdf


class PDFProcessingError(Exception):
    """Raised when a PDF cannot be read or text cannot be extracted."""


def extract_text_from_pdf(file_bytes: bytes) -> tuple[str, int]:
    """Extract text content from PDF bytes.

    Returns a tuple of (extracted_text, page_count).
    Raises PDFProcessingError if the PDF cannot be parsed.
    """
    try:
        doc = pymupdf.open(stream=file_bytes, filetype="pdf")
    except Exception as exc:
        raise PDFProcessingError(f"Failed to open PDF: {exc}") from exc

    try:
        page_count = len(doc)
        text_parts: list[str] = []
        for page in doc:
            text_parts.append(page.get_text())
        return "\n".join(text_parts), page_count
    finally:
        doc.close()

import pymupdf
import pytest

from src.services.pdf_processor import PDFProcessingError, extract_text_from_pdf


def _make_pdf(pages: list[str]) -> bytes:
    """Create an in-memory PDF with the given page texts."""
    doc = pymupdf.open()
    for text in pages:
        page = doc.new_page()
        page.insert_text((72, 72), text)
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def test_extract_text_from_valid_pdf():
    pdf_bytes = _make_pdf(["Hello World", "Page Two Content"])
    text, page_count = extract_text_from_pdf(pdf_bytes)

    assert page_count == 2
    assert "Hello World" in text
    assert "Page Two Content" in text


def test_extract_text_single_page():
    pdf_bytes = _make_pdf(["Single page"])
    text, page_count = extract_text_from_pdf(pdf_bytes)

    assert page_count == 1
    assert "Single page" in text


def test_extract_text_pdf_with_no_text():
    """A PDF with a blank page returns empty text."""
    doc = pymupdf.open()
    doc.new_page()  # blank page, no text inserted
    pdf_bytes = doc.tobytes()
    doc.close()

    text, page_count = extract_text_from_pdf(pdf_bytes)
    assert page_count == 1
    assert text.strip() == ""


def test_extract_text_corrupted_bytes():
    with pytest.raises(PDFProcessingError):
        extract_text_from_pdf(b"not a valid pdf at all")


def test_extract_text_empty_bytes():
    with pytest.raises(PDFProcessingError):
        extract_text_from_pdf(b"")

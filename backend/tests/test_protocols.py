from unittest.mock import patch

import pymupdf
import pytest

from src.services.vector_store import VectorStoreError


def _make_pdf(pages: list[str]) -> bytes:
    """Create an in-memory PDF with the given page texts."""
    doc = pymupdf.open()
    for text in pages:
        page = doc.new_page()
        page.insert_text((72, 72), text)
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


@pytest.mark.asyncio
@patch("src.api.routes.protocols.index_protocol")
async def test_upload_valid_pdf(mock_index, client):
    pdf_bytes = _make_pdf(["Protocol text content"])
    response = await client.post(
        "/api/v1/protocols/upload",
        files={"file": ("test-protocol.pdf", pdf_bytes, "application/pdf")},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["protocolId"].startswith("protocol_test_protocol_")
    assert data["protocolName"] == "test-protocol"
    assert "textContent" not in data
    assert "pageCount" not in data
    mock_index.assert_called_once()


@pytest.mark.asyncio
@patch("src.api.routes.protocols.index_protocol")
async def test_upload_multi_page_pdf(mock_index, client):
    pdf_bytes = _make_pdf(["Page 1", "Page 2", "Page 3"])
    response = await client.post(
        "/api/v1/protocols/upload",
        files={"file": ("multi.pdf", pdf_bytes, "application/pdf")},
    )

    assert response.status_code == 200
    data = response.json()
    assert "protocolId" in data
    assert "protocolName" in data
    assert "textContent" not in data
    assert "pageCount" not in data


@pytest.mark.asyncio
async def test_upload_non_pdf_extension(client):
    response = await client.post(
        "/api/v1/protocols/upload",
        files={"file": ("document.txt", b"some text", "text/plain")},
    )

    assert response.status_code == 422
    assert response.json()["code"] == "VALIDATION_ERROR"


@pytest.mark.asyncio
async def test_upload_wrong_content_type(client):
    response = await client.post(
        "/api/v1/protocols/upload",
        files={"file": ("document.pdf", b"some text", "text/plain")},
    )

    assert response.status_code == 422
    assert response.json()["code"] == "VALIDATION_ERROR"


@pytest.mark.asyncio
async def test_upload_corrupted_pdf(client):
    response = await client.post(
        "/api/v1/protocols/upload",
        files={"file": ("bad.pdf", b"not a real pdf", "application/pdf")},
    )

    assert response.status_code == 422
    assert response.json()["code"] == "PDF_PARSE_ERROR"


@pytest.mark.asyncio
@patch("src.api.routes.protocols.index_protocol")
async def test_upload_response_has_protocol_id_format(mock_index, client):
    pdf_bytes = _make_pdf(["Content"])
    response = await client.post(
        "/api/v1/protocols/upload",
        files={"file": ("my-protocol.pdf", pdf_bytes, "application/pdf")},
    )

    data = response.json()
    assert data["protocolId"].startswith("protocol_my_protocol_")


@pytest.mark.asyncio
async def test_upload_empty_text_pdf(client):
    """PDF that parses but has no extractable text returns PDF_PARSE_ERROR."""
    doc = pymupdf.open()
    doc.new_page()  # blank page, no text
    pdf_bytes = doc.tobytes()
    doc.close()

    response = await client.post(
        "/api/v1/protocols/upload",
        files={"file": ("empty.pdf", pdf_bytes, "application/pdf")},
    )

    assert response.status_code == 422
    data = response.json()
    assert data["code"] == "PDF_PARSE_ERROR"
    assert "no extractable text" in data["detail"]


@pytest.mark.asyncio
@patch("src.api.routes.protocols.index_protocol")
async def test_upload_vector_db_error(mock_index, client):
    mock_index.side_effect = VectorStoreError("Connection refused")
    pdf_bytes = _make_pdf(["Protocol text content"])
    response = await client.post(
        "/api/v1/protocols/upload",
        files={"file": ("test.pdf", pdf_bytes, "application/pdf")},
    )

    assert response.status_code == 502
    data = response.json()
    assert data["code"] == "VECTOR_DB_ERROR"
    assert "Connection refused" in data["detail"]

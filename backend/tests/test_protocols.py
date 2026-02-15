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
        data={"acronym": "THAPCA"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["protocolId"].startswith("protocol_test_protocol_")
    assert data["protocolName"] == "test-protocol"
    assert data["acronym"] == "THAPCA"
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
        data={"acronym": "FLUID"},
    )

    assert response.status_code == 200
    data = response.json()
    assert "protocolId" in data
    assert "protocolName" in data
    assert data["acronym"] == "FLUID"
    assert "textContent" not in data
    assert "pageCount" not in data


@pytest.mark.asyncio
async def test_upload_non_pdf_extension(client):
    response = await client.post(
        "/api/v1/protocols/upload",
        files={"file": ("document.txt", b"some text", "text/plain")},
        data={"acronym": "TESTT"},
    )

    assert response.status_code == 422
    assert response.json()["code"] == "VALIDATION_ERROR"


@pytest.mark.asyncio
async def test_upload_wrong_content_type(client):
    response = await client.post(
        "/api/v1/protocols/upload",
        files={"file": ("document.pdf", b"some text", "text/plain")},
        data={"acronym": "TESTT"},
    )

    assert response.status_code == 422
    assert response.json()["code"] == "VALIDATION_ERROR"


@pytest.mark.asyncio
async def test_upload_corrupted_pdf(client):
    response = await client.post(
        "/api/v1/protocols/upload",
        files={"file": ("bad.pdf", b"not a real pdf", "application/pdf")},
        data={"acronym": "TESTT"},
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
        data={"acronym": "PRECISE"},
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
        data={"acronym": "TESTT"},
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
        data={"acronym": "TESTT"},
    )

    assert response.status_code == 502
    data = response.json()
    assert data["code"] == "VECTOR_DB_ERROR"
    assert "Connection refused" in data["detail"]


# --- Acronym validation ---


@pytest.mark.asyncio
async def test_upload_acronym_too_short(client):
    pdf_bytes = _make_pdf(["Content"])
    response = await client.post(
        "/api/v1/protocols/upload",
        files={"file": ("test.pdf", pdf_bytes, "application/pdf")},
        data={"acronym": "AB"},
    )

    assert response.status_code == 422
    data = response.json()
    assert data["code"] == "VALIDATION_ERROR"
    assert "5 and 15" in data["detail"]


@pytest.mark.asyncio
async def test_upload_acronym_too_long(client):
    pdf_bytes = _make_pdf(["Content"])
    response = await client.post(
        "/api/v1/protocols/upload",
        files={"file": ("test.pdf", pdf_bytes, "application/pdf")},
        data={"acronym": "A" * 16},
    )

    assert response.status_code == 422
    data = response.json()
    assert data["code"] == "VALIDATION_ERROR"
    assert "5 and 15" in data["detail"]


@pytest.mark.asyncio
async def test_upload_acronym_whitespace_only(client):
    pdf_bytes = _make_pdf(["Content"])
    response = await client.post(
        "/api/v1/protocols/upload",
        files={"file": ("test.pdf", pdf_bytes, "application/pdf")},
        data={"acronym": "    "},
    )

    assert response.status_code == 422
    data = response.json()
    assert data["code"] == "VALIDATION_ERROR"


@pytest.mark.asyncio
@patch("src.api.routes.protocols.index_protocol")
async def test_upload_acronym_trimmed(mock_index, client):
    """Acronym with surrounding whitespace is trimmed before storage."""
    pdf_bytes = _make_pdf(["Content"])
    response = await client.post(
        "/api/v1/protocols/upload",
        files={"file": ("test.pdf", pdf_bytes, "application/pdf")},
        data={"acronym": "  THAPCA  "},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["acronym"] == "THAPCA"


@pytest.mark.asyncio
@patch("src.api.routes.protocols.index_protocol")
async def test_upload_acronym_exact_min_length(mock_index, client):
    """Acronym of exactly 5 characters is accepted."""
    pdf_bytes = _make_pdf(["Content"])
    response = await client.post(
        "/api/v1/protocols/upload",
        files={"file": ("test.pdf", pdf_bytes, "application/pdf")},
        data={"acronym": "ABCDE"},
    )

    assert response.status_code == 200
    assert response.json()["acronym"] == "ABCDE"


@pytest.mark.asyncio
@patch("src.api.routes.protocols.index_protocol")
async def test_upload_acronym_exact_max_length(mock_index, client):
    """Acronym of exactly 15 characters is accepted."""
    pdf_bytes = _make_pdf(["Content"])
    acronym = "A" * 15
    response = await client.post(
        "/api/v1/protocols/upload",
        files={"file": ("test.pdf", pdf_bytes, "application/pdf")},
        data={"acronym": acronym},
    )

    assert response.status_code == 200
    assert response.json()["acronym"] == acronym


@pytest.mark.asyncio
@patch("src.api.routes.protocols.index_protocol")
async def test_upload_passes_acronym_to_index(mock_index, client):
    """Acronym is passed through to the index_protocol function."""
    pdf_bytes = _make_pdf(["Protocol text content"])
    response = await client.post(
        "/api/v1/protocols/upload",
        files={"file": ("test.pdf", pdf_bytes, "application/pdf")},
        data={"acronym": "THAPCA"},
    )

    assert response.status_code == 200
    call_args = mock_index.call_args
    assert call_args[0][3] == "THAPCA"  # 4th positional arg is acronym


# --- GET /api/v1/protocols ---


@pytest.mark.asyncio
@patch("src.api.routes.protocols.list_protocols")
async def test_get_protocols_returns_list(mock_list, client):
    mock_list.return_value = [
        {
            "protocolId": "protocol_diabetes_20260203",
            "protocolName": "Diabetes Study",
            "indexedAt": "2026-02-03T14:30:00+00:00",
        },
        {
            "protocolId": "protocol_cardiac_20260201",
            "protocolName": "Cardiac Trial",
            "indexedAt": "2026-02-01T10:00:00+00:00",
        },
    ]

    response = await client.get("/api/v1/protocols/")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["protocolId"] == "protocol_diabetes_20260203"
    assert data[0]["protocolName"] == "Diabetes Study"
    assert data[0]["indexedAt"] == "2026-02-03T14:30:00+00:00"
    assert data[1]["protocolId"] == "protocol_cardiac_20260201"


@pytest.mark.asyncio
@patch("src.api.routes.protocols.list_protocols")
async def test_get_protocols_empty(mock_list, client):
    mock_list.return_value = []

    response = await client.get("/api/v1/protocols/")

    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
@patch("src.api.routes.protocols.list_protocols")
async def test_get_protocols_vector_db_error(mock_list, client):
    mock_list.side_effect = VectorStoreError("Connection refused")

    response = await client.get("/api/v1/protocols/")

    assert response.status_code == 502
    data = response.json()
    assert data["code"] == "VECTOR_DB_ERROR"
    assert "Connection refused" in data["detail"]


@pytest.mark.asyncio
@patch("src.api.routes.protocols.list_protocols")
async def test_get_protocols_response_structure(mock_list, client):
    """Verify each item has exactly the expected fields."""
    mock_list.return_value = [
        {
            "protocolId": "test_collection",
            "protocolName": "Test Protocol",
            "indexedAt": "2026-02-15T00:00:00+00:00",
        },
    ]

    response = await client.get("/api/v1/protocols/")

    assert response.status_code == 200
    item = response.json()[0]
    assert set(item.keys()) == {"protocolId", "protocolName", "indexedAt"}

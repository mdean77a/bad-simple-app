import json
from unittest.mock import AsyncMock, patch

import pytest

from src.services.llm_factory import LLMConfigError
from src.services.section_generator import SectionGenerationError
from src.services.vector_store import VectorStoreError


def _parse_sse(text: str) -> list[dict]:
    """Parse SSE text into a list of {event, data} dicts."""
    events = []
    current_event = ""
    for line in text.split("\n"):
        if line.startswith("event: "):
            current_event = line[7:]
        elif line.startswith("data: "):
            try:
                data = json.loads(line[6:])
            except json.JSONDecodeError:
                data = line[6:]
            events.append({"event": current_event, "data": data})
    return events


async def _fake_stream(*chunks):
    """Create an async generator that yields the given chunks."""
    for chunk in chunks:
        yield chunk


# --- POST /api/v1/sections/generate ---


@pytest.mark.asyncio
@patch("src.api.routes.sections.generate_section_stream")
async def test_generate_sections_success(mock_gen, client):
    """Successful generation emits section_start, section_chunk(s), section_complete."""
    async def fake_stream(protocol_id, section_name):
        yield "This study "
        yield "investigates..."

    mock_gen.side_effect = fake_stream

    response = await client.post(
        "/api/v1/sections/generate",
        json={
            "protocolId": "protocol_test_123",
            "sections": [{"id": "sec-1", "name": "Purpose of the Study"}],
        },
    )

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")

    events = _parse_sse(response.text)

    assert events[0]["event"] == "section_start"
    assert events[0]["data"]["sectionId"] == "sec-1"
    assert events[0]["data"]["name"] == "Purpose of the Study"

    chunk_events = [e for e in events if e["event"] == "section_chunk"]
    assert len(chunk_events) == 2
    assert chunk_events[0]["data"]["content"] == "This study "
    assert chunk_events[1]["data"]["content"] == "investigates..."

    complete_events = [e for e in events if e["event"] == "section_complete"]
    assert len(complete_events) == 1
    assert complete_events[0]["data"]["sectionId"] == "sec-1"
    assert complete_events[0]["data"]["status"] == "ready"


@pytest.mark.asyncio
@patch("src.api.routes.sections.generate_section_stream")
async def test_generate_sections_multiple_sections(mock_gen, client):
    """Multiple sections are processed sequentially."""
    async def fake_stream(protocol_id, section_name):
        yield f"Content for {section_name}"

    mock_gen.side_effect = fake_stream

    response = await client.post(
        "/api/v1/sections/generate",
        json={
            "protocolId": "protocol_test_123",
            "sections": [
                {"id": "sec-1", "name": "Purpose"},
                {"id": "sec-2", "name": "Procedures"},
            ],
        },
    )

    assert response.status_code == 200
    events = _parse_sse(response.text)

    start_events = [e for e in events if e["event"] == "section_start"]
    assert len(start_events) == 2
    assert start_events[0]["data"]["sectionId"] == "sec-1"
    assert start_events[1]["data"]["sectionId"] == "sec-2"

    complete_events = [e for e in events if e["event"] == "section_complete"]
    assert len(complete_events) == 2


@pytest.mark.asyncio
@patch("src.api.routes.sections.generate_section_stream")
async def test_generate_sections_vector_store_error(mock_gen, client):
    """VectorStoreError emits section_error event."""
    async def failing_stream(protocol_id, section_name):
        raise VectorStoreError("Connection refused")
        yield  # make it an async generator  # pragma: no cover

    mock_gen.side_effect = failing_stream

    response = await client.post(
        "/api/v1/sections/generate",
        json={
            "protocolId": "protocol_test_123",
            "sections": [{"id": "sec-1", "name": "Purpose"}],
        },
    )

    assert response.status_code == 200
    events = _parse_sse(response.text)

    error_events = [e for e in events if e["event"] == "section_error"]
    assert len(error_events) == 1
    assert error_events[0]["data"]["sectionId"] == "sec-1"
    assert error_events[0]["data"]["status"] == "error"
    assert "Connection refused" in error_events[0]["data"]["message"]


@pytest.mark.asyncio
@patch("src.api.routes.sections.generate_section_stream")
async def test_generate_sections_llm_config_error(mock_gen, client):
    """LLMConfigError emits section_error event."""
    async def failing_stream(protocol_id, section_name):
        raise LLMConfigError("ANTHROPIC_API_KEY is not configured")
        yield  # pragma: no cover

    mock_gen.side_effect = failing_stream

    response = await client.post(
        "/api/v1/sections/generate",
        json={
            "protocolId": "protocol_test_123",
            "sections": [{"id": "sec-1", "name": "Purpose"}],
        },
    )

    assert response.status_code == 200
    events = _parse_sse(response.text)

    error_events = [e for e in events if e["event"] == "section_error"]
    assert len(error_events) == 1
    assert "ANTHROPIC_API_KEY" in error_events[0]["data"]["message"]


@pytest.mark.asyncio
@patch("src.api.routes.sections.generate_section_stream")
async def test_generate_sections_generation_error(mock_gen, client):
    """SectionGenerationError emits section_error event."""
    async def failing_stream(protocol_id, section_name):
        raise SectionGenerationError("Failed after 3 attempts")
        yield  # pragma: no cover

    mock_gen.side_effect = failing_stream

    response = await client.post(
        "/api/v1/sections/generate",
        json={
            "protocolId": "protocol_test_123",
            "sections": [{"id": "sec-1", "name": "Purpose"}],
        },
    )

    assert response.status_code == 200
    events = _parse_sse(response.text)

    error_events = [e for e in events if e["event"] == "section_error"]
    assert len(error_events) == 1
    assert "Failed after 3 attempts" in error_events[0]["data"]["message"]


@pytest.mark.asyncio
async def test_generate_sections_empty_protocol_id(client):
    """Empty protocolId returns 422 validation error."""
    response = await client.post(
        "/api/v1/sections/generate",
        json={
            "protocolId": "   ",
            "sections": [{"id": "sec-1", "name": "Purpose"}],
        },
    )

    assert response.status_code == 422
    data = response.json()
    assert data["code"] == "VALIDATION_ERROR"
    assert "protocolId" in data["detail"]


@pytest.mark.asyncio
async def test_generate_sections_empty_sections_list(client):
    """Empty sections list returns 422 validation error."""
    response = await client.post(
        "/api/v1/sections/generate",
        json={
            "protocolId": "protocol_test_123",
            "sections": [],
        },
    )

    assert response.status_code == 422
    data = response.json()
    assert data["code"] == "VALIDATION_ERROR"
    assert "sections" in data["detail"]


@pytest.mark.asyncio
async def test_generate_sections_missing_protocol_id(client):
    """Missing protocolId field returns 422."""
    response = await client.post(
        "/api/v1/sections/generate",
        json={"sections": [{"id": "sec-1", "name": "Purpose"}]},
    )

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_generate_sections_missing_sections_field(client):
    """Missing sections field returns 422."""
    response = await client.post(
        "/api/v1/sections/generate",
        json={"protocolId": "protocol_test_123"},
    )

    assert response.status_code == 422


@pytest.mark.asyncio
@patch("src.api.routes.sections.generate_section_stream")
async def test_generate_sections_sse_event_format(mock_gen, client):
    """SSE events have correct format with event: and data: lines."""
    async def fake_stream(protocol_id, section_name):
        yield "chunk"

    mock_gen.side_effect = fake_stream

    response = await client.post(
        "/api/v1/sections/generate",
        json={
            "protocolId": "protocol_test_123",
            "sections": [{"id": "sec-1", "name": "Test"}],
        },
    )

    text = response.text
    # Verify SSE format: event lines followed by data lines
    assert "event: section_start\n" in text
    assert "event: section_chunk\n" in text
    assert "event: section_complete\n" in text
    # Each event block ends with double newline
    assert "\n\n" in text

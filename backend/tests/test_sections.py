import json
from unittest.mock import patch

import pytest


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


def _sse_event(event: str, data: dict) -> str:
    """Format a single SSE event (mirrors section_graph._sse_event)."""
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


# --- POST /api/v1/sections/generate ---


@pytest.mark.asyncio
@patch("src.api.routes.sections.stream_sections_parallel")
async def test_generate_sections_success(mock_stream, client):
    """Successful generation emits section_start, section_chunk(s), section_complete."""

    async def fake_stream(protocol_id, sections):
        s = sections[0]
        yield _sse_event("section_start", {"sectionId": s["id"], "name": s["name"]})
        yield _sse_event("section_chunk", {"sectionId": s["id"], "content": "This study "})
        yield _sse_event(
            "section_chunk", {"sectionId": s["id"], "content": "investigates..."}
        )
        yield _sse_event("section_complete", {"sectionId": s["id"], "status": "ready"})

    mock_stream.side_effect = fake_stream

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
@patch("src.api.routes.sections.stream_sections_parallel")
async def test_generate_sections_multiple_sections(mock_stream, client):
    """Multiple sections produce events for all sections."""

    async def fake_stream(protocol_id, sections):
        for s in sections:
            yield _sse_event("section_start", {"sectionId": s["id"], "name": s["name"]})
        for s in sections:
            yield _sse_event(
                "section_chunk",
                {"sectionId": s["id"], "content": f"Content for {s['name']}"},
            )
        for s in sections:
            yield _sse_event(
                "section_complete", {"sectionId": s["id"], "status": "ready"}
            )

    mock_stream.side_effect = fake_stream

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
    start_ids = {e["data"]["sectionId"] for e in start_events}
    assert start_ids == {"sec-1", "sec-2"}

    complete_events = [e for e in events if e["event"] == "section_complete"]
    assert len(complete_events) == 2


@pytest.mark.asyncio
@patch("src.api.routes.sections.stream_sections_parallel")
async def test_generate_sections_error_event(mock_stream, client):
    """Error from streaming yields section_error event."""

    async def fake_stream(protocol_id, sections):
        s = sections[0]
        yield _sse_event("section_start", {"sectionId": s["id"], "name": s["name"]})
        yield _sse_event(
            "section_error",
            {"sectionId": s["id"], "status": "error", "message": "Connection refused"},
        )

    mock_stream.side_effect = fake_stream

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
@patch("src.api.routes.sections.stream_sections_parallel")
async def test_generate_sections_llm_config_error(mock_stream, client):
    """LLMConfigError yields section_error for all sections."""

    async def fake_stream(protocol_id, sections):
        for s in sections:
            yield _sse_event("section_start", {"sectionId": s["id"], "name": s["name"]})
            yield _sse_event(
                "section_error",
                {
                    "sectionId": s["id"],
                    "status": "error",
                    "message": "ANTHROPIC_API_KEY is not configured",
                },
            )

    mock_stream.side_effect = fake_stream

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
@patch("src.api.routes.sections.stream_sections_parallel")
async def test_generate_sections_sse_event_format(mock_stream, client):
    """SSE events have correct format with event: and data: lines."""

    async def fake_stream(protocol_id, sections):
        s = sections[0]
        yield _sse_event("section_start", {"sectionId": s["id"], "name": s["name"]})
        yield _sse_event("section_chunk", {"sectionId": s["id"], "content": "chunk"})
        yield _sse_event("section_complete", {"sectionId": s["id"], "status": "ready"})

    mock_stream.side_effect = fake_stream

    response = await client.post(
        "/api/v1/sections/generate",
        json={
            "protocolId": "protocol_test_123",
            "sections": [{"id": "sec-1", "name": "Test"}],
        },
    )

    text = response.text
    assert "event: section_start\n" in text
    assert "event: section_chunk\n" in text
    assert "event: section_complete\n" in text
    assert "\n\n" in text


# --- POST /api/v1/sections/regenerate ---


REGEN_PAYLOAD = {
    "protocolId": "protocol_test_123",
    "sectionId": "sec-1",
    "sectionName": "Purpose of the Study",
    "currentContent": "This study evaluates the safety of the treatment.",
}


@pytest.mark.asyncio
@patch("src.api.routes.sections.stream_section_regenerate")
async def test_regenerate_section_success(mock_stream, client):
    """Successful regeneration emits start, chunks, complete."""

    async def fake_stream(**kwargs):
        sid = kwargs["section_id"]
        yield _sse_event("section_start", {"sectionId": sid, "name": kwargs["section_name"]})
        yield _sse_event("section_chunk", {"sectionId": sid, "content": "Improved "})
        yield _sse_event("section_chunk", {"sectionId": sid, "content": "content"})
        yield _sse_event("section_complete", {"sectionId": sid, "status": "ready"})

    mock_stream.side_effect = fake_stream

    response = await client.post("/api/v1/sections/regenerate", json=REGEN_PAYLOAD)

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")

    events = _parse_sse(response.text)
    assert events[0]["event"] == "section_start"
    assert events[0]["data"]["sectionId"] == "sec-1"

    chunks = [e for e in events if e["event"] == "section_chunk"]
    assert len(chunks) == 2
    assert chunks[0]["data"]["content"] == "Improved "
    assert chunks[1]["data"]["content"] == "content"

    complete = [e for e in events if e["event"] == "section_complete"]
    assert len(complete) == 1
    assert complete[0]["data"]["status"] == "ready"


@pytest.mark.asyncio
@patch("src.api.routes.sections.stream_section_regenerate")
async def test_regenerate_section_with_guidance(mock_stream, client):
    """Guidance is passed through to stream_section_regenerate."""

    async def fake_stream(**kwargs):
        assert kwargs["guidance"] == "Be more concise"
        yield _sse_event("section_start", {"sectionId": kwargs["section_id"], "name": kwargs["section_name"]})
        yield _sse_event("section_complete", {"sectionId": kwargs["section_id"], "status": "ready"})

    mock_stream.side_effect = fake_stream

    payload = {**REGEN_PAYLOAD, "guidance": "Be more concise"}
    response = await client.post("/api/v1/sections/regenerate", json=payload)

    assert response.status_code == 200
    events = _parse_sse(response.text)
    assert events[0]["event"] == "section_start"


@pytest.mark.asyncio
@patch("src.api.routes.sections.stream_section_regenerate")
async def test_regenerate_section_error_event(mock_stream, client):
    """Error from streaming yields section_error event."""

    async def fake_stream(**kwargs):
        sid = kwargs["section_id"]
        yield _sse_event("section_start", {"sectionId": sid, "name": kwargs["section_name"]})
        yield _sse_event(
            "section_error",
            {"sectionId": sid, "status": "error", "message": "LLM timeout"},
        )

    mock_stream.side_effect = fake_stream

    response = await client.post("/api/v1/sections/regenerate", json=REGEN_PAYLOAD)

    assert response.status_code == 200
    events = _parse_sse(response.text)
    error_events = [e for e in events if e["event"] == "section_error"]
    assert len(error_events) == 1
    assert "LLM timeout" in error_events[0]["data"]["message"]


@pytest.mark.asyncio
async def test_regenerate_section_empty_protocol_id(client):
    """Empty protocolId returns 422."""
    payload = {**REGEN_PAYLOAD, "protocolId": "   "}
    response = await client.post("/api/v1/sections/regenerate", json=payload)

    assert response.status_code == 422
    data = response.json()
    assert data["code"] == "VALIDATION_ERROR"
    assert "protocolId" in data["detail"]


@pytest.mark.asyncio
async def test_regenerate_section_empty_section_name(client):
    """Empty sectionName returns 422."""
    payload = {**REGEN_PAYLOAD, "sectionName": "  "}
    response = await client.post("/api/v1/sections/regenerate", json=payload)

    assert response.status_code == 422
    data = response.json()
    assert data["code"] == "VALIDATION_ERROR"
    assert "sectionName" in data["detail"]


@pytest.mark.asyncio
async def test_regenerate_section_missing_required_fields(client):
    """Missing required fields returns 422."""
    response = await client.post(
        "/api/v1/sections/regenerate",
        json={"protocolId": "proto-1"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
@patch("src.api.routes.sections.stream_section_regenerate")
async def test_regenerate_section_sse_format(mock_stream, client):
    """SSE events have correct format with event: and data: lines."""

    async def fake_stream(**kwargs):
        sid = kwargs["section_id"]
        yield _sse_event("section_start", {"sectionId": sid, "name": kwargs["section_name"]})
        yield _sse_event("section_chunk", {"sectionId": sid, "content": "text"})
        yield _sse_event("section_complete", {"sectionId": sid, "status": "ready"})

    mock_stream.side_effect = fake_stream

    response = await client.post("/api/v1/sections/regenerate", json=REGEN_PAYLOAD)

    text = response.text
    assert "event: section_start\n" in text
    assert "event: section_chunk\n" in text
    assert "event: section_complete\n" in text

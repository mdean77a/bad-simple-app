import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from langchain_core.messages import AIMessage

from src.services.llm_factory import LLMConfigError
from src.services.section_graph import (
    SectionGraphState,
    _build_messages,
    _extract_chunk_text,
    _make_section_node,
    _sse_event,
    build_section_graph,
    stream_sections_parallel,
)
from src.services.vector_store import VectorStoreError


def _parse_sse_events(raw_events: list[str]) -> list[dict]:
    """Parse raw SSE strings into {event, data} dicts."""
    parsed = []
    for raw in raw_events:
        lines = raw.strip().split("\n")
        event_name = ""
        data = {}
        for line in lines:
            if line.startswith("event: "):
                event_name = line[7:]
            elif line.startswith("data: "):
                data = json.loads(line[6:])
        parsed.append({"event": event_name, "data": data})
    return parsed


# --- _sse_event ---


def test_sse_event_format():
    result = _sse_event("section_start", {"sectionId": "s1", "name": "Purpose"})
    assert result.startswith("event: section_start\n")
    assert '"sectionId": "s1"' in result
    assert result.endswith("\n\n")


# --- _extract_chunk_text ---


def test_extract_chunk_text_string():
    chunk = MagicMock()
    chunk.content = "hello"
    assert _extract_chunk_text(chunk) == "hello"


def test_extract_chunk_text_list():
    chunk = MagicMock()
    chunk.content = [{"type": "text", "text": "part1"}, {"type": "text", "text": "part2"}]
    assert _extract_chunk_text(chunk) == "part1part2"


def test_extract_chunk_text_empty():
    chunk = MagicMock()
    chunk.content = 42
    assert _extract_chunk_text(chunk) == ""


# --- _build_messages ---


def test_build_messages():
    msgs = _build_messages("Risks", "Some protocol context")
    assert len(msgs) == 2
    assert "Risks" in msgs[1].content
    assert "Some protocol context" in msgs[1].content


# --- build_section_graph ---


def test_build_section_graph_creates_nodes():
    model = MagicMock()
    node_results = {}
    sections = [
        {"id": "sec-1", "name": "Purpose"},
        {"id": "sec-2", "name": "Risks"},
        {"id": "sec-3", "name": "Benefits"},
    ]
    graph = build_section_graph("proto-1", sections, model, node_results)
    # Compiled graph should have nodes for each section
    node_names = set(graph.get_graph().nodes.keys()) - {"__start__", "__end__"}
    assert node_names == {"Purpose", "Risks", "Benefits"}


# --- _make_section_node ---


@pytest.mark.asyncio
@patch("src.services.section_graph.search_protocol")
async def test_section_node_success(mock_search):
    """Successful RAG + LLM call produces ready result."""
    mock_search.return_value = ["Protocol excerpt about purpose"]
    model = AsyncMock()
    model.ainvoke = AsyncMock(return_value=AIMessage(content="Generated content"))
    node_results = {}

    node_fn = _make_section_node("proto-1", "sec-1", "Purpose", model, node_results)
    result = await node_fn(SectionGraphState(results={}))

    assert result["results"]["sec-1"]["status"] == "ready"
    assert result["results"]["sec-1"]["content"] == "Generated content"
    assert result["results"]["sec-1"]["error"] is None
    assert node_results["sec-1"]["status"] == "ready"
    mock_search.assert_called_once_with("proto-1", "Purpose", k=20)


@pytest.mark.asyncio
@patch("src.services.section_graph.search_protocol")
async def test_section_node_empty_rag(mock_search):
    """Empty RAG results produce error result."""
    mock_search.return_value = []
    model = AsyncMock()
    node_results = {}

    node_fn = _make_section_node("proto-1", "sec-1", "Purpose", model, node_results)
    result = await node_fn(SectionGraphState(results={}))

    assert result["results"]["sec-1"]["status"] == "error"
    assert "No relevant protocol content" in result["results"]["sec-1"]["error"]
    assert node_results["sec-1"]["status"] == "error"
    model.ainvoke.assert_not_called()


@pytest.mark.asyncio
@patch("src.services.section_graph.search_protocol")
async def test_section_node_llm_failure(mock_search):
    """LLM failure is caught and stored as error."""
    mock_search.return_value = ["Some context"]
    model = AsyncMock()
    model.ainvoke = AsyncMock(side_effect=Exception("LLM timeout"))
    node_results = {}

    node_fn = _make_section_node("proto-1", "sec-1", "Purpose", model, node_results)
    result = await node_fn(SectionGraphState(results={}))

    assert result["results"]["sec-1"]["status"] == "error"
    assert "LLM timeout" in result["results"]["sec-1"]["error"]
    assert node_results["sec-1"]["status"] == "error"


@pytest.mark.asyncio
@patch("src.services.section_graph.search_protocol")
async def test_section_node_vector_store_error(mock_search):
    """VectorStoreError is caught and stored as error."""
    mock_search.side_effect = VectorStoreError("Connection refused")
    model = AsyncMock()
    node_results = {}

    node_fn = _make_section_node("proto-1", "sec-1", "Purpose", model, node_results)
    result = await node_fn(SectionGraphState(results={}))

    assert result["results"]["sec-1"]["status"] == "error"
    assert "Connection refused" in result["results"]["sec-1"]["error"]
    assert node_results["sec-1"]["status"] == "error"


@pytest.mark.asyncio
@patch("src.services.section_graph.search_protocol")
async def test_section_node_llm_config_error(mock_search):
    """LLMConfigError is caught and stored as error."""
    mock_search.return_value = ["Some context"]
    model = AsyncMock()
    model.ainvoke = AsyncMock(side_effect=LLMConfigError("Key missing"))
    node_results = {}

    node_fn = _make_section_node("proto-1", "sec-1", "Purpose", model, node_results)
    result = await node_fn(SectionGraphState(results={}))

    assert result["results"]["sec-1"]["status"] == "error"
    assert "Key missing" in result["results"]["sec-1"]["error"]


# --- stream_sections_parallel ---


@pytest.mark.asyncio
@patch("src.services.section_graph.get_chat_model")
async def test_stream_llm_config_error_yields_errors_for_all(mock_get_model):
    """LLMConfigError on model init yields error for every section."""
    mock_get_model.side_effect = LLMConfigError("ANTHROPIC_API_KEY is not configured")
    sections = [
        {"id": "sec-1", "name": "Purpose"},
        {"id": "sec-2", "name": "Risks"},
    ]

    raw_events = []
    async for event_str in stream_sections_parallel("proto-1", sections):
        raw_events.append(event_str)

    events = _parse_sse_events(raw_events)

    start_events = [e for e in events if e["event"] == "section_start"]
    assert len(start_events) == 2

    error_events = [e for e in events if e["event"] == "section_error"]
    assert len(error_events) == 2
    for e in error_events:
        assert "ANTHROPIC_API_KEY" in e["data"]["message"]


@pytest.mark.asyncio
@patch("src.services.section_graph.search_protocol")
@patch("src.services.section_graph.get_chat_model")
async def test_stream_emits_section_start_for_all(mock_get_model, mock_search):
    """section_start events emitted for every requested section."""
    mock_search.return_value = ["Protocol content"]
    model = AsyncMock()
    model.ainvoke = AsyncMock(return_value=AIMessage(content="Content"))
    # Provide bind method for LangGraph internals
    model.bind = MagicMock(return_value=model)
    mock_get_model.return_value = model

    sections = [
        {"id": "sec-1", "name": "Purpose"},
        {"id": "sec-2", "name": "Risks"},
    ]

    raw_events = []
    async for event_str in stream_sections_parallel("proto-1", sections):
        raw_events.append(event_str)

    events = _parse_sse_events(raw_events)
    start_events = [e for e in events if e["event"] == "section_start"]
    assert len(start_events) == 2
    section_ids = {e["data"]["sectionId"] for e in start_events}
    assert section_ids == {"sec-1", "sec-2"}


@pytest.mark.asyncio
@patch("src.services.section_graph.search_protocol")
@patch("src.services.section_graph.get_chat_model")
async def test_stream_emits_section_complete(mock_get_model, mock_search):
    """Successful sections get section_complete events."""
    mock_search.return_value = ["Protocol content"]
    model = AsyncMock()
    model.ainvoke = AsyncMock(return_value=AIMessage(content="Content"))
    model.bind = MagicMock(return_value=model)
    mock_get_model.return_value = model

    sections = [{"id": "sec-1", "name": "Purpose"}]

    raw_events = []
    async for event_str in stream_sections_parallel("proto-1", sections):
        raw_events.append(event_str)

    events = _parse_sse_events(raw_events)
    complete_events = [e for e in events if e["event"] == "section_complete"]
    assert len(complete_events) == 1
    assert complete_events[0]["data"]["sectionId"] == "sec-1"
    assert complete_events[0]["data"]["status"] == "ready"


@pytest.mark.asyncio
@patch("src.services.section_graph.search_protocol")
@patch("src.services.section_graph.get_chat_model")
async def test_stream_emits_section_error_for_failed(mock_get_model, mock_search):
    """Failed sections get section_error events."""
    mock_search.side_effect = VectorStoreError("Connection refused")
    model = AsyncMock()
    model.bind = MagicMock(return_value=model)
    mock_get_model.return_value = model

    sections = [{"id": "sec-1", "name": "Purpose"}]

    raw_events = []
    async for event_str in stream_sections_parallel("proto-1", sections):
        raw_events.append(event_str)

    events = _parse_sse_events(raw_events)
    error_events = [e for e in events if e["event"] == "section_error"]
    assert len(error_events) == 1
    assert error_events[0]["data"]["sectionId"] == "sec-1"
    assert "Connection refused" in error_events[0]["data"]["message"]


@pytest.mark.asyncio
@patch("src.services.section_graph.search_protocol")
@patch("src.services.section_graph.get_chat_model")
async def test_stream_mixed_success_and_error(mock_get_model, mock_search):
    """Mix of successful and failed sections produces correct events."""

    def search_side_effect(protocol_id, section_name, k=20):
        if section_name == "Purpose":
            return ["Protocol content"]
        raise VectorStoreError("Not found")

    mock_search.side_effect = search_side_effect
    model = AsyncMock()
    model.ainvoke = AsyncMock(return_value=AIMessage(content="Content"))
    model.bind = MagicMock(return_value=model)
    mock_get_model.return_value = model

    sections = [
        {"id": "sec-1", "name": "Purpose"},
        {"id": "sec-2", "name": "Unknown"},
    ]

    raw_events = []
    async for event_str in stream_sections_parallel("proto-1", sections):
        raw_events.append(event_str)

    events = _parse_sse_events(raw_events)

    start_events = [e for e in events if e["event"] == "section_start"]
    assert len(start_events) == 2

    complete_events = [e for e in events if e["event"] == "section_complete"]
    assert len(complete_events) == 1
    assert complete_events[0]["data"]["sectionId"] == "sec-1"

    error_events = [e for e in events if e["event"] == "section_error"]
    assert len(error_events) == 1
    assert error_events[0]["data"]["sectionId"] == "sec-2"

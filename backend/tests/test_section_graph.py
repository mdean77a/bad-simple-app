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
    stream_section_regenerate,
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
    """Successful RAG + streaming LLM call produces ready result."""
    from langchain_core.messages import AIMessageChunk

    mock_search.return_value = ["Protocol excerpt about purpose"]
    model = AsyncMock()

    async def fake_astream(messages):
        yield AIMessageChunk(content="Generated ")
        yield AIMessageChunk(content="content")

    model.astream = fake_astream
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

    async def failing_astream(messages):
        raise Exception("LLM timeout")
        yield  # pragma: no cover — make it an async generator

    model.astream = failing_astream
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

    async def failing_astream(messages):
        raise LLMConfigError("Key missing")
        yield  # pragma: no cover — make it an async generator

    model.astream = failing_astream
    node_results = {}

    node_fn = _make_section_node("proto-1", "sec-1", "Purpose", model, node_results)
    result = await node_fn(SectionGraphState(results={}))

    assert result["results"]["sec-1"]["status"] == "error"
    assert "Key missing" in result["results"]["sec-1"]["error"]


# --- stream_sections_parallel (chunk streaming) ---


@pytest.mark.asyncio
@patch("src.services.section_graph.build_section_graph")
@patch("src.services.section_graph.get_chat_model")
async def test_stream_emits_chunk_events(mock_get_model, mock_build_graph):
    """on_chat_model_stream events produce section_chunk SSE; completion emitted inline."""
    from langchain_core.messages import AIMessageChunk

    mock_get_model.return_value = MagicMock()

    node_results_ref = {}

    async def fake_astream_events(input, version):
        yield {
            "event": "on_chat_model_stream",
            "metadata": {"langgraph_node": "Purpose"},
            "data": {"chunk": AIMessageChunk(content="Hello ")},
        }
        yield {
            "event": "on_chat_model_stream",
            "metadata": {"langgraph_node": "Purpose"},
            "data": {"chunk": AIMessageChunk(content="world")},
        }
        # Simulate node completion — populate node_results and emit a node end event
        node_results_ref["sec-1"] = {
            "content": "Hello world", "status": "ready", "error": None,
        }
        yield {
            "event": "on_chain_end",
            "metadata": {"langgraph_node": "Purpose"},
            "data": {},
        }

    mock_graph = MagicMock()
    mock_graph.astream_events = fake_astream_events

    def build_side_effect(protocol_id, sections, model, node_results):
        node_results_ref.update(node_results)  # share the dict reference
        # Replace node_results in caller with our shared ref
        node_results.update(node_results_ref)
        return mock_graph

    # We need build_section_graph to give stream_sections_parallel
    # the same dict that fake_astream_events mutates.
    def build_side_effect2(protocol_id, sections, model, node_results):
        nonlocal node_results_ref
        node_results_ref = node_results
        return mock_graph

    mock_build_graph.side_effect = build_side_effect2

    sections = [{"id": "sec-1", "name": "Purpose"}]
    raw_events = []
    async for event_str in stream_sections_parallel("proto-1", sections):
        raw_events.append(event_str)

    events = _parse_sse_events(raw_events)
    chunk_events = [e for e in events if e["event"] == "section_chunk"]
    assert len(chunk_events) == 2
    assert chunk_events[0]["data"]["sectionId"] == "sec-1"
    assert chunk_events[0]["data"]["content"] == "Hello "
    assert chunk_events[1]["data"]["content"] == "world"

    # Completion should be emitted during the streaming loop (not safety-net)
    complete_events = [e for e in events if e["event"] == "section_complete"]
    assert len(complete_events) == 1
    assert complete_events[0]["data"]["sectionId"] == "sec-1"


@pytest.mark.asyncio
@patch("src.services.section_graph.build_section_graph")
@patch("src.services.section_graph.get_chat_model")
async def test_stream_ignores_non_matching_node_names(mock_get_model, mock_build_graph):
    """on_chat_model_stream events with unknown node names are ignored."""
    from langchain_core.messages import AIMessageChunk

    mock_get_model.return_value = MagicMock()

    async def fake_astream_events(input, version):
        yield {
            "event": "on_chat_model_stream",
            "metadata": {"langgraph_node": "UnknownSection"},
            "data": {"chunk": AIMessageChunk(content="ignored")},
        }

    mock_graph = MagicMock()
    mock_graph.astream_events = fake_astream_events

    def build_side_effect(protocol_id, sections, model, node_results):
        node_results["sec-1"] = {"content": "", "status": "error", "error": "Not found"}
        return mock_graph

    mock_build_graph.side_effect = build_side_effect

    sections = [{"id": "sec-1", "name": "Purpose"}]
    raw_events = []
    async for event_str in stream_sections_parallel("proto-1", sections):
        raw_events.append(event_str)

    events = _parse_sse_events(raw_events)
    chunk_events = [e for e in events if e["event"] == "section_chunk"]
    assert len(chunk_events) == 0


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
    from langchain_core.messages import AIMessageChunk

    mock_search.return_value = ["Protocol content"]
    model = AsyncMock()

    async def fake_astream(messages):
        yield AIMessageChunk(content="Content")

    model.astream = fake_astream
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
    from langchain_core.messages import AIMessageChunk

    mock_search.return_value = ["Protocol content"]
    model = AsyncMock()

    async def fake_astream(messages):
        yield AIMessageChunk(content="Content")

    model.astream = fake_astream
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
    from langchain_core.messages import AIMessageChunk

    def search_side_effect(protocol_id, section_name, k=20):
        if section_name == "Purpose":
            return ["Protocol content"]
        raise VectorStoreError("Not found")

    mock_search.side_effect = search_side_effect
    model = AsyncMock()

    async def fake_astream(messages):
        yield AIMessageChunk(content="Content")

    model.astream = fake_astream
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


# --- Per-section completion ordering ---


@pytest.mark.asyncio
@patch("src.services.section_graph.build_section_graph")
@patch("src.services.section_graph.get_chat_model")
async def test_section_a_completes_before_section_b_finishes(
    mock_get_model, mock_build_graph
):
    """Section A's section_complete appears before Section B's final chunk."""
    from langchain_core.messages import AIMessageChunk

    mock_get_model.return_value = MagicMock()
    node_results_ref = {}

    async def fake_astream_events(input, version):
        # Section A streams tokens
        yield {
            "event": "on_chat_model_stream",
            "metadata": {"langgraph_node": "Purpose"},
            "data": {"chunk": AIMessageChunk(content="A content")},
        }
        # Section B starts streaming
        yield {
            "event": "on_chat_model_stream",
            "metadata": {"langgraph_node": "Risks"},
            "data": {"chunk": AIMessageChunk(content="B part1 ")},
        }
        # Section A finishes — node result appears
        node_results_ref["sec-1"] = {
            "content": "A content", "status": "ready", "error": None,
        }
        yield {
            "event": "on_chain_end",
            "metadata": {"langgraph_node": "Purpose"},
            "data": {},
        }
        # Section B continues streaming AFTER A completed
        yield {
            "event": "on_chat_model_stream",
            "metadata": {"langgraph_node": "Risks"},
            "data": {"chunk": AIMessageChunk(content="B part2")},
        }
        # Section B finishes
        node_results_ref["sec-2"] = {
            "content": "B part1 B part2", "status": "ready", "error": None,
        }
        yield {
            "event": "on_chain_end",
            "metadata": {"langgraph_node": "Risks"},
            "data": {},
        }

    mock_graph = MagicMock()
    mock_graph.astream_events = fake_astream_events

    def build_side_effect(protocol_id, sections, model, node_results):
        nonlocal node_results_ref
        node_results_ref = node_results
        return mock_graph

    mock_build_graph.side_effect = build_side_effect

    sections = [
        {"id": "sec-1", "name": "Purpose"},
        {"id": "sec-2", "name": "Risks"},
    ]
    raw_events = []
    async for event_str in stream_sections_parallel("proto-1", sections):
        raw_events.append(event_str)

    events = _parse_sse_events(raw_events)

    # Find positions of key events
    a_complete_idx = next(
        i for i, e in enumerate(events)
        if e["event"] == "section_complete" and e["data"]["sectionId"] == "sec-1"
    )
    b_last_chunk_idx = max(
        i for i, e in enumerate(events)
        if e["event"] == "section_chunk" and e["data"]["sectionId"] == "sec-2"
    )
    b_complete_idx = next(
        i for i, e in enumerate(events)
        if e["event"] == "section_complete" and e["data"]["sectionId"] == "sec-2"
    )

    # Section A's completion must appear BEFORE Section B's last chunk
    assert a_complete_idx < b_last_chunk_idx, (
        f"Section A complete (idx={a_complete_idx}) should precede "
        f"Section B's last chunk (idx={b_last_chunk_idx})"
    )
    # Section B completes after its last chunk
    assert b_complete_idx > b_last_chunk_idx


# --- stream_section_regenerate ---


@pytest.mark.asyncio
@patch("src.services.section_graph.search_protocol")
@patch("src.services.section_graph.get_chat_model")
async def test_regen_success_stream(mock_get_model, mock_search):
    """Successful regeneration emits start → chunk(s) → complete."""
    from langchain_core.messages import AIMessageChunk

    mock_search.return_value = ["Protocol excerpt"]
    model = AsyncMock()

    async def fake_astream(messages):
        yield AIMessageChunk(content="Regenerated ")
        yield AIMessageChunk(content="content")

    model.astream = fake_astream
    mock_get_model.return_value = model

    raw_events = []
    async for event_str in stream_section_regenerate(
        protocol_id="proto-1",
        section_id="sec-1",
        section_name="Purpose",
        current_content="This study evaluates safety.",
    ):
        raw_events.append(event_str)

    events = _parse_sse_events(raw_events)
    assert events[0]["event"] == "section_start"
    assert events[0]["data"]["sectionId"] == "sec-1"
    assert events[0]["data"]["name"] == "Purpose"

    chunks = [e for e in events if e["event"] == "section_chunk"]
    assert len(chunks) == 2
    assert chunks[0]["data"]["content"] == "Regenerated "
    assert chunks[1]["data"]["content"] == "content"

    complete = [e for e in events if e["event"] == "section_complete"]
    assert len(complete) == 1
    assert complete[0]["data"]["status"] == "ready"


@pytest.mark.asyncio
@patch("src.services.section_graph.search_protocol")
@patch("src.services.section_graph.get_chat_model")
async def test_regen_prompt_includes_current_content_and_context(
    mock_get_model, mock_search,
):
    """Prompt includes RAG context, current content, and revision framing."""
    from langchain_core.messages import AIMessageChunk

    mock_search.return_value = ["Protocol context about dosing"]
    model = AsyncMock()
    captured_messages = []

    async def fake_astream(messages):
        captured_messages.extend(messages)
        yield AIMessageChunk(content="ok")

    model.astream = fake_astream
    mock_get_model.return_value = model

    raw_events = []
    async for event_str in stream_section_regenerate(
        protocol_id="proto-1",
        section_id="sec-1",
        section_name="Purpose",
        current_content="This study evaluates safety.",
        guidance="Be more concise",
    ):
        raw_events.append(event_str)

    system_msg = captured_messages[0]
    assert "revising" in system_msg.content.lower()

    human_msg = captured_messages[1]
    assert 'Revise the "Purpose"' in human_msg.content
    assert "Protocol context about dosing" in human_msg.content
    assert "This study evaluates safety." in human_msg.content
    assert "Reviewer guidance:" in human_msg.content
    assert "Be more concise" in human_msg.content


@pytest.mark.asyncio
@patch("src.services.section_graph.search_protocol")
@patch("src.services.section_graph.get_chat_model")
async def test_regen_no_guidance_uses_default_instruction(mock_get_model, mock_search):
    """Without guidance, a default improvement instruction is used."""
    from langchain_core.messages import AIMessageChunk

    mock_search.return_value = ["Protocol context"]
    model = AsyncMock()
    captured_messages = []

    async def fake_astream(messages):
        captured_messages.extend(messages)
        yield AIMessageChunk(content="ok")

    model.astream = fake_astream
    mock_get_model.return_value = model

    raw_events = []
    async for event_str in stream_section_regenerate(
        protocol_id="proto-1",
        section_id="sec-1",
        section_name="Purpose",
        current_content="Existing content here.",
    ):
        raw_events.append(event_str)

    human_msg = captured_messages[1]
    assert "Existing content here." in human_msg.content
    assert "Reviewer guidance:" not in human_msg.content
    assert "improve the clarity" in human_msg.content


@pytest.mark.asyncio
@patch("src.services.section_graph.get_chat_model")
async def test_regen_llm_config_error(mock_get_model):
    """LLMConfigError yields section_start then section_error."""
    mock_get_model.side_effect = LLMConfigError("API key missing")

    raw_events = []
    async for event_str in stream_section_regenerate(
        protocol_id="proto-1",
        section_id="sec-1",
        section_name="Purpose",
        current_content="Existing content.",
    ):
        raw_events.append(event_str)

    events = _parse_sse_events(raw_events)
    assert events[0]["event"] == "section_start"
    assert events[1]["event"] == "section_error"
    assert "API key missing" in events[1]["data"]["message"]


@pytest.mark.asyncio
@patch("src.services.section_graph.search_protocol")
@patch("src.services.section_graph.get_chat_model")
async def test_regen_vector_store_error(mock_get_model, mock_search):
    """VectorStoreError yields section_error without retries."""
    mock_search.side_effect = VectorStoreError("Connection refused")
    mock_get_model.return_value = MagicMock()

    raw_events = []
    async for event_str in stream_section_regenerate(
        protocol_id="proto-1",
        section_id="sec-1",
        section_name="Purpose",
        current_content="Existing content.",
    ):
        raw_events.append(event_str)

    events = _parse_sse_events(raw_events)
    assert events[0]["event"] == "section_start"
    assert events[1]["event"] == "section_error"
    assert "Connection refused" in events[1]["data"]["message"]


@pytest.mark.asyncio
@patch("src.services.section_graph.search_protocol")
@patch("src.services.section_graph.get_chat_model")
async def test_regen_empty_rag_results(mock_get_model, mock_search):
    """Empty RAG results yield section_error."""
    mock_search.return_value = []
    mock_get_model.return_value = MagicMock()

    raw_events = []
    async for event_str in stream_section_regenerate(
        protocol_id="proto-1",
        section_id="sec-1",
        section_name="Purpose",
        current_content="Existing content.",
    ):
        raw_events.append(event_str)

    events = _parse_sse_events(raw_events)
    assert events[0]["event"] == "section_start"
    assert events[1]["event"] == "section_error"
    assert "No relevant protocol content" in events[1]["data"]["message"]


@pytest.mark.asyncio
@patch("src.services.section_graph.search_protocol")
@patch("src.services.section_graph.get_chat_model")
async def test_regen_retries_on_transient_failure(mock_get_model, mock_search):
    """Transient failures are retried up to 3 times, then emit section_error."""
    from langchain_core.messages import AIMessageChunk

    mock_search.return_value = ["Protocol context"]
    model = AsyncMock()
    call_count = 0

    async def failing_astream(messages):
        nonlocal call_count
        call_count += 1
        raise Exception("Transient error")
        yield  # pragma: no cover — make it an async generator

    model.astream = failing_astream
    mock_get_model.return_value = model

    raw_events = []
    async for event_str in stream_section_regenerate(
        protocol_id="proto-1",
        section_id="sec-1",
        section_name="Purpose",
        current_content="Existing content.",
    ):
        raw_events.append(event_str)

    events = _parse_sse_events(raw_events)
    assert call_count == 3

    error_events = [e for e in events if e["event"] == "section_error"]
    assert len(error_events) == 1
    assert "after 3 attempts" in error_events[0]["data"]["message"]


@pytest.mark.asyncio
@patch("src.services.section_graph.search_protocol")
@patch("src.services.section_graph.get_chat_model")
async def test_regen_succeeds_on_second_attempt(mock_get_model, mock_search):
    """If first attempt fails but second succeeds, section_complete is emitted."""
    from langchain_core.messages import AIMessageChunk

    mock_search.return_value = ["Protocol context"]
    model = AsyncMock()
    call_count = 0

    async def flaky_astream(messages):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            raise Exception("Transient error")
        yield AIMessageChunk(content="Success")

    model.astream = flaky_astream
    mock_get_model.return_value = model

    raw_events = []
    async for event_str in stream_section_regenerate(
        protocol_id="proto-1",
        section_id="sec-1",
        section_name="Purpose",
        current_content="Existing content.",
    ):
        raw_events.append(event_str)

    events = _parse_sse_events(raw_events)
    assert call_count == 2

    complete = [e for e in events if e["event"] == "section_complete"]
    assert len(complete) == 1
    assert complete[0]["data"]["status"] == "ready"

    # No error events
    errors = [e for e in events if e["event"] == "section_error"]
    assert len(errors) == 0


# --- Boilerplate sections in stream_sections_parallel ---


@pytest.mark.asyncio
@patch("src.services.section_graph.get_chat_model")
async def test_stream_boilerplate_only_no_llm(mock_get_model):
    """Boilerplate-only sections emit SSE events without calling get_chat_model."""
    sections = [
        {"id": "sec-1", "name": "Teen Assent"},
        {"id": "sec-2", "name": "Adult Consent"},
    ]

    raw_events = []
    async for event_str in stream_sections_parallel("proto-1", sections):
        raw_events.append(event_str)

    mock_get_model.assert_not_called()

    events = _parse_sse_events(raw_events)

    # Each boilerplate section should have start, chunk, complete
    start_events = [e for e in events if e["event"] == "section_start"]
    assert len(start_events) == 2

    chunk_events = [e for e in events if e["event"] == "section_chunk"]
    assert len(chunk_events) == 2
    assert "I confirm that I have read this assent document" in chunk_events[0]["data"]["content"]
    assert "[Boilerplate placeholder for Adult Consent]" in chunk_events[1]["data"]["content"]

    complete_events = [e for e in events if e["event"] == "section_complete"]
    assert len(complete_events) == 2


@pytest.mark.asyncio
@patch("src.services.section_graph.build_section_graph")
@patch("src.services.section_graph.get_chat_model")
async def test_stream_mixed_boilerplate_and_llm(mock_get_model, mock_build_graph):
    """Mixed list emits boilerplate first, then LLM sections. No double section_start."""
    from langchain_core.messages import AIMessageChunk

    mock_get_model.return_value = MagicMock()
    node_results_ref = {}

    async def fake_astream_events(input, version):
        yield {
            "event": "on_chat_model_stream",
            "metadata": {"langgraph_node": "Purpose of the Study"},
            "data": {"chunk": AIMessageChunk(content="LLM content")},
        }
        node_results_ref["sec-2"] = {
            "content": "LLM content", "status": "ready", "error": None,
        }
        yield {
            "event": "on_chain_end",
            "metadata": {"langgraph_node": "Purpose of the Study"},
            "data": {},
        }

    mock_graph = MagicMock()
    mock_graph.astream_events = fake_astream_events

    def build_side_effect(protocol_id, sections, model, node_results):
        nonlocal node_results_ref
        node_results_ref = node_results
        return mock_graph

    mock_build_graph.side_effect = build_side_effect

    sections = [
        {"id": "sec-1", "name": "Adult Consent"},
        {"id": "sec-2", "name": "Purpose of the Study"},
    ]
    raw_events = []
    async for event_str in stream_sections_parallel("proto-1", sections):
        raw_events.append(event_str)

    events = _parse_sse_events(raw_events)

    # Boilerplate section should have exactly one section_start (no double)
    boilerplate_starts = [
        e for e in events
        if e["event"] == "section_start" and e["data"]["sectionId"] == "sec-1"
    ]
    assert len(boilerplate_starts) == 1

    # LLM section should have exactly one section_start
    llm_starts = [
        e for e in events
        if e["event"] == "section_start" and e["data"]["sectionId"] == "sec-2"
    ]
    assert len(llm_starts) == 1

    # Boilerplate events come before LLM events
    boilerplate_complete_idx = next(
        i for i, e in enumerate(events)
        if e["event"] == "section_complete" and e["data"]["sectionId"] == "sec-1"
    )
    llm_start_idx = next(
        i for i, e in enumerate(events)
        if e["event"] == "section_start" and e["data"]["sectionId"] == "sec-2"
    )
    assert boilerplate_complete_idx < llm_start_idx

    # build_section_graph should only receive LLM sections
    call_args = mock_build_graph.call_args
    graph_sections = call_args[0][1]
    assert len(graph_sections) == 1
    assert graph_sections[0]["name"] == "Purpose of the Study"


@pytest.mark.asyncio
@patch("src.services.section_graph.search_protocol")
@patch("src.services.section_graph.get_chat_model")
async def test_stream_standard_only_unchanged(mock_get_model, mock_search):
    """Standard-only sections behave the same as before (LLM generation)."""
    from langchain_core.messages import AIMessageChunk

    mock_search.return_value = ["Protocol content"]
    model = AsyncMock()

    async def fake_astream(messages):
        yield AIMessageChunk(content="Generated content")

    model.astream = fake_astream
    model.bind = MagicMock(return_value=model)
    mock_get_model.return_value = model

    sections = [{"id": "sec-1", "name": "Purpose of the Study"}]

    raw_events = []
    async for event_str in stream_sections_parallel("proto-1", sections):
        raw_events.append(event_str)

    events = _parse_sse_events(raw_events)
    start_events = [e for e in events if e["event"] == "section_start"]
    assert len(start_events) == 1

    complete_events = [e for e in events if e["event"] == "section_complete"]
    assert len(complete_events) == 1

    mock_get_model.assert_called_once()


@pytest.mark.asyncio
@patch("src.services.section_graph.search_protocol")
@patch("src.services.section_graph.get_chat_model")
async def test_regen_vector_store_error_during_stream_not_retried(
    mock_get_model, mock_search,
):
    """VectorStoreError raised during astream is re-raised (not retried)."""
    from langchain_core.messages import AIMessageChunk

    mock_search.return_value = ["Protocol context"]
    model = AsyncMock()

    async def raise_vector_error(messages):
        raise VectorStoreError("Qdrant down")
        yield  # pragma: no cover

    model.astream = raise_vector_error
    mock_get_model.return_value = model

    # VectorStoreError should propagate (re-raised immediately, not caught by retry)
    with pytest.raises(VectorStoreError, match="Qdrant down"):
        async for _ in stream_section_regenerate(
            protocol_id="proto-1",
            section_id="sec-1",
            section_name="Purpose",
            current_content="Existing content.",
        ):
            pass

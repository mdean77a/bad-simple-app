from unittest.mock import MagicMock, patch

import pytest
from langchain_core.messages import AIMessageChunk, HumanMessage, ToolMessage

from src.services.llm_factory import LLMConfigError
from src.services.section_generator import (
    MAX_RETRIES,
    SectionGenerationError,
    _build_user_message,
    generate_section_stream,
)
from src.services.vector_store import VectorStoreError


def _ai_chunk(content, tool_calls=None, tool_call_chunks=None):
    """Create an AIMessageChunk with given content."""
    chunk = AIMessageChunk(content=content)
    if tool_calls:
        chunk.tool_calls = tool_calls
    if tool_call_chunks:
        chunk.tool_call_chunks = tool_call_chunks
    return chunk


def test_build_user_message():
    msg = _build_user_message("Purpose of the Study")
    assert "Purpose of the Study" in msg
    assert "search" in msg.lower()


@pytest.mark.asyncio
@patch("src.services.section_generator.get_chat_model")
@patch("src.services.section_generator.create_agent")
async def test_generate_section_stream_yields_chunks(mock_create_agent, mock_get_model):
    """Streaming yields content strings from the agent."""
    mock_get_model.return_value = MagicMock()

    async def fake_astream(input_data, stream_mode):
        yield (_ai_chunk("This study "), {"langgraph_node": "agent"})
        yield (_ai_chunk("investigates..."), {"langgraph_node": "agent"})

    mock_agent = MagicMock()
    mock_agent.astream = fake_astream
    mock_create_agent.return_value = mock_agent

    chunks = []
    async for chunk in generate_section_stream("protocol_test", "Purpose of the Study"):
        chunks.append(chunk)

    assert chunks == ["This study ", "investigates..."]
    mock_get_model.assert_called_once()
    mock_create_agent.assert_called_once()


@pytest.mark.asyncio
@patch("src.services.section_generator.get_chat_model")
@patch("src.services.section_generator.create_agent")
async def test_generate_section_stream_skips_tool_call_chunks(
    mock_create_agent, mock_get_model
):
    """Tool call chunks are skipped, text chunks are yielded."""
    mock_get_model.return_value = MagicMock()

    tool_chunk = _ai_chunk(
        "",
        tool_call_chunks=[{"name": "search", "args": '{"query": "test"}', "id": "abc", "index": 0}],
    )
    text_chunk = _ai_chunk("Hello")

    async def fake_astream(input_data, stream_mode):
        yield (tool_chunk, {"langgraph_node": "agent"})
        yield (text_chunk, {"langgraph_node": "agent"})

    mock_agent = MagicMock()
    mock_agent.astream = fake_astream
    mock_create_agent.return_value = mock_agent

    chunks = []
    async for chunk in generate_section_stream("protocol_test", "Section"):
        chunks.append(chunk)

    assert chunks == ["Hello"]


@pytest.mark.asyncio
@patch("src.services.section_generator.get_chat_model")
@patch("src.services.section_generator.create_agent")
async def test_generate_section_stream_skips_non_ai_messages(
    mock_create_agent, mock_get_model
):
    """Non-AIMessageChunk messages (Human, Tool) are ignored."""
    mock_get_model.return_value = MagicMock()

    async def fake_astream(input_data, stream_mode):
        yield (HumanMessage(content="user msg"), {"langgraph_node": "agent"})
        yield (_ai_chunk("content"), {"langgraph_node": "agent"})
        yield (ToolMessage(content="tool result", tool_call_id="abc"), {"langgraph_node": "tools"})

    mock_agent = MagicMock()
    mock_agent.astream = fake_astream
    mock_create_agent.return_value = mock_agent

    chunks = []
    async for chunk in generate_section_stream("protocol_test", "Section"):
        chunks.append(chunk)

    assert chunks == ["content"]


@pytest.mark.asyncio
@patch("src.services.section_generator.get_chat_model")
@patch("src.services.section_generator.create_agent")
async def test_generate_section_stream_handles_list_content_blocks(
    mock_create_agent, mock_get_model
):
    """Anthropic-style list content blocks with type=text are yielded."""
    mock_get_model.return_value = MagicMock()

    chunk_with_text_block = _ai_chunk([{"type": "text", "text": "block content"}])
    chunk_with_tool_block = _ai_chunk(
        [{"type": "tool_use", "id": "abc"}],
        tool_calls=[{"name": "search", "args": {}, "id": "abc"}],
    )

    async def fake_astream(input_data, stream_mode):
        yield (chunk_with_tool_block, {"langgraph_node": "agent"})
        yield (chunk_with_text_block, {"langgraph_node": "agent"})

    mock_agent = MagicMock()
    mock_agent.astream = fake_astream
    mock_create_agent.return_value = mock_agent

    chunks = []
    async for chunk in generate_section_stream("protocol_test", "Section"):
        chunks.append(chunk)

    assert chunks == ["block content"]


@pytest.mark.asyncio
@patch("src.services.section_generator.get_chat_model")
async def test_generate_section_stream_llm_config_error(mock_get_model):
    """LLMConfigError propagates immediately without retry."""
    mock_get_model.side_effect = LLMConfigError("ANTHROPIC_API_KEY is not configured")

    with pytest.raises(LLMConfigError, match="ANTHROPIC_API_KEY"):
        async for _ in generate_section_stream("protocol_test", "Section"):
            pass


@pytest.mark.asyncio
@patch("src.services.section_generator.get_chat_model")
@patch("src.services.section_generator.create_agent")
async def test_generate_section_stream_vector_store_error(
    mock_create_agent, mock_get_model
):
    """VectorStoreError propagates immediately without retry."""
    mock_get_model.return_value = MagicMock()

    async def fake_astream(input_data, stream_mode):
        raise VectorStoreError("QDRANT_URL is not configured")
        yield  # make it an async generator

    mock_agent = MagicMock()
    mock_agent.astream = fake_astream
    mock_create_agent.return_value = mock_agent

    with pytest.raises(VectorStoreError, match="QDRANT_URL"):
        async for _ in generate_section_stream("protocol_test", "Section"):
            pass


@pytest.mark.asyncio
@patch("src.services.section_generator.get_chat_model")
@patch("src.services.section_generator.create_agent")
async def test_generate_section_stream_retries_on_generic_error(
    mock_create_agent, mock_get_model
):
    """Generic exceptions trigger retries up to MAX_RETRIES, then raise SectionGenerationError."""
    mock_get_model.return_value = MagicMock()

    call_count = 0

    async def fake_astream(input_data, stream_mode):
        nonlocal call_count
        call_count += 1
        raise RuntimeError("Temporary failure")
        yield  # make it an async generator

    mock_agent = MagicMock()
    mock_agent.astream = fake_astream
    mock_create_agent.return_value = mock_agent

    with pytest.raises(SectionGenerationError, match="failed after 3 attempts"):
        async for _ in generate_section_stream("protocol_test", "Section"):
            pass

    assert call_count == MAX_RETRIES


@pytest.mark.asyncio
@patch("src.services.section_generator.get_chat_model")
@patch("src.services.section_generator.create_agent")
async def test_generate_section_stream_empty_content_skipped(
    mock_create_agent, mock_get_model
):
    """Chunks with empty content are skipped."""
    mock_get_model.return_value = MagicMock()

    async def fake_astream(input_data, stream_mode):
        yield (_ai_chunk(""), {"langgraph_node": "agent"})
        yield (_ai_chunk("real content"), {"langgraph_node": "agent"})

    mock_agent = MagicMock()
    mock_agent.astream = fake_astream
    mock_create_agent.return_value = mock_agent

    chunks = []
    async for chunk in generate_section_stream("protocol_test", "Section"):
        chunks.append(chunk)

    assert chunks == ["real content"]


# --- Tests for the @tool function (search_protocol_chunks) ---


@pytest.mark.asyncio
@patch("src.services.section_generator.search_protocol")
@patch("src.services.section_generator.get_chat_model")
@patch("src.services.section_generator.create_agent")
async def test_tool_returns_joined_chunks(
    mock_create_agent, mock_get_model, mock_search
):
    """The RAG tool joins retrieved chunks with separator."""
    mock_get_model.return_value = MagicMock()
    mock_search.return_value = ["chunk one", "chunk two"]

    captured_tool = None

    def capture_agent(model, tools, **kwargs):
        nonlocal captured_tool
        captured_tool = tools[0]
        agent = MagicMock()

        async def empty_stream(input_data, stream_mode):
            return
            yield  # make it an async generator

        agent.astream = empty_stream
        return agent

    mock_create_agent.side_effect = capture_agent

    async for _ in generate_section_stream("protocol_test", "Section"):
        pass

    assert captured_tool is not None
    result = captured_tool.invoke({"query": "test query"})
    assert "chunk one" in result
    assert "chunk two" in result
    assert "\n\n---\n\n" in result
    mock_search.assert_called_with("protocol_test", "test query", k=20)


@pytest.mark.asyncio
@patch("src.services.section_generator.search_protocol")
@patch("src.services.section_generator.get_chat_model")
@patch("src.services.section_generator.create_agent")
async def test_tool_returns_fallback_when_no_chunks(
    mock_create_agent, mock_get_model, mock_search
):
    """The RAG tool returns fallback message when no chunks found."""
    mock_get_model.return_value = MagicMock()
    mock_search.return_value = []

    captured_tool = None

    def capture_agent(model, tools, **kwargs):
        nonlocal captured_tool
        captured_tool = tools[0]
        agent = MagicMock()

        async def empty_stream(input_data, stream_mode):
            return
            yield

        agent.astream = empty_stream
        return agent

    mock_create_agent.side_effect = capture_agent

    async for _ in generate_section_stream("protocol_test", "Section"):
        pass

    result = captured_tool.invoke({"query": "obscure query"})
    assert result == "No relevant content found for this query."


@pytest.mark.asyncio
@patch("src.services.section_generator.search_protocol")
@patch("src.services.section_generator.get_chat_model")
@patch("src.services.section_generator.create_agent")
async def test_tool_propagates_vector_store_error(
    mock_create_agent, mock_get_model, mock_search
):
    """The RAG tool re-raises VectorStoreError from search_protocol."""
    mock_get_model.return_value = MagicMock()
    mock_search.side_effect = VectorStoreError("Qdrant down")

    captured_tool = None

    def capture_agent(model, tools, **kwargs):
        nonlocal captured_tool
        captured_tool = tools[0]
        agent = MagicMock()

        async def empty_stream(input_data, stream_mode):
            return
            yield

        agent.astream = empty_stream
        return agent

    mock_create_agent.side_effect = capture_agent

    async for _ in generate_section_stream("protocol_test", "Section"):
        pass

    with pytest.raises(VectorStoreError, match="Qdrant down"):
        captured_tool.invoke({"query": "test"})


@pytest.mark.asyncio
@patch("src.services.section_generator.search_protocol")
@patch("src.services.section_generator.get_chat_model")
@patch("src.services.section_generator.create_agent")
async def test_tool_wraps_generic_error_as_vector_store_error(
    mock_create_agent, mock_get_model, mock_search
):
    """The RAG tool wraps unexpected exceptions as VectorStoreError."""
    mock_get_model.return_value = MagicMock()
    mock_search.side_effect = RuntimeError("connection timeout")

    captured_tool = None

    def capture_agent(model, tools, **kwargs):
        nonlocal captured_tool
        captured_tool = tools[0]
        agent = MagicMock()

        async def empty_stream(input_data, stream_mode):
            return
            yield

        agent.astream = empty_stream
        return agent

    mock_create_agent.side_effect = capture_agent

    async for _ in generate_section_stream("protocol_test", "Section"):
        pass

    with pytest.raises(VectorStoreError, match="Protocol search failed"):
        captured_tool.invoke({"query": "test"})

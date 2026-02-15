from unittest.mock import MagicMock, patch

import pytest

from src.services.vector_store import (
    VectorStoreError,
    chunk_text,
    generate_collection_name,
    index_protocol,
    list_protocols,
)


# --- generate_collection_name ---


def test_generate_collection_name_format():
    name = generate_collection_name("my-protocol.pdf")
    assert name.startswith("protocol_my_protocol_")
    parts = name.split("_", 2)
    assert parts[0] == "protocol"


def test_generate_collection_name_lowercase():
    name = generate_collection_name("MyProtocol.pdf")
    assert name == name.lower()


def test_generate_collection_name_special_chars():
    name = generate_collection_name("my protocol (v2).pdf")
    assert name.startswith("protocol_my_protocol__v2_")
    assert all(c.isalnum() or c == "_" for c in name)


def test_generate_collection_name_max_length():
    long_name = "a" * 100 + ".pdf"
    name = generate_collection_name(long_name)
    assert len(name) <= 64


# --- chunk_text ---


def test_chunk_text_single_chunk():
    text = "Short text."
    chunks = chunk_text(text)
    assert len(chunks) == 1
    assert chunks[0] == "Short text."


def test_chunk_text_multiple_chunks():
    text = "word " * 500  # 2500 chars
    chunks = chunk_text(text)
    assert len(chunks) > 1


def test_chunk_text_empty():
    chunks = chunk_text("")
    assert chunks == []


# --- index_protocol ---


def test_index_protocol_empty_text():
    with pytest.raises(VectorStoreError, match="Cannot index empty text"):
        index_protocol("", "test_collection", "Test Protocol", "TESTT")


def test_index_protocol_whitespace_only():
    with pytest.raises(VectorStoreError, match="Cannot index empty text"):
        index_protocol("   \n\t  ", "test_collection", "Test Protocol", "TESTT")


@patch("src.services.vector_store.settings")
def test_index_protocol_missing_qdrant_url(mock_settings):
    mock_settings.qdrant_url = ""
    mock_settings.openai_api_key = "test-key"
    with pytest.raises(VectorStoreError, match="QDRANT_URL is not configured"):
        index_protocol("Some text", "test_collection", "Test Protocol", "TESTT")


@patch("src.services.vector_store.settings")
def test_index_protocol_missing_openai_key(mock_settings):
    mock_settings.qdrant_url = "https://qdrant.example.com"
    mock_settings.openai_api_key = None
    with pytest.raises(VectorStoreError, match="OPENAI_API_KEY is not configured"):
        index_protocol("Some text", "test_collection", "Test Protocol", "TESTT")


@patch("src.services.vector_store.QdrantVectorStore")
@patch("src.services.vector_store.settings")
def test_index_protocol_success(mock_settings, mock_qdrant_vs):
    mock_settings.qdrant_url = "https://qdrant.example.com"
    mock_settings.qdrant_api_key = "qdrant-key"
    mock_settings.openai_api_key = "openai-key"

    index_protocol("Some protocol text", "test_collection", "Test Protocol", "THAPCA")

    mock_qdrant_vs.from_texts.assert_called_once()
    call_kwargs = mock_qdrant_vs.from_texts.call_args.kwargs
    assert call_kwargs["collection_name"] == "test_collection"
    assert call_kwargs["url"] == "https://qdrant.example.com"
    assert call_kwargs["api_key"] == "qdrant-key"
    assert len(call_kwargs["texts"]) == 1
    assert call_kwargs["metadatas"][0]["protocol_name"] == "Test Protocol"
    assert call_kwargs["metadatas"][0]["chunk_index"] == 0
    assert call_kwargs["metadatas"][0]["acronym"] == "THAPCA"
    assert "indexed_at" in call_kwargs["metadatas"][0]


@patch("src.services.vector_store.QdrantVectorStore")
@patch("src.services.vector_store.settings")
def test_index_protocol_wraps_external_errors(mock_settings, mock_qdrant_vs):
    mock_settings.qdrant_url = "https://qdrant.example.com"
    mock_settings.openai_api_key = "openai-key"
    mock_qdrant_vs.from_texts.side_effect = ConnectionError("Connection refused")

    with pytest.raises(VectorStoreError, match="Vector indexing failed"):
        index_protocol("Some text", "test_collection", "Test Protocol", "TESTT")


@patch("src.services.vector_store.QdrantVectorStore")
@patch("src.services.vector_store.settings")
def test_index_protocol_stores_acronym_in_all_chunks(mock_settings, mock_qdrant_vs):
    """Acronym is stored in metadata for every chunk."""
    mock_settings.qdrant_url = "https://qdrant.example.com"
    mock_settings.qdrant_api_key = "qdrant-key"
    mock_settings.openai_api_key = "openai-key"

    long_text = "word " * 500  # multiple chunks
    index_protocol(long_text, "test_collection", "Test Protocol", "FLUID")

    call_kwargs = mock_qdrant_vs.from_texts.call_args.kwargs
    indexed_at_values = set()
    for metadata in call_kwargs["metadatas"]:
        assert metadata["acronym"] == "FLUID"
        assert "indexed_at" in metadata
        indexed_at_values.add(metadata["indexed_at"])
    # All chunks share the same indexed_at timestamp
    assert len(indexed_at_values) == 1


# --- list_protocols ---


def _make_collection(name: str):
    """Create a mock collection object."""
    col = MagicMock()
    col.name = name
    return col


def _make_point(payload: dict):
    """Create a mock point with payload."""
    point = MagicMock()
    point.payload = payload
    return point


@patch("src.services.vector_store.QdrantClient")
@patch("src.services.vector_store.settings")
def test_list_protocols_returns_protocol_list(mock_settings, mock_client_cls):
    mock_settings.qdrant_url = "https://qdrant.example.com"
    mock_settings.qdrant_api_key = "qdrant-key"

    mock_client = MagicMock()
    mock_client_cls.return_value = mock_client

    collections_response = MagicMock()
    collections_response.collections = [
        _make_collection("protocol_diabetes_20260203"),
        _make_collection("protocol_cardiac_20260201"),
    ]
    mock_client.get_collections.return_value = collections_response

    mock_client.scroll.side_effect = [
        (
            [_make_point({"protocol_name": "Diabetes Study", "indexed_at": "2026-02-03T14:30:00+00:00"})],
            None,
        ),
        (
            [_make_point({"protocol_name": "Cardiac Trial", "indexed_at": "2026-02-01T10:00:00+00:00"})],
            None,
        ),
    ]

    result = list_protocols()

    assert len(result) == 2
    assert result[0]["protocolId"] == "protocol_diabetes_20260203"
    assert result[0]["protocolName"] == "Diabetes Study"
    assert result[0]["indexedAt"] == "2026-02-03T14:30:00+00:00"
    assert result[1]["protocolId"] == "protocol_cardiac_20260201"
    assert result[1]["protocolName"] == "Cardiac Trial"


@patch("src.services.vector_store.QdrantClient")
@patch("src.services.vector_store.settings")
def test_list_protocols_empty_when_no_collections(mock_settings, mock_client_cls):
    mock_settings.qdrant_url = "https://qdrant.example.com"
    mock_settings.qdrant_api_key = "qdrant-key"

    mock_client = MagicMock()
    mock_client_cls.return_value = mock_client

    collections_response = MagicMock()
    collections_response.collections = []
    mock_client.get_collections.return_value = collections_response

    result = list_protocols()

    assert result == []


@patch("src.services.vector_store.QdrantClient")
@patch("src.services.vector_store.settings")
def test_list_protocols_sorted_by_indexed_at_descending(mock_settings, mock_client_cls):
    mock_settings.qdrant_url = "https://qdrant.example.com"
    mock_settings.qdrant_api_key = "qdrant-key"

    mock_client = MagicMock()
    mock_client_cls.return_value = mock_client

    collections_response = MagicMock()
    collections_response.collections = [
        _make_collection("older"),
        _make_collection("newer"),
        _make_collection("middle"),
    ]
    mock_client.get_collections.return_value = collections_response

    mock_client.scroll.side_effect = [
        ([_make_point({"protocol_name": "Older", "indexed_at": "2026-01-01T00:00:00+00:00"})], None),
        ([_make_point({"protocol_name": "Newer", "indexed_at": "2026-03-01T00:00:00+00:00"})], None),
        ([_make_point({"protocol_name": "Middle", "indexed_at": "2026-02-01T00:00:00+00:00"})], None),
    ]

    result = list_protocols()

    assert [p["protocolName"] for p in result] == ["Newer", "Middle", "Older"]


@patch("src.services.vector_store.QdrantClient")
@patch("src.services.vector_store.settings")
def test_list_protocols_raises_on_qdrant_failure(mock_settings, mock_client_cls):
    mock_settings.qdrant_url = "https://qdrant.example.com"
    mock_settings.qdrant_api_key = "qdrant-key"

    mock_client = MagicMock()
    mock_client_cls.return_value = mock_client
    mock_client.get_collections.side_effect = ConnectionError("Connection refused")

    with pytest.raises(VectorStoreError, match="Failed to list protocols"):
        list_protocols()


@patch("src.services.vector_store.settings")
def test_list_protocols_missing_qdrant_url(mock_settings):
    mock_settings.qdrant_url = ""

    with pytest.raises(VectorStoreError, match="QDRANT_URL is not configured"):
        list_protocols()


@patch("src.services.vector_store.QdrantClient")
@patch("src.services.vector_store.settings")
def test_list_protocols_skips_empty_collections(mock_settings, mock_client_cls):
    """Collections with no points are skipped."""
    mock_settings.qdrant_url = "https://qdrant.example.com"
    mock_settings.qdrant_api_key = "qdrant-key"

    mock_client = MagicMock()
    mock_client_cls.return_value = mock_client

    collections_response = MagicMock()
    collections_response.collections = [
        _make_collection("has_points"),
        _make_collection("empty_collection"),
    ]
    mock_client.get_collections.return_value = collections_response

    mock_client.scroll.side_effect = [
        ([_make_point({"protocol_name": "Has Points", "indexed_at": "2026-02-01T00:00:00+00:00"})], None),
        ([], None),  # empty collection
    ]

    result = list_protocols()

    assert len(result) == 1
    assert result[0]["protocolName"] == "Has Points"

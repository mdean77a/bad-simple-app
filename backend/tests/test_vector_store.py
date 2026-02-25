from unittest.mock import MagicMock, patch

import pytest

from src.services.vector_store import (
    VectorStoreError,
    chunk_text,
    generate_collection_name,
    index_protocol,
    list_protocols,
    search_protocol,
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


# --- search_protocol ---


@patch("src.services.vector_store.QdrantVectorStore")
@patch("src.services.vector_store.QdrantClient")
@patch("src.services.vector_store.settings")
def test_search_protocol_returns_chunk_texts(mock_settings, mock_client_cls, mock_vs_cls):
    mock_settings.qdrant_url = "https://qdrant.example.com"
    mock_settings.qdrant_api_key = "qdrant-key"
    mock_settings.openai_api_key = "openai-key"

    mock_doc1 = MagicMock()
    mock_doc1.page_content = "Chunk about study purpose"
    mock_doc2 = MagicMock()
    mock_doc2.page_content = "Chunk about procedures"

    mock_store = MagicMock()
    mock_vs_cls.return_value = mock_store
    mock_store.similarity_search.return_value = [mock_doc1, mock_doc2]

    result = search_protocol("protocol_test_123", "study purpose", k=5)

    assert result == ["Chunk about study purpose", "Chunk about procedures"]
    mock_store.similarity_search.assert_called_once_with("study purpose", k=5)


@patch("src.services.vector_store.settings")
def test_search_protocol_missing_qdrant_url(mock_settings):
    mock_settings.qdrant_url = ""
    mock_settings.openai_api_key = "openai-key"

    with pytest.raises(VectorStoreError, match="QDRANT_URL is not configured"):
        search_protocol("protocol_test_123", "query")


@patch("src.services.vector_store.settings")
def test_search_protocol_missing_openai_key(mock_settings):
    mock_settings.qdrant_url = "https://qdrant.example.com"
    mock_settings.openai_api_key = None

    with pytest.raises(VectorStoreError, match="OPENAI_API_KEY is not configured"):
        search_protocol("protocol_test_123", "query")


@patch("src.services.vector_store.QdrantVectorStore")
@patch("src.services.vector_store.QdrantClient")
@patch("src.services.vector_store.settings")
def test_search_protocol_wraps_errors(mock_settings, mock_client_cls, mock_vs_cls):
    mock_settings.qdrant_url = "https://qdrant.example.com"
    mock_settings.qdrant_api_key = "qdrant-key"
    mock_settings.openai_api_key = "openai-key"

    mock_store = MagicMock()
    mock_vs_cls.return_value = mock_store
    mock_store.similarity_search.side_effect = ConnectionError("timeout")

    with pytest.raises(VectorStoreError, match="Protocol search failed"):
        search_protocol("protocol_test_123", "query")


@patch("src.services.vector_store.QdrantVectorStore")
@patch("src.services.vector_store.QdrantClient")
@patch("src.services.vector_store.settings")
def test_search_protocol_reraises_vector_store_error(mock_settings, mock_client_cls, mock_vs_cls):
    """VectorStoreError from similarity_search is re-raised unchanged (not double-wrapped)."""
    mock_settings.qdrant_url = "https://qdrant.example.com"
    mock_settings.qdrant_api_key = "qdrant-key"
    mock_settings.openai_api_key = "openai-key"

    mock_store = MagicMock()
    mock_vs_cls.return_value = mock_store
    mock_store.similarity_search.side_effect = VectorStoreError("Already a VectorStoreError")

    with pytest.raises(VectorStoreError, match="Already a VectorStoreError"):
        search_protocol("protocol_test_123", "query")


@patch("src.services.vector_store.QdrantVectorStore")
@patch("src.services.vector_store.QdrantClient")
@patch("src.services.vector_store.settings")
def test_search_protocol_empty_results(mock_settings, mock_client_cls, mock_vs_cls):
    mock_settings.qdrant_url = "https://qdrant.example.com"
    mock_settings.qdrant_api_key = "qdrant-key"
    mock_settings.openai_api_key = "openai-key"

    mock_store = MagicMock()
    mock_vs_cls.return_value = mock_store
    mock_store.similarity_search.return_value = []

    result = search_protocol("protocol_test_123", "query")

    assert result == []


@patch("src.services.vector_store.QdrantVectorStore")
@patch("src.services.vector_store.QdrantClient")
@patch("src.services.vector_store.settings")
def test_search_protocol_default_k(mock_settings, mock_client_cls, mock_vs_cls):
    """Default k value is 20."""
    mock_settings.qdrant_url = "https://qdrant.example.com"
    mock_settings.qdrant_api_key = "qdrant-key"
    mock_settings.openai_api_key = "openai-key"

    mock_store = MagicMock()
    mock_vs_cls.return_value = mock_store
    mock_store.similarity_search.return_value = []

    search_protocol("protocol_test_123", "query")

    mock_store.similarity_search.assert_called_once_with("query", k=20)


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
            [_make_point({"metadata": {"protocol_name": "Diabetes Study", "acronym": "DBS", "indexed_at": "2026-02-03T14:30:00+00:00"}})],
            None,
        ),
        (
            [_make_point({"metadata": {"protocol_name": "Cardiac Trial", "acronym": "CRT", "indexed_at": "2026-02-01T10:00:00+00:00"}})],
            None,
        ),
    ]

    result = list_protocols()

    assert len(result) == 2
    assert result[0]["protocolId"] == "protocol_diabetes_20260203"
    assert result[0]["protocolName"] == "Diabetes Study"
    assert result[0]["acronym"] == "DBS"
    assert result[0]["indexedAt"] == "2026-02-03T14:30:00+00:00"
    assert result[1]["protocolId"] == "protocol_cardiac_20260201"
    assert result[1]["protocolName"] == "Cardiac Trial"
    assert result[1]["acronym"] == "CRT"


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
        ([_make_point({"metadata": {"protocol_name": "Older", "acronym": "OLD", "indexed_at": "2026-01-01T00:00:00+00:00"}})], None),
        ([_make_point({"metadata": {"protocol_name": "Newer", "acronym": "NEW", "indexed_at": "2026-03-01T00:00:00+00:00"}})], None),
        ([_make_point({"metadata": {"protocol_name": "Middle", "acronym": "MID", "indexed_at": "2026-02-01T00:00:00+00:00"}})], None),
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
        ([_make_point({"metadata": {"protocol_name": "Has Points", "acronym": "HPT", "indexed_at": "2026-02-01T00:00:00+00:00"}})], None),
        ([], None),  # empty collection
    ]

    result = list_protocols()

    assert len(result) == 1
    assert result[0]["protocolName"] == "Has Points"


@patch("src.services.vector_store.QdrantClient")
@patch("src.services.vector_store.settings")
def test_list_protocols_reraises_vector_store_error(mock_settings, mock_client_cls):
    """VectorStoreError from QdrantClient is re-raised unchanged (not double-wrapped)."""
    mock_settings.qdrant_url = "https://qdrant.example.com"
    mock_settings.qdrant_api_key = "qdrant-key"

    mock_client = MagicMock()
    mock_client_cls.return_value = mock_client
    mock_client.get_collections.side_effect = VectorStoreError("Already wrapped")

    with pytest.raises(VectorStoreError, match="Already wrapped"):
        list_protocols()

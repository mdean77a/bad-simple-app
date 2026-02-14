from unittest.mock import patch

import pytest

from src.services.vector_store import (
    VectorStoreError,
    chunk_text,
    generate_collection_name,
    index_protocol,
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
        index_protocol("", "test_collection", "Test Protocol")


def test_index_protocol_whitespace_only():
    with pytest.raises(VectorStoreError, match="Cannot index empty text"):
        index_protocol("   \n\t  ", "test_collection", "Test Protocol")


@patch("src.services.vector_store.settings")
def test_index_protocol_missing_qdrant_url(mock_settings):
    mock_settings.qdrant_url = ""
    mock_settings.openai_api_key = "test-key"
    with pytest.raises(VectorStoreError, match="QDRANT_URL is not configured"):
        index_protocol("Some text", "test_collection", "Test Protocol")


@patch("src.services.vector_store.settings")
def test_index_protocol_missing_openai_key(mock_settings):
    mock_settings.qdrant_url = "https://qdrant.example.com"
    mock_settings.openai_api_key = None
    with pytest.raises(VectorStoreError, match="OPENAI_API_KEY is not configured"):
        index_protocol("Some text", "test_collection", "Test Protocol")


@patch("src.services.vector_store.QdrantVectorStore")
@patch("src.services.vector_store.settings")
def test_index_protocol_success(mock_settings, mock_qdrant_vs):
    mock_settings.qdrant_url = "https://qdrant.example.com"
    mock_settings.qdrant_api_key = "qdrant-key"
    mock_settings.openai_api_key = "openai-key"

    index_protocol("Some protocol text", "test_collection", "Test Protocol")

    mock_qdrant_vs.from_texts.assert_called_once()
    call_kwargs = mock_qdrant_vs.from_texts.call_args.kwargs
    assert call_kwargs["collection_name"] == "test_collection"
    assert call_kwargs["url"] == "https://qdrant.example.com"
    assert call_kwargs["api_key"] == "qdrant-key"
    assert len(call_kwargs["texts"]) == 1
    assert call_kwargs["metadatas"][0]["protocol_name"] == "Test Protocol"
    assert call_kwargs["metadatas"][0]["chunk_index"] == 0


@patch("src.services.vector_store.QdrantVectorStore")
@patch("src.services.vector_store.settings")
def test_index_protocol_wraps_external_errors(mock_settings, mock_qdrant_vs):
    mock_settings.qdrant_url = "https://qdrant.example.com"
    mock_settings.openai_api_key = "openai-key"
    mock_qdrant_vs.from_texts.side_effect = ConnectionError("Connection refused")

    with pytest.raises(VectorStoreError, match="Vector indexing failed"):
        index_protocol("Some text", "test_collection", "Test Protocol")

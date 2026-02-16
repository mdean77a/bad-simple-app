import re
from datetime import datetime, timezone

from langchain_openai import OpenAIEmbeddings
from langchain_qdrant import QdrantVectorStore
from langchain_text_splitters import RecursiveCharacterTextSplitter
from qdrant_client import QdrantClient

from src.config import settings


class VectorStoreError(Exception):
    """Raised when any vector store operation fails."""


def generate_collection_name(filename: str) -> str:
    """Create a collection name from filename + timestamp.

    Format: protocol_{sanitized}_{YYYYMMDDHHmmss}, lowercase, max 64 chars.
    """
    name = filename.rsplit(".", 1)[0] if "." in filename else filename
    sanitized = re.sub(r"[^a-zA-Z0-9_]", "_", name).lower().strip("_")
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    collection_name = f"protocol_{sanitized}_{timestamp}"
    return collection_name[:64]


def chunk_text(text: str) -> list[str]:
    """Split text into chunks using recursive character splitting."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
    )
    return splitter.split_text(text)


def index_protocol(
    text: str, collection_name: str, protocol_name: str, acronym: str
) -> None:
    """Chunk text, embed via OpenAI, and store in Qdrant."""
    if not text.strip():
        raise VectorStoreError("Cannot index empty text")

    if not settings.qdrant_url:
        raise VectorStoreError("QDRANT_URL is not configured")
    if not settings.openai_api_key:
        raise VectorStoreError("OPENAI_API_KEY is not configured")

    try:
        chunks = chunk_text(text)
        indexed_at = datetime.now(timezone.utc).isoformat()
        metadatas = [
            {
                "chunk_index": i,
                "protocol_name": protocol_name,
                "acronym": acronym,
                "indexed_at": indexed_at,
            }
            for i in range(len(chunks))
        ]

        QdrantVectorStore.from_texts(
            texts=chunks,
            embedding=OpenAIEmbeddings(
                model="text-embedding-3-small",
                api_key=settings.openai_api_key,
            ),
            metadatas=metadatas,
            url=settings.qdrant_url,
            api_key=settings.qdrant_api_key,
            collection_name=collection_name,
        )
    except Exception as exc:
        raise VectorStoreError(f"Vector indexing failed: {exc}") from exc


def search_protocol(collection_name: str, query: str, k: int = 20) -> list[str]:
    """Retrieve relevant chunks from a protocol collection via similarity search.

    Returns list of chunk text strings ranked by relevance.
    """
    if not settings.qdrant_url:
        raise VectorStoreError("QDRANT_URL is not configured")
    if not settings.openai_api_key:
        raise VectorStoreError("OPENAI_API_KEY is not configured")

    try:
        client = QdrantClient(
            url=settings.qdrant_url, api_key=settings.qdrant_api_key
        )
        store = QdrantVectorStore(
            client=client,
            collection_name=collection_name,
            embedding=OpenAIEmbeddings(
                model="text-embedding-3-small",
                api_key=settings.openai_api_key,
            ),
        )
        docs = store.similarity_search(query, k=k)
        return [doc.page_content for doc in docs]
    except VectorStoreError:
        raise
    except Exception as exc:
        raise VectorStoreError(f"Protocol search failed: {exc}") from exc


def list_protocols() -> list[dict]:
    """List all indexed protocols from Qdrant.

    Returns list of {protocolId, protocolName, indexedAt} sorted by indexedAt desc.
    """
    if not settings.qdrant_url:
        raise VectorStoreError("QDRANT_URL is not configured")

    try:
        client = QdrantClient(
            url=settings.qdrant_url, api_key=settings.qdrant_api_key
        )
        collections = client.get_collections().collections

        protocols = []
        for collection in collections:
            points, _ = client.scroll(collection.name, limit=1)
            if not points:
                continue
            metadata = points[0].payload or {}
            protocols.append(
                {
                    "protocolId": collection.name,
                    "protocolName": metadata.get("protocol_name", collection.name),
                    "indexedAt": metadata.get("indexed_at", ""),
                }
            )

        protocols.sort(key=lambda p: p["indexedAt"], reverse=True)
        return protocols
    except VectorStoreError:
        raise
    except Exception as exc:
        raise VectorStoreError(f"Failed to list protocols: {exc}") from exc

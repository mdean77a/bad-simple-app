# Backend

FastAPI REST API for clinical protocol processing. Extracts text from uploaded PDFs, chunks it, generates vector embeddings via OpenAI, and stores them in Qdrant Cloud for RAG-based retrieval.

## Tech Stack

- **Python 3.13+** with [uv](https://docs.astral.sh/uv/) for package management
- **FastAPI** — async web framework
- **PyMuPDF** — PDF text extraction
- **LangChain** — text splitting (`RecursiveCharacterTextSplitter`) and Qdrant integration (`QdrantVectorStore.from_texts()`)
- **OpenAI** — `text-embedding-3-small` embeddings
- **Qdrant Cloud** — vector database for similarity search

## Setup

```bash
cp .env.example .env   # Fill in required values
uv sync                # Install dependencies
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CORS_ORIGINS` | No | Comma-separated allowed origins (default: `http://localhost:3000`) |
| `QDRANT_URL` | Yes | Qdrant Cloud cluster URL |
| `QDRANT_API_KEY` | Yes | Qdrant Cloud API key |
| `OPENAI_API_KEY` | Yes | OpenAI API key for embeddings |

## Running

```bash
uv run uvicorn src.main:app --reload
```

The API runs at http://localhost:8000. Interactive docs at http://localhost:8000/docs.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/health` | Health check |
| `POST` | `/api/v1/protocols/upload` | Upload a PDF protocol for processing and indexing |

### Upload Response

```json
{
  "protocolId": "protocol_my_protocol_20260214120000",
  "protocolName": "my_protocol"
}
```

### Error Codes

| HTTP Status | Code | When |
|-------------|------|------|
| 422 | `VALIDATION_ERROR` | Non-PDF file extension or content type |
| 422 | `PDF_PARSE_ERROR` | Corrupted PDF or no extractable text |
| 502 | `VECTOR_DB_ERROR` | Qdrant or OpenAI service failure |

## Project Structure

```
backend/
├── src/
│   ├── main.py                    # FastAPI app, middleware, router registration
│   ├── config.py                  # Pydantic settings (env vars)
│   ├── api/routes/
│   │   ├── health.py              # Health check endpoint
│   │   └── protocols.py           # Protocol upload endpoint
│   └── services/
│       ├── pdf_processor.py       # PDF text extraction (PyMuPDF)
│       └── vector_store.py        # Chunking, embedding, Qdrant indexing
├── tests/
│   ├── conftest.py                # Async test client fixture
│   ├── test_health.py             # Health endpoint tests
│   ├── test_pdf_processor.py      # PDF extraction tests
│   ├── test_protocols.py          # Upload endpoint tests
│   └── test_vector_store.py       # Vector store service tests
├── .env.example                   # Environment variable template
└── pyproject.toml                 # Dependencies and tool config
```

## Testing

```bash
uv run pytest tests/ -v --cov=src --cov-report=term-missing
```

28 tests, 99% coverage. All external services (Qdrant, OpenAI) are mocked in tests.

# Story 2.3: Create Protocol List Endpoint

Status: ready-for-dev

## Story

As a **research coordinator**,
I want **to see a list of protocols that have been indexed**,
so that **I can select a previously uploaded protocol for ICF generation**.

## Acceptance Criteria

1. **Given** protocols have been indexed in Qdrant, **When** I call `GET /api/v1/protocols`, **Then** I receive a list of all indexed protocols, **And** each item includes `protocolId`, `protocolName`, and `indexedAt`.

2. **Given** no protocols have been indexed, **When** I call `GET /api/v1/protocols`, **Then** I receive an empty array `[]`.

3. **Given** the Qdrant connection is secured, **When** the endpoint retrieves the protocol list, **Then** the request uses API key authentication (NFR6).

4. **Given** Qdrant Cloud is unreachable, **When** I call `GET /api/v1/protocols`, **Then** I receive a 502 response with error code `VECTOR_DB_ERROR`.

## Tasks / Subtasks

- [ ] Task 1: Add `list_protocols()` function to `vector_store.py` (AC: #1, #2, #3, #4)
  - [ ] 1.1: Use Qdrant client to list all collections (every collection is a protocol)
  - [ ] 1.2: Extract metadata (protocol name, indexed timestamp) from each collection
  - [ ] 1.3: Return list of `{protocolId, protocolName, indexedAt}` sorted by `indexedAt` descending
  - [ ] 1.4: Return empty list when no collections found
  - [ ] 1.5: Raise `VectorStoreError` on Qdrant connection failures
- [ ] Task 2: Add GET `/` endpoint to `protocols.py` route (AC: #1, #2, #4)
  - [ ] 2.1: Create GET handler that calls `list_protocols()`
  - [ ] 2.2: Return JSON array response (direct array, no wrapper)
  - [ ] 2.3: Return 502 with `VECTOR_DB_ERROR` on `VectorStoreError`
- [ ] Task 3: Write unit tests for `list_protocols()` in `test_vector_store.py` (AC: #1, #2, #3, #4)
  - [ ] 3.1: Test returns protocol list with correct fields
  - [ ] 3.2: Test returns empty list when no collections
  - [ ] 3.3: Test sorts by `indexedAt` descending
  - [ ] 3.5: Test raises `VectorStoreError` on Qdrant failures
- [ ] Task 4: Write integration tests for GET endpoint in `test_protocols.py` (AC: #1, #2, #4)
  - [ ] 4.1: Test 200 with list of protocols
  - [ ] 4.2: Test 200 with empty array when none exist
  - [ ] 4.3: Test 502 on vector store error
  - [ ] 4.4: Verify response JSON structure (`protocolId`, `protocolName`, `indexedAt`)

## Dev Notes

### Architecture & API Patterns

- **Endpoint:** `GET /api/v1/protocols` — already defined in architecture doc
- **Response format:** Direct JSON array (no wrapper object), per architecture patterns:
  ```json
  [
    {"protocolId": "protocol_diabetes_study_20260203143000", "protocolName": "Diabetes Prevention Study", "indexedAt": "2026-02-03T14:30:00Z"},
    {"protocolId": "protocol_cardiac_trial_20260201100000", "protocolName": "Cardiac Trial", "indexedAt": "2026-02-01T10:00:00Z"}
  ]
  ```
- **Error format:** `{"code": "VECTOR_DB_ERROR", "detail": "..."}` — matches existing pattern in `protocols.py` helper `_vector_db_error()`
- **Sorting:** Most recent first (`indexedAt` descending)

### Qdrant Client Usage

The existing codebase uses `langchain-qdrant` (`QdrantVectorStore.from_texts()`) for writing. For **listing collections**, you need the **low-level `qdrant-client`** directly:

```python
from qdrant_client import QdrantClient

client = QdrantClient(url=settings.qdrant_url, api_key=settings.qdrant_api_key)
collections = client.get_collections().collections
```

- `qdrant-client` is already an installed dependency (transitive via `langchain-qdrant`)
- Every collection in the Qdrant instance is a protocol — no filtering needed, list them all
- Each collection's `.name` field gives the collection name (which is our `protocolId`)
- Chunk metadata contains: `protocol_name`, `acronym`, `indexed_at`, `chunk_index`
- `indexed_at` is an ISO 8601 timestamp stored explicitly in metadata — no need to parse collection names

### Extracting Metadata from Collections

Two approaches for getting `protocolName` and `indexedAt`:

**Recommended: Peek at first point's metadata via `client.scroll(collection_name, limit=1)`**
- All fields are stored in every chunk's metadata: `protocol_name`, `acronym`, `indexed_at`
- `indexed_at` is an ISO 8601 string (e.g., `"2026-02-15T14:30:00+00:00"`)
- This is reliable because `index_protocol()` stores identical metadata on every chunk

### Key Existing Code to Understand

- **`backend/src/services/vector_store.py`** — `generate_collection_name()` creates the naming pattern; `index_protocol()` stores `protocol_name` in metadata
- **`backend/src/api/routes/protocols.py`** — existing POST upload endpoint with error helpers (`_vector_db_error()`) to reuse
- **`backend/src/config.py`** — `settings.qdrant_url` and `settings.qdrant_api_key` for client initialization
- **`backend/tests/test_vector_store.py`** — existing mocking patterns: `@patch("src.services.vector_store.settings")`, `@patch("src.services.vector_store.QdrantVectorStore")`

### Project Structure Notes

- All changes are in the **backend only** — no frontend work in this story
- New GET endpoint goes in existing `backend/src/api/routes/protocols.py` (alongside POST upload)
- New service function goes in existing `backend/src/services/vector_store.py`
- No new files need to be created
- Router is already registered in `main.py` with prefix `/api/v1/protocols`

### Testing Standards

- **Framework:** pytest + pytest-asyncio
- **HTTP client:** `httpx.AsyncClient` with `ASGITransport` (fixture in `conftest.py`)
- **Mocking pattern:** `@patch("src.api.routes.protocols.list_protocols")` for route tests; `@patch("src.services.vector_store.QdrantClient")` for service tests
- **Coverage threshold:** 80% minimum (currently at 99%)
- All tests must be `async` with `@pytest.mark.asyncio`
- Run tests: `cd backend && uv run pytest --cov=src --cov-report=term-missing`

### Previous Story Intelligence

From Story 2.2 (Protocol Chunking & Vector Indexing):
- `index_protocol()` uses `QdrantVectorStore.from_texts()` which creates a new collection per protocol
- Metadata stored per chunk: `{"chunk_index": int, "protocol_name": str}`
- Collection naming: `protocol_{sanitized_filename}_{YYYYMMDDHHmmss}`
- OpenAI embeddings used: `text-embedding-3-small`
- External errors wrapped in `VectorStoreError`

From Story 2.4 (Protocol Upload UI):
- Backend response format is `{protocolId, protocolName}` only
- Error responses use `{code, detail}` structure
- `asyncio.to_thread()` used to run sync vector store functions from async routes

### Library/Framework Requirements

- **qdrant-client:** Already installed (transitive dependency). Use `QdrantClient` for collection listing and point scrolling
- **No new dependencies needed** — everything required is already in `pyproject.toml`
- `langchain-qdrant>=1.1.0`, `langchain-openai>=0.3.0`, `qdrant-client` (transitive)

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns] — endpoint spec
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns] — response format, error codes, naming conventions
- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.3] — acceptance criteria
- [Source: backend/src/services/vector_store.py] — existing vector store code
- [Source: backend/src/api/routes/protocols.py] — existing upload endpoint and error helpers

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

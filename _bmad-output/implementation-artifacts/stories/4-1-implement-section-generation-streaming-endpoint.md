# Story 4.1: Implement Section Generation Streaming Endpoint

Status: complete

## Story

As a **research coordinator**,
I want **the system to generate ICF sections with real-time streaming**,
so that **I can see content appearing as it's generated and track progress**.

## Acceptance Criteria

1. **Given** I have confirmed an outline with selected sections, **When** I call `POST /api/v1/sections/generate` with `protocolId` and `sections` array, **Then** the endpoint returns a stream of SSE events (FR16).
2. **Given** section generation begins, **When** the first chunk is ready, **Then** streaming begins within 10 seconds (NFR2).
3. **Given** a section is generating, **When** content is produced, **Then** the stream emits `section_start`, `section_chunk`, and `section_complete` events with appropriate data.
4. **Given** a section generation fails after 3 retries, **When** the error is confirmed, **Then** the stream emits a `section_error` event with `sectionId`, `status: "error"`, and `message` (NFR9).
5. **Given** the vector database is unreachable, **When** RAG retrieval fails, **Then** a `section_error` event is emitted with a specific error message (NFR10).
6. **Given** I open the debug page, **When** I trigger section generation, **Then** I can see streaming text appearing in real-time for verification.

## Tasks / Subtasks

- [x] Task 1: Install LangGraph dependency (AC: all)
  - [x] 1.1 Add `langgraph>=1.0.0` to `backend/pyproject.toml` dependencies
  - [x] 1.2 Run `uv sync` to install

- [x] Task 2: Create section generation pipeline with LangGraph (AC: #1, #2, #3, #4, #5)
  - [x] 2.1 Create `backend/src/services/section_generator.py`
  - [x] 2.2 Used `create_react_agent` from `langgraph.prebuilt` (LangGraph's standard agent API)
  - [x] 2.3 Created `@tool` wrapping `search_protocol()` for RAG retrieval
  - [x] 2.4 Streaming via `astream_events(version="v2")` for token-level output
  - [x] 2.5 Retry logic: up to 3 attempts before `SectionGenerationError`
  - [x] 2.6 Single section generation only (no parallel yet)

- [x] Task 3: Create SSE streaming endpoint (AC: #1, #2, #3, #4, #5)
  - [x] 3.1 Create `backend/src/api/routes/sections.py` with `POST /generate`
  - [x] 3.2 Use FastAPI `StreamingResponse` with `media_type="text/event-stream"`
  - [x] 3.3 Format SSE events: `section_start`, `section_chunk`, `section_complete`, `section_error`
  - [x] 3.4 Register route in `backend/src/main.py`

- [x] Task 4: Create throwaway debug page (AC: #6)
  - [x] 4.1 Create `frontend/src/app/debug/stream/page.tsx` — temporary page to visualize SSE streaming
  - [x] 4.2 Use `fetch` with ReadableStream reader to consume SSE (POST, not EventSource)
  - [x] 4.3 Display streaming text in real-time with event log
  - [x] 4.4 Text inputs for protocolId and section name

- [x] Task 5: Write unit tests (80%+ coverage)
  - [x] 5.1 Test section_generator.py: streaming, error handling, retry logic (8 tests)
  - [x] 5.2 Test sections.py route: SSE format, error responses, validation (10 tests)
  - [x] 5.3 Test debug page renders and connects to stream (9 tests)

## Dev Notes

### Technical Direction (from product owner)

**Incremental approach — this story focuses on getting ONE section working end-to-end:**

1. Single agent created using `create_agent` from `langchain.agents`
2. Simple `StateGraph`: START -> agent -> END
3. `TypedDict` for State with `text: str` field
4. Streaming text stored in state field, streamed to the debug window
5. Later stories will expand to two parallel sections, then N sections

**Do NOT try to build parallel multi-section generation yet.** Get one section streaming correctly first.

### LangGraph Setup

**Package:** `langgraph>=1.0.0` (latest is 1.0.9)

**State pattern** (from LangGraph PyPI docs):
```python
from typing_extensions import TypedDict
from langgraph.graph import START, StateGraph

class State(TypedDict):
    text: str
```

**Agent creation** (from LangChain agents docs):
```python
from langchain.agents import create_agent
from langchain.tools import tool

@tool
def search_protocol_chunks(query: str) -> str:
    """Retrieve relevant protocol chunks from Qdrant for section generation."""
    # Use existing search_protocol() from vector_store.py
    ...

agent = create_agent(
    model,  # ChatAnthropic instance from llm_factory.py
    tools=[search_protocol_chunks],
    system_prompt="You are an expert ICF section writer..."
)
```

**Graph construction:**
```python
graph = StateGraph(State)
graph.add_node("generate_section", agent_node)
graph.add_edge(START, "generate_section")
# agent node -> END is implicit when there's only one node with no other edges

compiled = graph.compile()
```

**Streaming** — the compiled graph supports `.stream()`:
```python
for chunk in compiled.stream({"text": ""}, stream_mode="values"):
    # chunk contains updated state
    yield chunk["text"]
```

### SSE Event Format

Follow the architecture spec exactly:

```
event: section_start
data: {"sectionId": "uuid", "name": "Purpose of the Study"}

event: section_chunk
data: {"sectionId": "uuid", "content": "This study investigates..."}

event: section_complete
data: {"sectionId": "uuid", "status": "ready"}

event: section_error
data: {"sectionId": "uuid", "status": "error", "message": "..."}
```

**FastAPI SSE pattern:**
```python
from fastapi.responses import StreamingResponse

async def event_generator():
    yield f"event: section_start\ndata: {json.dumps(...)}\n\n"
    # ... stream chunks ...
    yield f"event: section_complete\ndata: {json.dumps(...)}\n\n"

return StreamingResponse(event_generator(), media_type="text/event-stream")
```

### RAG Retrieval for Sections

Reuse the existing `search_protocol()` from `vector_store.py`. Each section needs its own search query tailored to the section name. The agent should use this as a tool to retrieve relevant protocol chunks before generating content.

### Section Generation Prompt

The agent's system prompt should instruct it to write a specific ICF section based on retrieved protocol content. The prompt should include:
- The section name being generated
- Instructions for ICF-appropriate language (clear, accessible to participants)
- The protocol chunks (retrieved via the RAG tool)

### Debug Page

The debug page at `/debug/stream` is **throwaway** — it will be deleted when the real dashboard (Story 4.2+) is built. Keep it simple:
- Hardcode or use a text input for protocolId
- Hardcode or use a dropdown for section name
- Display streaming text in a `<pre>` or simple div
- No need for polished styling

**Frontend SSE consumption:**
```typescript
const eventSource = new EventSource(url);  // or fetch with ReadableStream
eventSource.addEventListener("section_chunk", (e) => {
    const data = JSON.parse(e.data);
    // Append data.content to display
});
```

Note: `EventSource` only supports GET. Since our endpoint is POST, use `fetch` with a ReadableStream reader instead, parsing SSE format manually. Or consider a lightweight SSE client library. Alternatively, the endpoint could accept GET with query params for the debug page.

### Project Structure Notes

**New files to create:**
- `backend/src/services/section_generator.py` — LangGraph pipeline for section generation
- `backend/src/api/routes/sections.py` — SSE streaming endpoint
- `frontend/src/app/debug/stream/page.tsx` — Throwaway debug page
- `backend/tests/test_sections.py` — Backend tests
- `frontend/src/__tests__/debug-stream.test.tsx` — Frontend debug page test

**Files to modify:**
- `backend/pyproject.toml` — Add `langgraph>=1.0.0`
- `backend/src/main.py` — Register sections router

### Existing Code Patterns to Follow

**Backend route pattern** (from `outline.py`):
- `APIRouter()` with endpoint functions
- Pydantic `BaseModel` for request validation
- Error helper functions returning `JSONResponse` with structured codes
- `asyncio.to_thread()` for sync-to-async bridging (if needed)

**LLM factory** (from `llm_factory.py`):
- Use `get_chat_model()` to get the configured `ChatAnthropic` instance
- Do NOT create ChatAnthropic directly — use the factory

**Vector store** (from `vector_store.py`):
- Use `search_protocol(collection_name, query, k=20)` for RAG retrieval
- Returns `list[str]` of chunk text strings
- Raises `VectorStoreError` on failure

**Error codes** (from architecture):
- `VALIDATION_ERROR` (422) — Invalid input
- `LLM_ERROR` (502) — LLM failed after retries
- `VECTOR_DB_ERROR` (502) — Qdrant unreachable

**Test pattern** (from existing backend tests):
- pytest with pytest-asyncio
- httpx `AsyncClient` for endpoint testing
- Mock external services (LLM, Qdrant)

### Previous Story Intelligence

**Story 3.3** (Outline Confirmation Flow):
- Created `ProjectContext` with `useReducer` — stores confirmed outline with section names and IDs
- Dashboard page at `/projects/[id]/page.tsx` already exists as placeholder
- `SectionState` type already defined in `types/project.ts` with `id`, `name`, `content`, `status`
- Sections initialized with `status: "generating"` at confirmation time

**Key patterns established:**
- Wrap components in `<AuthProvider>` and `<ProjectProvider>` for tests
- Mock `next/navigation` with `jest.fn()`
- `"use client"` directive on all pages
- 100% test coverage maintained across stories

### What NOT to Do

- Do NOT build parallel multi-section generation yet — ONE section only
- Do NOT build the real section dashboard — use the throwaway debug page
- Do NOT install unnecessary packages (no axios, no eventsource-parser, etc.)
- Do NOT modify the existing `rag_pipeline.py` — create a new `section_generator.py`
- Do NOT create ChatAnthropic directly — use `get_chat_model()` from `llm_factory.py`
- Do NOT skip the RAG retrieval — sections must be based on protocol content
- Do NOT use `EventSource` for POST requests (it only supports GET)

### References

- [Source: epics.md#Story 4.1] — Full acceptance criteria
- [Source: architecture.md#API Patterns] — SSE event format, endpoint spec
- [Source: architecture.md#State Management] — SectionStatus state machine
- [Source: architecture.md#Service Boundaries] — rag_pipeline responsibilities
- [Source: pypi.org/project/langgraph] — LangGraph 1.0 StateGraph + TypedDict pattern
- [Source: docs.langchain.com/oss/python/langchain/agents] — create_agent API

### Library/Framework Notes

- **LangGraph 1.0.9** — `StateGraph`, `START`, `TypedDict` state, `.stream()` for streaming
- **langchain.agents `create_agent`** — Creates agent with model + tools + system_prompt; returns graph-compatible object
- **FastAPI `StreamingResponse`** — `media_type="text/event-stream"` for SSE
- **Next.js 16.1.6** — Debug page uses App Router
- **No new frontend dependencies needed** — use native `fetch` with `ReadableStream`

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
None — all tests passed.

### Completion Notes List
- Used `create_react_agent` from `langgraph.prebuilt` instead of `create_agent` from `langchain.agents` (which doesn't exist). This is the standard LangGraph agent API.
- Used `astream_events(version="v2")` for token-level streaming instead of `.stream(stream_mode="values")` which only yields state-level updates.
- Backend: 104 tests, 96% coverage. `section_generator.py` at 80%, `sections.py` at 100%.
- Frontend: 162 tests, 96.68% statement coverage. Debug stream page at 95%.
- The `@tool` for RAG retrieval is defined inside `generate_section_stream()` to capture `protocol_id` via closure.

### File List

**New files (6):**
1. `backend/src/services/section_generator.py` — LangGraph ReAct agent pipeline with RAG tool and streaming
2. `backend/src/api/routes/sections.py` — SSE streaming endpoint `POST /api/v1/sections/generate`
3. `frontend/src/app/debug/stream/page.tsx` — Throwaway debug page for testing SSE streaming
4. `backend/tests/test_section_generator.py` — 8 tests for section generator service
5. `backend/tests/test_sections.py` — 10 tests for sections route
6. `frontend/src/__tests__/debug-stream.test.tsx` — 9 tests for debug stream page

**Modified files (2):**
1. `backend/pyproject.toml` — Added `langgraph>=1.0.0` dependency
2. `backend/src/main.py` — Registered sections router

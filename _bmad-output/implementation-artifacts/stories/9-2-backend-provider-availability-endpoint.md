# Story 9.2: Provider Availability Endpoint and Generation Overrides

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **frontend developer**,
I want **an API endpoint that reports available providers and generation endpoints that accept provider/model overrides**,
So that **the frontend can offer the correct vendor/model choices and route requests accordingly**.

## Acceptance Criteria

1. **Given** the server has `ANTHROPIC_API_KEY` and `OPENAI_API_KEY` configured, **When** I call `GET /api/v1/settings/providers`, **Then** it returns `{ "providers": ["anthropic", "openai"] }`
2. **Given** the server has `ENABLE_LOCAL_LLM=true`, **When** I call `GET /api/v1/settings/providers`, **Then** the response includes `"local"` in the providers list
3. **Given** the server has no `OPENAI_API_KEY` configured, **When** I call `GET /api/v1/settings/providers`, **Then** `"openai"` is excluded from the providers list (NFR16)
4. **Given** the server has no `ANTHROPIC_API_KEY` configured, **When** I call `GET /api/v1/settings/providers`, **Then** `"anthropic"` is excluded from the providers list
5. **Given** I call `POST /api/v1/sections/generate` with `provider: "openai"` and `model: "gpt-5.1"` in the request body, **When** the generation runs, **Then** it uses the specified provider and model instead of server defaults
6. **Given** I call `POST /api/v1/sections/regenerate` with `provider: "openai"` and `model: "gpt-5.1"` in the request body, **When** the regeneration runs, **Then** it uses the specified provider and model instead of server defaults
7. **Given** I call a generation endpoint with no `provider` or `model` fields, **When** the generation runs, **Then** it uses the server default provider and model (Anthropic) — backward compatible
8. **Given** I call `POST /api/v1/outline/generate` with `provider` and `model` in the request body, **When** the outline generation runs, **Then** it uses the specified provider and model
9. **Given** `ENABLE_LOCAL_LLM=false` (default), **When** I call `GET /api/v1/settings/providers`, **Then** `"local"` is NOT in the providers list

## Tasks / Subtasks

- [ ] Task 1: Create `backend/src/api/routes/settings.py` with providers endpoint (AC: 1, 2, 3, 4, 9)
  - [ ] 1.1: Create `settings.py` with `APIRouter`
  - [ ] 1.2: Implement `GET /providers` — build providers list by checking `settings.anthropic_api_key`, `settings.openai_api_key`, and `settings.enable_local_llm`
  - [ ] 1.3: Check for key **presence** (not None and not empty string), not validity
  - [ ] 1.4: Return `{ "providers": [...] }` — always include "anthropic" first if available for consistent ordering
- [ ] Task 2: Register settings router in `backend/src/main.py` (AC: 1)
  - [ ] 2.1: Import `settings` route module (rename carefully to avoid collision with `src.config.settings`)
  - [ ] 2.2: Add `app.include_router(settings_routes.router, prefix="/api/v1/settings", tags=["settings"])`
- [ ] Task 3: Add `provider` and `model` fields to section request models in `backend/src/api/routes/sections.py` (AC: 5, 6, 7)
  - [ ] 3.1: Add `provider: str | None = None` and `model: str | None = None` to `GenerateSectionsRequest`
  - [ ] 3.2: Add `provider: str | None = None` and `model: str | None = None` to `RegenerateSectionRequest`
  - [ ] 3.3: Pass `provider=request.provider, model_name=request.model` to `stream_sections_parallel()` in generate endpoint
  - [ ] 3.4: Pass `provider=request.provider, model_name=request.model` to `stream_section_regenerate()` in regenerate endpoint
- [ ] Task 4: Add `provider` and `model` fields to outline request model in `backend/src/api/routes/outline.py` (AC: 8)
  - [ ] 4.1: Add `provider: str | None = None` and `model: str | None = None` to `GenerateOutlineRequest`
  - [ ] 4.2: Pass `provider=request.provider, model_name=request.model` to `generate_outline()` in the `asyncio.to_thread` call
- [ ] Task 5: Create `backend/tests/test_settings.py` (AC: 1, 2, 3, 4, 9)
  - [ ] 5.1: Test: both keys configured → returns `["anthropic", "openai"]`
  - [ ] 5.2: Test: only anthropic key → returns `["anthropic"]`
  - [ ] 5.3: Test: only openai key → returns `["openai"]`
  - [ ] 5.4: Test: no keys configured → returns `[]`
  - [ ] 5.5: Test: anthropic key + enable_local_llm → returns `["anthropic", "local"]`
  - [ ] 5.6: Test: all three (both keys + local) → returns `["anthropic", "openai", "local"]`
  - [ ] 5.7: Test: empty string keys treated as not configured
  - [ ] 5.8: Test: enable_local_llm=false (default) → local not in list
- [ ] Task 6: Update `backend/tests/test_sections.py` (AC: 5, 6, 7)
  - [ ] 6.1: Add test: generate with provider/model passes them to `stream_sections_parallel`
  - [ ] 6.2: Add test: regenerate with provider/model passes them to `stream_section_regenerate`
  - [ ] 6.3: Add test: generate without provider/model passes None (backward compatible)
  - [ ] 6.4: Add test: regenerate without provider/model passes None (backward compatible)
- [ ] Task 7: Update `backend/tests/test_outline.py` (AC: 8)
  - [ ] 7.1: Add test: outline generate with provider/model passes them to `generate_outline`
  - [ ] 7.2: Add test: outline generate without provider/model passes None (backward compatible)

## Dev Notes

### Story 9.1 Foundation (already implemented on this branch)

Story 9.1 added `provider`/`model_name` params to all service functions:
- `llm_factory.get_chat_model(provider=None, model=None)`
- `section_graph.stream_sections_parallel(protocol_id, sections, provider=None, model_name=None)`
- `section_graph.stream_section_regenerate(protocol_id, section_id, section_name, current_content, guidance=None, provider=None, model_name=None)`
- `rag_pipeline.generate_outline(protocol_id, provider=None, model_name=None)`
- `section_generator.generate_section_stream(protocol_id, section_name, provider=None, model_name=None)`

This story wires the route layer to those service params.

### Import Naming Collision

`backend/src/main.py` already imports `from src.config import settings`. The new route module is also called `settings.py`. Use an alias when importing:
```python
from src.api.routes import export, health, outline, protocols, sections, settings as settings_routes
```

### Provider Availability Logic

Check key **presence** not validity — we don't want to call the API to validate keys on every request:
```python
providers = []
if settings.anthropic_api_key:  # truthy check: not None and not ""
    providers.append("anthropic")
if settings.openai_api_key:
    providers.append("openai")
if settings.enable_local_llm:
    providers.append("local")
return {"providers": providers}
```

### Request Model Changes

The `provider` and `model` fields are optional with `None` defaults, so existing API calls without these fields remain fully backward compatible. No frontend changes needed yet.

**Current request models:**
```python
class GenerateSectionsRequest(BaseModel):
    protocolId: str
    sections: list[SectionRequest]

class RegenerateSectionRequest(BaseModel):
    protocolId: str
    sectionId: str
    sectionName: str
    currentContent: str
    guidance: str | None = None

class GenerateOutlineRequest(BaseModel):
    protocolId: str
```

**After this story, add to each:**
```python
    provider: str | None = None
    model: str | None = None
```

### Passing to Service Layer

Note the parameter name difference: route models use `model` (camelCase-friendly for JSON), but service functions use `model_name` (to avoid shadowing Python's `model` in Pydantic). Pass as:
```python
stream_sections_parallel(
    request.protocolId, sections_input,
    provider=request.provider, model_name=request.model
)
```

### Outline Endpoint Threading

`generate_outline` is called via `asyncio.to_thread`. Pass the new params as additional args:
```python
sections = await asyncio.to_thread(
    generate_outline, request.protocolId,
    provider=request.provider, model_name=request.model
)
```

### Test Pattern for Settings Endpoint

Use the existing httpx AsyncClient fixture from `conftest.py`. Mock `settings` at the route level:
```python
@pytest.mark.asyncio
@patch("src.api.routes.settings.settings")
async def test_providers_both_keys(mock_settings, client):
    mock_settings.anthropic_api_key = "sk-ant-test"
    mock_settings.openai_api_key = "sk-test"
    mock_settings.enable_local_llm = False

    response = await client.get("/api/v1/settings/providers")

    assert response.status_code == 200
    assert response.json() == {"providers": ["anthropic", "openai"]}
```

### Test Pattern for Section Route Overrides

Mock the streaming function and verify it receives the provider/model args:
```python
@pytest.mark.asyncio
@patch("src.api.routes.sections.stream_sections_parallel")
async def test_generate_with_provider_model(mock_stream, client):
    async def fake_stream(protocol_id, sections, provider=None, model_name=None):
        yield _sse_event("section_start", {"sectionId": "s1", "name": "Purpose"})
        yield _sse_event("section_complete", {"sectionId": "s1", "status": "ready"})

    mock_stream.side_effect = fake_stream

    response = await client.post("/api/v1/sections/generate", json={
        "protocolId": "proto-1",
        "sections": [{"id": "s1", "name": "Purpose"}],
        "provider": "openai",
        "model": "gpt-5.1",
    })

    assert response.status_code == 200
    mock_stream.assert_called_once()
    call_kwargs = mock_stream.call_args
    assert call_kwargs[1]["provider"] == "openai"
    assert call_kwargs[1]["model_name"] == "gpt-5.1"
```

### What NOT to Do

- **Do NOT validate provider/model values in the route layer** — the factory handles validation and returns appropriate errors
- **Do NOT add frontend code** — that is Stories 9.3 and 9.4
- **Do NOT add model discovery/listing** — that is a future enhancement
- **Do NOT change `llm_factory.py`** — already done in Story 9.1

### Project Structure Notes

- New file: `backend/src/api/routes/settings.py`
- New file: `backend/tests/test_settings.py`
- Files to modify: `backend/src/main.py`, `backend/src/api/routes/sections.py`, `backend/src/api/routes/outline.py`
- Test files to modify: `backend/tests/test_sections.py`, `backend/tests/test_outline.py`

### References

- [Source: _bmad-output/planning-artifacts/prd.md — FR44-FR47, NFR16]
- [Source: _bmad-output/planning-artifacts/architecture.md — GET /api/v1/settings/providers, generation endpoint overrides]
- [Source: _bmad-output/planning-artifacts/epics.md — Epic 9, Story 9.2]
- [Source: backend/src/api/routes/sections.py — current request models and route handlers]
- [Source: backend/src/api/routes/outline.py — current outline request model]
- [Source: backend/src/main.py — router registration pattern]
- [Source: backend/tests/test_sections.py — existing test patterns]
- [Source: _bmad-output/implementation-artifacts/stories/9-1-backend-multi-provider-llm-factory.md — Story 9.1 implementation]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

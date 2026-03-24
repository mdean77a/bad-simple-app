# Story 9.1: Expand LLM Factory for Multi-Provider Support

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **developer**,
I want **the backend to support multiple LLM providers (Anthropic, OpenAI, Local/LM Studio)**,
So that **the system can route generation requests to the user's chosen provider**.

## Acceptance Criteria

1. **Given** the server is configured with `LLM_PROVIDER=anthropic` and a valid `ANTHROPIC_API_KEY`, **When** `get_chat_model()` is called with no overrides, **Then** it returns a `ChatAnthropic` instance with the configured model (existing behavior preserved)
2. **Given** `get_chat_model()` is called with `provider="openai"` and `model="gpt-5.1"`, **When** a valid `OPENAI_API_KEY` is configured, **Then** it returns a `ChatOpenAI` instance with model `gpt-5.1`
3. **Given** `get_chat_model()` is called with `provider="openai"`, **When** no `OPENAI_API_KEY` is configured (None or empty string), **Then** it raises `LLMConfigError` with message "OPENAI_API_KEY is not configured"
4. **Given** `get_chat_model()` is called with `provider="local"`, **When** `enable_local_llm=True` and `local_llm_base_url` is configured, **Then** it returns a `ChatOpenAI` instance with `base_url` set to the configured URL and model parameter set to `"local"`
5. **Given** `get_chat_model()` is called with `provider="local"`, **When** `enable_local_llm=False` or not set, **Then** it raises `LLMConfigError` with message "Local LLM is not enabled"
6. **Given** `get_chat_model()` is called with an unsupported provider string, **When** the factory processes it, **Then** it raises `LLMConfigError` with message "Unsupported LLM provider: {provider}" (existing behavior preserved)
7. **Given** the config.py Settings class, **When** loaded from environment, **Then** it includes `enable_local_llm: bool = False` and `local_llm_base_url: str = "http://localhost:1234/v1"`
8. **Given** `get_chat_model()` is called with `provider` and `model` overrides, **When** overrides are provided, **Then** the overrides take precedence over `settings.llm_provider` and `settings.llm_model`
9. **Given** `get_chat_model()` is called with `provider` override but no `model` override, **When** the provider is "openai", **Then** a sensible default model is used (e.g., "gpt-5.1")

## Tasks / Subtasks

- [ ] Task 1: Add new config fields to `backend/src/config.py` (AC: 7)
  - [ ] 1.1: Add `enable_local_llm: bool = False` field to Settings class
  - [ ] 1.2: Add `local_llm_base_url: str = "http://localhost:1234/v1"` field to Settings class
  - [ ] 1.3: Update comment on `openai_api_key` to reflect dual-purpose (embeddings + LLM provider)
- [ ] Task 2: Expand `get_chat_model()` in `backend/src/services/llm_factory.py` (AC: 1, 2, 3, 4, 5, 6, 8, 9)
  - [ ] 2.1: Add `from langchain_openai import ChatOpenAI` import
  - [ ] 2.2: Change function signature to `get_chat_model(provider: str | None = None, model: str | None = None) -> ChatAnthropic | ChatOpenAI`
  - [ ] 2.3: Resolve effective provider: `provider or settings.llm_provider`
  - [ ] 2.4: Resolve effective model: `model or settings.llm_model` (with provider-specific defaults — see Dev Notes)
  - [ ] 2.5: Add `"openai"` branch: validate `settings.openai_api_key`, return `ChatOpenAI(model=effective_model, api_key=settings.openai_api_key)`
  - [ ] 2.6: Add `"local"` branch: validate `settings.enable_local_llm`, return `ChatOpenAI(model="local", base_url=settings.local_llm_base_url)` — no API key needed for LM Studio
  - [ ] 2.7: Keep existing `"anthropic"` branch unchanged
  - [ ] 2.8: Keep existing unsupported provider error unchanged
  - [ ] 2.9: Update return type annotation to `ChatAnthropic | ChatOpenAI` (both are `BaseChatModel` subclasses)
- [ ] Task 3: Update callers to accept optional provider/model parameters (AC: 8)
  - [ ] 3.1: Update `section_graph.py` `stream_section_regenerate()` — add `provider`/`model` params, pass to `get_chat_model(provider, model)`
  - [ ] 3.2: Update `section_graph.py` `stream_sections_parallel()` — add `provider`/`model` params, pass to `get_chat_model(provider, model)`
  - [ ] 3.3: Update `section_graph.py` `_make_section_node()` — remove local `get_chat_model()` call, receive model instance as parameter
  - [ ] 3.4: Update `section_generator.py` `generate_section()` — add `provider`/`model` params, pass to `get_chat_model(provider, model)`
  - [ ] 3.5: Update `rag_pipeline.py` `generate_outline()` — add `provider`/`model` params, pass to `get_chat_model(provider, model)`
  - [ ] 3.6: **Do NOT update route handlers yet** — that is Story 9.2's scope
- [ ] Task 4: Update `backend/tests/test_config.py` (AC: 7)
  - [ ] 4.1: Test `enable_local_llm` defaults to `False`
  - [ ] 4.2: Test `local_llm_base_url` defaults to `"http://localhost:1234/v1"`
  - [ ] 4.3: Test both fields can be set via environment variables
- [ ] Task 5: Expand `backend/tests/test_llm_factory.py` (AC: 1-6, 8, 9)
  - [ ] 5.1: Keep existing 4 tests (anthropic happy path, missing key, empty key, unsupported provider)
  - [ ] 5.2: Add test: OpenAI happy path — `get_chat_model(provider="openai", model="gpt-5.1")` returns `ChatOpenAI` with correct params
  - [ ] 5.3: Add test: OpenAI missing key — raises `LLMConfigError`
  - [ ] 5.4: Add test: OpenAI empty key — raises `LLMConfigError`
  - [ ] 5.5: Add test: Local happy path — `get_chat_model(provider="local")` returns `ChatOpenAI` with `base_url` and `model="local"`
  - [ ] 5.6: Add test: Local not enabled — raises `LLMConfigError`
  - [ ] 5.7: Add test: Provider override takes precedence over settings
  - [ ] 5.8: Add test: Model override takes precedence over settings
  - [ ] 5.9: Add test: No overrides uses settings defaults (existing behavior)
  - [ ] 5.10: Add test: Provider override with no model override uses provider-specific default
- [ ] Task 6: Update service-level tests that mock `get_chat_model` (AC: 1, 8)
  - [ ] 6.1: Update `test_section_graph.py` — ensure mocks accommodate new `provider`/`model` params in `stream_sections_parallel` and `stream_section_regenerate`
  - [ ] 6.2: Update `test_section_generator.py` — ensure mocks accommodate new params
  - [ ] 6.3: Update `test_rag_pipeline.py` — ensure mocks accommodate new params in `generate_outline`
  - [ ] 6.4: Existing tests should pass with no provider/model args (defaults to settings)

## Dev Notes

### Current State of `llm_factory.py`

The factory currently has a single code path:
```python
from langchain_anthropic import ChatAnthropic
from src.config import settings

class LLMConfigError(Exception): ...

def get_chat_model() -> ChatAnthropic:
    provider = settings.llm_provider
    if provider == "anthropic":
        if not settings.anthropic_api_key:
            raise LLMConfigError("ANTHROPIC_API_KEY is not configured")
        return ChatAnthropic(model=settings.llm_model, api_key=settings.anthropic_api_key)
    raise LLMConfigError(f"Unsupported LLM provider: {provider}")
```

### Provider-Specific Default Models

When a `provider` override is given but no `model` override, use these defaults:
- `"anthropic"` → `settings.llm_model` (falls back to `"claude-sonnet-4-6"`)
- `"openai"` → `"gpt-5.1"`
- `"local"` → `"local"` (ignored by LM Studio — it serves whatever model is loaded)

### LM Studio / Local Provider Details

- LM Studio exposes an OpenAI-compatible API at `http://localhost:1234/v1` by default
- Use `ChatOpenAI(model="local", base_url=settings.local_llm_base_url)` — no API key needed
- **Do NOT pass `api_key`** for local provider — LM Studio doesn't require one
- The model name is irrelevant for LM Studio; it serves whatever model the user has loaded
- Local option is **dev-only** — gated by `enable_local_llm` env var

### Callers of `get_chat_model()` — 4 Call Sites

All four call sites need `provider`/`model` params threaded through:

| File | Function | Line | Notes |
|------|----------|------|-------|
| `section_graph.py` | `stream_section_regenerate()` | 116 | Called from `sections.py` route |
| `section_graph.py` | `stream_sections_parallel()` | 297 | Called from `sections.py` route (inside `build_section_graph`) |
| `section_generator.py` | `generate_section()` | 62 | Called from `section_graph._make_section_node` |
| `rag_pipeline.py` | `generate_outline()` | 133 | Called from `outline.py` route |

**Important:** In `stream_sections_parallel`, `get_chat_model()` is called once and the model is passed to `build_section_graph()` which passes it to `_make_section_node()`. The model instance is reused across all parallel section nodes. This pattern should be preserved — just add `provider`/`model` to the top-level call.

### What NOT to Do

- **Do NOT modify route handlers** (`sections.py`, `outline.py`) — that is Story 9.2
- **Do NOT create `settings.py` route** — that is Story 9.2
- **Do NOT add frontend code** — that is Stories 9.3 and 9.4
- **Do NOT add new dependencies** — `langchain-openai` is already in `pyproject.toml`
- **Do NOT change the `rag_pipeline.py` embedding logic** — embeddings always use OpenAI regardless of LLM provider

### Testing Pattern

Follow existing test pattern in `test_llm_factory.py`:
```python
@patch("src.services.llm_factory.ChatOpenAI")  # Add this import mock
@patch("src.services.llm_factory.settings")
def test_get_chat_model_openai(mock_settings, mock_chat_cls):
    mock_settings.openai_api_key = "sk-test-key"
    model = get_chat_model(provider="openai", model="gpt-5.1")
    mock_chat_cls.assert_called_once_with(model="gpt-5.1", api_key="sk-test-key")
    assert model == mock_chat_cls.return_value
```

For service-level tests that mock `get_chat_model`, the key change is that the mock must now accept optional `provider` and `model` kwargs. Since `@patch` creates a `MagicMock`, this should work automatically — but verify that tests don't assert `get_chat_model()` was called with zero args if the signature changes.

### Project Structure Notes

- All changes are in `backend/` — no frontend changes in this story
- Files to modify: `backend/src/config.py`, `backend/src/services/llm_factory.py`, `backend/src/services/section_graph.py`, `backend/src/services/section_generator.py`, `backend/src/services/rag_pipeline.py`
- Test files to modify: `backend/tests/test_llm_factory.py`, `backend/tests/test_config.py`, `backend/tests/test_section_graph.py`, `backend/tests/test_section_generator.py`, `backend/tests/test_rag_pipeline.py`
- No new files created in this story

### References

- [Source: _bmad-output/planning-artifacts/prd.md — FR44-FR47, LLM Provider Management section]
- [Source: _bmad-output/planning-artifacts/architecture.md — Configuration: Configurable LLM Provider, llm_factory description]
- [Source: _bmad-output/planning-artifacts/epics.md — Epic 9, Story 9.1]
- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-03-24.md — Section 4: Backend Changes]
- [Source: backend/src/services/llm_factory.py — current implementation]
- [Source: backend/src/config.py — current Settings class]
- [Source: backend/tests/test_llm_factory.py — current test patterns]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

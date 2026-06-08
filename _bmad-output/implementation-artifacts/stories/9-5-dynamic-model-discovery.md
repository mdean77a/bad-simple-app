# Story 9.5: Dynamic Model Discovery from Anthropic and OpenAI

Status: done

## Story

As a **research coordinator**,
I want **the vendor/model picker to list the actual models currently offered by Anthropic and OpenAI**,
So that **I am not limited to a hand-edited list that can fall out of date as new models ship**.

## Acceptance Criteria

1. **Given** the backend has an `ANTHROPIC_API_KEY` configured, **When** the frontend loads the new project page, **Then** the Anthropic model dropdown is populated from Anthropic's live `/v1/models` API (not a hardcoded list).
2. **Given** the backend has an `OPENAI_API_KEY` configured, **When** the frontend loads the new project page, **Then** the OpenAI model dropdown is populated from OpenAI's live `/v1/models` API, filtered to chat-completion models (exclude embeddings, image, audio, moderation).
3. **Given** `ENABLE_LOCAL_LLM=true` in the dev environment, **When** the providers endpoint is called, **Then** `"local"` appears in the providers list (unchanged from Story 9.2) and no model dropdown is shown for Local (unchanged from Story 9.3).
4. **Given** the providers/models endpoint is called multiple times within a short window, **When** each call is served, **Then** model lists are returned from an in-process cache (TTL ~10 minutes) so we don't hammer the upstream APIs on every page load.
5. **Given** a provider's upstream model API call fails (network error, auth error, rate limit), **When** the providers/models endpoint responds, **Then** that provider still appears in `providers` but with an empty `models[provider]` list — the frontend should show that provider in the vendor dropdown with no model options (or skip rendering the model select), not crash.
6. **Given** the frontend receives a model list for a given provider, **When** the user selects that provider, **Then** the first model in the returned list is selected by default (FR46 default-selection behavior preserved).
7. **Given** the live model list for Anthropic differs from the previous hardcoded value (`claude-sonnet-4-6`), **When** outline/section generation runs, **Then** the chosen model is sent through to the backend `get_chat_model()` factory exactly as selected (no client-side rewriting).
8. **Given** a previously-saved project file has a `llmProvider`/`llmModel` value that is no longer present in the live list, **When** the project is loaded, **Then** the UI still functions — the saved model is shown in the dropdown as a stale option (so the user can see what was used) and can be replaced by selecting a fresh one.

## Tasks / Subtasks

- [x] Task 1: Backend — model discovery service (AC: 1, 2, 4, 5)
  - [x] 1.1: New file `backend/src/services/model_discovery.py` with `get_provider_models() -> dict[str, list[str]]`
  - [x] 1.2: Call Anthropic `GET https://api.anthropic.com/v1/models` with header `x-api-key: <key>` and `anthropic-version: 2023-06-01`; map response `data[].id` → list of strings
  - [x] 1.3: Call OpenAI `GET https://api.openai.com/v1/models` with header `Authorization: Bearer <key>`; filter `data[].id` to chat models: keep IDs starting with `gpt-`, `o1`, `o3`, `o4`, `chatgpt-`; exclude any ID containing `embedding`, `audio`, `whisper`, `tts`, `dall-e`, `moderation`, `realtime`, `transcribe`, `image`
  - [x] 1.4: In-process TTL cache (~600s) so repeat calls don't hit upstream
  - [x] 1.5: Per-provider try/except: a failure on one provider returns `[]` for that provider, never raises
- [x] Task 2: Backend — extend `/api/v1/settings/providers` response (AC: 1, 2, 3, 5)
  - [x] 2.1: Update `backend/src/api/routes/settings.py` to call `get_provider_models()` and include `models` field
  - [x] 2.2: New response shape: `{"providers": [...], "models": {"anthropic": [...], "openai": [...]}}` — `local` is not in `models` (no list needed)
  - [x] 2.3: Only include a provider in `models` if it is in `providers` (i.e., key is configured)
- [x] Task 3: Backend tests (AC: 1, 2, 4, 5)
  - [x] 3.1: Update `backend/tests/test_settings.py` — existing tests pass with new field present; new tests assert `models` content with httpx upstream mocked
  - [x] 3.2: New file `backend/tests/test_model_discovery.py` — happy path, OpenAI filter (exclude embeddings etc.), upstream 401/500/timeout returns `[]`, cache hit reuses previous result
- [x] Task 4: Frontend — fetch and pass models (AC: 1, 2, 6, 8)
  - [x] 4.1: Update `fetchProviders()` return type to `{providers: string[], models: Record<string, string[]>}`; fallback shape: `{providers: ["anthropic"], models: {}}`
  - [x] 4.2: New project page (`projects/new/page.tsx`): store `models` in state alongside `providers`; pass `models` prop into `<LlmSettings>`
- [x] Task 5: Frontend — `LlmSettings` consumes discovered models (AC: 6, 8)
  - [x] 5.1: Remove the hardcoded `PROVIDER_MODELS` constant; accept `models: Record<string, string[]>` prop instead
  - [x] 5.2: When the current `model` prop is not in `models[provider]`, render it as the first option anyway so the value stays valid (handles stale project files — AC 8)
  - [x] 5.3: When the provider changes, default to the first model in the new provider's list; if list is empty, set model to `""`
- [x] Task 6: Frontend tests (AC: 1, 2, 5, 6, 8)
  - [x] 6.1: Update `__tests__/LlmSettings.test.tsx` — drop `PROVIDER_MODELS` import, pass `models` prop in test props
  - [x] 6.2: Add test: when `model` prop is not in `models[provider]`, it still appears in the dropdown (stale-value preservation)
  - [x] 6.3: Update `__tests__/api.test.ts` (or equivalent) — `fetchProviders()` returns new shape; fallback returns empty models map

## Dev Notes

### Why server-side discovery (not direct from browser)

API keys must not be sent to the browser. The backend already holds the keys for chat calls; it can reuse them to call the providers' `/v1/models` endpoints. The browser only sees a curated list.

### Anthropic `/v1/models` response shape (as of 2026-06)

```json
{
  "data": [
    {"type": "model", "id": "claude-sonnet-4-6", "display_name": "Claude Sonnet 4.6", "created_at": "..."}
  ],
  "has_more": false,
  "first_id": "...",
  "last_id": "..."
}
```

We use `id` strings directly — that's what `get_chat_model()` passes to `ChatAnthropic(model=...)`.

### OpenAI `/v1/models` response shape

```json
{
  "object": "list",
  "data": [
    {"id": "gpt-5.1", "object": "model", "created": 0, "owned_by": "openai"},
    {"id": "text-embedding-3-small", ...},
    {"id": "dall-e-3", ...}
  ]
}
```

OpenAI returns ~100s of model IDs including embeddings, image, audio, fine-tuned variants. We filter aggressively (allowlist by prefix, denylist by substring) to keep the dropdown sane. The denylist is the source of truth — if a future GPT model accidentally contains a denylisted token we'll need to revisit.

### Cache

Simple module-level dict with `(value, expires_at_monotonic)`. No threading concerns — FastAPI default worker model serializes per worker. TTL ~10 min: long enough to coalesce a session's page loads, short enough that newly-launched models appear without a restart.

### Failure mode for stale saved project files (AC 8)

A user could open a project saved months ago whose `llmModel` is no longer in the live list. We don't want a silent fallback (would hide that the model is gone); we don't want a crash either. Keep the saved value as a visible dropdown entry; the user can pick a fresh one to overwrite.

### What NOT to do

- Do NOT cache to disk — process-lifetime cache is fine and survives the typical session.
- Do NOT add user-visible "model is stale" warnings yet — out of scope. AC 8 just requires the UI keeps working.
- Do NOT change `get_chat_model()` or any other generation path — model selection still flows through the existing pipeline.

### References

- `backend/src/api/routes/settings.py` — endpoint to extend
- `backend/src/services/llm_factory.py` — model name is passed through unchanged
- `frontend/src/components/dashboard/LlmSettings.tsx` — remove hardcoded list
- `frontend/src/lib/api.ts` — `fetchProviders()` return shape
- `frontend/src/app/projects/new/page.tsx` — wires providers + models into `<LlmSettings>`

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (1M context)

### File List

**Added:**
- `backend/src/services/model_discovery.py`
- `backend/tests/test_model_discovery.py`

**Modified:**
- `backend/src/api/routes/settings.py` — response now includes `models`
- `backend/tests/test_settings.py` — assertions for new response shape
- `frontend/src/lib/api.ts` — `fetchProviders()` returns `{providers, models}`
- `frontend/src/components/dashboard/LlmSettings.tsx` — removed hardcoded `PROVIDER_MODELS`, accepts `models` prop, preserves stale model values
- `frontend/src/app/projects/new/page.tsx` — stores and passes `models` to `LlmSettings`
- `frontend/src/__tests__/LlmSettings.test.tsx` — drops `PROVIDER_MODELS` import, adds stale-model and empty-list cases
- `_bmad-output/planning-artifacts/sprint-status.yaml` — renumbered prior 9.5 → 9.6

### Completion Notes

- Backend: 277 tests pass, 99% coverage. `model_discovery.py` at 97% (the two missed lines are the `clear_cache` helper exercised only in fixtures).
- Frontend: 419 tests pass.
- No changes to `get_chat_model()` or any generation path — model strings flow through unchanged.

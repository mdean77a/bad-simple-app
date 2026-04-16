# Sprint Change Proposal — Multi-Vendor LLM Support

**Date:** 2026-03-24
**Author:** Bob (Scrum Master) with Mikey
**Change Scope:** Moderate
**Status:** Pending Approval

---

## Section 1: Issue Summary

The application currently hardcodes Anthropic (Claude Sonnet) as the sole LLM provider. The `llm_factory.py` only creates `ChatAnthropic` instances, and no frontend UI exists for vendor or model selection.

**Change requested:** Enable users to select between LLM vendors:
- **Deployed app (Vercel/Render):** Anthropic and OpenAI
- **Local development only:** Additional "Local" option (LM Studio, using ChatOpenAI interface with custom base URL)

**Context:** All 8 original epics are complete. This is a post-MVP enhancement. The architecture already anticipated multi-provider support — `langchain-openai` is an existing dependency, `llm_provider` config field exists, and the PRD's Technology Evolution Strategy states: *"Model selection is a configuration decision, not an architectural constraint."*

**Key design decisions from product owner:**
- Default vendor: Anthropic
- Vendor/model selection is per-session in the UI
- Vendor/model choice is saved in the project file
- "Local" option uses LM Studio (ChatOpenAI interface), no Ollama support
- "Local" visibility controlled by env var — only present in dev environment
- No model-list discovery for Local — user gets whatever LM Studio is serving
- Local LLM must be pre-started manually; app only connects

---

## Section 2: Impact Analysis

### Epic Impact
- **No existing epics affected** — all 8 are complete and merged
- **New Epic 9 required** — Multi-Vendor LLM Support
- No epic resequencing or priority changes needed

### Artifact Conflicts

**PRD:**
- No conflicts with core goals — PRD explicitly supports model flexibility
- New functional requirements needed (FR44-FR47) for vendor selection, model selection, session persistence, and project file storage

**Architecture:**
- `llm_factory.py`: Expand from Anthropic-only to two code paths (ChatAnthropic, ChatOpenAI). "Local" reuses ChatOpenAI with base_url override
- `config.py`: Add `local_llm_base_url`, `enable_local_llm`, and OpenAI model config
- New API endpoint: Report available providers to frontend (filtered by configured keys and env flags)
- Existing generation endpoints: Accept provider/model override from frontend
- Project file schema: Add `llmProvider` and `llmModel` fields
- **No new dependencies** — `langchain-openai` already installed; LM Studio uses ChatOpenAI interface

**UI/UX:**
- New settings control on dashboard — vendor dropdown (Anthropic/OpenAI, plus Local in dev) and model selector
- Model dropdown disabled/hidden when "Local" is selected
- Visual indicator of current vendor/model selection
- Settings accessible but not intrusive (most users keep the default)

**Testing:**
- New tests: multi-provider factory, provider availability endpoint, frontend settings UI, project file save/load with vendor/model fields
- Existing tests unaffected — Anthropic path remains default

**Deployment:**
- Render: Add `OPENAI_API_KEY` for LLM use (already exists for embeddings), no other env changes for production
- Local `.env`: Add `ENABLE_LOCAL_LLM=true` and `LOCAL_LLM_BASE_URL=http://localhost:1234/v1` (LM Studio default)

---

## Section 3: Recommended Approach

**Selected:** Direct Adjustment — add new Epic 9 within existing project structure.

**Rationale:**
- Purely additive — no existing code needs rollback or restructuring
- Architecture already anticipated this (config fields, langchain-openai dep)
- LM Studio using ChatOpenAI means zero new dependencies
- Low technical risk — existing Anthropic path remains default and untouched
- Moderate effort spread across well-understood files

**Effort estimate:** Medium
**Risk assessment:** Low
**Timeline impact:** None on existing work; new epic estimated at 4-6 stories

---

## Section 4: Detailed Change Proposals

### Backend Changes

**`backend/src/config.py`:**
```
OLD:
  llm_provider: str = "anthropic"
  llm_model: str = "claude-sonnet-4-6"
  anthropic_api_key: str | None = None
  openai_api_key: str | None = None  # Used for embeddings

NEW:
  llm_provider: str = "anthropic"
  llm_model: str = "claude-sonnet-4-6"
  anthropic_api_key: str | None = None
  openai_api_key: str | None = None  # Used for embeddings AND OpenAI LLM provider
  enable_local_llm: bool = False
  local_llm_base_url: str = "http://localhost:1234/v1"

Rationale: Add config for local LLM. OpenAI key now dual-purpose.
```

**`backend/src/services/llm_factory.py`:**
```
OLD:
  Only handles provider == "anthropic", raises error otherwise

NEW:
  Three providers:
  - "anthropic" → ChatAnthropic(model=..., api_key=...)
  - "openai" → ChatOpenAI(model=..., api_key=...)
  - "local" → ChatOpenAI(model="local", base_url=settings.local_llm_base_url)
  Factory accepts provider/model overrides (for per-request selection)

Rationale: Enable multi-vendor support with minimal code paths
```

**New API endpoint:**
```
GET /api/v1/settings/providers
Returns: { providers: ["anthropic", "openai"] }  (production)
Returns: { providers: ["anthropic", "openai", "local"] }  (when ENABLE_LOCAL_LLM=true)

Rationale: Frontend needs to know which providers are available
```

**Existing generation endpoints:**
```
OLD: Use server default provider/model
NEW: Accept optional provider/model in request body, fall back to server default

Rationale: Enable per-request vendor/model selection from frontend
```

### Frontend Changes

**Project file schema:**
```
OLD: No vendor/model fields
NEW: Add "llmProvider": "anthropic", "llmModel": "claude-sonnet-4-6"

Rationale: Persist vendor/model choice per project
```

**Dashboard UI:**
```
NEW: Settings control (dropdown) for vendor and model selection
- Vendor dropdown populated from GET /api/v1/settings/providers
- Model dropdown populated per vendor (hardcoded lists for Anthropic/OpenAI, hidden for Local)
- Selection stored in session state (React context or localStorage)
- Selection included in generation/regeneration API calls

Rationale: User-facing vendor/model selection per session
```

---

## Section 5: Implementation Handoff

**Change scope: Moderate** — requires backlog creation and coordinated implementation across backend and frontend.

### Handoff Plan

| Role | Agent | Responsibility |
|------|-------|---------------|
| Product Manager | 📋 John | Update PRD with FR44-FR47 |
| Architect | 🏗️ Winston | Update architecture doc with revised patterns |
| Product Manager | 📋 John | Create Epic 9 with stories in epics document |
| Scrum Master | 🏃 Bob | Sprint planning for Epic 9 |
| Developer | 💻 Amelia | Story-by-story implementation |

### Suggested Epic 9 Story Breakdown (preliminary)

1. **9.1** — Backend: Expand llm_factory + config for multi-provider support
2. **9.2** — Backend: Provider availability endpoint + generation endpoint overrides
3. **9.3** — Frontend: Settings UI for vendor/model selection
4. **9.4** — Frontend: Persist vendor/model in project file + load on open
5. **9.5** — Integration: End-to-end testing across all providers

### Success Criteria
- Users can select Anthropic or OpenAI from the dashboard
- Vendor/model choice persists in project files
- Local (LM Studio) option available in dev environment only
- All existing functionality unaffected (Anthropic remains default)
- Test coverage maintained at ~100% (project standard: ~96-99%)

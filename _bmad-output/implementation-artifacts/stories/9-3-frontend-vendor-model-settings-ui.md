# Story 9.3: Frontend Settings UI for Vendor/Model Selection

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **research coordinator**,
I want **to choose which AI vendor and model to use before starting ICF generation**,
So that **I can use my preferred provider for outline and section generation**.

## Acceptance Criteria

1. **Given** I am on the new project page (`/projects/new`), **When** the page loads, **Then** it fetches available providers from `GET /api/v1/settings/providers` and displays a vendor dropdown with the available options
2. **Given** I select "OpenAI" from the vendor dropdown, **When** the vendor changes, **Then** the model dropdown updates to show OpenAI models (e.g., gpt-5.1, gpt-5.1-mini-2025-04-14) and the first model is selected by default
3. **Given** I select "Local" from the vendor dropdown, **When** the vendor changes, **Then** the model dropdown is hidden (FR45) and a note indicates "Uses whatever model LM Studio is serving"
4. **Given** I select "Anthropic" from the vendor dropdown, **When** the vendor changes, **Then** the model dropdown shows Anthropic models (e.g., claude-sonnet-4-6)
5. **Given** the vendor/model selection is displayed, **When** no interaction has occurred, **Then** Anthropic is selected as the default vendor (FR46)
6. **Given** I select a vendor and model then click Continue, **When** outline generation runs, **Then** the selected vendor and model are included in the API request body (FR46)
7. **Given** I am on the dashboard page and I regenerate a section, **When** the regeneration runs, **Then** the current vendor and model are included in the API request body (FR46)
8. **Given** the settings/providers endpoint returns only `["anthropic"]`, **When** the UI renders, **Then** only Anthropic is shown in the vendor dropdown
9. **Given** the settings/providers endpoint fails, **When** the UI renders, **Then** Anthropic is used as the sole default (graceful degradation)

## Tasks / Subtasks

- [ ] Task 1: Add `fetchProviders()` to `frontend/src/lib/api.ts` (AC: 1)
  - [ ] 1.1: Add `fetchProviders(): Promise<{ providers: string[] }>` function
  - [ ] 1.2: `GET ${API_BASE_URL}/api/v1/settings/providers`
  - [ ] 1.3: On error, return `{ providers: ["anthropic"] }` as fallback (AC: 9)
- [ ] Task 2: Add `provider`/`model` params to SSE functions in `frontend/src/lib/sse.ts` (AC: 7)
  - [ ] 2.1: Add optional `provider?: string` and `model?: string` to `streamSections()` — include in `JSON.stringify` body
  - [ ] 2.2: Add optional `provider?: string` and `model?: string` to `streamSectionRegenerate()` — include in `JSON.stringify` body
- [ ] Task 3: Add `provider`/`model` params to `generateOutline()` in `frontend/src/lib/api.ts` (AC: 6)
  - [ ] 3.1: Add optional `provider?: string` and `model?: string` parameters
  - [ ] 3.2: Include in `JSON.stringify` body when present
- [ ] Task 4: Add provider/model state to `ProjectProvider` context in `frontend/src/lib/project.tsx` (AC: 5, 6, 7)
  - [ ] 4.1: Add `llmProvider: string` and `llmModel: string` to project state (default: `"anthropic"`, `"claude-sonnet-4-6"`)
  - [ ] 4.2: Add `SET_LLM` action to reducer: `{ type: "SET_LLM"; payload: { provider: string; model: string } }`
  - [ ] 4.3: Expose `setLlm(provider, model)` function from context
  - [ ] 4.4: Ensure provider/model are available to all pages that need them (new project, outline, dashboard)
- [ ] Task 5: Create `LlmSettings` component at `frontend/src/components/dashboard/LlmSettings.tsx` (AC: 1, 2, 3, 4, 5, 8)
  - [ ] 5.1: Accept props: `provider`, `model`, `onProviderChange`, `onModelChange`, `providers` (list of available providers)
  - [ ] 5.2: Render vendor `<select>` populated from `providers` prop, with display labels ("Anthropic", "OpenAI", "Local")
  - [ ] 5.3: Render model `<select>` populated from hardcoded per-vendor model lists
  - [ ] 5.4: Hide model select when provider is "local"; show note "Uses whatever model LM Studio is serving"
  - [ ] 5.5: When vendor changes, auto-select the first model in the new vendor's list
  - [ ] 5.6: Style as a compact inline control
- [ ] Task 6: Define per-vendor model lists as constants (AC: 2, 4)
  - [ ] 6.1: Create in `LlmSettings.tsx`:
    - `ANTHROPIC_MODELS = ["claude-sonnet-4-6"]`
    - `OPENAI_MODELS = ["gpt-5.1", "gpt-5.1-mini-2025-04-14"]`
    - Local: no model list
- [ ] Task 7: Wire `LlmSettings` into new project page at `frontend/src/app/projects/new/page.tsx` (AC: 1, 5, 6)
  - [ ] 7.1: Fetch providers on mount via `fetchProviders()` and store in state
  - [ ] 7.2: Place `<LlmSettings>` between protocol selection and the Continue button
  - [ ] 7.3: On provider/model change, call `setLlm()` from ProjectProvider context
  - [ ] 7.4: Provider/model flows to outline page via context (no extra wiring needed)
- [ ] Task 8: Wire provider/model into outline generation (AC: 6)
  - [ ] 8.1: In `frontend/src/app/projects/[id]/outline/page.tsx`, read `llmProvider`/`llmModel` from ProjectProvider context
  - [ ] 8.2: Pass to `generateOutline(protocolId, provider, model)` call
- [ ] Task 9: Wire provider/model into `useSectionStreaming` hook (AC: 7)
  - [ ] 9.1: Accept `provider` and `model` as parameters: `useSectionStreaming(provider, model)`
  - [ ] 9.2: Pass them to `streamSections()` call
- [ ] Task 10: Wire provider/model into section regeneration on dashboard page (AC: 7)
  - [ ] 10.1: In `frontend/src/app/projects/[id]/page.tsx`, read `llmProvider`/`llmModel` from ProjectProvider context
  - [ ] 10.2: Pass to `useSectionStreaming(llmProvider, llmModel)`
  - [ ] 10.3: Pass to `streamSectionRegenerate()` calls
- [ ] Task 11: Write tests (AC: 1-9)
  - [ ] 11.1: Test `fetchProviders()` returns providers from API
  - [ ] 11.2: Test `fetchProviders()` returns fallback on error
  - [ ] 11.3: Test `LlmSettings` renders vendor dropdown with correct options
  - [ ] 11.4: Test `LlmSettings` shows model dropdown for Anthropic/OpenAI
  - [ ] 11.5: Test `LlmSettings` hides model dropdown for Local, shows note
  - [ ] 11.6: Test `LlmSettings` calls `onProviderChange`/`onModelChange` on selection
  - [ ] 11.7: Test `LlmSettings` auto-selects first model when vendor changes
  - [ ] 11.8: Test `streamSections` includes provider/model in request body
  - [ ] 11.9: Test `streamSectionRegenerate` includes provider/model in request body
  - [ ] 11.10: Test `generateOutline` includes provider/model in request body

## Dev Notes

### User Flow — Where LLM Settings Fit

```text
[Landing Page] → [New Project Page] → [Outline Page] → [Dashboard Page]
                       ↑                     ↑               ↑
                  LlmSettings         reads provider/   reads provider/
                  UI lives HERE       model from        model from
                  (select before      ProjectProvider   ProjectProvider
                   any LLM call)      context           context
```

The new project page (`/projects/new/page.tsx`) is where users select/upload a protocol. The LLM settings go here because:
- It's **before** any LLM call (outline generation is the first)
- The user picks a protocol and a provider in the same flow
- Clicking "Continue" navigates to outline generation, which uses the selected provider

### New Project Page Layout (After Changes)

```text
[PageHeader: "Select Protocol"]

[Upload New Protocol]
[Or Select Existing Protocol]

[LLM Settings: Provider: [Anthropic ▾]  Model: [claude-sonnet-4-6 ▾]]

[Continue Button]
```

### Model Lists (Hardcoded for Now)

```typescript
const PROVIDER_MODELS: Record<string, string[]> = {
  anthropic: ["claude-sonnet-4-6"],
  openai: ["gpt-5.1", "gpt-5.1-mini-2025-04-14"],
};

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  local: "Local (LM Studio)",
};
```

### ProjectProvider Context Approach

Add provider/model to `ProjectProvider` so all pages share it. This is clean because:
- New project page sets it
- Outline page reads it for `generateOutline()`
- Dashboard page reads it for `streamSectionRegenerate()` and `useSectionStreaming()`
- Story 9.4 will persist it to the project file from the same context

Add to the reducer:

```typescript
// In project.tsx state
llmProvider: string;  // default: "anthropic"
llmModel: string;     // default: "claude-sonnet-4-6"

// New action
| { type: "SET_LLM"; payload: { provider: string; model: string } }
```

### SSE Function Signature Changes

Add optional params — backward compatible since `undefined` fields are stripped by `JSON.stringify`:

```typescript
export async function* streamSections(
  protocolId: string,
  sections: { id: string; name: string }[],
  signal?: AbortSignal,
  provider?: string,
  model?: string,
): AsyncGenerator<SSEEvent> {
  const response = await fetch(`${API_BASE_URL}/api/v1/sections/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ protocolId, sections, provider, model }),
    signal,
  });
  // ...
}
```

### useSectionStreaming Hook Changes

Pass provider/model as hook params from dashboard page:

```typescript
export function useSectionStreaming(provider?: string, model?: string): void {
  // ... existing logic ...
  for await (const event of streamSections(
    protocolId,
    sectionsInput,
    controller.signal,
    provider,  // NEW
    model,     // NEW
  )) {
```

### What Already Exists (from Stories 9.1-9.2)

- Backend `GET /api/v1/settings/providers` is live
- All generation/regeneration/outline endpoints accept optional `provider`/`model` in request body
- No new backend changes needed

### What NOT to Do

- **Do NOT put LlmSettings on the dashboard page** — it must be before outline generation
- **Do NOT add model discovery API calls** — hardcoded lists for now
- **Do NOT persist provider/model to project file** — that is Story 9.4
- **Do NOT change backend code** — backend is complete from Stories 9.1-9.2

### Project Structure Notes

- New file: `frontend/src/components/dashboard/LlmSettings.tsx`
- Files to modify: `frontend/src/lib/api.ts`, `frontend/src/lib/sse.ts`, `frontend/src/lib/project.tsx`, `frontend/src/hooks/useSectionStreaming.ts`, `frontend/src/app/projects/new/page.tsx`, `frontend/src/app/projects/[id]/page.tsx`, `frontend/src/app/projects/[id]/outline/page.tsx`
- New test file: `frontend/src/__tests__/LlmSettings.test.tsx`
- Test files to modify: `frontend/src/__tests__/api.test.ts`, `frontend/src/__tests__/sse.test.ts`

### Testing Patterns

- Wrap `LlmSettings` with `<AuthProvider>` in tests (project convention)
- Mock `fetchProviders` via `jest.mock("@/lib/api")`
- Use `fireEvent.change(select, { target: { value: "openai" } })` for dropdown selection
- For SSE tests: verify `fetch` was called with body containing `provider`/`model`

### References

- [Source: _bmad-output/planning-artifacts/prd.md — FR44-FR47]
- [Source: _bmad-output/planning-artifacts/epics.md — Epic 9, Story 9.3]
- [Source: frontend/src/app/projects/new/page.tsx — new project page where LlmSettings goes]
- [Source: frontend/src/lib/api.ts — current API client functions]
- [Source: frontend/src/lib/sse.ts — current SSE streaming functions]
- [Source: frontend/src/lib/project.tsx — ProjectProvider context to extend]
- [Source: frontend/src/hooks/useSectionStreaming.ts — hook to wire provider/model through]
- [Source: frontend/src/app/projects/[id]/outline/page.tsx — outline generation call site]
- [Source: frontend/src/app/projects/[id]/page.tsx — dashboard regeneration call site]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

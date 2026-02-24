# Story 4.3: Implement Section Card with Streaming Display

Status: ready-for-dev

## Story

As a **research coordinator**,
I want **to see section content streaming in real-time with clear status indicators**,
so that **I know the system is working and can read content as it's generated**.

## Acceptance Criteria

1. **Given** I have confirmed an outline with selected sections, **When** the dashboard loads, **Then** a streaming request is sent to `POST /api/v1/sections/generate` with `protocolId` and `sections` array (FR16).
2. **Given** a section is generating, **When** `section_chunk` events arrive, **Then** text streams into the section card content area in real-time, replacing the skeleton placeholder (FR16).
3. **Given** streaming chunks arrive, **When** content is appended, **Then** the word count updates in real-time.
4. **Given** a section completes generation, **When** the `section_complete` event is received, **Then** the section status changes to "ready" and action buttons become enabled (FR24).
5. **Given** a section generation fails, **When** the `section_error` event is received, **Then** the section status changes to "error" and an error message is displayed in the content area (FR24a).
6. **Given** a section is in "generating" status, **When** I view the action area, **Then** the Approve, Edit, and Regenerate buttons are disabled (FR17).
7. **Given** content is very long, **When** I view the section card, **Then** the content area has a maximum height with scroll capability.

## Tasks / Subtasks

- [ ] Task 1: Create SSE stream consumption utility (AC: #1, #2)
  - [ ] 1.1 Create `frontend/src/lib/sse.ts` with a `streamSections()` function
  - [ ] 1.2 Accept `protocolId` and `sections` array, return parsed SSE events
  - [ ] 1.3 Use `fetch` with `body.getReader()` (POST, not EventSource)
  - [ ] 1.4 Parse SSE event format: `event:` line + `data:` line
  - [ ] 1.5 Support `AbortController` for cancellation
  - [ ] 1.6 Yield typed events: `SectionStartEvent`, `SectionChunkEvent`, `SectionCompleteEvent`, `SectionErrorEvent`

- [ ] Task 2: Create `useSectionStreaming` hook (AC: #1, #2, #3, #4, #5)
  - [ ] 2.1 Create `frontend/src/hooks/useSectionStreaming.ts`
  - [ ] 2.2 Accept `protocolId` and `sections` from ProjectContext
  - [ ] 2.3 On mount, if any section has `status === "generating"`, start streaming
  - [ ] 2.4 On `section_start`: no-op (section already in generating state)
  - [ ] 2.5 On `section_chunk`: call `updateSection(id, { content: accumulated })` to append content
  - [ ] 2.6 On `section_complete`: call `updateSection(id, { status: "ready" })`
  - [ ] 2.7 On `section_error`: call `updateSection(id, { status: "error", content: errorMessage })`
  - [ ] 2.8 Cleanup: abort stream on unmount
  - [ ] 2.9 Track streaming state (`isStreaming`) for the dashboard to consume

- [ ] Task 3: Wire dashboard page to streaming hook (AC: #1, #2, #3, #4, #5)
  - [ ] 3.1 Update `frontend/src/app/projects/[id]/page.tsx` to call `useSectionStreaming`
  - [ ] 3.2 Pass `project.protocolId` and `project.sections` to the hook
  - [ ] 3.3 Sections update in ProjectContext automatically via `updateSection()`

- [ ] Task 4: Update SectionCard for streaming content (AC: #2, #3, #6, #7)
  - [ ] 4.1 Update `frontend/src/components/dashboard/SectionCard.tsx`
  - [ ] 4.2 Show streaming content as it accumulates (replace skeleton once content arrives)
  - [ ] 4.3 Add `max-h-96 overflow-y-auto` to content area for long content with scroll
  - [ ] 4.4 Ensure word count updates as content grows
  - [ ] 4.5 Show error message in content area when `status === "error"`

- [ ] Task 5: Write unit tests (80%+ coverage)
  - [ ] 5.1 Test `sse.ts`: event parsing, error handling, abort (new test file)
  - [ ] 5.2 Test `useSectionStreaming` hook: start, chunk accumulation, complete, error, cleanup (new test file)
  - [ ] 5.3 Update `SectionCard.test.tsx`: error message display, scrollable content
  - [ ] 5.4 Update `dashboard-placeholder.test.tsx`: streaming integration

## Dev Notes

### Technical Direction

**This story connects the frontend to the backend streaming endpoint built in Story 4.1.** The debug stream page proved the SSE consumption pattern works. Now we extract that pattern into reusable utilities and wire it to the real dashboard.

**Scope boundaries:**
- Story 4.3 handles: streaming display, status transitions (generating→ready, generating→error)
- Story 4.4 handles: retry button for error state, error-specific UX
- Epic 5 handles: approve, edit, regenerate button actions
- Keep approve/edit/regenerate buttons rendered but non-functional (as they are now)

### SSE Streaming Pattern (proven in debug page)

The debug page at `frontend/src/app/debug/stream/page.tsx` has a working implementation. Extract and refine into `lib/sse.ts`:

```typescript
// Existing pattern from debug page:
const response = await fetch(`${API_BASE_URL}/api/v1/sections/generate`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ protocolId, sections }),
  signal: controller.signal,
});

const reader = response.body.getReader();
const decoder = new TextDecoder();
let buffer = "";

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });
  // Parse SSE lines...
}
```

### SSE Event Format (from backend)

```
event: section_start
data: {"sectionId": "uuid", "name": "Purpose of the Study"}

event: section_chunk
data: {"sectionId": "uuid", "content": "This study investigates..."}

event: section_complete
data: {"sectionId": "uuid", "status": "ready"}

event: section_error
data: {"sectionId": "uuid", "status": "error", "message": "LLM request failed after 3 retries"}
```

### Event Type Definitions

```typescript
type SSEEvent =
  | { type: "section_start"; sectionId: string; name: string }
  | { type: "section_chunk"; sectionId: string; content: string }
  | { type: "section_complete"; sectionId: string }
  | { type: "section_error"; sectionId: string; message: string };
```

### Content Accumulation Strategy

The hook must accumulate content per section because `section_chunk` events contain individual chunks, not the full text:

```typescript
// Inside useSectionStreaming hook:
const contentRef = useRef<Record<string, string>>({});

// On section_chunk:
contentRef.current[sectionId] = (contentRef.current[sectionId] || "") + chunk.content;
updateSection(sectionId, { content: contentRef.current[sectionId] });
```

### Section Status State Machine (relevant transitions for this story)

```
generating → ready     (on section_complete)
generating → error     (on section_error)
```

Other transitions (ready→approved, ready→editing, etc.) are handled in later stories.

### ProjectContext Integration

Story 4.2 added `updateSection(id, updates)` to ProjectContext. The streaming hook uses this to update section state:

```typescript
const { project, updateSection } = useProject();
```

### Streaming Trigger Logic

Start streaming when the dashboard mounts AND there are sections with `status === "generating"`:

```typescript
const generatingSections = project.sections.filter(s => s.status === "generating");
if (generatingSections.length > 0) {
  // Start streaming with these sections
}
```

Only start once — use a ref to track if streaming has been initiated.

### Content Area Scrolling

For long generated content, add max height and scroll:
```tsx
<div className="mt-4 max-h-96 overflow-y-auto rounded-md border-l-4 bg-slate-50 p-4 ...">
```

### Testing Notes

**SSE utility tests (`sse.test.ts`):**
- Mock `fetch` to return a ReadableStream with SSE-formatted data
- Test event parsing for each event type
- Test buffer handling (partial lines across chunks)
- Test abort signal cancellation
- For jsdom: polyfill TextEncoder/TextDecoder from `util`, mock `body.getReader()` interface

**Hook tests (`useSectionStreaming.test.tsx`):**
- Use `renderHook` from `@testing-library/react`
- Mock `sse.ts` module to control events
- Verify `updateSection` is called with correct args for each event type
- Test cleanup on unmount (abort called)

**SectionCard tests (update existing):**
- Test error message display when `status === "error"` and content contains error text
- Test scrollable container class

### What NOT to Do

- Do NOT implement retry logic (that's story 4.4)
- Do NOT implement approve/edit/regenerate button handlers (that's Epic 5)
- Do NOT modify the backend — streaming endpoint is complete
- Do NOT use EventSource (it only supports GET; our endpoint is POST)
- Do NOT install new dependencies — use native `fetch` + `ReadableStream`
- Do NOT build parallel streaming per-section — the backend handles sequential generation in a single stream

### Project Structure Notes

**New files to create:**
- `frontend/src/lib/sse.ts` — SSE stream consumption utility
- `frontend/src/hooks/useSectionStreaming.ts` — React hook for streaming integration
- `frontend/src/__tests__/sse.test.ts` — SSE utility tests
- `frontend/src/__tests__/useSectionStreaming.test.tsx` — Hook tests

**Files to modify:**
- `frontend/src/app/projects/[id]/page.tsx` — Wire up `useSectionStreaming` hook
- `frontend/src/components/dashboard/SectionCard.tsx` — Scrollable content, error display
- `frontend/src/__tests__/SectionCard.test.tsx` — New test cases
- `frontend/src/__tests__/dashboard-placeholder.test.tsx` — Streaming integration tests

### Existing Code Patterns to Follow

**API base URL** (from `lib/api.ts`):
```typescript
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
```

**Context usage** (from `lib/project.tsx`):
```typescript
const { project, updateSection } = useProject();
// updateSection(id: string, updates: Partial<SectionState>) => void
```

**Test patterns:**
- Wrap components with `<AuthProvider>` and `<ProjectProvider>`
- Mock `next/navigation` with `jest.fn()` for push/replace
- For jsdom stream tests: polyfill TextEncoder/TextDecoder, mock `body.getReader()` interface

### Previous Story Intelligence

**Story 4.1** (Section Generation Streaming Endpoint):
- Backend SSE endpoint is complete and tested
- Debug page proved the fetch + ReadableStream SSE pattern works
- Events arrive sequentially: all chunks for section 1, then section 2, etc.

**Story 4.2** (Section Dashboard Layout):
- SectionCard component exists with status icon, buttons, content/skeleton
- ActionBar exists with disabled placeholder buttons
- Dashboard page renders section cards from ProjectContext
- `updateSection()` added to ProjectContext

### References

- [Source: epics.md#Story 4.3] — Full acceptance criteria
- [Source: architecture.md#API Patterns] — SSE event format
- [Source: architecture.md#State Management] — SectionStatus state machine
- [Source: architecture.md#FR16] — Section generation streaming to UI
- [Source: architecture.md#FR17] — Dashboard view and controls
- [Source: architecture.md#FR24] — Section status display

### Library/Framework Notes

- **No new dependencies needed** — use native `fetch` + `ReadableStream`
- **React hooks** — `useEffect`, `useRef`, `useCallback` for streaming lifecycle
- **Testing** — `@testing-library/react` `renderHook` for hook tests

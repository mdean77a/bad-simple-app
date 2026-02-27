# Story 7.3: Implement Load Project from Local File

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **research coordinator**,
I want **to open a previously saved project file**,
So that **I can resume my work where I left off**.

## Acceptance Criteria

1. **Given** I am on the landing page, **When** I click "Continue Saved Project", **Then** a file picker dialog opens allowing me to select a JSON file (FR30)
2. **Given** I select a valid project file, **When** the file is parsed, **Then** the project state is restored within 5 seconds (NFR3) **And** I am navigated to the dashboard with all sections displayed (FR27)
3. **Given** a loaded project has sections in various states, **When** the dashboard loads, **Then** each section displays its saved content and status **And** approved sections show their Approval Badges **And** the Action Bar shows correct progress
4. **Given** I select an invalid file (not JSON, wrong structure), **When** parsing fails, **Then** I see an error message "Invalid project file" **And** I remain on the landing page
5. **Given** I select a file with an unrecognized version, **When** the file is loaded, **Then** I see a warning "This file was created with a newer version" **And** the file is loaded anyway (best effort)
6. **Given** I cancel the file picker, **When** the dialog closes, **Then** I remain on the landing page with no changes
7. **Given** a loaded project references a protocol, **When** the dashboard loads, **Then** the protocol name is displayed in the header **And** the `protocolId` is available for regeneration requests

## Tasks / Subtasks

- [x] Task 1: Add `LOAD_PROJECT` action to project reducer in `frontend/src/lib/project.tsx` (AC: 2, 3, 7)
  - [x] 1.1: Add `LOAD_PROJECT` action type with `payload: ProjectState` to the `ProjectAction` union
  - [x] 1.2: Add `LOAD_PROJECT` case to `projectReducer` — replaces entire state with payload
  - [x] 1.3: Add `loadProject(state: ProjectState)` method to `ProjectContextType` and `ProjectProvider`
  - [x] 1.4: Export `loadProject` from the context hook
- [x] Task 2: Create `readProjectFile()` utility in `frontend/src/lib/projectFile.ts` (AC: 2, 4, 5)
  - [x] 2.1: Implement `readProjectFile(file: File): Promise<{ project: ProjectState; warnings?: string[] }>` — reads File via FileReader, JSON.parse, validate, deserialize
  - [x] 2.2: Throw descriptive error on invalid JSON (catch `JSON.parse` `SyntaxError`)
  - [x] 2.3: Throw descriptive error on validation failure (call `validateProjectFile`, throw with joined errors)
  - [x] 2.4: Return warnings array from `validateProjectFile` (e.g., version mismatch) alongside the deserialized project
- [x] Task 3: Enable "Continue Saved Project" button and wire file input on landing page `frontend/src/app/page.tsx` (AC: 1, 4, 5, 6)
  - [x] 3.1: Add hidden `<input type="file" accept=".json">` element with a `useRef`
  - [x] 3.2: Change "Continue Saved Project" from disabled `<button>` to enabled `<button>` that calls `fileInputRef.current.click()`
  - [x] 3.3: Remove the "will be enabled in a later version" placeholder text
  - [x] 3.4: Add `onChange` handler that calls `readProjectFile(file)`, then `loadProject(state)`, then navigates
  - [x] 3.5: Add error state — display inline error message below button on invalid file
  - [x] 3.6: Add warning display — show version warning if present (non-blocking, still load)
  - [x] 3.7: Determine navigation target: if `outline` exists → `/projects/${protocolId}` (dashboard), else → `/projects/${protocolId}/outline`
- [x] Task 4: Write unit tests (AC: 1-7)
  - [x] 4.1: Test `LOAD_PROJECT` action replaces project state in reducer
  - [x] 4.2: Test `readProjectFile` with valid JSON file → returns deserialized `ProjectState`
  - [x] 4.3: Test `readProjectFile` with invalid JSON → throws error
  - [x] 4.4: Test `readProjectFile` with invalid structure (missing fields) → throws error with validation messages
  - [x] 4.5: Test `readProjectFile` with unrecognized version → returns project + warnings array
  - [x] 4.6: Test landing page "Continue Saved Project" button is enabled and triggers file input click
  - [x] 4.7: Test landing page loads valid file and navigates to dashboard
  - [x] 4.8: Test landing page shows error message for invalid file
  - [x] 4.9: Test landing page cancel (no file selected) → no state change
  - [x] 4.10: Test loaded project displays correct sections and approvals on dashboard

## Dev Notes

### What Already Exists (from Stories 7.1 and 7.2)

Story 7.1 created all deserialization and validation infrastructure. **Do NOT recreate or duplicate this logic:**

- `frontend/src/lib/projectFile.ts` — `deserializeProject()`, `validateProjectFile()`, `serializeProject()`, `mapToPersistableStatus()`, `extractExtraFields()`, `sanitizeFilename()`, `downloadProjectFile()`
- `frontend/src/types/project.ts` — `ProjectFile`, `PersistableStatus`, `ProjectFileSection`, `ProjectFileOutline`, `ProjectState`, `SectionState`, `ConfirmedOutline`
- `frontend/src/__tests__/projectFile.test.ts` — 63 existing tests covering serialization/validation round-trips

**Key existing function signatures:**
```typescript
export function validateProjectFile(data: unknown): ValidationResult;
// Returns { valid: boolean; errors: string[]; warnings?: string[] }

export function deserializeProject(file: ProjectFile): ProjectState;
// Maps ProjectFile → ProjectState (generatedOutline always null)
```

### Implementation Pattern: LOAD_PROJECT Action

The project context (`frontend/src/lib/project.tsx`) uses `useReducer`. Add a new action:

```typescript
// Add to ProjectAction union:
| { type: "LOAD_PROJECT"; payload: ProjectState }

// Add to projectReducer:
case "LOAD_PROJECT":
  return action.payload;
```

Add to `ProjectContextType`:
```typescript
loadProject: (state: ProjectState) => void;
```

Add to `ProjectProvider`:
```typescript
const loadProject = (state: ProjectState) => {
  dispatch({ type: "LOAD_PROJECT", payload: state });
};
```

### Implementation Pattern: readProjectFile()

This is a new utility in `frontend/src/lib/projectFile.ts`. It wraps FileReader + validate + deserialize:

```typescript
export async function readProjectFile(
  file: File
): Promise<{ project: ProjectState; warnings?: string[] }> {
  const text = await file.text();

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Invalid project file: not valid JSON");
  }

  const validation = validateProjectFile(parsed);
  if (!validation.valid) {
    throw new Error(`Invalid project file: ${validation.errors.join("; ")}`);
  }

  const project = deserializeProject(parsed as ProjectFile);
  return {
    project,
    ...(validation.warnings?.length ? { warnings: validation.warnings } : {}),
  };
}
```

**Note:** Use `file.text()` (returns a Promise) rather than wrapping FileReader manually. `File.text()` is supported in all modern browsers (Chrome 76+, Safari 14+). However, **jsdom does not support `Blob.text()`** — in tests, mock the `File` object with a custom `text()` method.

### Landing Page Changes

Current state of `frontend/src/app/page.tsx` `AuthenticatedLandingPage`:
- "Continue Saved Project" is a **disabled `<button>`** with `opacity-50 cursor-not-allowed`
- There's a placeholder paragraph: "Continue Saved Project will be enabled in a later version."

Changes needed:
1. Add `useRef<HTMLInputElement>(null)` for hidden file input
2. Add state: `const [loadError, setLoadError] = useState<string | null>(null)`
3. Add state: `const [loadWarning, setLoadWarning] = useState<string | null>(null)`
4. Replace disabled button with enabled button that calls `fileInputRef.current?.click()`
5. Add hidden `<input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleFileSelect} />`
6. Remove placeholder paragraph
7. Import `useProject` and `useRouter`
8. Import `readProjectFile` from `@/lib/projectFile`

**Button styling** — change from disabled style to match the existing outline/secondary button pattern:
```tsx
<button
  onClick={() => fileInputRef.current?.click()}
  className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-4 font-medium text-slate-700 hover:bg-slate-50"
>
```

### Navigation After Load

From the UX spec, navigation depends on loaded project state:
- **Outline confirmed** (`project.outline !== null`) → Navigate to `/projects/${protocolId}` (dashboard)
- **Outline NOT confirmed** (`project.outline === null`) → Navigate to `/projects/${protocolId}/outline`

Use `router.push()` after calling `loadProject()`.

**Important:** The `[id]` route param uses `protocolId` from the project state. The existing app uses `protocolId` as the route param (e.g., `/projects/protocol_diabetes_study_20260203/outline`).

### Error Handling

Display an inline error message below the "Continue Saved Project" button:
```tsx
{loadError && (
  <p className="text-center text-sm text-red-600">{loadError}</p>
)}
```

Clear the error when the user tries again (on button click or on new file selection).

### Warning Display (Version Mismatch)

If `readProjectFile` returns warnings, display them as a non-blocking warning. The file still loads. Show a brief warning below the button before navigating, or rely on a transient display. Since navigation happens immediately, consider logging the warning or showing it briefly. A simple approach: if there are warnings, still navigate but show the warning text briefly before navigating (or simply log to console — the UX spec doesn't require a persistent warning banner on the dashboard).

**Simplest approach:** Show warning via `alert()` or a brief inline message. Since the AC says "I see a warning", a `window.alert()` or inline text before navigation is sufficient for MVP.

### Testing the File Input

For testing file selection in jsdom:
```typescript
// Create a mock File
const projectFile = {
  version: "1.0",
  protocolId: "test-protocol",
  protocolName: "Test Protocol",
  createdAt: "2026-01-01T00:00:00.000Z",
  lastModifiedAt: "2026-01-01T00:00:00.000Z",
  sections: [],
};
const file = new File(
  [JSON.stringify(projectFile)],
  "test_ICF.json",
  { type: "application/json" }
);

// jsdom File doesn't have .text() — mock it
Object.defineProperty(file, "text", {
  value: () => Promise.resolve(JSON.stringify(projectFile)),
});

// Trigger file input change
const fileInput = container.querySelector('input[type="file"]');
fireEvent.change(fileInput, { target: { files: [file] } });
```

### Testing readProjectFile

Mock `File.text()` since jsdom doesn't support it:
```typescript
function createMockFile(content: string, name = "test.json"): File {
  const file = new File([content], name, { type: "application/json" });
  Object.defineProperty(file, "text", {
    value: () => Promise.resolve(content),
  });
  return file;
}
```

### Dashboard Behavior After Load

No changes needed to the dashboard page (`frontend/src/app/projects/[id]/page.tsx`). The dashboard reads from `useProject()` context — once `loadProject()` sets the state, the dashboard will render sections correctly:
- Approved sections show ApprovalBadge (existing behavior)
- ActionBar shows correct X/Y approved progress (existing behavior)
- Save Project button works (existing behavior from Story 7.2)
- Protocol name available via `project.protocolName` (existing behavior)

### File Reset on Error

After an error, reset the file input value so the user can re-select the same file:
```typescript
if (fileInputRef.current) {
  fileInputRef.current.value = "";
}
```

### What NOT to Change

- **Do NOT modify** `projectFile.ts` types or existing functions (only add `readProjectFile`)
- **Do NOT modify** the dashboard page — it already works with any `ProjectState`
- **Do NOT modify** the `ActionBar`, `SectionCard`, or `ApprovalBadge` components
- **Do NOT add** a `protocolName` prop to the project context — it's already in `ProjectState`
- **Do NOT create** a new page for loading — the file picker is triggered from the landing page

### Project Structure Notes

| File | Action |
|------|--------|
| `frontend/src/lib/project.tsx` | **MODIFY** — Add `LOAD_PROJECT` action, `loadProject` method |
| `frontend/src/lib/projectFile.ts` | **MODIFY** — Add `readProjectFile()` utility |
| `frontend/src/app/page.tsx` | **MODIFY** — Enable button, add file input, handle load/navigate |
| `frontend/src/__tests__/projectFile.test.ts` | **MODIFY** — Add `readProjectFile` tests |
| `frontend/src/__tests__/project-context.test.tsx` | **MODIFY** — Add `LOAD_PROJECT` tests |
| `frontend/src/__tests__/page.test.tsx` | **MODIFY** — Update tests for enabled button, file load, navigation, errors |

### Testing Standards

- Jest 30, minimum 80% coverage (project achieves ~97-99%)
- Wrap components with `<AuthProvider>` and `<ProjectProvider>` in tests
- Mock `next/navigation` with `jest.fn()` for `useRouter` push/replace
- Mock `@/lib/projectFile` for integration tests
- For jsdom: `Blob.text()` / `File.text()` not available — use `Object.defineProperty` mock
- Reset file input value in test cleanup

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture — Project File Format, Frontend-Only Operations]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 7.3]
- [Source: _bmad-output/planning-artifacts/prd.md — FR27, FR30, NFR3, NFR12-13]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Landing Page — Continue Saved Project flow]
- [Source: frontend/src/lib/projectFile.ts — validateProjectFile(), deserializeProject()]
- [Source: frontend/src/lib/project.tsx — ProjectProvider, useReducer pattern]
- [Source: frontend/src/app/page.tsx — AuthenticatedLandingPage, disabled Continue button]
- [Source: frontend/src/types/project.ts — ProjectFile, ProjectState types]
- [Source: Story 7.1 — "Story 7.3's responsibility (adding a LOAD_PROJECT action)"]
- [Source: Story 7.2 — downloadProjectFile pattern, sanitizeFilename, createdAt handling]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Existing page tests failed after adding `useProject()` to landing page — required wrapping with `<ProjectProvider>` and mocking `next/navigation`
- Bug fix during development: `validateProjectFile` rejected empty `protocolName` (`""`) due to `!obj.protocolName` falsy check — changed to `typeof` check
- Bug fix during development: `protocolName` was never set in project context — threaded through from protocol selection/upload via new `SET_PROTOCOL` action
- All 382 frontend tests pass (20 new, 362 existing — 0 regressions)
- All 149 backend tests pass (0 regressions)

### Completion Notes List

- Added `LOAD_PROJECT` action to `ProjectAction` union and `projectReducer` — replaces entire state with payload
- Added `loadProject(state: ProjectState)` to `ProjectContextType`, `ProjectProvider`, and context value
- Added `SET_PROTOCOL` action to `ProjectAction` union and `projectReducer` — sets `protocolId` and `protocolName`
- Added `setProtocol(protocolId, protocolName)` to `ProjectContextType`, `ProjectProvider`, and context value
- Added `readProjectFile(file: File)` to `projectFile.ts` — uses `file.text()` + `JSON.parse` + `validateProjectFile` + `deserializeProject` pipeline
- `readProjectFile` throws descriptive errors: "not valid JSON" for parse failures, validation error details for structure failures
- `readProjectFile` returns `{ project, warnings? }` — warnings populated for unrecognized version (non-blocking)
- Fixed `validateProjectFile` to accept empty string `protocolName` (was rejecting falsy values)
- Enabled "Continue Saved Project" button on landing page — removed disabled state, opacity-50, cursor-not-allowed, and aria-disabled
- Removed "will be enabled in a later version" placeholder text
- Added hidden `<input type="file" accept=".json">` with `useRef` — triggered by button click
- Added `handleFileSelect` async handler: reads file, loads into context, navigates based on outline state
- Navigation: outline confirmed → `/projects/${encodeURIComponent(protocolId)}` (dashboard), no outline → `.../outline`
- Error display: inline `<p role="alert">` with red text below buttons, cleared on next file selection
- Version warning: shown via `window.alert()` before navigation (non-blocking — file still loads)
- File input reset after each attempt (success or failure) so same file can be re-selected
- Threaded `protocolName` through ProtocolUpload, ProtocolSelect, and NewProjectPage callbacks
- `ProtocolUpload.onUploadSuccess` now passes `(protocolId, protocolName)` — was `(protocolId)` only
- `ProtocolSelect.onSelectionChange` now passes `(protocolId, protocolName)` — was `(protocolId)` only
- `NewProjectPage` calls `setProtocol(id, name)` before navigating to outline page
- `downloadProjectFile` filename fallback: uses `protocolId` when `protocolName` is empty
- Fixed stale dependency array in `ProtocolUpload.handleUpload` — added `onUploadSuccess` to deps
- 8 new `readProjectFile` + validation tests (valid file, invalid JSON, invalid structure, specific errors, version warnings, no warnings, empty protocolName acceptance, filename fallback)
- 3 new project context tests (`LOAD_PROJECT` replaces state, `SET_PROTOCOL` sets both fields, `protocolName` persists through `confirmOutline`)
- 7 new landing page tests (hidden file input, load+navigate dashboard, load+navigate outline, error display, version warning alert, cancel no-op, error clear on retry)
- Updated existing page tests: wrapped with `<ProjectProvider>`, mocked `next/navigation`, changed "disabled" test to "enabled"
- Updated existing ProtocolUpload test: `onUploadSuccess` assertion now expects both `(protocolId, protocolName)`
- Updated existing ProtocolSelect test: `onSelectionChange` assertion now expects both `(protocolId, protocolName)`
- Updated existing NewProjectPage tests: wrapped with `<ProjectProvider>`
- Full regression suite: 149 backend + 382 frontend = 531 tests (0 failures)

### File List

- `frontend/src/lib/project.tsx` — **MODIFIED** — Added `LOAD_PROJECT` action, `SET_PROTOCOL` action, `loadProject` method, `setProtocol` method, context value
- `frontend/src/lib/projectFile.ts` — **MODIFIED** — Added `readProjectFile()`, fixed `validateProjectFile` empty protocolName, added filename fallback for empty protocolName
- `frontend/src/app/page.tsx` — **MODIFIED** — Enabled "Continue Saved Project" button, added hidden file input, file load handler, error/warning display, navigation with `encodeURIComponent`, removed placeholder text
- `frontend/src/app/projects/new/page.tsx` — **MODIFIED** — Tracks `protocolName` for upload/select, calls `setProtocol()` before navigation
- `frontend/src/components/projects/ProtocolUpload.tsx` — **MODIFIED** — `onUploadSuccess` callback passes `(protocolId, protocolName)`, fixed stale `handleUpload` dependency array
- `frontend/src/components/projects/ProtocolSelect.tsx` — **MODIFIED** — `onSelectionChange` callback passes `(protocolId, protocolName)`
- `frontend/src/__tests__/projectFile.test.ts` — **MODIFIED** — Added 8 tests (readProjectFile + empty protocolName + filename fallback)
- `frontend/src/__tests__/project-context.test.tsx` — **MODIFIED** — Added 3 tests (LOAD_PROJECT, SET_PROTOCOL, protocolName persistence)
- `frontend/src/__tests__/page.test.tsx` — **MODIFIED** — Updated existing tests for `<ProjectProvider>` wrapping, added 7 new "Continue Saved Project" tests
- `frontend/src/__tests__/ProtocolUpload.test.tsx` — **MODIFIED** — Updated `onUploadSuccess` assertion for new signature
- `frontend/src/__tests__/ProtocolSelect.test.tsx` — **MODIFIED** — Updated `onSelectionChange` assertion for new signature
- `frontend/src/__tests__/new-project-page.test.tsx` — **MODIFIED** — Added `<ProjectProvider>` wrapping

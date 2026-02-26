# Story 7.2: Implement Save Project to Local File

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **research coordinator**,
I want **to save my work-in-progress to a local file**,
So that **I can resume later or share with colleagues**.

## Acceptance Criteria

1. **Given** I am on the dashboard with project state, **When** I click the "Save Project" button in the Action Bar, **Then** the project state is serialized to JSON and a file download is triggered with filename `{protocolName}_ICF.json` (FR25)
2. **Given** I save a project, **When** the file is downloaded, **Then** the save completes within 5 seconds (NFR3)
3. **Given** any section is currently generating, **When** I view the Save Project button, **Then** it is disabled and cannot be clicked (NFR14)
4. **Given** all sections have completed (ready, edited, approved, or error), **When** I view the Save Project button, **Then** it is enabled and clickable
5. **Given** I save a project, **When** the save completes, **Then** the `lastModifiedAt` timestamp is updated in the saved file
6. **Given** I have made changes since the last save, **When** I click Save Project, **Then** the new file includes all current section content and approval states
7. **Given** I save a project multiple times, **When** each save occurs, **Then** the browser downloads a new file (does not overwrite previous automatically)
8. **Given** sections are in transient states (generating, editing, error), **When** the project is saved, **Then** those sections are saved as "ready" with their current content preserved

## Tasks / Subtasks

- [x] Task 1: Create `downloadProjectFile()` utility function in `frontend/src/lib/projectFile.ts` (AC: 1, 2, 5, 7)
  - [x] 1.1: Implement `sanitizeFilename(name: string): string` — remove special chars, replace spaces with underscores, limit length
  - [x] 1.2: Implement `downloadProjectFile(project: ProjectState, createdAt?: string): void` — serialize, create blob, trigger download
  - [x] 1.3: Use `URL.createObjectURL()` + anchor element download pattern
  - [x] 1.4: Generate filename as `{sanitizedProtocolName}_ICF.json`
  - [x] 1.5: Call `serializeProject(project, createdAt)` from existing Story 7.1 code
- [x] Task 2: Add `onSaveProject` prop to `ActionBar` component (AC: 1, 3, 4)
  - [x] 2.1: Add `onSaveProject?: () => void` to ActionBar props
  - [x] 2.2: Wire Save Project button `onClick` to call `onSaveProject`
  - [x] 2.3: Verify button is already disabled when `anyGenerating` is true (existing logic — AC 3)
  - [x] 2.4: Verify button is enabled when no sections are generating (existing logic — AC 4)
- [x] Task 3: Create `handleSaveProject` callback in dashboard page (AC: 1, 5, 6, 8)
  - [x] 3.1: Import `downloadProjectFile` from `projectFile.ts`
  - [x] 3.2: Create `handleSaveProject` using `useCallback` — calls `downloadProjectFile(project)`
  - [x] 3.3: Pass `onSaveProject={handleSaveProject}` to `<ActionBar />`
- [x] Task 4: Write unit tests (AC: 1-8)
  - [x] 4.1: Test `sanitizeFilename` with various inputs (special chars, spaces, long names, empty string)
  - [x] 4.2: Test `downloadProjectFile` creates correct JSON blob and triggers download with correct filename
  - [x] 4.3: Test transient statuses are mapped to "ready" in downloaded file (via serializeProject, already tested in 7.1)
  - [x] 4.4: Test ActionBar calls `onSaveProject` when Save Project button is clicked
  - [x] 4.5: Test ActionBar does NOT call `onSaveProject` when button is disabled (generating state)
  - [x] 4.6: Test dashboard page wires `handleSaveProject` to ActionBar correctly

## Dev Notes

### What Already Exists (from Story 7.1)

Story 7.1 created all the serialization infrastructure. **Do NOT recreate or duplicate this logic:**

- `frontend/src/lib/projectFile.ts` — `serializeProject()`, `deserializeProject()`, `validateProjectFile()`, `mapToPersistableStatus()`, `extractExtraFields()`
- `frontend/src/types/project.ts` — `ProjectFile`, `PersistableStatus`, `ProjectFileSection`, `ProjectFileOutline` types
- 47 existing unit tests in `frontend/src/__tests__/projectFile.test.ts` covering serialization round-trips

**Key function signature from Story 7.1:**
```typescript
export function serializeProject(
  project: ProjectState,
  createdAt?: string,
  existingFile?: Record<string, unknown>
): ProjectFile
```

### Implementation Pattern: Browser File Download

Use the standard `URL.createObjectURL()` + anchor element pattern. This is a **frontend-only operation** — no backend call required.

```typescript
export function downloadProjectFile(project: ProjectState, createdAt?: string): void {
  const projectFile = serializeProject(project, createdAt);
  const jsonString = JSON.stringify(projectFile, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `${sanitizeFilename(project.protocolName)}_ICF.json`;
  document.body.appendChild(a);
  a.click();

  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```

### Filename Sanitization

Protocol names may contain special characters. Sanitize for safe filenames:
- Replace spaces with underscores
- Remove characters not safe in filenames (e.g., `/`, `\`, `:`, `*`, `?`, `"`, `<`, `>`, `|`)
- Trim to reasonable length (e.g., 100 chars max)
- Fallback to `"project"` if name is empty after sanitization

### ActionBar Integration

The Save Project button already exists in `ActionBar.tsx` (lines 88-94). Current state:
- Styled as secondary/outline button (white bg with border)
- Disabled when `anyGenerating` is true (correct per AC 3/4)
- Has `aria-label="Save project"`
- **Currently no onClick handler** — this story wires it up

Only changes needed:
1. Add `onSaveProject?: () => void` to props interface
2. Add `onClick={onSaveProject}` to the button element

### Dashboard Page Integration

In `frontend/src/app/projects/[id]/page.tsx`, the ActionBar is currently rendered as:
```tsx
<ActionBar sections={project.sections} onApproveAll={handleApproveAll} />
```

Add `onSaveProject` prop:
```tsx
<ActionBar
  sections={project.sections}
  onApproveAll={handleApproveAll}
  onSaveProject={handleSaveProject}
/>
```

### UX Behavior (from UX Spec)

- **No confirmation dialog** — save is a non-destructive action (downloads file, doesn't overwrite)
- **No toast notification needed on success** — browser download UI provides feedback
- **Toast on failure**: "Failed to save. Please try again." — but client-side blob download is unlikely to fail
- Save Project button is **outline/secondary** style (already correct)
- Button available **only on Dashboard page** (already the case)

### State Management

No changes to `ProjectProvider` or reducer are needed for this story. The `handleSaveProject` callback reads directly from the current `project` state via `useProject()`.

### Tracking `createdAt` Across Saves

The `createdAt` parameter in `serializeProject` preserves the original creation timestamp across re-saves. For Story 7.2 (first save), `createdAt` can be omitted (defaults to `new Date().toISOString()`). Story 7.3 (load project) will provide `createdAt` from the loaded file so subsequent saves preserve the original timestamp.

For now, each save creates a new `createdAt`. This is acceptable — Story 7.3 will add `createdAt` tracking when load is implemented.

### Project Structure Notes

- All changes confined to existing files — no new files created except potentially a new test file
- `projectFile.ts` already exists — add `downloadProjectFile()` and `sanitizeFilename()` to it
- Tests can be added to existing `projectFile.test.ts` or as new focused test file
- Component directory structure unchanged

### Testing Standards

- Jest 30, minimum 80% coverage (project achieves ~97-99%)
- For `downloadProjectFile`, mock DOM APIs (`document.createElement`, `URL.createObjectURL`, etc.)
- For ActionBar tests, use existing pattern: render with `@testing-library/react`, wrap with providers
- For jsdom environment: `URL.createObjectURL` may need to be mocked as `jest.fn()`
- Existing tests in `frontend/src/__tests__/projectFile.test.ts` — extend or create companion test file

### Testing the Download Function

Since `downloadProjectFile` interacts with DOM and `URL.createObjectURL`, mock these in tests:

```typescript
// Mock setup for download tests
const mockCreateObjectURL = jest.fn(() => "blob:mock-url");
const mockRevokeObjectURL = jest.fn();
global.URL.createObjectURL = mockCreateObjectURL;
global.URL.revokeObjectURL = mockRevokeObjectURL;

const mockClick = jest.fn();
const mockAppendChild = jest.fn();
const mockRemoveChild = jest.fn();
jest.spyOn(document, "createElement").mockReturnValue({
  set href(val: string) { /* capture */ },
  set download(val: string) { /* capture */ },
  click: mockClick,
} as unknown as HTMLAnchorElement);
jest.spyOn(document.body, "appendChild").mockImplementation(mockAppendChild);
jest.spyOn(document.body, "removeChild").mockImplementation(mockRemoveChild);
```

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture — Project File Format]
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns — Frontend-Only Operations]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 7.2]
- [Source: _bmad-output/planning-artifacts/prd.md — FR25, NFR3, NFR14]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Action Bar — Save Project Behavior]
- [Source: frontend/src/lib/projectFile.ts — serializeProject() from Story 7.1]
- [Source: frontend/src/components/dashboard/ActionBar.tsx — Save Project button (lines 88-94)]
- [Source: frontend/src/app/projects/[id]/page.tsx — Dashboard page with ActionBar integration]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Initial `blob.text()` test failure in jsdom — resolved by using `JSON.stringify` spy instead (jsdom lacks `Blob.text()` and `Response` APIs)

### Completion Notes List

- Added `sanitizeFilename()` to `projectFile.ts` — replaces spaces with underscores, removes unsafe chars (`/\:*?"<>|`), collapses multiple underscores, trims edges, max 100 chars, fallback to "project"
- Added `downloadProjectFile()` to `projectFile.ts` — calls `serializeProject()`, creates JSON blob, triggers browser download via `URL.createObjectURL()` + anchor element pattern
- Filename format: `{sanitizedProtocolName}_ICF.json` per AC 1
- Added `onSaveProject?: () => void` prop to `ActionBar` component, wired to Save Project button `onClick`
- Button already correctly disabled during generation (`anyGenerating` check) — AC 3/4 satisfied by existing logic
- Added `handleSaveProject` callback in dashboard page using `useCallback`, passed to ActionBar
- 8 new tests for `sanitizeFilename` (spaces, unsafe chars, collapse, trim, truncate, empty, unsafe-only, mixed)
- 7 new tests for `downloadProjectFile` (blob creation, filename, sanitization, href, DOM append/remove, createdAt passthrough, transient status mapping)
- 2 new tests for ActionBar `onSaveProject` (click calls handler, disabled button doesn't call handler)
- Full regression suite: 149 backend + 362 frontend tests pass (0 failures)
- No changes to ProjectProvider/reducer — frontend-only operation reading directly from project state

### File List

- `frontend/src/lib/projectFile.ts` — **MODIFIED** — Added `sanitizeFilename()`, `downloadProjectFile()`
- `frontend/src/components/dashboard/ActionBar.tsx` — **MODIFIED** — Added `onSaveProject` prop, wired `onClick`
- `frontend/src/app/projects/[id]/page.tsx` — **MODIFIED** — Added `handleSaveProject` callback, imported `downloadProjectFile`, passed to ActionBar
- `frontend/src/__tests__/projectFile.test.ts` — **MODIFIED** — Added 15 tests (8 sanitizeFilename + 7 downloadProjectFile)
- `frontend/src/__tests__/ActionBar.test.tsx` — **MODIFIED** — Added 2 tests (onSaveProject click + disabled state)

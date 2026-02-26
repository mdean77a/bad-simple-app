# Story 7.1: Define Project File Format and State Structure

Status: done

## Story

As a **developer**,
I want **a well-defined project file format with types and validation**,
So that **projects can be saved, loaded, and shared reliably**.

## Acceptance Criteria

1. **Given** a project needs to be saved, **When** the file format is used, **Then** it includes a `version` field (`"1.0"`) for compatibility checking
2. **Given** a project file is created, **When** I examine its structure, **Then** it contains `protocolId`, `protocolName`, `createdAt`, and `lastModifiedAt` (ISO 8601)
3. **Given** a project has a confirmed outline, **When** the file is saved, **Then** it contains `outline` object with `sections` array, `confirmedAt`, and `confirmedBy`
4. **Given** a project has generated sections, **When** the file is saved, **Then** it contains `sections` array with each section's `id`, `name`, `content`, `status`, `originalPrompt`, and optional `approval`
5. **Given** a section is in "generating", "regenerating", "editing", or "error" status, **When** the project is saved, **Then** the section is saved with status `"ready"` (transient states not persisted) and partial content is preserved
6. **Given** future versions add new fields, **When** an older version loads a newer file, **Then** unknown fields are preserved on save (forward compatibility)
7. **Given** I need to validate a project file, **When** I check its structure, **Then** required fields are enforced: `version`, `protocolId`, `sections`

## Tasks / Subtasks

- [x] Task 1: Create `ProjectFile` interface and related types in `frontend/src/types/project.ts` (AC: 1-4)
  - [x] 1.1: Define `PersistableStatus` type (`"ready" | "edited" | "approved"`)
  - [x] 1.2: Define `ProjectFileSection` interface (serialized section shape)
  - [x] 1.3: Define `ProjectFileOutline` interface (serialized outline shape)
  - [x] 1.4: Define `ProjectFile` interface (top-level file shape with index signature for forward compat)
- [x] Task 2: Create `frontend/src/lib/projectFile.ts` with serialization/deserialization (AC: 1-6)
  - [x] 2.1: `serializeProject(project: ProjectState, createdAt?: string): ProjectFile` — maps `ProjectState` to `ProjectFile`, coerces transient statuses to `"ready"`
  - [x] 2.2: `deserializeProject(file: ProjectFile): ProjectState` — maps `ProjectFile` back to `ProjectState`
  - [x] 2.3: Handle `createdAt` / `lastModifiedAt` timestamps (ISO 8601 via `new Date().toISOString()`)
  - [x] 2.4: Preserve unknown fields through index signature on `ProjectFile` interface
- [x] Task 3: Create `validateProjectFile()` in `frontend/src/lib/projectFile.ts` (AC: 7)
  - [x] 3.1: Check required fields: `version`, `protocolId`, `sections` (array)
  - [x] 3.2: Validate section structure: each section has `id`, `name`, `content`, `status`
  - [x] 3.3: Return `{ valid: boolean; errors: string[]; warnings?: string[] }` — collect all errors, don't fail on first
  - [x] 3.4: Validate version field (warn on unrecognized version, don't reject)
- [x] Task 4: Write unit tests in `frontend/src/__tests__/projectFile.test.ts` (AC: 1-7)
  - [x] 4.1: Test serialization maps transient statuses to `"ready"`
  - [x] 4.2: Test serialization preserves approval data on approved sections
  - [x] 4.3: Test deserialization restores `ProjectState` correctly
  - [x] 4.4: Test validation rejects missing required fields
  - [x] 4.5: Test validation accepts valid project files
  - [x] 4.6: Test forward compatibility (unknown fields preserved)
  - [x] 4.7: Test version warning on unrecognized version

## Dev Notes

### Existing Types to Build On

The existing types in `frontend/src/types/project.ts` already define most of the runtime shapes:

```typescript
// Already exists — DO NOT modify these:
export type SectionStatus = "generating" | "regenerating" | "ready" | "editing" | "edited" | "approved" | "error";
export interface SectionApproval { userName: string; userEmail: string; timestamp: string; }
export interface SectionState { id: string; name: string; content: string; status: SectionStatus; originalPrompt: string; approval?: SectionApproval; }
export interface ConfirmedOutline { sections: string[]; confirmedAt: string; confirmedBy: { name: string; email: string; }; }
export interface ProjectState { protocolId: string; protocolName: string; outline: ConfirmedOutline | null; sections: SectionState[]; generatedOutline: GeneratedOutlineCache | null; }
```

The **new** types for the file format are a subset of the runtime types — the key difference is that `status` in the file is restricted to `"ready" | "edited" | "approved"` (no transient states), and the file adds `version`, `createdAt`, `lastModifiedAt`.

### Architecture Specification

From `architecture.md`, the project file format is:

```json
{
  "version": "1.0",
  "protocolId": "string",
  "protocolName": "string",
  "createdAt": "ISO8601",
  "lastModifiedAt": "ISO8601",
  "outline": {
    "sections": ["Purpose", "Procedures"],
    "confirmedAt": "ISO8601",
    "confirmedBy": { "name": "string", "email": "string" }
  },
  "sections": [
    {
      "id": "string",
      "name": "string",
      "content": "string",
      "status": "ready|edited|approved",
      "originalPrompt": "string",
      "approval": { "userName": "string", "userEmail": "string", "timestamp": "ISO8601" }
    }
  ]
}
```

### Key Design Decisions

1. **Status mapping**: `"generating"`, `"regenerating"`, `"editing"`, `"error"` all map to `"ready"` on save. Content is preserved as-is.
2. **Forward compatibility**: Use spread operator to preserve unknown fields. When deserializing, `{ ...rest }` captures any extra fields and they get re-serialized on save.
3. **No Zod or external validation library**: The project doesn't use any validation libraries. Use plain TypeScript type guards with manual field checking.
4. **`generatedOutline` is NOT saved**: This is a transient UI cache (outline checkbox state). It's not part of the project file. On load, `generatedOutline` will be `null`.
5. **`protocolName` lives in `ProjectState` already**: The existing `ProjectState` has `protocolName`, so no changes needed to the context/reducer — just the file needs it persisted.

### State Management Context

The project uses React Context + `useReducer` in `frontend/src/lib/project.tsx`. Story 7.1 does NOT modify the context/reducer — that's Story 7.3's responsibility (adding a `LOAD_PROJECT` action). This story only defines types, serialization, deserialization, and validation.

### Serialization Logic

```typescript
// Pseudocode for serializeProject:
function serializeProject(project: ProjectState, createdAt?: string): ProjectFile {
  const now = new Date().toISOString();
  return {
    version: "1.0",
    protocolId: project.protocolId,
    protocolName: project.protocolName,
    createdAt: createdAt ?? now,  // Preserve original if re-saving
    lastModifiedAt: now,
    outline: project.outline ? { ...project.outline } : undefined,
    sections: project.sections.map(s => ({
      id: s.id,
      name: s.name,
      content: s.content,
      status: mapToPersistableStatus(s.status),  // transient → "ready"
      originalPrompt: s.originalPrompt,
      ...(s.approval ? { approval: s.approval } : {}),
    })),
  };
}
```

### File Structure

| File | Action |
|------|--------|
| `frontend/src/types/project.ts` | **MODIFY** — Add `PersistableStatus`, `ProjectFileSection`, `ProjectFileOutline`, `ProjectFile` |
| `frontend/src/lib/projectFile.ts` | **CREATE** — `serializeProject()`, `deserializeProject()`, `validateProjectFile()` |
| `frontend/src/__tests__/projectFile.test.ts` | **CREATE** — Unit tests for all serialization/validation logic |

### Testing Standards

- Jest 30, minimum 80% coverage (project achieves ~97-99%)
- Test file location: `frontend/src/__tests__/projectFile.test.ts`
- No mocking needed — this is pure data transformation logic
- Test edge cases: empty sections array, missing optional fields, unrecognized version, extra unknown fields

### Project Structure Notes

- All frontend types in `frontend/src/types/`
- Lib utilities in `frontend/src/lib/`
- Tests in `frontend/src/__tests__/`
- camelCase for all JSON fields per architecture conventions

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture — Project File Format]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 7.1]
- [Source: _bmad-output/planning-artifacts/prd.md — FR25, NFR3, NFR12-14]
- [Source: frontend/src/types/project.ts — Existing type definitions]
- [Source: frontend/src/lib/project.tsx — React Context + useReducer pattern]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None — all tests passed on first run.

### Completion Notes List

- Added 4 new types to `project.ts`: `PersistableStatus`, `ProjectFileSection`, `ProjectFileOutline`, `ProjectFile`
- `ProjectFile` uses index signature `[key: string]: unknown` for forward compatibility
- Created `projectFile.ts` with `mapToPersistableStatus()`, `serializeProject()`, `deserializeProject()`, `validateProjectFile()`, `extractExtraFields()`
- `serializeProject` accepts optional `createdAt` param to preserve original timestamp on re-saves
- `serializeProject` accepts optional `existingFile` param to preserve unknown fields from future versions (forward compatibility — AC6)
- `validateProjectFile` accepts `unknown` for safe use with raw `JSON.parse()` output
- `validateProjectFile` returns `{ valid, errors, warnings? }` — warnings used for unrecognized version
- Section validation includes `originalPrompt` as a required field
- Transient statuses (generating, regenerating, editing, error) all coerce to "ready"
- `generatedOutline` is intentionally excluded from file format (transient UI cache)
- 47 unit tests covering all acceptance criteria, edge cases, and forward compatibility round-trip

**Code Review Fixes Applied (2026-02-26):**
- [HIGH] Fixed forward compatibility: `serializeProject` now merges unknown fields from `existingFile` via `extractExtraFields()`
- [MEDIUM] Changed `validateProjectFile` param from `ProjectFile` to `unknown` for runtime safety
- [MEDIUM] Added `originalPrompt` to section validation checks
- Full regression suite: 149 backend + 345 frontend tests pass (0 failures)

### File List

- `frontend/src/types/project.ts` — **MODIFIED** — Added `PersistableStatus`, `ProjectFileSection`, `ProjectFileOutline`, `ProjectFile`
- `frontend/src/lib/projectFile.ts` — **CREATED** — `serializeProject()`, `deserializeProject()`, `validateProjectFile()`, `mapToPersistableStatus()`, `extractExtraFields()`
- `frontend/src/__tests__/projectFile.test.ts` — **CREATED** — 47 unit tests

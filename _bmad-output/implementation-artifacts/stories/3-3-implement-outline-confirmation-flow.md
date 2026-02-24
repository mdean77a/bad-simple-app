# Story 3.3: Implement Outline Confirmation Flow

Status: dev-complete

## Story

As a **research coordinator**,
I want **to confirm my outline selections and proceed to section generation**,
so that **the system generates only the sections I've chosen**.

## Acceptance Criteria

1. **Given** I am on the outline review page, **When** I have reviewed and adjusted the checklist, **Then** I see a "Confirm Outline" button at the bottom (FR15).
2. **Given** I click "Confirm Outline", **When** the confirmation is processed, **Then** the selected sections are stored in project state **And** I am navigated to the section dashboard page (`/projects/[id]`).
3. **Given** outline confirmation succeeds, **When** I arrive at the dashboard, **Then** the confirmed outline is recorded with `confirmedAt` timestamp (ISO 8601) and `confirmedBy` user info (`{name, email}`).
4. **Given** I have not checked any sections, **When** I try to click "Confirm Outline", **Then** the button is disabled **And** I see a message indicating at least one section must be selected.
5. **Given** I want to go back and change my protocol selection, **When** I click the back navigation, **Then** I return to the protocol selection page **And** my outline progress is not saved.
6. **Given** outline generation is still loading, **When** I view the page, **Then** I see a loading state with spinner **And** the "Confirm Outline" button is disabled.

## Tasks / Subtasks

- [x] Task 1: Create Project State Context (AC: #2, #3)
  - [x] 1.1 Create `src/types/project.ts` with `ConfirmedOutline`, `Section`, `ProjectState` interfaces
  - [x] 1.2 Create `src/lib/project.tsx` with ProjectContext and ProjectProvider
  - [x] 1.3 Wire ProjectProvider into `src/app/layout.tsx` (wrap inside AuthProvider)
- [x] Task 2: Create ConfirmButton component (AC: #1, #4, #6)
  - [x] 2.1 Create `src/components/outline/ConfirmButton.tsx`
  - [x] 2.2 Green primary button, disabled when no sections checked or while loading
  - [x] 2.3 Show helper text when disabled due to no sections selected
- [x] Task 3: Update outline page to integrate ConfirmButton (AC: #1, #2, #3, #5)
  - [x] 3.1 Add ConfirmButton below OutlineChecklist in `src/app/projects/[id]/outline/page.tsx`
  - [x] 3.2 On confirm: build confirmed outline object with UUID section IDs, store in ProjectContext, navigate to `/projects/[id]`
  - [x] 3.3 Back navigation returns to `/projects/new` (already implemented)
- [x] Task 4: Create placeholder dashboard page (AC: #2)
  - [x] 4.1 Create `src/app/projects/[id]/page.tsx` as a placeholder for the section dashboard
  - [x] 4.2 Display confirmed sections list and confirmation metadata (Epic 4 will build the real dashboard)
- [x] Task 5: Write unit tests (80%+ coverage)
  - [x] 5.1 Test ConfirmButton renders, disabled states, click handler
  - [x] 5.2 Test outline page confirm flow: click → context update → navigation
  - [x] 5.3 Test ProjectContext/Provider: state updates, confirmed outline storage
  - [x] 5.4 Test placeholder dashboard page reads from context
  - [x] 5.5 Test disabled state when no sections checked
  - [x] 5.6 Test disabled state during loading

## Dev Notes

### Architecture & Approach

**Project State Management:**
The architecture specifies "React built-in state management" with no external libraries. This story introduces a `ProjectContext` (React Context + useReducer) to share project state across pages (outline → dashboard). This is the first time cross-page state is needed.

The context will hold the confirmed outline data and later (Epic 4+) the section generation state, approvals, etc. Keep it minimal for now — only store what this story requires plus the foundation for future expansion.

**UUID Generation:**
Generate UUID v4 for each confirmed section at confirmation time using `crypto.randomUUID()` (supported in all target browsers: Chrome 92+, Safari 15.4+). No external UUID library needed.

**Dashboard Page:**
Epic 4 (Story 4.2) will build the real section dashboard. For Story 3.3, create a minimal placeholder page at `/projects/[id]/page.tsx` that reads from ProjectContext and displays the confirmed sections. This ensures the navigation target exists and the context pipeline works end-to-end.

### Technical Requirements

**Section State Machine** (from Architecture):
```typescript
type SectionStatus = "generating" | "ready" | "editing" | "edited" | "approved" | "error";
```
At confirmation time, each section should be initialized with status `"generating"` — Epic 4 will trigger actual generation.

**Confirmed Outline Data Structure** (from Architecture + Epics):
```typescript
interface ConfirmedOutline {
  sections: string[];          // Section names in order
  confirmedAt: string;         // ISO 8601
  confirmedBy: {
    name: string;
    email: string;
  };
}

interface SectionState {
  id: string;                  // UUID v4
  name: string;                // Section name
  content: string;             // Empty initially
  status: SectionStatus;       // "generating" at confirmation
  originalPrompt: string;      // Empty initially
  approval?: {
    userName: string;
    userEmail: string;
    timestamp: string;          // ISO 8601
  };
}
```

**API JSON Convention:** camelCase for all fields (matches architecture spec).

### Project Structure Notes

**New files to create:**
- `frontend/src/types/project.ts` — Project/Section TypeScript interfaces
- `frontend/src/lib/project.tsx` — ProjectContext, ProjectProvider, useProject hook
- `frontend/src/components/outline/ConfirmButton.tsx` — Confirm button component
- `frontend/src/app/projects/[id]/page.tsx` — Placeholder dashboard page
- `frontend/src/__tests__/ConfirmButton.test.tsx`
- `frontend/src/__tests__/project-context.test.tsx`
- `frontend/src/__tests__/dashboard-placeholder.test.tsx`

**Files to modify:**
- `frontend/src/app/layout.tsx` — Add ProjectProvider wrapper
- `frontend/src/app/projects/[id]/outline/page.tsx` — Add ConfirmButton integration

### Existing Code Patterns to Follow

**Component pattern** (from OutlineChecklist.tsx):
- Functional components with TypeScript interfaces for props
- Direct Tailwind utility classes
- No separate CSS files

**Page pattern** (from outline/page.tsx):
- `"use client"` directive at top
- `useParams()` for route params, `useRouter()` for navigation
- `useAuth()` for user identity
- State type union for loading/error/loaded states
- `useEffect` for data fetching on mount

**Test pattern** (from existing tests):
- Mock `next/navigation` with `jest.fn()` for push/replace
- Mock API functions via `jest.mock("@/lib/api")`
- Wrap components in `<AuthProvider>` for rendering
- Set `localStorage` user before rendering
- Use `@testing-library/react` with `screen`, `waitFor`, `fireEvent`
- Group tests in `describe` blocks, `beforeEach` for setup

**Button styling** (from UX spec):
- Primary/Approve: `bg-emerald-500 text-white hover:bg-emerald-600`
- Disabled: `opacity-50 cursor-not-allowed`
- Size lg for prominent actions

### Accessibility Requirements

- Confirm button: `aria-label="Confirm outline and begin generation"`
- Disabled state: `aria-disabled="true"` attribute
- Helper text for disabled reason connected via `aria-describedby`
- Keyboard: Enter activates the button when focused
- Focus ring: `focus:ring-2 focus:ring-violet-500`

### References

- [Source: epics.md#Story 3.3] — Full acceptance criteria and technical notes
- [Source: architecture.md#Data Architecture] — Project file format, confirmed outline structure
- [Source: architecture.md#State Management Patterns] — SectionStatus state machine, DashboardState
- [Source: architecture.md#Frontend Architecture] — React built-in state, no external libs
- [Source: architecture.md#Naming Patterns] — camelCase for TypeScript, JSON fields
- [Source: architecture.md#Project Structure] — Component and page file locations
- [Source: ux-design-specification.md#Outline Checklist] — Approve Outline button, interaction behavior
- [Source: ux-design-specification.md#Button] — Primary green button styling, disabled states
- [Source: ux-design-specification.md#Accessibility] — WCAG 2.1 AA, focus indicators, ARIA labels

### Library/Framework Notes

- **Next.js 16.1.6** — App Router, `useParams()` for dynamic `[id]` segments
- **React 19.2.3** — `useReducer` for complex state (ProjectContext), `useContext` for sharing
- **Tailwind CSS v4** — CSS-first config, no `tailwind.config.js`; utilities unchanged
- **Jest 30.2.0** — Standard testing setup with `@testing-library/react` 16.x
- **No additional dependencies needed** — `crypto.randomUUID()` is a browser API

### Previous Story Intelligence

**Story 3.1** (Outline Generation Endpoint):
- Created `backend/src/api/routes/outline.py` with `POST /api/v1/outline/generate`
- Response format: `{ protocolId, sections: [{ sectionName, category, isConditional, defaultChecked, detectionReason }] }`
- Standard/Conditional/Signature section categories established

**Story 3.2** (Outline Checklist UI):
- Created `src/app/projects/[id]/outline/page.tsx` — fetches outline, manages checkedState
- Created `src/components/outline/OutlineChecklist.tsx` — groups sections by category, renders checkboxes
- State pattern: `PageState` union type (`loading | error | loaded`)
- checkedState: `Record<string, boolean>` keyed by section name
- Back navigation to `/projects/new` already implemented
- No OutlineCheckbox separate component (inline checkboxes in OutlineChecklist)

**Git commits** show consistent patterns:
- `feat(story-X.Y): Description` commit format
- Tests co-located in `src/__tests__/`
- 100% coverage maintained across stories

### What NOT to Do

- Do NOT install any new npm packages (no uuid library, no state management library)
- Do NOT create a full dashboard implementation — only a placeholder page
- Do NOT call any backend API on confirm (outline confirmation is frontend-only per architecture)
- Do NOT persist project state to localStorage at this point (Epic 7 handles persistence)
- Do NOT create an OutlineCheckbox component — checkboxes are already inline in OutlineChecklist
- Do NOT modify OutlineChecklist.tsx — it is a presentational component; add ConfirmButton in the page

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
N/A

### Completion Notes List
- All 6 acceptance criteria satisfied
- 151 tests passing (14 test suites), 97.39% overall coverage
- New files all at 100% statement coverage
- types/project.ts shows 0% in coverage report but is purely type definitions (no runtime code)
- No new npm dependencies added
- crypto.randomUUID() used for UUID generation (browser API)

### File List

**New files created:**
- `frontend/src/types/project.ts` — SectionStatus, SectionApproval, SectionState, ConfirmedOutline, ProjectState types
- `frontend/src/lib/project.tsx` — ProjectContext, ProjectProvider, useProject hook (useReducer)
- `frontend/src/components/outline/ConfirmButton.tsx` — Confirm button with disabled/helper states
- `frontend/src/app/projects/[id]/page.tsx` — Placeholder dashboard page
- `frontend/src/__tests__/ConfirmButton.test.tsx` — 8 tests for ConfirmButton component
- `frontend/src/__tests__/project-context.test.tsx` — 4 tests for ProjectContext
- `frontend/src/__tests__/dashboard-placeholder.test.tsx` — 7 tests for dashboard placeholder

**Files modified:**
- `frontend/src/app/layout.tsx` — Added ProjectProvider wrapper inside AuthProvider
- `frontend/src/app/projects/[id]/outline/page.tsx` — Integrated ConfirmButton, handleConfirm, useProject
- `frontend/src/__tests__/outline-page.test.tsx` — Added ProjectProvider wrapper + 4 confirm flow tests

# Story 6.1: Display Approval Information on Section Cards

Status: ready-for-dev

## Story

As a research coordinator,
I want to see who approved each section and when,
so that I have clear accountability records for regulatory purposes.

## Acceptance Criteria

1. **Given** a section has been approved, **When** I view the section card, **Then** I see an Approval Badge showing the approver's name and the approval timestamp formatted as "Feb 3, 2026 at 2:30 PM" (FR33)
2. **Given** a section has been approved, **When** I view the Approval Badge, **Then** it displays below the status line (word count / status) and is visually distinct but not overwhelming
3. **Given** a section has not been approved, **When** I view the section card, **Then** no Approval Badge is displayed
4. **Given** I am viewing an approved section, **When** I look at the approval information, **Then** I can identify the most recent approver (FR31)
5. **Given** multiple users work on the same project, **When** different users approve different sections, **Then** each section shows its own approver correctly
6. **Given** I am on the dashboard, **When** I scan all section cards, **Then** I can quickly distinguish which sections are approved and by whom

## Tasks / Subtasks

- [ ] Task 1: Create `ApprovalBadge` component (AC: 1, 2, 3)
  - [ ] 1.1 Create `frontend/src/components/dashboard/ApprovalBadge.tsx`
  - [ ] 1.2 Accept `userName: string` and `timestamp: string` (ISO 8601) as props
  - [ ] 1.3 Format timestamp as "MMM D, YYYY at h:mm AM/PM" (e.g., "Feb 3, 2026 at 2:30 PM")
  - [ ] 1.4 Render a small, subtle badge with a check-circle icon, approver name, and formatted time
  - [ ] 1.5 Use Tailwind classes consistent with existing SectionCard styling (emerald/green for approval theme)
- [ ] Task 2: Integrate into `SectionCard` (AC: 2, 3, 6)
  - [ ] 2.1 Import `ApprovalBadge` in `SectionCard.tsx`
  - [ ] 2.2 Conditionally render `ApprovalBadge` when `section.approval` exists
  - [ ] 2.3 Position below the subtitle line ("X words - Status: ...")
- [ ] Task 3: Write unit tests (AC: 1-6)
  - [ ] 3.1 Test `ApprovalBadge` renders name and formatted timestamp
  - [ ] 3.2 Test `ApprovalBadge` is not rendered when approval is undefined
  - [ ] 3.3 Test timestamp formatting for various dates/times (AM/PM, midnight, noon edge cases)
  - [ ] 3.4 Test integration: SectionCard renders ApprovalBadge when section has approval data
  - [ ] 3.5 Test integration: SectionCard does NOT render ApprovalBadge when section has no approval
  - [ ] 3.6 Verify accessibility (aria attributes, screen reader text)

## Dev Notes

### Existing Data Structure (already implemented in Story 5.1)

The approval data structure is already defined and populated — no backend changes needed.

**`frontend/src/types/project.ts`:**
```typescript
export interface SectionApproval {
  userName: string;
  userEmail: string;
  timestamp: string; // ISO 8601
}

export interface SectionState {
  // ...
  approval?: SectionApproval;
}
```

The `onApprove` handler in the dashboard already sets this data using auth context (`userName`, `userEmail`, ISO timestamp).

### Key Implementation Details

**Timestamp formatting:** Use `Intl.DateTimeFormat` or manual `Date` parsing — do NOT add a date library (no dayjs/moment). Format: `"Feb 3, 2026 at 2:30 PM"`. Create a small helper function (e.g., `formatApprovalDate`) either inline in ApprovalBadge or as a utility if it will be reused.

**Component placement in SectionCard:** Insert the ApprovalBadge between the existing subtitle `<p>` (line ~178, "X words - Status: ...") and the content area `<div>` (line ~183). Only render when `section.approval` is defined.

**Styling approach:** Use Tailwind classes consistent with the existing card. The badge should be subtle — small text, emerald/green accent to match the approved border color (`border-l-emerald-500`). Consider something like:
- Small check-circle SVG icon (emerald-500)
- Text: "Approved by {name} on {date}" in `text-xs text-slate-500`

### Files to Create/Modify

| File | Action |
|------|--------|
| `frontend/src/components/dashboard/ApprovalBadge.tsx` | **CREATE** — New presentational component |
| `frontend/src/components/dashboard/SectionCard.tsx` | **MODIFY** — Import and render ApprovalBadge |
| `frontend/src/__tests__/ApprovalBadge.test.tsx` | **CREATE** — Unit tests for ApprovalBadge |
| `frontend/src/__tests__/SectionCard.test.tsx` | **MODIFY** — Add approval badge integration tests |

### Project Structure Notes

- Component goes in `frontend/src/components/dashboard/` alongside SectionCard, RegenerateModal, etc.
- Tests go in `frontend/src/__tests__/` following existing pattern
- No backend changes required — this is purely frontend display of existing data
- No new dependencies needed

### Testing Patterns (from previous stories)

- Wrap components with `<AuthProvider>` and `<ProjectProvider>` in tests
- Use `screen.getByText()` / `screen.queryByText()` for presence/absence checks
- Mock data: use `SectionState` objects with/without the `approval` field
- Existing `SectionCard.test.tsx` has examples of rendering with different section states

### Previous Story Intelligence

**From Stories 5.1-5.4:**
- The approve flow is fully working — clicking Approve records `{userName, userEmail, timestamp}` from auth context
- The Approve button already hides when `status === "approved"` (SectionCard line 102)
- The approved state uses emerald color theme (`border-l-emerald-500`, emerald button)
- Status labels already show "Approved" text

**From Story 4.3-4.4:**
- SectionCard is a well-established component with consistent patterns
- StatusIcon component handles status display in the header row

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 6, Story 6.1]
- [Source: _bmad-output/planning-artifacts/prd.md — FR31, FR33]
- [Source: frontend/src/types/project.ts — SectionApproval interface]
- [Source: frontend/src/components/dashboard/SectionCard.tsx — integration point]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

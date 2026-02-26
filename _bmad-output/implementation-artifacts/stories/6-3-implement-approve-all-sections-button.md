# Story 6.3: Implement Approve All Sections Button

Status: ready-for-dev

## Story

As a research coordinator,
I want to approve all ready sections at once,
so that I can quickly finalize the document after reviewing all content.

## Acceptance Criteria

1. **Given** one or more sections are in "ready" or "edited" status, **When** I view the Action Bar, **Then** the "Approve All Sections" button is enabled (FR34)
2. **Given** I click "Approve All Sections", **Then** all sections in "ready" or "edited" status are approved **And** each records me as approver with current timestamp **And** already "approved" sections remain unchanged **And** "generating"/"error" sections are skipped
3. **Given** I click "Approve All Sections", **Then** all affected sections update to "Approved" status **And** Approval Badges appear on each newly approved section
4. **Given** all sections are already approved, **When** I view the Action Bar, **Then** the button shows "All Approved" with a check icon and is disabled
5. **Given** sections are still generating, **When** I view the Action Bar, **Then** the "Approve All Sections" button is disabled

## Tasks / Subtasks

- [ ] Task 1: Update ActionBar component to accept props and manage button state (AC: 1, 4, 5)
- [ ] Task 2: Add handleApproveAll to dashboard page and pass to ActionBar (AC: 2, 3)
- [ ] Task 3: Write tests for ActionBar button states and dashboard integration (AC: 1-5)

## Dev Notes

### Files to Modify

| File | Action |
|------|--------|
| `frontend/src/components/dashboard/ActionBar.tsx` | **MODIFY** — Accept props, wire Approve All button |
| `frontend/src/app/projects/[id]/page.tsx` | **MODIFY** — Add handleApproveAll, pass props to ActionBar |
| `frontend/src/__tests__/ActionBar.test.tsx` | **MODIFY** — Test button states |
| `frontend/src/__tests__/dashboard-placeholder.test.tsx` | **MODIFY** — Integration test for approve all |

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 6, Story 6.3]
- [Source: frontend/src/components/dashboard/ActionBar.tsx — current placeholder]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

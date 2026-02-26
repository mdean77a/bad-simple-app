# Story 6.2: Track Re-approval After Edits

Status: ready-for-dev

## Story

As a research coordinator,
I want approval to be cleared when I edit an approved section,
so that edits are always reviewed before the document is finalized.

## Acceptance Criteria

1. **Given** a section is approved, **When** I click "Edit" and make changes, **Then** the section status changes to "editing" and approval is cleared, **And** when I save, the status becomes "edited" (not "approved") (FR32)
2. **Given** a section was previously approved by User A, **When** I (User B) edit and then re-approve the section, **Then** the approval record is updated to show User B as the approver **And** the timestamp is updated to the re-approval time
3. **Given** a section is approved, **When** I trigger regeneration, **Then** the approval is cleared **And** the regenerated section must be approved again
4. **Given** a section was previously approved, **When** I view it after editing (before re-approval), **Then** the Approval Badge is not displayed **And** the section shows "edited" status requiring approval
5. **Given** I re-approve an edited section, **When** the approval is recorded, **Then** only the most recent approver is tracked (FR33) **And** previous approval history is replaced, not appended
6. **Given** an approved section is being edited, **When** I click Cancel, **Then** the approval is restored along with the previous status

## Tasks / Subtasks

- [ ] Task 1: Update handleEdit to clear approval on edit start (AC: 1, 6)
  - [ ] 1.1 Change prevStatusRef type to store both status and approval
  - [ ] 1.2 Save previous approval in ref before clearing
  - [ ] 1.3 Clear approval in updateSection call
- [ ] Task 2: Update handleCancel to restore approval (AC: 6)
  - [ ] 2.1 Restore both status and approval from saved ref
- [ ] Task 3: Write integration tests (AC: 1-6)
  - [ ] 3.1 Test approval badge disappears immediately when editing approved section
  - [ ] 3.2 Test cancel on approved section restores approval badge
  - [ ] 3.3 Test re-approval after edit shows new user info
  - [ ] 3.4 Test regeneration clears approval (already partially tested)

## Dev Notes

### What's Already Implemented

- `handleSave` already clears `approval: undefined` (page.tsx line 52)
- `handleRegenerateSubmit` already clears `approval: undefined` (page.tsx line 73)
- `handleApprove` already records from current auth user (page.tsx line 28-37)
- Existing test verifies save clears approval (dashboard-placeholder.test.tsx line 475)

### What Needs to Change

**`frontend/src/app/projects/[id]/page.tsx`:**
- Change `prevStatusRef` from `Record<string, SectionStatus>` to `Record<string, { status: SectionStatus; approval?: SectionApproval }>`
- `handleEdit`: save previous approval, clear approval in updateSection
- `handleCancel`: restore both status and approval from ref

### Files to Modify

| File | Action |
|------|--------|
| `frontend/src/app/projects/[id]/page.tsx` | **MODIFY** — Update handleEdit/handleCancel for approval tracking |
| `frontend/src/__tests__/dashboard-placeholder.test.tsx` | **MODIFY** — Add re-approval integration tests |

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 6, Story 6.2]
- [Source: frontend/src/app/projects/[id]/page.tsx — handleEdit, handleSave, handleCancel]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

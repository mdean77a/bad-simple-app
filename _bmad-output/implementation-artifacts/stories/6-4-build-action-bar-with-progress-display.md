# Story 6.4: Build Action Bar with Progress Display

Status: ready-for-dev

## Story

As a research coordinator,
I want to see my overall progress and have quick access to bulk actions,
so that I know how close I am to completing the document.

## Acceptance Criteria

1. **Given** sections exist on the dashboard, **When** I view the Action Bar, **Then** I see a progress indicator showing "X/Y approved" (FR35a)
2. **Given** some sections are still generating, **When** I view the progress indicator, **Then** it shows "Generating..." instead of the count
3. **Given** I approve more sections, **When** the progress updates, **Then** the indicator reflects the new count immediately
4. **Given** all sections are approved, **When** I view the progress, **Then** it shows "X/X approved" with a check icon
5. **Given** all sections are approved, **When** I view export buttons, **Then** PDF, Word, and Markdown buttons are enabled
6. **Given** not all sections are approved, **When** I view export buttons, **Then** they are disabled
7. **Given** no sections are generating, **When** I view the Save Project button, **Then** it is enabled (no-op for now, Epic 7)
8. **Given** sections are generating, **When** I view the Save Project button, **Then** it is disabled
9. **Given** I am viewing on a smaller screen, **When** the Action Bar renders, **Then** it adapts layout appropriately

## Tasks / Subtasks

- [ ] Task 1: Add progress indicator to ActionBar (AC: 1-4)
- [ ] Task 2: Wire export button enabled/disabled state (AC: 5, 6)
- [ ] Task 3: Add Save Project button with generating guard (AC: 7, 8)
- [ ] Task 4: Add responsive layout for smaller screens (AC: 9)
- [ ] Task 5: Write tests (AC: 1-8)

## Dev Notes

### Files to Modify

| File | Action |
|------|--------|
| `frontend/src/components/dashboard/ActionBar.tsx` | **MODIFY** — Add progress, export states, save button |
| `frontend/src/__tests__/ActionBar.test.tsx` | **MODIFY** — Add tests for new features |

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

# Story 2.4: Build Protocol Upload UI

Status: ready-for-dev

## Story

As a **research coordinator**,
I want **a user-friendly interface to upload protocol PDFs**,
So that **I can easily add new protocols to the system**.

## Acceptance Criteria

1. **Given** I am logged in and on the landing page
   **When** I click "New Project"
   **Then** I am navigated to `/projects/new`
   **And** I see a file upload area with drag-and-drop support and a browse button

2. **Given** I drag a PDF file over the upload area
   **When** the file is over the drop zone
   **Then** the drop zone visually indicates it will accept the file (border highlight, background color change)

3. **Given** I drop or select a PDF file
   **When** the upload begins
   **Then** I see a spinner/progress indicator showing upload status
   **And** I see "Processing protocol..." message during extraction

4. **Given** the upload and processing completes successfully
   **When** the response is received
   **Then** I see a success message with the protocol name
   **And** I can proceed to the next step (placeholder for outline generation in Epic 3)

5. **Given** the upload fails (corrupt PDF, network error, non-PDF file)
   **When** the error response is received
   **Then** I see a specific error message explaining what went wrong
   **And** I can try uploading again

6. **Given** I interact with the upload UI
   **When** I click or drag
   **Then** the response is within 200ms (NFR4)

## Tasks / Subtasks

- [ ] Task 1: Add `uploadProtocol()` to the frontend API client (AC: #3, #4, #5)
  - [ ] Add `uploadProtocol(file: File)` to `frontend/src/lib/api.ts`
  - [ ] POST to `{API_BASE_URL}/api/v1/protocols/upload` with FormData
  - [ ] Return `{ protocolId, protocolName }` on success
  - [ ] Throw typed errors for VALIDATION_ERROR, PDF_PARSE_ERROR, network errors

- [ ] Task 2: Create the ProtocolUpload component (AC: #1, #2, #3, #4, #5)
  - [ ] Create `frontend/src/components/projects/ProtocolUpload.tsx`
  - [ ] Implement drag-and-drop zone with visual states: default, dragging-over, uploading, success, error
  - [ ] Include hidden `<input type="file" accept=".pdf">` with browse button trigger
  - [ ] Show spinner during upload/processing
  - [ ] Show success state with protocol name and "Continue" button (disabled placeholder for now)
  - [ ] Show error state with message and "Try Again" button

- [ ] Task 3: Create the new project page (AC: #1)
  - [ ] Create `frontend/src/app/projects/new/page.tsx`
  - [ ] Include PageHeader with title "New Project" and back navigation
  - [ ] Render the ProtocolUpload component
  - [ ] Wrap in auth check (redirect to login if not authenticated)

- [ ] Task 4: Wire up "New Project" button on landing page (AC: #1)
  - [ ] Update `frontend/src/app/page.tsx` — enable the "New Project" button
  - [ ] Add Next.js `Link` or `useRouter` navigation to `/projects/new`

- [ ] Task 5: Write tests (AC: all)
  - [ ] Test `uploadProtocol()` API function (success, validation error, parse error, network error)
  - [ ] Test ProtocolUpload component states (default, dragging, uploading, success, error)
  - [ ] Test new project page renders with header and upload component
  - [ ] Test "New Project" button navigates to `/projects/new`
  - [ ] Achieve 80%+ coverage on all new files

## Dev Notes

### Existing Code to Build On

- **API client:** `frontend/src/lib/api.ts` — already has `API_BASE_URL` and `checkHealth()`. Add `uploadProtocol()` here.
- **Backend endpoint:** `POST /api/v1/protocols/upload` already exists in `backend/src/api/routes/protocols.py`. Accepts `multipart/form-data` with a `file` field. Returns `{ protocolId, protocolName, textContent, pageCount }` on success. Returns `422` with `{ code, detail }` on error.
- **Auth context:** `frontend/src/lib/auth.tsx` — use `useAuth()` to check login state on the new project page.
- **PageHeader:** `frontend/src/components/layout/PageHeader.tsx` — reuse with `title="New Project"`.
- **Landing page:** `frontend/src/app/page.tsx` — "New Project" button exists but is disabled. Enable it and add navigation.

### Backend Error Response Format

The backend returns errors as:
```json
{ "code": "VALIDATION_ERROR", "detail": "File must have a .pdf extension" }
{ "code": "PDF_PARSE_ERROR", "detail": "Failed to extract text: corrupted file" }
```
Status code is `422` for both. The frontend should extract `detail` for user-facing messages.

### Architecture Compliance

- **Component location:** `src/components/projects/ProtocolUpload.tsx` per architecture spec
- **Page location:** `src/app/projects/new/page.tsx` per architecture spec
- **Naming:** PascalCase for components, camelCase for functions/variables
- **Styling:** Tailwind CSS with violet-600 primary, emerald-500 success, red-500 error, slate for neutral
- **No external libraries** for file upload — use native HTML5 drag-and-drop API + `<input type="file">`
- **State management:** React `useState` only — no external state libraries

### File Upload Component States

| State | Visual |
|-------|--------|
| Default | Dashed border, instruction text, browse button |
| Drag over | Highlighted border (violet), light background |
| Uploading | Spinner, "Processing protocol..." text |
| Success | Green checkmark, protocol name, "Continue" button |
| Error | Red border, error message, "Try Again" button |

### Accessibility Requirements

- Semantic `<input type="file" accept=".pdf">` element
- `aria-label="Upload protocol PDF"` on drop zone
- Error messages via `aria-live="assertive"`
- Focus ring on interactive elements (`focus:ring-2`)
- Keyboard accessible: Tab to browse button, Enter to activate

### Project Structure Notes

New files to create:
```
frontend/src/
├── app/projects/new/page.tsx          # New project page
├── components/projects/
│   └── ProtocolUpload.tsx             # Upload component with drag-and-drop
├── __tests__/
│   ├── api.test.ts                    # (extend existing) uploadProtocol tests
│   ├── ProtocolUpload.test.tsx        # Upload component tests
│   └── new-project-page.test.tsx      # New project page tests
└── lib/
    └── api.ts                         # (extend existing) add uploadProtocol()
```

Files to modify:
```
frontend/src/app/page.tsx              # Enable "New Project" button with navigation
frontend/src/__tests__/page.test.tsx   # Update tests for enabled button
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-2.4]
- [Source: _bmad-output/planning-artifacts/architecture.md#API-Endpoints]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#File-Upload-Component]
- [Source: backend/src/api/routes/protocols.py — existing upload endpoint]
- [Source: frontend/src/lib/api.ts — existing API client]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

# Story 2.6: Add Protocol Acronym

Status: ready-for-dev

## Story

As a **research coordinator**,
I want **to provide a short acronym when uploading a protocol** (e.g., THAPCA, FLUID, PRECISE),
so that **protocols are easily identifiable by their commonly known abbreviation**.

## Acceptance Criteria

1. **Given** I am on the upload page, **When** I view the upload form, **Then** I see a required text input for "Protocol Acronym" alongside the file upload.

2. **Given** I am entering an acronym, **When** I type fewer than 5 or more than 15 characters, **Then** I see a validation error and cannot submit.

3. **Given** I select a PDF and enter a valid acronym (5-15 characters), **When** I click upload, **Then** the acronym is sent to the backend along with the file.

4. **Given** the backend receives a file and acronym, **When** the upload is processed, **Then** the acronym is stored as metadata in Qdrant chunks **And** the upload response includes the acronym.

5. **Given** I upload without providing an acronym, **When** I attempt to submit, **Then** the form shows a validation error "Protocol acronym is required".

6. **Given** protocols have been indexed with acronyms, **When** I call `GET /api/v1/protocols`, **Then** each item in the response includes the `acronym` field.

## Tasks / Subtasks

- [ ] Task 1: Update backend upload endpoint to accept `acronym` form field (AC: #3, #4, #5)
  - [ ] 1.1: Add `acronym: str` parameter to POST `/upload` handler in `protocols.py`
  - [ ] 1.2: Validate acronym length (5-15 characters), return 422 VALIDATION_ERROR if invalid
  - [ ] 1.3: Pass acronym through to `index_protocol()`
  - [ ] 1.4: Include `acronym` in the upload response alongside `protocolId` and `protocolName`
- [ ] Task 2: Update vector store to store acronym in metadata (AC: #4)
  - [ ] 2.1: Add `acronym` parameter to `index_protocol()` function signature
  - [ ] 2.2: Store `acronym` in chunk metadata alongside existing `protocol_name` and `chunk_index`
- [ ] Task 3: Update `list_protocols()` to return acronym (AC: #6)
  - [ ] 3.1: Extract `acronym` from chunk metadata when listing protocols
  - [ ] 3.2: Include `acronym` in each protocol's response object
- [ ] Task 4: Update frontend upload UI to collect acronym (AC: #1, #2, #5)
  - [ ] 4.1: Add text input for "Protocol Acronym" to ProtocolUpload component
  - [ ] 4.2: Add client-side validation: required, 5-15 characters
  - [ ] 4.3: Send acronym as form field in upload request
  - [ ] 4.4: Update API client `uploadProtocol()` to accept and send acronym
- [ ] Task 5: Update backend tests (AC: #3, #4, #5)
  - [ ] 5.1: Update `test_protocols.py` — upload tests must include acronym field
  - [ ] 5.2: Update `test_vector_store.py` — verify acronym stored in metadata
  - [ ] 5.3: Add validation tests: missing acronym, too short, too long
  - [ ] 5.4: Update list endpoint tests to verify acronym in response
- [ ] Task 6: Update frontend tests (AC: #1, #2, #5)
  - [ ] 6.1: Update ProtocolUpload tests — acronym input rendering, validation, submission
  - [ ] 6.2: Update API client tests — acronym included in upload request

## Dev Notes

### Dependency Note

This story modifies code from completed stories (2.2, 2.4) and adds to story 2.3's list endpoint. If story 2.3 is implemented first, this story adds the `acronym` field to its response. If implemented before 2.3, the list endpoint should include `acronym` from the start.

### Backend Changes

**`backend/src/api/routes/protocols.py`** — existing upload endpoint:
- Currently accepts only `file: UploadFile`
- Add `acronym: str = Form(...)` parameter
- Validate: `5 <= len(acronym.strip()) <= 15`, return 422 if invalid
- Pass to `index_protocol(text, collection_name, protocol_name, acronym)`
- Response becomes: `{"protocolId": str, "protocolName": str, "acronym": str}`
- Use existing `_validation_error()` helper for acronym validation errors

**`backend/src/services/vector_store.py`** — `index_protocol()`:
- Add `acronym: str` parameter
- Update metadata per chunk: `{"chunk_index": i, "protocol_name": protocol_name, "acronym": acronym}`

**`backend/src/services/vector_store.py`** — `list_protocols()` (from story 2.3):
- When scrolling first point for metadata, also extract `acronym`
- Include in returned dict: `{"protocolId": ..., "protocolName": ..., "acronym": ..., "indexedAt": ...}`

### Frontend Changes

**`frontend/src/components/projects/ProtocolUpload.tsx`**:
- Add a text input above or below the file drop zone
- Label: "Protocol Acronym" with helper text (e.g., "e.g., THAPCA, FLUID, PRECISE")
- Validation: required, 5-15 characters
- Disable upload button until both file selected AND valid acronym entered
- Send as `FormData.append("acronym", acronym)` alongside the file

**`frontend/src/lib/api.ts`** — `uploadProtocol()`:
- Currently: `uploadProtocol(file: File)`
- Update to: `uploadProtocol(file: File, acronym: string)`
- Append acronym to FormData before sending

### Existing Code Patterns

- Upload endpoint uses `Form(...)` for multipart fields — add `acronym` the same way
- Frontend `ProtocolUpload.tsx` already has state management for file + upload status — add `acronym` state
- Validation pattern on frontend: inline error messages below input, same as LoginForm
- Backend error pattern: `_validation_error(detail)` returns `{"code": "VALIDATION_ERROR", "detail": str}`

### Testing Standards

- **Backend:** pytest + pytest-asyncio, mock external services
- **Frontend:** jest + @testing-library/react, 80% coverage threshold
- All existing upload tests must be updated to include acronym (they will break without it since it becomes required)
- Run backend: `cd backend && uv run pytest --cov=src --cov-report=term-missing`
- Run frontend: `cd frontend && npm test -- --coverage`

### References

- [Source: backend/src/api/routes/protocols.py] — existing upload endpoint
- [Source: backend/src/services/vector_store.py] — index_protocol() and metadata structure
- [Source: frontend/src/components/projects/ProtocolUpload.tsx] — existing upload UI
- [Source: frontend/src/lib/api.ts] — uploadProtocol() API client function

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

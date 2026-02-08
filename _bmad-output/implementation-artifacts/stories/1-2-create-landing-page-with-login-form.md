# Story 1.2: Create Landing Page with Login Form

Status: complete

## Story

As a **research coordinator**,
I want **to enter my name and email to identify myself**,
So that **my actions in the system can be tracked for accountability**.

## Acceptance Criteria

1. **Given** I am not logged in
   **When** I navigate to the application root URL
   **Then** I see a landing page with a login form containing name and email fields
   ✅ Implemented in `page.tsx` - shows `LoginPage` when user is null

2. **Given** I am on the login form
   **When** I enter a valid name and email and click "Continue"
   **Then** my identity is stored in the browser (localStorage/context)
   **And** I see the main landing page with options to start or continue a project
   ✅ Implemented - `login()` stores user in localStorage and context, page switches to `AuthenticatedLandingPage`

3. **Given** I am on the login form
   **When** I submit the form with an empty name field
   **Then** I see a validation error "Name is required"
   **And** the form is not submitted
   ✅ Implemented in `LoginForm.tsx` with validation

4. **Given** I am on the login form
   **When** I submit the form with an invalid email format
   **Then** I see a validation error "Please enter a valid email"
   **And** the form is not submitted
   ✅ Implemented with regex validation

5. **Given** I have previously logged in and closed the browser
   **When** I return to the application
   **Then** my identity is restored from localStorage
   **And** I am taken directly to the main landing page (not the login form)
   ✅ Implemented in `AuthProvider` useEffect

6. **Given** I am logged in
   **When** the page loads
   **Then** UI interactions respond within 200ms (NFR4)
   ✅ React state updates are synchronous, well under 200ms

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Completion Notes

- Created auth context with React Context API and localStorage persistence
- Login form includes client-side validation with clear error messages
- Used violet-600 color scheme per UX design spec
- Added accessibility features: aria-invalid, aria-describedby, role="alert"
- Form uses `noValidate` to rely on custom validation rather than browser defaults
- Tests achieve 100% code coverage
- Both "New Project" and "Continue Saved Project" buttons are disabled (to be enabled in later epics)

### File List

**New Files:**
- `frontend/src/lib/auth.tsx` - Auth context provider with localStorage persistence
- `frontend/src/components/auth/LoginForm.tsx` - Login form with validation
- `frontend/src/__tests__/auth.test.tsx` - Auth context tests
- `frontend/src/__tests__/LoginForm.test.tsx` - Login form tests
- `frontend/src/__tests__/page.test.tsx` - Page component tests
- `frontend/jest.config.ts` - Jest configuration
- `frontend/jest.setup.ts` - Jest setup with localStorage mock

**Modified Files:**
- `frontend/src/app/layout.tsx` - Wrapped with AuthProvider, updated metadata
- `frontend/src/app/page.tsx` - Replaced with login/authenticated landing page
- `frontend/package.json` - Added test scripts and testing dependencies
- `frontend/eslint.config.mjs` - Added coverage to ignores

### Test Coverage

```
All files        |     100 |      100 |     100 |     100 |
 app             |     100 |      100 |     100 |     100 |
  page.tsx       |     100 |      100 |     100 |     100 |
 components/auth |     100 |      100 |     100 |     100 |
  LoginForm.tsx  |     100 |      100 |     100 |     100 |
 lib             |     100 |      100 |     100 |     100 |
  auth.tsx       |     100 |      100 |     100 |     100 |
```

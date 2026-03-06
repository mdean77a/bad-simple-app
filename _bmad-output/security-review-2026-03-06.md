# Security Review — bmad-simple-app (ICF Generator)

**Date:** 2026-03-06
**Scope:** Full codebase review (backend + frontend)
**Reviewer:** Claude Code (automated)

---

## Summary

**No high-confidence vulnerabilities found.**

All candidate findings were filtered out as false positives or excluded by review criteria. The codebase follows sound security practices for its current development stage.

---

## Areas Reviewed

### Backend (Python/FastAPI)
- All API route handlers (`health.py`, `protocols.py`, `outline.py`, `sections.py`, `export.py`)
- All service modules (`llm_factory.py`, `vector_store.py`, `pdf_processor.py`, `section_definitions.py`, `section_graph.py`, `rag_pipeline.py`, `export_service.py`)
- Configuration (`config.py`, `main.py`, `pyproject.toml`)
- Environment/secrets management (`.env`, `.gitignore`)

### Frontend (Next.js/React)
- API client (`api.ts`)
- Auth system (`auth.tsx`)
- SSE streaming (`sse.ts`)
- Project file serialization (`projectFile.ts`)
- All components (dashboard, projects, auth, outline)
- Configuration (`next.config.ts`, `package.json`)

---

## Findings Evaluated and Dismissed

### 1. Content-Disposition Header Injection — FALSE POSITIVE (2/10)

**Location:** `backend/src/api/routes/export.py`
**Claim:** User-controlled `protocolName` injected into Content-Disposition header without escaping.
**Why dismissed:** The ASGI transport layer (h11/httptools) rejects any header value containing newlines, CRs, or null bytes — blocking HTTP response splitting at the transport level. The export format is constrained to `md`/`pdf`/`docx` via Pydantic `Literal`, preventing extension manipulation. Double-quote injection produces only cosmetic filename confusion with no security impact.

### 2. CORS Misconfiguration — FALSE POSITIVE (2/10)

**Location:** `backend/src/config.py`, `backend/src/main.py`
**Claim:** `allow_credentials=True` with broad regex could allow credential theft.
**Why dismissed:** The application has no authentication mechanism — no cookies, no session tokens, no auth headers. `allow_credentials=True` is inert without credentials to send. There is no user-specific data to steal via CORS bypass; an attacker can make the same requests directly without needing CORS.

### 3. Exposed API Keys in `.env` — FALSE POSITIVE (1/10)

**Location:** `backend/.env`
**Claim:** API keys committed to version control.
**Why dismissed:** `.env` is explicitly listed in `.gitignore` (line 13) and was never committed to any branch in git history (verified via `git log --all`). This is standard local secret storage practice, excluded per review criteria.

### 4. File Upload Path Traversal — FALSE POSITIVE (2/10)

**Location:** `backend/src/api/routes/protocols.py`, `backend/src/services/vector_store.py`
**Claim:** Uploaded filename used without path traversal protection.
**Why dismissed:** The filename never touches the filesystem. File bytes are read into memory and passed to PyMuPDF's stream-based parser. The filename is used only to derive: (a) a display name stored in Qdrant metadata, and (b) a collection name via `generate_collection_name()` which applies strict allowlist sanitization (`[^a-zA-Z0-9_]` → `_`).

### 5. Information Disclosure in Error Messages — FALSE POSITIVE (3/10)

**Location:** All route handlers
**Claim:** Internal exception messages expose infrastructure details.
**Why dismissed:** Only `str(exc)` message strings are sent — no stack traces. The disclosed information (library error messages, missing config names) is low-value and does not enable any concrete attack path. FastAPI's non-debug mode returns generic 500 for unhandled exceptions.

---

## Positive Security Observations

- **No dangerous deserialization** — No `pickle`, `yaml.unsafe_load()`, `eval()`, or `exec()` anywhere
- **No XSS vectors** — React renders all user content as text; no `dangerouslySetInnerHTML` in the codebase
- **No SQL injection** — No SQL databases; vector DB queries use parameterized APIs
- **No command injection** — No `subprocess`, `os.system`, or shell execution
- **Proper input validation** — Pydantic models enforce request schemas; file uploads check extension and content type
- **Safe file handling** — Uploaded files processed in-memory only; no disk writes with user-controlled filenames
- **Secrets properly managed** — API keys loaded from gitignored `.env`; never committed to history
- **Minimal frontend dependencies** — Only Next.js, React, React-DOM; small attack surface
- **Safe content rendering** — SSE stream data parsed with JSON.parse in try/catch; rendered as text
- **Proper URL encoding** — `encodeURIComponent()` used for dynamic URL segments in frontend routing

---

## Excluded by Review Criteria

The following categories were identified but excluded per the review scope:

| Category | Reason for Exclusion |
|----------|---------------------|
| No authentication/authorization | Lack of hardening, not a concrete vulnerability |
| No rate limiting | DoS/resource exhaustion excluded per criteria |
| Missing security headers | Lack of hardening measures |
| Missing file size limits on upload | DoS/resource exhaustion excluded |
| User content in LLM prompts | Prompt injection excluded per criteria |
| Dependency version ranges | Outdated library management excluded |
| Missing audit logging | Not a vulnerability per criteria |

---

## Recommendations for Production Hardening

These are not vulnerabilities but would strengthen the application for production deployment:

1. **Add authentication** — Implement OAuth 2.0/OIDC or API key auth before exposing to untrusted users
2. **Add rate limiting** — Protect LLM-intensive endpoints from abuse (e.g., `slowapi`)
3. **Add file size limits** — Enforce max upload size at the route handler level
4. **Add security headers** — `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`
5. **Restrict CORS methods** — Limit to `GET` and `POST` (the only methods actually used)
6. **Pin dependency versions** — Use exact versions in `pyproject.toml` for reproducibility
7. **Sanitize error messages** — Return generic errors to clients; log details server-side only

---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
status: complete
completedAt: '2026-02-03'
lastStep: 8
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-bmad-simple-app-2026-02-02.md
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/prd-validation-report.md
  - _bmad-output/planning-artifacts/validation-report-prd.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
workflowType: 'architecture'
project_name: 'bmad-simple-app'
user_name: 'Mikey'
date: '2026-02-03'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**

The PRD defines functional requirements across 8 functional areas:

| Category | FRs | Key Capabilities |
|----------|-----|------------------|
| Authentication & Session | FR1-FR3 | Name + email login (client-side), logout, user tracking |
| Protocol Management | FR4-FR8 | PDF upload, text extraction, chunking/embedding, indexed protocol list |
| ICF Outline Management | FR9-FR15 | Outline generation, conditional section detection, checklist selection, confirmation |
| Section Generation & Review | FR16-FR24 | Parallel streaming generation, approve/edit/regenerate, per-section controls |
| Project Management | FR25, FR27, FR29-FR30 | Save to local file, open from file, new project |
| Approval Tracking | FR31-FR34, FR35a | Section approval records (last approver), approve-all, audit trail |
| Export & Delivery | FR35-FR39 | LLM→Markdown→PDF/Word export, local save, approval page |
| User Interface | FR40-FR43 | Desktop/tablet/phone responsive design |

**Non-Functional Requirements:**

| Category | NFRs | Architectural Impact |
|----------|------|---------------------|
| Performance | NFR1-NFR4 | Protocol processing < 1 min, streaming < 10s start, UI < 200ms |
| Security | NFR5-NFR6 | HTTPS, API key auth for vector DB |
| Integration | NFR9-NFR11 | LLM retry 3x, graceful degradation, error specificity |
| Reliability | NFR12-NFR15 | In-memory state, local file save/resume, save disabled during generation |

**Scale & Complexity:**

- Primary domain: Full-stack web application with AI/ML backend services
- Complexity level: High
- Estimated architectural components: 12-15 (auth, protocol processing, vector store, LLM service, streaming, project persistence, export pipeline, frontend components)

### Technical Constraints & Dependencies

**From UX Specification:**

- Framework: Next.js with TypeScript
- Styling: Tailwind CSS with custom React components
- Deployment: Vercel-compatible
- Browsers: Chrome and Safari only

**External Dependencies:**

- LLM API (model-agnostic, configuration-driven)
- Vector database for RAG retrieval
- PDF processing library (PyMuPDF or equivalent mentioned)

**Constraints:**

- No native mobile app features required
- No real-time collaboration (simultaneous editing)
- No offline capability required
- Session-based auth only (no persistent accounts for MVP)

### Cross-Cutting Concerns Identified

1. **Error Handling & Recovery**
   - LLM failures (retry 3x, then error status with Retry button)
   - PDF processing failures (specific error messages)
   - Network failures (auto-retry, user notification)
   - No server-side session persistence; user saves project locally to resume later

2. **State Management**
   - Section states: Generating → Ready → Approved (with Edit/Regenerate branches)
   - Project persistence across sessions and users
   - Real-time streaming state updates

3. **Authentication & User Identity**
   - User identification for approval tracking (name + email, client-side)
   - No server-side sessions or access control
   - User identity is for attribution, not authorization

4. **Responsive Design**
   - Three breakpoints: Mobile (320px+), Tablet (768px+), Desktop (1024px+)
   - Section cards collapse on mobile
   - Touch targets ≥ 44px

5. **Audit Trail**
   - Section approval records (user, date, time)
   - Modification history when sections re-approved
   - Printed on final ICF page

## Starter Template Evaluation

### Architecture Decision: Two-Tier Monorepo

**Decision:** Monorepo with separate frontend and backend, auto-deploying to Vercel and Render respectively.

```text
bmad-simple-app/                    # Monorepo root (GitHub)
├── frontend/                       # Next.js → Vercel (auto-deploy)
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── next.config.js
│   ├── src/
│   │   ├── app/                    # App Router pages
│   │   ├── components/             # Custom React components
│   │   ├── lib/                    # API client, utilities
│   │   └── styles/
│   └── vercel.json
│
├── backend/                        # FastAPI → Render (auto-deploy)
│   ├── pyproject.toml
│   ├── uv.lock
│   ├── Dockerfile
│   ├── render.yaml
│   ├── .env.example
│   ├── src/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── api/routes/
│   │   ├── services/
│   │   │   ├── llm/                # Configurable LLM provider
│   │   │   ├── rag_pipeline.py     # LangGraph workflows
│   │   │   ├── pdf_processor.py
│   │   │   └── vector_store.py
│   │   ├── models/
│   │   └── schemas/
│   └── tests/
│
└── docs/
```

**Deployment Flow:**

| Trigger | Frontend | Backend |
|---------|----------|---------|
| Push to main | Vercel auto-deploys `/frontend` | Render auto-deploys `/backend` |
| Local dev | `npm run dev` (port 3000) | `uv run uvicorn` (port 8000) |
| Local prod | `npm run build && start` | `uv run uvicorn` (no --reload) |

### Frontend Starter: create-next-app

**Initialization:**

```bash
cd bmad-simple-app
npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

**Provides:**

- TypeScript 5.x with strict mode
- Tailwind CSS with PostCSS
- App Router (React Server Components)
- Turbopack for development
- ESLint for code quality

### Backend Starter: FastAPI + LangChain 1.0 + LangGraph

**Initialization:**

```bash
cd bmad-simple-app
mkdir backend && cd backend
uv init

# Core framework
uv add fastapi uvicorn[standard] python-multipart

# LangChain 1.0 ecosystem (REQUIRES PYTHON 3.10+)
uv add "langchain>=1.2.0" "langgraph>=0.3.0"
uv add langchain-anthropic langchain-openai langchain-ollama

# Vector store
uv add qdrant-client

# PDF processing
uv add pymupdf

# Export formats
uv add python-docx weasyprint markdown

# Configuration & utilities
uv add pydantic-settings python-dotenv
```

**Note:** No database dependencies required (no SQLAlchemy, no psycopg2, no alembic).

**⚠️ IMPLEMENTATION NOTE:** LangChain 1.0 and LangGraph components require close supervision during implementation due to significant API changes from earlier versions:

- LCEL pipes (`|`) deprecated
- Agent state must be TypedDict (not Pydantic)
- New `create_agent` patterns
- LangGraph state machine architecture

### Configuration: Configurable LLM Provider

**Environment Variables (.env):**

```bash
# LLM Provider Selection
LLM_PROVIDER=anthropic  # anthropic | openai | ollama
LLM_MODEL=claude-sonnet-4-20250514

# Provider API Keys (only needed for selected provider)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
OLLAMA_BASE_URL=http://localhost:11434

# Qdrant Cloud
QDRANT_URL=https://xxx.qdrant.io
QDRANT_API_KEY=...
QDRANT_COLLECTION=protocols

# CORS (frontend URL)
CORS_ORIGINS=["http://localhost:3000","https://app.example.com"]
```

**Note:** No database configuration required (no DATABASE_URL, no PostgreSQL credentials).

**Config Pattern (config.py):**

```python
from pydantic_settings import BaseSettings
from typing import Literal

class Settings(BaseSettings):
    # LLM Configuration
    llm_provider: Literal["anthropic", "openai", "ollama"] = "anthropic"
    llm_model: str = "claude-sonnet-4-20250514"

    # Provider-specific (only needed for selected provider)
    anthropic_api_key: str | None = None
    openai_api_key: str | None = None
    ollama_base_url: str = "http://localhost:11434"

    # Qdrant
    qdrant_url: str
    qdrant_api_key: str | None = None
    qdrant_collection: str = "protocols"

    # Application
    cors_origins: list[str] = ["http://localhost:3000"]

    model_config = {"env_file": ".env"}
```

### Technology Decisions Summary

| Concern | Frontend | Backend |
|---------|----------|---------|
| Language | TypeScript | Python 3.10+ |
| Framework | Next.js 15+ (App Router) | FastAPI |
| Styling | Tailwind CSS | N/A |
| Package Manager | npm/pnpm | uv |
| AI Orchestration | N/A | LangGraph (state machine workflows) |
| LLM Framework | N/A | LangChain 1.0+ (configurable provider) |
| LLM Providers | N/A | Anthropic, OpenAI, Ollama/LM Studio |
| Vector DB | N/A | Qdrant Cloud |
| PDF Processing | N/A | PyMuPDF |
| Deployment | Vercel | Render / Local |
| CI/CD | GitHub → Vercel (auto) | GitHub → Render (auto) |

**Note:** Project initialization (both frontend and backend) should be among the first implementation stories.

## Core Architectural Decisions

### Decision Summary

| Category | Decision | Details |
|----------|----------|---------|
| Data Persistence | Local file system | Project state saved as JSON file to user's local system |
| Session Management | Client-side state | User info (name, email) stored in React context/localStorage |
| Streaming | SSE (Server-Sent Events) | For real-time section generation streaming |
| API Design | REST with /api/v1/ prefix | OpenAPI docs auto-generated at /docs |
| Frontend State | React built-in | useState/useReducer, native fetch/EventSource |
| Environment Config | Standard .env | Platform-specific env vars (Vercel, Render) |
| Logging | Structured Python logging | Viewable in Render dashboard |
| CORS | Backend configuration | Whitelist frontend origins in settings |

### Data Architecture

**Decision:** Stateless backend; frontend owns all project state

| Data Type | Storage | Details |
|-----------|---------|---------|
| Project state | Frontend (React state) | Sections, approvals, outline, original prompts |
| Saved projects | Local JSON file | User saves/opens via file system dialog |
| User identity | Client-side (React context) | Name + email captured at login |
| Protocol index | Qdrant Cloud | Vector embeddings for RAG retrieval |

**Stateless Backend Model:**

- Backend stores nothing between requests; each request is self-contained
- Frontend sends all context needed (protocol ID, section content, original prompts, etc.)
- Backend processes request (RAG retrieval, LLM call) and returns result
- Multiple concurrent users supported; no session isolation needed because no session state
- No project ID required for isolation

**Frontend is Source of Truth:**

- Stores section content (accumulated from backend streams)
- Stores original prompts per section (for regeneration with guidance)
- Stores approval tracking (user, date, time)
- Saves/loads project state to local JSON files
- Detects user inactivity and prompts to save

**Rationale:**

- Stateless backend is simpler to deploy and scale
- No session management or isolation complexity
- Local file save/open is familiar pattern (like Word, Excel)
- No database hosting costs or maintenance

**Project File Format (JSON):**

```json
{
  "version": "1.0",
  "protocolId": "string",
  "protocolName": "string",
  "createdAt": "ISO8601",
  "lastModifiedAt": "ISO8601",
  "outline": {
    "sections": ["Purpose", "Procedures", "..."],
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
      "approval": {
        "userName": "string",
        "userEmail": "string",
        "timestamp": "ISO8601"
      }
    }
  ]
}
```

**Version Handling:**
- Current version: `1.0`
- On load, check version field; if missing or unrecognized, display warning to user
- Future versions may add fields; unknown fields should be preserved on save
- "generating" and "error" statuses are transient and never saved to file

### Authentication & Security

**Decision:** Client-side user identity for approval attribution

**Flow:**

1. User enters name + email on login screen
2. Frontend stores user info in React context (and optionally localStorage for persistence)
3. User info included in API requests that require attribution (approvals, saves)
4. No server-side session management required
5. User can "log out" by clearing client-side state

**Security Measures:**

- HTTPS required (NFR5)
- Protocol index access secured via API key (NFR6)
- User identity is for attribution, not access control (internal tool with trusted users)
- No sensitive data stored client-side (name and email only)

**Rationale:**

- Simplified model appropriate for internal tool with trusted users
- No session timeout management needed
- User identity purpose is approval attribution on final ICF, not access control

### API & Communication Patterns

**Decision:** REST API with SSE for streaming

**API Structure:**

- Base path: `/api/v1/`
- Documentation: Auto-generated OpenAPI at `/docs`
- Response format: JSON
- Error format: `{error: {code, message, details}}`

**Endpoints (high-level):**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/v1/protocols/upload` | Upload PDF, extract text, index in Qdrant; returns `{protocolId, protocolName}` |
| GET | `/api/v1/protocols` | List indexed protocols; returns `[{protocolId, protocolName, indexedAt}]` |
| POST | `/api/v1/outline/generate` | Generate outline from protocol ID; returns proposed section checklist |
| POST | `/api/v1/sections/generate` | SSE stream - generate sections; body: `{protocolId, sections: [...]}` |
| POST | `/api/v1/sections/regenerate` | SSE stream - regenerate one section; body: `{protocolId, sectionName, originalPrompt, guidance?}` |
| POST | `/api/v1/export` | Generate export document; body: `{sections: [...], approvals: [...], format: "md"|"docx"|"pdf"}` |

**Frontend-Only Operations (no backend call):**

| Operation | Reason |
|-----------|--------|
| Approve section | Frontend updates local state |
| Approve all sections | Frontend updates local state |
| Edit section content | Frontend updates local state |
| Save project | Frontend serializes state to local JSON file |
| Load project | Frontend reads local JSON file into state |

**Notes:**
- Backend is stateless; no project state stored between requests
- Each request includes all context needed (protocol ID, prompts, content)
- Frontend accumulates streamed content and manages all project state
- Export endpoint receives section content from frontend, LLM formats as Markdown, backend converts to PDF/Word

**Streaming Pattern (SSE):**

```text
GET /api/v1/sections/generate
Accept: text/event-stream

event: section_start
data: {"sectionId": "123", "name": "Purpose"}

event: section_chunk
data: {"sectionId": "123", "content": "This study..."}

event: section_complete
data: {"sectionId": "123", "status": "ready"}

event: section_error
data: {"sectionId": "456", "status": "error", "message": "LLM request failed after 3 retries"}
```

### Frontend Architecture

**Decision:** React built-in state management, no additional libraries

**State Management:**

- `useState` for component-local state
- `useReducer` for complex state transitions (section status machine)
- Props/Context for shared state (current user, current project)
- No external state libraries (Zustand, Redux, etc.)

**API Communication:**

- Native `fetch` for REST endpoints
- Native `EventSource` for SSE streaming
- No axios or TanStack Query

**Rationale:**

- Projects and protocols retrieved from backend on demand
- Section dashboard state is local to the page
- Built-in React capabilities sufficient for MVP complexity
- Fewer dependencies = simpler maintenance

### Infrastructure & Deployment

**Environment Configuration:**

| Environment | Frontend Config | Backend Config |
|-------------|-----------------|----------------|
| Local dev | `.env.local` | `.env` |
| Production | Vercel dashboard | Render dashboard |

**Logging Strategy:**

- Backend: Python `logging` module with structured format
- Log levels: DEBUG (dev), INFO (prod)
- Viewing: Render dashboard log viewer
- No external logging services for MVP

**CORS Configuration:**

```python
cors_origins = [
    "http://localhost:3000",              # Local dev
    "https://bmad-simple-app.vercel.app"  # Production
]
```

### Deferred Decisions (Post-MVP)

| Decision | Rationale for Deferral |
|----------|------------------------|
| External error tracking (Sentry) | Console logging sufficient for MVP |
| Rate limiting | Internal tool, trusted users |
| Persistent database | Local file storage sufficient for MVP; database adds complexity |
| Background job queue | Synchronous processing acceptable initially |
| File conflict resolution | Sequential file handoff sufficient for MVP |

## Implementation Patterns & Consistency Rules

### Why These Patterns Matter

Multiple AI agents will implement different parts of this system. Without consistent patterns, agents could make different choices that cause integration failures. These patterns ensure all code works together seamlessly.

### Naming Patterns

**Project File (JSON):**

| Element | Convention | Example |
|---------|------------|---------|
| Top-level keys | camelCase | `protocolId`, `createdAt`, `lastModifiedAt` |
| Nested objects | camelCase keys | `{ "userName": "...", "userEmail": "..." }` |
| Arrays | camelCase plural | `sections`, `approvals` |
| IDs | camelCase with Id suffix | `sectionId`, `protocolId` |

**API (REST):**

| Element | Convention | Example |
|---------|------------|---------|
| Endpoints | plural lowercase | `/api/v1/projects`, `/api/v1/sections` |
| URL parameters | camelCase | `/api/v1/projects/{projectId}` |
| Query parameters | camelCase | `?includeApprovals=true` |
| JSON fields | camelCase | `{ "userId": "...", "createdAt": "..." }` |

**Code - Python (Backend):**

| Element | Convention | Example |
|---------|------------|---------|
| Functions | snake_case | `def get_project_by_id():` |
| Variables | snake_case | `project_id`, `section_content` |
| Classes | PascalCase | `class ProjectService:` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT = 3` |
| Files | snake_case | `pdf_processor.py`, `rag_pipeline.py` |

**Code - TypeScript (Frontend):**

| Element | Convention | Example |
|---------|------------|---------|
| Functions | camelCase | `function getProjectById()` |
| Variables | camelCase | `projectId`, `sectionContent` |
| Components | PascalCase | `SectionCard`, `ActionBar` |
| Hooks | camelCase with `use` prefix | `useSectionState`, `useProjectData` |
| Component files | PascalCase | `SectionCard.tsx` |
| Utility files | camelCase | `apiClient.ts`, `dateUtils.ts` |
| Types/Interfaces | PascalCase | `interface SectionData {}` |

### Structure Patterns

**Frontend Component Organization:**

```text
src/components/
├── common/           # Reusable UI primitives
│   ├── Button.tsx
│   ├── StatusBadge.tsx
│   ├── Spinner.tsx
│   ├── TextInput.tsx
│   └── FileUpload.tsx
├── dashboard/        # ICF review dashboard
│   ├── SectionCard.tsx
│   ├── ActionBar.tsx
│   └── RegenerateModal.tsx
├── projects/         # Project management
│   ├── ProtocolSelect.tsx    # Select from indexed protocols
│   └── OutlineChecklist.tsx  # Section checklist for outline
└── layout/           # Page structure
    ├── PageHeader.tsx
    └── Container.tsx
```

**Backend Service Organization:**

```text
src/services/
├── llm/
│   ├── __init__.py
│   ├── factory.py        # get_chat_model()
│   ├── anthropic.py      # Anthropic-specific logic
│   ├── openai.py         # OpenAI-specific logic
│   └── ollama.py         # Ollama-specific logic
├── rag_pipeline.py       # LangGraph workflows (outline, sections)
├── pdf_processor.py      # PyMuPDF extraction
├── vector_store.py       # Qdrant operations
├── project_state.py      # In-memory project state, save/load serialization
└── export_service.py     # LLM generates Markdown; PDF/Word derived
```

### API Response Patterns

**Success Responses:**

Direct object/array response (no wrapper):

```json
// Single resource
{ "id": "123", "name": "Project A", "status": "active" }

// Collection
[
  { "id": "123", "name": "Project A" },
  { "id": "456", "name": "Project B" }
]

// Collection with pagination (when needed)
{
  "items": [...],
  "total": 42,
  "page": 1,
  "pageSize": 20
}
```

**Error Responses:**

Structured error with code for programmatic handling:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Project not found",
    "details": { "projectId": "123" }
  }
}
```

**Standard Error Codes:**

| Code | HTTP Status | Usage |
|------|-------------|-------|
| `VALIDATION_ERROR` | 422 | Invalid input data |
| `NOT_FOUND` | 404 | Resource doesn't exist |
| `LLM_ERROR` | 502 | LLM provider failed after retries |
| `PDF_PARSE_ERROR` | 422 | PDF extraction failed |
| `VECTOR_DB_ERROR` | 502 | Qdrant unreachable or query failed |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

### Data Format Patterns

**Date/Time:**

| Context | Format |
|---------|--------|
| API (JSON) | ISO 8601: `"2026-02-03T14:30:00Z"` |
| Project file | ISO 8601: `"2026-02-03T14:30:00Z"` |
| UI (recent) | "2 hours ago" |
| UI (this year) | "Feb 3 at 2:30 PM" |
| UI (older) | "Feb 3, 2026" |
| Approval records | "Feb 3, 2026 at 2:30 PM" (always full) |

**IDs:**

| Context | Format |
|---------|--------|
| Section IDs | UUID v4 (generated on outline confirmation) |
| Protocol IDs | Qdrant collection name (see naming below) |
| API references | String representation of UUID or collection name |

**Qdrant Collection Naming:**

- Format: `protocol_{sanitized_filename}_{timestamp}`
- Example: `protocol_diabetes_prevention_study_20260203143000`
- Sanitization: lowercase, replace spaces/special chars with underscores, max 64 chars
- Protocol name (for display) stored in collection metadata

### State Management Patterns

**Section Status State Machine:**

```typescript
type SectionStatus =
  | "generating"  // Streaming in progress, controls disabled for this section
  | "ready"       // Generation complete, awaiting review
  | "editing"     // User is editing content
  | "edited"      // Edits saved, awaiting approval
  | "approved"    // Section approved (can still edit/regenerate)
  | "error";      // Generation failed

// Valid transitions
const validTransitions: Record<SectionStatus, SectionStatus[]> = {
  generating: ["ready", "error"],
  ready: ["approved", "editing", "generating"],
  editing: ["edited", "ready"],  // ready = cancel
  edited: ["approved", "editing", "generating"],
  approved: ["editing", "generating"],
  error: ["generating"],
};
```

**Generation Tracking (for save/autosave control):**

```typescript
// Save button and autosave are DISABLED when any section is generating
const isAnyGenerating = Object.values(sections).some(s => s.status === "generating");
const canSave = !isAnyGenerating;
```

**Frontend State Structure:**

```typescript
interface DashboardState {
  sections: Record<string, {
    id: string;
    name: string;
    content: string;
    status: SectionStatus;
    wordCount: number;
    approval?: {
      userName: string;
      userEmail: string;
      timestamp: string;  // ISO 8601
    };
  }>;
  streamingContent: Record<string, string>;  // Partial content during generation
  isAnyGenerating: boolean;  // Computed: true if any section is "generating"
}
```

**Approve All Pattern:**

```typescript
// When user clicks "Approve All", approve all non-generating sections
function approveAll(user: { name: string; email: string }) {
  const timestamp = new Date().toISOString();
  Object.values(sections)
    .filter(s => s.status !== "generating" && s.status !== "error")
    .forEach(s => {
      s.status = "approved";
      s.approval = { userName: user.name, userEmail: user.email, timestamp };
    });
}
```

### Logging Patterns

**Backend Structured Logging:**

```python
import logging

logger = logging.getLogger(__name__)

# Include context in extra dict
logger.info("Section generated", extra={
    "project_id": str(project_id),
    "section_name": section_name,
    "duration_ms": duration_ms,
    "word_count": word_count
})

logger.error("LLM generation failed", extra={
    "project_id": str(project_id),
    "section_name": section_name,
    "provider": settings.llm_provider,
    "error": str(e)
})
```

**Log Levels:**

| Level | Usage | Examples |
|-------|-------|----------|
| DEBUG | Detailed debugging (dev only) | RAG chunks retrieved, prompt content |
| INFO | Normal operations | User login, section approved, export complete |
| WARNING | Recoverable issues | LLM retry succeeded, slow query |
| ERROR | Failures requiring attention | LLM failed after retries, PDF parse failed |

### Enforcement Guidelines

**All AI Agents MUST:**

1. Follow naming conventions exactly - no variations
2. Use the defined section state machine - no custom states
3. Return errors in the structured format - no plain strings
4. Use camelCase for all JSON fields - backend converts automatically
5. Place files in the defined directory structure - no new top-level folders
6. Use ISO 8601 for all API date/time fields
7. Log with structured extra context - no string interpolation in messages

**Pydantic Model Pattern (auto camelCase):**

```python
from pydantic import BaseModel, ConfigDict

def to_camel(string: str) -> str:
    components = string.split('_')
    return components[0] + ''.join(x.title() for x in components[1:])

class ApiModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

# Usage
class ProjectResponse(ApiModel):
    project_id: str      # JSON: "projectId"
    created_at: datetime # JSON: "createdAt"
```

### Anti-Patterns to Avoid

| Anti-Pattern | Correct Pattern |
|--------------|-----------------|
| `{ "error": "Something went wrong" }` | `{ "error": { "code": "...", "message": "..." } }` |
| `createdAt` in Python code | `created_at` in Python, `createdAt` in JSON |
| `src/components/SectionCard/index.tsx` | `src/components/dashboard/SectionCard.tsx` |
| `logger.info(f"User {user_id} logged in")` | `logger.info("User logged in", extra={"user_id": user_id})` |
| Custom section status strings | Use `SectionStatus` enum values only |
| Timestamps as Unix integers | ISO 8601 strings in API |

## Project Structure & Boundaries

### Requirements to Structure Mapping

| FR Category | Frontend Location | Backend Location |
|-------------|-------------------|------------------|
| Auth (FR1-3) | `src/app/page.tsx` (login), `src/lib/auth.ts`, `src/components/auth/` | N/A (client-side only) |
| Protocol (FR4-8) | `src/app/protocols/`, `src/components/protocols/` | `src/api/routes/protocols.py`, `src/services/pdf_processor.py`, `src/services/vector_store.py` |
| Outline (FR9-15) | `src/app/projects/[id]/outline/`, `src/components/outline/` | `src/api/routes/outline.py`, `src/services/rag_pipeline.py` |
| Sections (FR16-24) | `src/app/projects/[id]/`, `src/components/dashboard/` | `src/api/routes/sections.py`, `src/services/rag_pipeline.py` |
| Projects (FR25, FR27, FR29-30) | `src/app/page.tsx` (open file), `src/app/projects/new/` | N/A (frontend-only: save/load local files) |
| Approvals (FR31-34) | Integrated in dashboard components | `src/models/project.py` (Pydantic models) |
| Export (FR35-39) | `src/components/common/ExportButton.tsx` | `src/api/routes/export.py`, `src/services/export_service.py` |
| UI Responsive (FR40-43) | Tailwind breakpoints in all components | N/A |

### Complete Project Directory Structure

```text
bmad-simple-app/
├── README.md
├── .gitignore
├── .github/
│   └── workflows/
│       └── ci.yml                    # Lint, test for both frontend/backend
│
├── frontend/                          # Next.js → Vercel (auto-deploy)
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── postcss.config.js
│   ├── next.config.js
│   ├── .env.local.example
│   ├── .eslintrc.json
│   ├── vercel.json
│   │
│   ├── public/
│   │   └── favicon.ico
│   │
│   └── src/
│       ├── app/                       # App Router pages
│       │   ├── globals.css
│       │   ├── layout.tsx             # Root layout with auth context
│       │   ├── page.tsx               # Landing page: login + "Continue Saved Project" (FR1, FR30)
│       │   │
│       │   ├── projects/
│       │   │   ├── new/
│       │   │   │   └── page.tsx       # New project: select/upload protocol (FR29)
│       │   │   └── [id]/
│       │   │       ├── page.tsx       # Section dashboard (FR17, FR24)
│       │   │       └── outline/
│       │   │           └── page.tsx   # Outline review (FR12-15)
│       │   │
│       │   └── protocols/
│       │       └── page.tsx           # Protocol list (FR7)
│       │
│       ├── components/
│       │   ├── common/                # Reusable UI primitives
│       │   │   ├── Button.tsx
│       │   │   ├── StatusBadge.tsx
│       │   │   ├── Spinner.tsx
│       │   │   ├── TextInput.tsx
│       │   │   ├── TextArea.tsx
│       │   │   ├── FileUpload.tsx
│       │   │   └── ExportButton.tsx   # PDF/Word/Markdown export (FR35-38)
│       │   │
│       │   ├── auth/
│       │   │   └── LoginForm.tsx      # Name + email form (FR1)
│       │   │
│       │   ├── dashboard/             # ICF section review
│       │   │   ├── SectionCard.tsx    # Section with approve/edit/regenerate
│       │   │   ├── SectionContent.tsx # Editable content area
│       │   │   ├── ActionBar.tsx      # Approve/Edit/Regenerate buttons
│       │   │   ├── RegenerateModal.tsx# Guidance input modal (FR21)
│       │   │   ├── ApprovalBadge.tsx  # Shows who approved, when
│       │   │   └── StreamingContent.tsx# Real-time generation display
│       │   │
│       │   ├── projects/
│       │   │   ├── ProtocolSelect.tsx # Select from indexed protocols (FR7-8)
│       │   │   └── ProtocolUpload.tsx # Upload new protocol PDF (FR4)
│       │   │
│       │   ├── outline/
│       │   │   ├── OutlineCheckbox.tsx  # Single section checkbox item
│       │   │   ├── OutlineChecklist.tsx # Full checklist display (FR12-14)
│       │   │   └── ConfirmButton.tsx    # Confirm outline and start generation (FR15)
│       │   │
│       │   └── layout/
│       │       ├── PageHeader.tsx     # App header with logout
│       │       └── Container.tsx      # Responsive container
│       │
│       ├── lib/
│       │   ├── api.ts                 # API client (fetch wrapper)
│       │   ├── sse.ts                 # SSE client for streaming
│       │   ├── auth.ts                # Auth context and hooks
│       │   └── utils.ts               # Date formatting, etc.
│       │
│       └── types/
│           ├── api.ts                 # API request/response types
│           ├── project.ts             # Project, Section, Approval types
│           └── protocol.ts            # Protocol types
│
├── backend/                           # FastAPI → Render (auto-deploy)
│   ├── pyproject.toml
│   ├── uv.lock
│   ├── Dockerfile
│   ├── render.yaml
│   ├── .env.example
│   ├── .python-version                # 3.10+
│   │
│   ├── src/
│   │   ├── __init__.py
│   │   ├── main.py                    # FastAPI app, CORS, routes
│   │   ├── config.py                  # Pydantic Settings
│   │   │
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── deps.py                # Dependency injection (project state)
│   │   │   └── routes/
│   │   │       ├── __init__.py
│   │   │       ├── protocols.py       # POST /upload, GET / (FR4-8)
│   │   │       ├── outline.py         # POST /generate (FR9-15)
│   │   │       ├── sections.py        # POST /generate, /regenerate (FR16-24)
│   │   │       └── export.py          # POST /export (FR35-39)
│   │   │
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── llm/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── factory.py         # get_chat_model() by provider
│   │   │   │   ├── anthropic.py
│   │   │   │   ├── openai.py
│   │   │   │   └── ollama.py
│   │   │   ├── rag_pipeline.py        # LangGraph workflows (outline, sections)
│   │   │   ├── pdf_processor.py       # PyMuPDF extraction (FR5)
│   │   │   ├── vector_store.py        # Qdrant operations (FR6)
│   │   │   └── export_service.py      # LLM formats Markdown; converts to PDF/Word
│   │   │
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── project.py             # Project Pydantic model (not SQLAlchemy)
│   │   │   └── section.py             # Section Pydantic model with status
│   │   │
│   │   └── schemas/
│   │       ├── __init__.py
│   │       ├── protocol.py            # Protocol schemas
│   │       ├── outline.py             # Outline request/response schemas
│   │       ├── project.py             # Project save/load schemas
│   │       ├── section.py             # Section schemas
│   │       └── common.py              # ErrorResponse, ApiModel base
│   │
│   └── tests/
│       ├── __init__.py
│       ├── conftest.py                # Fixtures
│       ├── test_protocols.py
│       ├── test_outline.py
│       ├── test_sections.py
│       ├── test_project.py
│       └── test_export.py
│
└── docs/                              # Project documentation
    └── api.md                         # API documentation notes
```

### Architectural Boundaries

**API Boundaries:**

| Boundary | Description |
|----------|-------------|
| `/api/v1/protocols/*` | PDF upload, text extraction, vector indexing, list indexed protocols |
| `/api/v1/outline/*` | Generate ICF outline from protocol |
| `/api/v1/sections/*` | Generate sections (SSE), regenerate with guidance (SSE) |
| `/api/v1/export` | Generate document (LLM→Markdown→PDF/Word) from frontend content |

**Service Boundaries:**

| Service | Responsibility | Dependencies |
|---------|----------------|--------------|
| `pdf_processor` | PDF → text extraction, error on corrupt/unreadable PDFs | PyMuPDF |
| `vector_store` | Chunk embedding, similarity search, list collections | Qdrant Cloud |
| `rag_pipeline` | Outline generation, section generation, regeneration with guidance | LLM, vector_store |
| `export_service` | LLM formats content as Markdown; converts to Word/PDF | LLM, python-docx, weasyprint |

**Data Flow:**

```text
Protocol Upload:
  PDF → pdf_processor → chunks → vector_store → Qdrant
  Returns: {protocolId, protocolName}

Outline Generation:
  Frontend sends: {protocolId}
  Backend: Qdrant retrieval → LLM → proposed sections
  Returns: [{sectionName, isConditional, defaultChecked}]

Section Generation:
  Frontend sends: {protocolId, sections: ["Purpose", "Procedures", ...]}
  Backend: For each section: Qdrant retrieval → LLM → SSE stream
  Frontend: Accumulates chunks, stores content + originalPrompt per section

Regeneration:
  Frontend sends: {protocolId, sectionName, originalPrompt, guidance?}
  Backend: Qdrant retrieval → LLM (prompt + guidance) → SSE stream
  Frontend: Replaces section content

Approval/Edit:
  Frontend-only: Updates local React state (no backend call)

Save Project:
  Frontend-only: Serializes state to JSON, browser downloads file

Load Project:
  Frontend-only: User selects file, frontend parses JSON into state

Export:
  Frontend sends: {sections: [...], approvals: [...], format}
  Backend: LLM formats as Markdown → convert to PDF/Word if needed
  Returns: Document file for download
```

### Cross-Cutting Concerns Mapping

| Concern | Frontend | Backend |
|---------|----------|---------|
| User Identity | `lib/auth.ts` context, localStorage | User info included in export request for approval page |
| Error Handling | `lib/api.ts` error parsing | Structured ErrorResponse |
| Streaming | `lib/sse.ts` EventSource | FastAPI StreamingResponse |
| State Machine | `types/project.ts` SectionStatus | N/A (stateless) |
| Project State | React state, local file save/load | N/A (stateless) |
| Generation Tracking | `isAnyGenerating` computed from section statuses | N/A (stateless) |
| Responsive | Tailwind breakpoints | N/A |

## Architecture Validation Results

### Coherence Validation ✅

All architectural decisions work together without conflicts:

- Technology stack is compatible (Next.js + FastAPI + Qdrant + LangChain/LangGraph)
- Local file storage model eliminates database complexity
- Patterns support the chosen technologies consistently
- Project structure enables all defined patterns

### Requirements Coverage ✅

**Functional Requirements:**

| Category | Status | Components |
|----------|--------|------------|
| Auth (FR1-3) | ✅ | Client-side auth context, login form on landing page |
| Protocol (FR4-8) | ✅ | PDF processor, vector store, protocol routes |
| Outline (FR9-15) | ✅ | RAG pipeline, outline checklist components |
| Sections (FR16-24) | ✅ | Dashboard components, SSE streaming, state machine |
| Projects (FR25, FR27, FR29-30) | ✅ | Frontend-only: React state, local file save/load |
| Approvals (FR31-34, FR35a) | ✅ | Approval tracking in project state, approve-all endpoint |
| Export (FR35-39) | ✅ | Export service (LLM→Markdown→PDF/Word), export button |
| UI (FR40-43) | ✅ | Tailwind responsive, three breakpoints defined |

**Non-Functional Requirements:**

| Category | Status | Notes |
|----------|--------|-------|
| NFR1-4 (Performance) | ✅ | SSE streaming pattern, in-memory state |
| NFR5-6 (Security) | ✅ | HTTPS, API key auth for vector DB |
| NFR9-11 (Integration) | ✅ | LLM retry pattern (3x), error codes defined |
| NFR12-15 (Reliability) | ✅ | In-memory state, local file save, save disabled during generation |

### Implementation Readiness ✅

AI agents can implement consistently using:

- Complete directory structure with all files specified
- Explicit naming conventions for all layers
- Code examples for key patterns (Pydantic, logging, state machine)
- Clear anti-patterns to avoid

### Architecture Completeness Checklist

**✅ Requirements Analysis**

- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed (High)
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**✅ Architectural Decisions**

- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined (REST, SSE)
- [x] Performance considerations addressed

**✅ Implementation Patterns**

- [x] Naming conventions established (all layers)
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented (errors, logging)

**✅ Project Structure**

- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High

**Key Strengths:**

- Comprehensive FR/NFR coverage with explicit mapping
- Clear separation between frontend and backend
- Well-defined patterns prevent agent implementation conflicts
- Configurable LLM provider supports future flexibility

**First Implementation Priority:**

Project initialization stories (create-next-app, uv init, docker-compose.yml)

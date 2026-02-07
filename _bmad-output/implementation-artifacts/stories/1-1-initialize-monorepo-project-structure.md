# Story 1.1: Initialize Monorepo Project Structure

Status: ready-for-dev

## Story

As a **developer**,
I want **a properly configured monorepo with frontend and backend projects**,
so that **I can run the application locally and begin feature development**.

## Acceptance Criteria

1. **Given** a fresh clone of the repository
   **When** I run the frontend setup commands (`cd frontend && npm install && npm run dev`)
   **Then** the Next.js application starts on port 3000
   **And** I can access http://localhost:3000 in Chrome or Safari

2. **Given** a fresh clone of the repository
   **When** I run the backend setup commands (`cd backend && uv sync && uv run uvicorn src.main:app --reload`)
   **Then** the FastAPI application starts on port 8000
   **And** I can access the OpenAPI docs at http://localhost:8000/docs

3. **Given** the backend is running
   **When** I make a GET request to `/api/v1/health`
   **Then** I receive a 200 response with `{"status": "ok"}`

4. **Given** the frontend and backend are both running
   **When** the frontend makes a request to the backend
   **Then** CORS is properly configured and the request succeeds

## Tasks / Subtasks

- [ ] Task 1: Initialize Frontend (AC: 1)
  - [ ] Run `npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"`
  - [ ] Verify Next.js starts on port 3000
  - [ ] Create `frontend/.env.example` with `NEXT_PUBLIC_API_URL=http://localhost:8000`
  - [ ] Create `frontend/.env.local` (gitignored) with same content

- [ ] Task 2: Initialize Backend (AC: 2)
  - [ ] Create `backend/` directory and run `uv init`
  - [ ] Add dependencies to pyproject.toml (see Dev Notes)
  - [ ] Create `backend/src/` directory structure
  - [ ] Create `backend/src/main.py` with FastAPI app
  - [ ] Create `backend/src/config.py` with pydantic-settings
  - [ ] Create `backend/.env.example` with required variables
  - [ ] Verify FastAPI starts on port 8000 with OpenAPI docs

- [ ] Task 3: Implement Health Endpoint (AC: 3)
  - [ ] Create `backend/src/api/__init__.py`
  - [ ] Create `backend/src/api/routes/__init__.py`
  - [ ] Create `backend/src/api/routes/health.py` with GET `/health`
  - [ ] Register router with `/api/v1` prefix in main.py
  - [ ] Verify endpoint returns `{"status": "ok"}`

- [ ] Task 4: Configure CORS (AC: 4)
  - [ ] Add CORS middleware to FastAPI app
  - [ ] Configure CORS_ORIGINS from environment variable
  - [ ] Set default to `["http://localhost:3000"]` for local dev
  - [ ] Test cross-origin request from frontend to backend

- [ ] Task 5: Write Unit Tests (AC: All)
  - [ ] Backend: Add pytest, pytest-asyncio, httpx to dev dependencies
  - [ ] Backend: Create `backend/tests/test_health.py`
  - [ ] Backend: Test health endpoint returns 200 with correct body
  - [ ] Frontend: Verify default Next.js tests pass
  - [ ] Ensure 80%+ coverage on new backend code

## Dev Notes

### Backend Directory Structure

```
backend/
├── pyproject.toml
├── uv.lock
├── .env.example
├── src/
│   ├── __init__.py
│   ├── main.py              # FastAPI app, CORS, router registration
│   ├── config.py            # Settings from pydantic-settings
│   └── api/
│       ├── __init__.py
│       └── routes/
│           ├── __init__.py
│           └── health.py    # GET /health endpoint
└── tests/
    ├── __init__.py
    ├── conftest.py          # pytest fixtures
    └── test_health.py
```

### Frontend Directory Structure

```
frontend/
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
├── .env.example
├── .env.local              # gitignored
└── src/
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx
    │   └── globals.css
    └── lib/                 # Will hold API client in future stories
```

### Backend Dependencies (pyproject.toml)

```toml
[project]
name = "bmad-simple-app-backend"
version = "0.1.0"
requires-python = ">=3.13"
dependencies = [
    "fastapi>=0.115.0",
    "uvicorn[standard]>=0.34.0",
    "python-multipart>=0.0.20",
    "pydantic-settings>=2.7.0",
    "python-dotenv>=1.0.0",
]

[dependency-groups]
dev = [
    "pytest>=8.0.0",
    "pytest-asyncio>=0.25.0",
    "httpx>=0.28.0",
    "pytest-cov>=6.0.0",
]
```

### Config Pattern (backend/src/config.py)

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    cors_origins: list[str] = ["http://localhost:3000"]

    class Config:
        env_file = ".env"

settings = Settings()
```

### Main App Pattern (backend/src/main.py)

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.config import settings
from src.api.routes import health

app = FastAPI(title="bmad-simple-app API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api/v1")
```

### Health Endpoint Pattern (backend/src/api/routes/health.py)

```python
from fastapi import APIRouter

router = APIRouter()

@router.get("/health")
async def health_check():
    return {"status": "ok"}
```

### Environment Variables

**backend/.env.example:**
```
CORS_ORIGINS=["http://localhost:3000"]
```

**frontend/.env.example:**
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Testing Commands

```bash
# Backend tests
cd backend
uv run pytest --cov=src --cov-report=term-missing

# Frontend tests
cd frontend
npm test
```

### Naming Conventions (from Architecture)

- Python: snake_case for functions/variables, PascalCase for classes
- TypeScript: camelCase for functions/variables, PascalCase for components
- JSON/API: camelCase for all fields
- Files: snake_case for Python, camelCase/PascalCase for TypeScript

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Starter Template Evaluation]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.1]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Completion Notes List

_(To be filled during implementation)_

### File List

_(To be filled during implementation)_

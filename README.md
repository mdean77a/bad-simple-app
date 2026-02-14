# BAD Simple App

A clinical protocol analysis tool that uses AI to process and index clinical trial protocols (PDFs), enabling RAG-based retrieval for downstream tasks like ICF (Informed Consent Form) generation.

## Repository Structure

This is a monorepo with two main directories:

```
bad-simple-app/
├── frontend/          # Next.js web application
├── backend/           # FastAPI REST API
└── _bmad/             # BMAD framework (AI-assisted development workflows)
```

- **[frontend/](frontend/)** — Next.js 16 app with React 19, Tailwind CSS, and client-side auth. Handles protocol upload UI and project management pages.
- **[backend/](backend/)** — FastAPI app that extracts text from uploaded PDFs, chunks it, generates embeddings via OpenAI, and stores vectors in Qdrant Cloud for similarity search.

## Prerequisites

- **Node.js** 18+ and npm (frontend)
- **Python** 3.13+ and [uv](https://docs.astral.sh/uv/) (backend)
- **Qdrant Cloud** account with a cluster URL and API key
- **OpenAI** API key (for text-embedding-3-small embeddings)

## Quick Start

### Backend

```bash
cd backend
cp .env.example .env   # Fill in QDRANT_URL, QDRANT_API_KEY, OPENAI_API_KEY
uv sync
uv run uvicorn src.main:app --reload
```

The API will be available at http://localhost:8000. Interactive docs at http://localhost:8000/docs.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The app will be available at http://localhost:3000.

## Deployment

- **Frontend** deploys to [Vercel](https://vercel.com) (auto-deploys on push to `main`)
- **Backend** deploys to [Render](https://render.com) (auto-deploys on push to `main`)

Environment variables required in production:

| Variable | Where | Description |
|----------|-------|-------------|
| `NEXT_PUBLIC_API_URL` | Vercel | Backend API base URL |
| `CORS_ORIGINS` | Render | Comma-separated allowed origins |
| `QDRANT_URL` | Render | Qdrant Cloud cluster URL |
| `QDRANT_API_KEY` | Render | Qdrant Cloud API key |
| `OPENAI_API_KEY` | Render | OpenAI API key |

## Testing

```bash
# Backend (28 tests, 99% coverage)
cd backend && uv run pytest tests/ -v --cov=src --cov-report=term-missing

# Frontend (67 tests, 99% coverage)
cd frontend && npm test
```

Both suites enforce a minimum 80% coverage threshold.

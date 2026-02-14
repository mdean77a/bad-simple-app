# Frontend

Next.js web application for uploading and managing clinical protocol PDFs. Provides a drag-and-drop upload interface with client-side authentication.

## Tech Stack

- **Next.js 16** with App Router
- **React 19**
- **Tailwind CSS 4** — utility-first styling
- **TypeScript 5**
- **Jest 30** + **React Testing Library** — unit tests

## Setup

```bash
npm install
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | No | Backend API base URL (default: `http://localhost:8000`) |

For local development the default is fine. For deployment, set this in the Vercel dashboard (it's baked in at build time).

## Running

```bash
npm run dev
```

The app runs at http://localhost:3000. Requires the backend running at `http://localhost:8000` (or the URL set in `NEXT_PUBLIC_API_URL`).

## Project Structure

```
frontend/src/
├── app/
│   ├── layout.tsx                  # Root layout with auth provider
│   ├── page.tsx                    # Landing page (login / project links)
│   └── projects/
│       └── new/
│           └── page.tsx            # New project page (auth-guarded)
├── components/
│   ├── auth/
│   │   └── LoginForm.tsx           # Email/password login form
│   ├── layout/
│   │   └── PageHeader.tsx          # Shared page header
│   └── projects/
│       └── ProtocolUpload.tsx      # Drag-and-drop PDF upload
├── lib/
│   ├── api.ts                      # API client (checkHealth, uploadProtocol)
│   └── auth.tsx                    # Auth context provider and useAuth hook
└── __tests__/                      # All test files
```

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page with login form and project navigation |
| `/projects/new` | Auth-guarded page for uploading a new protocol PDF |

## Testing

```bash
npm test                 # Run all tests
npm run test:coverage    # Run with coverage report
```

67 tests, 99% coverage. Coverage threshold enforced at 80% in `jest.config.ts`.

## Build

```bash
npm run build
```

Produces a production build in `.next/`. Deployed automatically to Vercel on push to `main`.

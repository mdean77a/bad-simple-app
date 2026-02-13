from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.routes import health, protocols
from src.config import settings

app = FastAPI(
    title="bmad-simple-app API",
    version="0.1.0",
    description="Backend API for ICF generation tool",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api/v1", tags=["health"])
app.include_router(protocols.router, prefix="/api/v1/protocols", tags=["protocols"])

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.routes import export, health, outline, protocols, sections
from src.api.routes import settings as settings_routes
from src.config import settings

app = FastAPI(
    title="bmad-simple-app API",
    version="0.1.0",
    description="Backend API for ICF generation tool",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=settings.cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api/v1", tags=["health"])
app.include_router(protocols.router, prefix="/api/v1/protocols", tags=["protocols"])
app.include_router(outline.router, prefix="/api/v1/outline", tags=["outline"])
app.include_router(sections.router, prefix="/api/v1/sections", tags=["sections"])
app.include_router(export.router, prefix="/api/v1/export", tags=["export"])
app.include_router(settings_routes.router, prefix="/api/v1/settings", tags=["settings"])

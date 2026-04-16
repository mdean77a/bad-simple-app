from fastapi import APIRouter

from src.config import settings

router = APIRouter()


@router.get("/providers")
async def get_providers() -> dict:
    """Return available LLM providers based on configured API keys and env flags."""
    providers = []
    if settings.anthropic_api_key:
        providers.append("anthropic")
    if settings.openai_api_key:
        providers.append("openai")
    if settings.enable_local_llm:
        providers.append("local")
    return {"providers": providers}

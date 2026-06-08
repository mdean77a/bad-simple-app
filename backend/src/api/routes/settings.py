from fastapi import APIRouter

from src.config import settings
from src.services.model_discovery import get_provider_models

router = APIRouter()


@router.get("/providers")
async def get_providers() -> dict:
    """Return available LLM providers and their model lists.

    Providers are gated on configured API keys and env flags. Model lists for
    Anthropic and OpenAI are discovered live from each provider's /v1/models
    endpoint (cached in-process). Local has no model list — LM Studio decides.
    """
    providers = []
    if settings.anthropic_api_key:
        providers.append("anthropic")
    if settings.openai_api_key:
        providers.append("openai")
    if settings.enable_local_llm:
        providers.append("local")

    models = get_provider_models()
    return {"providers": providers, "models": models}

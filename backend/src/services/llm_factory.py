from langchain_anthropic import ChatAnthropic
from langchain_openai import ChatOpenAI

from src.config import settings

_OPENAI_DEFAULT_MODEL = "gpt-5.1"


class LLMConfigError(Exception):
    """Raised when LLM configuration is invalid or incomplete."""


def get_chat_model(
    provider: str | None = None,
    model: str | None = None,
) -> ChatAnthropic | ChatOpenAI:
    """Return a LangChain chat model based on provider and model.

    Args:
        provider: LLM provider override. Falls back to settings.llm_provider.
        model: Model name override. Falls back to settings.llm_model or
               provider-specific default.

    Supports: anthropic, openai, local (LM Studio via ChatOpenAI).
    """
    effective_provider = provider or settings.llm_provider

    if effective_provider == "anthropic":
        if not settings.anthropic_api_key:
            raise LLMConfigError("ANTHROPIC_API_KEY is not configured")
        effective_model = model or settings.llm_model
        return ChatAnthropic(
            model=effective_model,
            api_key=settings.anthropic_api_key,
        )

    if effective_provider == "openai":
        if not settings.openai_api_key:
            raise LLMConfigError("OPENAI_API_KEY is not configured")
        effective_model = model or _OPENAI_DEFAULT_MODEL
        return ChatOpenAI(
            model=effective_model,
            api_key=settings.openai_api_key,
        )

    if effective_provider == "local":
        if not settings.enable_local_llm:
            raise LLMConfigError("Local LLM is not enabled")
        return ChatOpenAI(
            model="local",
            base_url=settings.local_llm_base_url,
        )

    raise LLMConfigError(f"Unsupported LLM provider: {effective_provider}")

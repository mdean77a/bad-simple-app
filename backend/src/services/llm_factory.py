from langchain_anthropic import ChatAnthropic

from src.config import settings


class LLMConfigError(Exception):
    """Raised when LLM configuration is invalid or incomplete."""


def get_chat_model() -> ChatAnthropic:
    """Return a LangChain chat model based on configured provider.

    Currently supports: anthropic.
    """
    provider = settings.llm_provider

    if provider == "anthropic":
        if not settings.anthropic_api_key:
            raise LLMConfigError("ANTHROPIC_API_KEY is not configured")
        return ChatAnthropic(
            model=settings.llm_model,
            api_key=settings.anthropic_api_key,
        )

    raise LLMConfigError(f"Unsupported LLM provider: {provider}")

"""Discover available chat models from Anthropic and OpenAI."""

import re
import time

import httpx

from src.config import settings

_ANTHROPIC_MODELS_URL = "https://api.anthropic.com/v1/models"
_OPENAI_MODELS_URL = "https://api.openai.com/v1/models"
_ANTHROPIC_VERSION = "2023-06-01"
_HTTP_TIMEOUT = 10.0
_CACHE_TTL_SECONDS = 600.0

_OPENAI_CHAT_PREFIXES = ("gpt-", "chatgpt-")
_OPENAI_EXCLUDE_TOKENS = (
    "embedding",
    "audio",
    "whisper",
    "tts",
    "dall-e",
    "moderation",
    "realtime",
    "transcribe",
    "image",
    "codex",
    "nano",
    "preview",
    "latest",
    "3.5",
    "4o",
)
_OPENAI_DATED_SNAPSHOT_RE = re.compile(r"-(?:\d{4}-\d{2}-\d{2}|\d{4})$")
# Drops legacy gpt-4 family without a 4.X decimal version (e.g., gpt-4, gpt-4-turbo)
_OPENAI_LEGACY_GPT4_RE = re.compile(r"^gpt-4(-|$)")

_cache: dict[str, tuple[list[str], float]] = {}


def _cache_get(key: str) -> list[str] | None:
    entry = _cache.get(key)
    if entry is None:
        return None
    value, expires_at = entry
    if time.monotonic() >= expires_at:
        return None
    return value


def _cache_set(key: str, value: list[str]) -> None:
    _cache[key] = (value, time.monotonic() + _CACHE_TTL_SECONDS)


def clear_cache() -> None:
    """Test helper — drop all cached entries."""
    _cache.clear()


def _fetch_anthropic_models(api_key: str) -> list[str]:
    try:
        response = httpx.get(
            _ANTHROPIC_MODELS_URL,
            headers={
                "x-api-key": api_key,
                "anthropic-version": _ANTHROPIC_VERSION,
            },
            timeout=_HTTP_TIMEOUT,
        )
        response.raise_for_status()
        data = response.json().get("data", [])
        return [m["id"] for m in data if isinstance(m, dict) and "id" in m]
    except (httpx.HTTPError, ValueError, KeyError):
        return []


def _is_openai_chat_model(model_id: str) -> bool:
    lower = model_id.lower()
    if any(token in lower for token in _OPENAI_EXCLUDE_TOKENS):
        return False
    if _OPENAI_DATED_SNAPSHOT_RE.search(lower):
        return False
    if _OPENAI_LEGACY_GPT4_RE.match(lower):
        return False
    return any(lower.startswith(prefix) for prefix in _OPENAI_CHAT_PREFIXES)


def _fetch_openai_models(api_key: str) -> list[str]:
    try:
        response = httpx.get(
            _OPENAI_MODELS_URL,
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=_HTTP_TIMEOUT,
        )
        response.raise_for_status()
        data = response.json().get("data", [])
        ids = [m["id"] for m in data if isinstance(m, dict) and "id" in m]
        return sorted(m for m in ids if _is_openai_chat_model(m))
    except (httpx.HTTPError, ValueError, KeyError):
        return []


def get_provider_models() -> dict[str, list[str]]:
    """Return a {provider: [model_id, ...]} map for configured providers.

    Results are cached in-process for ~10 minutes. A failure for one provider
    yields an empty list for that provider; it never raises.
    """
    result: dict[str, list[str]] = {}

    if settings.anthropic_api_key:
        cached = _cache_get("anthropic")
        if cached is None:
            cached = _fetch_anthropic_models(settings.anthropic_api_key)
            _cache_set("anthropic", cached)
        result["anthropic"] = cached

    if settings.openai_api_key:
        cached = _cache_get("openai")
        if cached is None:
            cached = _fetch_openai_models(settings.openai_api_key)
            _cache_set("openai", cached)
        result["openai"] = cached

    return result

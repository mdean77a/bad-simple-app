from unittest.mock import patch

import pytest


# --- GET /api/v1/settings/providers ---


@pytest.mark.asyncio
@patch("src.api.routes.settings.settings")
async def test_providers_both_keys(mock_settings, client):
    """Both API keys configured returns anthropic and openai."""
    mock_settings.anthropic_api_key = "sk-ant-test"
    mock_settings.openai_api_key = "sk-test"
    mock_settings.enable_local_llm = False

    response = await client.get("/api/v1/settings/providers")

    assert response.status_code == 200
    assert response.json() == {"providers": ["anthropic", "openai"]}


@pytest.mark.asyncio
@patch("src.api.routes.settings.settings")
async def test_providers_anthropic_only(mock_settings, client):
    """Only anthropic key configured returns just anthropic."""
    mock_settings.anthropic_api_key = "sk-ant-test"
    mock_settings.openai_api_key = None
    mock_settings.enable_local_llm = False

    response = await client.get("/api/v1/settings/providers")

    assert response.status_code == 200
    assert response.json() == {"providers": ["anthropic"]}


@pytest.mark.asyncio
@patch("src.api.routes.settings.settings")
async def test_providers_openai_only(mock_settings, client):
    """Only openai key configured returns just openai."""
    mock_settings.anthropic_api_key = None
    mock_settings.openai_api_key = "sk-test"
    mock_settings.enable_local_llm = False

    response = await client.get("/api/v1/settings/providers")

    assert response.status_code == 200
    assert response.json() == {"providers": ["openai"]}


@pytest.mark.asyncio
@patch("src.api.routes.settings.settings")
async def test_providers_no_keys(mock_settings, client):
    """No keys configured returns empty list."""
    mock_settings.anthropic_api_key = None
    mock_settings.openai_api_key = None
    mock_settings.enable_local_llm = False

    response = await client.get("/api/v1/settings/providers")

    assert response.status_code == 200
    assert response.json() == {"providers": []}


@pytest.mark.asyncio
@patch("src.api.routes.settings.settings")
async def test_providers_with_local_enabled(mock_settings, client):
    """Local LLM enabled adds local to providers list."""
    mock_settings.anthropic_api_key = "sk-ant-test"
    mock_settings.openai_api_key = None
    mock_settings.enable_local_llm = True

    response = await client.get("/api/v1/settings/providers")

    assert response.status_code == 200
    assert response.json() == {"providers": ["anthropic", "local"]}


@pytest.mark.asyncio
@patch("src.api.routes.settings.settings")
async def test_providers_all_three(mock_settings, client):
    """All providers available returns all three in order."""
    mock_settings.anthropic_api_key = "sk-ant-test"
    mock_settings.openai_api_key = "sk-test"
    mock_settings.enable_local_llm = True

    response = await client.get("/api/v1/settings/providers")

    assert response.status_code == 200
    assert response.json() == {"providers": ["anthropic", "openai", "local"]}


@pytest.mark.asyncio
@patch("src.api.routes.settings.settings")
async def test_providers_empty_keys_treated_as_missing(mock_settings, client):
    """Empty string keys are treated as not configured."""
    mock_settings.anthropic_api_key = ""
    mock_settings.openai_api_key = ""
    mock_settings.enable_local_llm = False

    response = await client.get("/api/v1/settings/providers")

    assert response.status_code == 200
    assert response.json() == {"providers": []}


@pytest.mark.asyncio
@patch("src.api.routes.settings.settings")
async def test_providers_local_disabled_by_default(mock_settings, client):
    """Local not in list when enable_local_llm is false."""
    mock_settings.anthropic_api_key = "sk-ant-test"
    mock_settings.openai_api_key = "sk-test"
    mock_settings.enable_local_llm = False

    response = await client.get("/api/v1/settings/providers")

    assert response.status_code == 200
    assert "local" not in response.json()["providers"]

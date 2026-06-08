from unittest.mock import patch

import pytest


# --- GET /api/v1/settings/providers ---


@pytest.mark.asyncio
@patch("src.api.routes.settings.get_provider_models")
@patch("src.api.routes.settings.settings")
async def test_providers_both_keys(mock_settings, mock_models, client):
    """Both API keys configured returns anthropic and openai."""
    mock_settings.anthropic_api_key = "sk-ant-test"
    mock_settings.openai_api_key = "sk-test"
    mock_settings.enable_local_llm = False
    mock_models.return_value = {
        "anthropic": ["claude-sonnet-4-6"],
        "openai": ["gpt-5.1"],
    }

    response = await client.get("/api/v1/settings/providers")

    assert response.status_code == 200
    assert response.json() == {
        "providers": ["anthropic", "openai"],
        "models": {"anthropic": ["claude-sonnet-4-6"], "openai": ["gpt-5.1"]},
    }


@pytest.mark.asyncio
@patch("src.api.routes.settings.get_provider_models")
@patch("src.api.routes.settings.settings")
async def test_providers_anthropic_only(mock_settings, mock_models, client):
    """Only anthropic key configured returns just anthropic."""
    mock_settings.anthropic_api_key = "sk-ant-test"
    mock_settings.openai_api_key = None
    mock_settings.enable_local_llm = False
    mock_models.return_value = {"anthropic": ["claude-sonnet-4-6"]}

    response = await client.get("/api/v1/settings/providers")

    assert response.status_code == 200
    body = response.json()
    assert body["providers"] == ["anthropic"]
    assert body["models"] == {"anthropic": ["claude-sonnet-4-6"]}


@pytest.mark.asyncio
@patch("src.api.routes.settings.get_provider_models")
@patch("src.api.routes.settings.settings")
async def test_providers_openai_only(mock_settings, mock_models, client):
    """Only openai key configured returns just openai."""
    mock_settings.anthropic_api_key = None
    mock_settings.openai_api_key = "sk-test"
    mock_settings.enable_local_llm = False
    mock_models.return_value = {"openai": ["gpt-5.1"]}

    response = await client.get("/api/v1/settings/providers")

    assert response.status_code == 200
    body = response.json()
    assert body["providers"] == ["openai"]
    assert body["models"] == {"openai": ["gpt-5.1"]}


@pytest.mark.asyncio
@patch("src.api.routes.settings.get_provider_models")
@patch("src.api.routes.settings.settings")
async def test_providers_no_keys(mock_settings, mock_models, client):
    """No keys configured returns empty list."""
    mock_settings.anthropic_api_key = None
    mock_settings.openai_api_key = None
    mock_settings.enable_local_llm = False
    mock_models.return_value = {}

    response = await client.get("/api/v1/settings/providers")

    assert response.status_code == 200
    assert response.json() == {"providers": [], "models": {}}


@pytest.mark.asyncio
@patch("src.api.routes.settings.get_provider_models")
@patch("src.api.routes.settings.settings")
async def test_providers_with_local_enabled(mock_settings, mock_models, client):
    """Local LLM enabled adds local to providers list; no model list for local."""
    mock_settings.anthropic_api_key = "sk-ant-test"
    mock_settings.openai_api_key = None
    mock_settings.enable_local_llm = True
    mock_models.return_value = {"anthropic": ["claude-sonnet-4-6"]}

    response = await client.get("/api/v1/settings/providers")

    assert response.status_code == 200
    body = response.json()
    assert body["providers"] == ["anthropic", "local"]
    assert "local" not in body["models"]


@pytest.mark.asyncio
@patch("src.api.routes.settings.get_provider_models")
@patch("src.api.routes.settings.settings")
async def test_providers_all_three(mock_settings, mock_models, client):
    """All providers available returns all three in order."""
    mock_settings.anthropic_api_key = "sk-ant-test"
    mock_settings.openai_api_key = "sk-test"
    mock_settings.enable_local_llm = True
    mock_models.return_value = {
        "anthropic": ["claude-sonnet-4-6"],
        "openai": ["gpt-5.1"],
    }

    response = await client.get("/api/v1/settings/providers")

    assert response.status_code == 200
    body = response.json()
    assert body["providers"] == ["anthropic", "openai", "local"]
    assert set(body["models"].keys()) == {"anthropic", "openai"}


@pytest.mark.asyncio
@patch("src.api.routes.settings.get_provider_models")
@patch("src.api.routes.settings.settings")
async def test_providers_empty_keys_treated_as_missing(
    mock_settings, mock_models, client
):
    """Empty string keys are treated as not configured."""
    mock_settings.anthropic_api_key = ""
    mock_settings.openai_api_key = ""
    mock_settings.enable_local_llm = False
    mock_models.return_value = {}

    response = await client.get("/api/v1/settings/providers")

    assert response.status_code == 200
    assert response.json() == {"providers": [], "models": {}}


@pytest.mark.asyncio
@patch("src.api.routes.settings.get_provider_models")
@patch("src.api.routes.settings.settings")
async def test_providers_local_disabled_by_default(
    mock_settings, mock_models, client
):
    """Local not in list when enable_local_llm is false."""
    mock_settings.anthropic_api_key = "sk-ant-test"
    mock_settings.openai_api_key = "sk-test"
    mock_settings.enable_local_llm = False
    mock_models.return_value = {
        "anthropic": ["claude-sonnet-4-6"],
        "openai": ["gpt-5.1"],
    }

    response = await client.get("/api/v1/settings/providers")

    assert response.status_code == 200
    assert "local" not in response.json()["providers"]


@pytest.mark.asyncio
@patch("src.api.routes.settings.get_provider_models")
@patch("src.api.routes.settings.settings")
async def test_providers_handles_empty_model_list(
    mock_settings, mock_models, client
):
    """Provider with empty model list (upstream failure) still appears."""
    mock_settings.anthropic_api_key = "sk-ant-test"
    mock_settings.openai_api_key = None
    mock_settings.enable_local_llm = False
    mock_models.return_value = {"anthropic": []}

    response = await client.get("/api/v1/settings/providers")

    assert response.status_code == 200
    body = response.json()
    assert body["providers"] == ["anthropic"]
    assert body["models"] == {"anthropic": []}

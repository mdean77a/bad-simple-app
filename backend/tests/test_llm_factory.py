from unittest.mock import patch

import pytest

from src.services.llm_factory import LLMConfigError, get_chat_model


# --- Anthropic provider tests ---


@patch("src.services.llm_factory.ChatAnthropic")
@patch("src.services.llm_factory.settings")
def test_get_chat_model_anthropic(mock_settings, mock_chat_cls):
    mock_settings.llm_provider = "anthropic"
    mock_settings.llm_model = "claude-sonnet-4-20250514"
    mock_settings.anthropic_api_key = "sk-ant-test-key"

    model = get_chat_model()

    mock_chat_cls.assert_called_once_with(
        model="claude-sonnet-4-20250514",
        api_key="sk-ant-test-key",
    )
    assert model == mock_chat_cls.return_value


@patch("src.services.llm_factory.settings")
def test_get_chat_model_anthropic_missing_key(mock_settings):
    mock_settings.llm_provider = "anthropic"
    mock_settings.anthropic_api_key = None

    with pytest.raises(LLMConfigError, match="ANTHROPIC_API_KEY is not configured"):
        get_chat_model()


@patch("src.services.llm_factory.settings")
def test_get_chat_model_anthropic_empty_key(mock_settings):
    mock_settings.llm_provider = "anthropic"
    mock_settings.anthropic_api_key = ""

    with pytest.raises(LLMConfigError, match="ANTHROPIC_API_KEY is not configured"):
        get_chat_model()


@patch("src.services.llm_factory.settings")
def test_get_chat_model_unsupported_provider(mock_settings):
    mock_settings.llm_provider = "unsupported"

    with pytest.raises(LLMConfigError, match="Unsupported LLM provider: unsupported"):
        get_chat_model()


# --- OpenAI provider tests ---


@patch("src.services.llm_factory.ChatOpenAI")
@patch("src.services.llm_factory.settings")
def test_get_chat_model_openai(mock_settings, mock_chat_cls):
    mock_settings.openai_api_key = "sk-test-key"

    model = get_chat_model(provider="openai", model="gpt-5.1")

    mock_chat_cls.assert_called_once_with(
        model="gpt-5.1",
        api_key="sk-test-key",
    )
    assert model == mock_chat_cls.return_value


@patch("src.services.llm_factory.ChatOpenAI")
@patch("src.services.llm_factory.settings")
def test_get_chat_model_openai_default_model(mock_settings, mock_chat_cls):
    mock_settings.openai_api_key = "sk-test-key"

    get_chat_model(provider="openai")

    mock_chat_cls.assert_called_once_with(
        model="gpt-5.1",
        api_key="sk-test-key",
    )


@patch("src.services.llm_factory.settings")
def test_get_chat_model_openai_missing_key(mock_settings):
    mock_settings.openai_api_key = None

    with pytest.raises(LLMConfigError, match="OPENAI_API_KEY is not configured"):
        get_chat_model(provider="openai")


@patch("src.services.llm_factory.settings")
def test_get_chat_model_openai_empty_key(mock_settings):
    mock_settings.openai_api_key = ""

    with pytest.raises(LLMConfigError, match="OPENAI_API_KEY is not configured"):
        get_chat_model(provider="openai")


# --- Local provider tests ---


@patch("src.services.llm_factory.ChatOpenAI")
@patch("src.services.llm_factory.settings")
def test_get_chat_model_local(mock_settings, mock_chat_cls):
    mock_settings.enable_local_llm = True
    mock_settings.local_llm_base_url = "http://localhost:1234/v1"

    model = get_chat_model(provider="local")

    mock_chat_cls.assert_called_once_with(
        model="local",
        base_url="http://localhost:1234/v1",
    )
    assert model == mock_chat_cls.return_value


@patch("src.services.llm_factory.settings")
def test_get_chat_model_local_not_enabled(mock_settings):
    mock_settings.enable_local_llm = False

    with pytest.raises(LLMConfigError, match="Local LLM is not enabled"):
        get_chat_model(provider="local")


# --- Override behavior tests ---


@patch("src.services.llm_factory.ChatAnthropic")
@patch("src.services.llm_factory.settings")
def test_provider_override_takes_precedence(mock_settings, mock_chat_cls):
    """Provider override should override settings.llm_provider."""
    mock_settings.llm_provider = "openai"  # settings says openai
    mock_settings.anthropic_api_key = "sk-ant-test-key"
    mock_settings.llm_model = "claude-sonnet-4-6"

    get_chat_model(provider="anthropic")  # but we override to anthropic

    mock_chat_cls.assert_called_once_with(
        model="claude-sonnet-4-6",
        api_key="sk-ant-test-key",
    )


@patch("src.services.llm_factory.ChatAnthropic")
@patch("src.services.llm_factory.settings")
def test_model_override_takes_precedence(mock_settings, mock_chat_cls):
    """Model override should override settings.llm_model."""
    mock_settings.llm_provider = "anthropic"
    mock_settings.llm_model = "claude-sonnet-4-6"
    mock_settings.anthropic_api_key = "sk-ant-test-key"

    get_chat_model(model="claude-opus-4-6")

    mock_chat_cls.assert_called_once_with(
        model="claude-opus-4-6",
        api_key="sk-ant-test-key",
    )


@patch("src.services.llm_factory.ChatAnthropic")
@patch("src.services.llm_factory.settings")
def test_no_overrides_uses_settings(mock_settings, mock_chat_cls):
    """No overrides should use settings defaults."""
    mock_settings.llm_provider = "anthropic"
    mock_settings.llm_model = "claude-sonnet-4-6"
    mock_settings.anthropic_api_key = "sk-ant-test-key"

    get_chat_model()

    mock_chat_cls.assert_called_once_with(
        model="claude-sonnet-4-6",
        api_key="sk-ant-test-key",
    )


@patch("src.services.llm_factory.ChatOpenAI")
@patch("src.services.llm_factory.settings")
def test_provider_override_without_model_uses_provider_default(
    mock_settings, mock_chat_cls
):
    """OpenAI provider without model override should use _OPENAI_DEFAULT_MODEL."""
    mock_settings.llm_provider = "anthropic"  # settings says anthropic
    mock_settings.llm_model = "claude-sonnet-4-6"  # settings model is anthropic model
    mock_settings.openai_api_key = "sk-test-key"

    get_chat_model(provider="openai")  # override to openai, no model

    mock_chat_cls.assert_called_once_with(
        model="gpt-5.1",  # should use openai default, not anthropic model
        api_key="sk-test-key",
    )

from unittest.mock import patch

import pytest

from src.services.llm_factory import LLMConfigError, get_chat_model


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

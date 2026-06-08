from unittest.mock import MagicMock, patch

import httpx
import pytest

from src.services import model_discovery
from src.services.model_discovery import (
    _is_openai_chat_model,
    clear_cache,
    get_provider_models,
)


@pytest.fixture(autouse=True)
def reset_cache():
    clear_cache()
    yield
    clear_cache()


def _mock_response(json_payload: dict, status_code: int = 200) -> MagicMock:
    resp = MagicMock()
    resp.status_code = status_code
    resp.json.return_value = json_payload
    if status_code >= 400:
        resp.raise_for_status.side_effect = httpx.HTTPStatusError(
            "error", request=MagicMock(), response=resp
        )
    else:
        resp.raise_for_status.return_value = None
    return resp


@patch("src.services.model_discovery.settings")
@patch("src.services.model_discovery.httpx.get")
def test_get_provider_models_anthropic_only(mock_get, mock_settings):
    mock_settings.anthropic_api_key = "sk-ant-test"
    mock_settings.openai_api_key = None
    mock_get.return_value = _mock_response(
        {"data": [{"id": "claude-sonnet-4-6", "type": "model"}]}
    )

    result = get_provider_models()

    assert result == {"anthropic": ["claude-sonnet-4-6"]}
    mock_get.assert_called_once()
    headers = mock_get.call_args.kwargs["headers"]
    assert headers["x-api-key"] == "sk-ant-test"


@patch("src.services.model_discovery.settings")
@patch("src.services.model_discovery.httpx.get")
def test_get_provider_models_openai_filters_non_chat(mock_get, mock_settings):
    mock_settings.anthropic_api_key = None
    mock_settings.openai_api_key = "sk-test"
    mock_get.return_value = _mock_response(
        {
            "data": [
                {"id": "gpt-5.1"},
                {"id": "gpt-5.1-mini"},
                {"id": "gpt-5"},
                {"id": "gpt-4.1"},
                {"id": "gpt-4.1-mini"},
                {"id": "gpt-5.1-mini-2025-04-14"},
                {"id": "gpt-4o"},
                {"id": "gpt-4o-mini"},
                {"id": "gpt-4o-2024-08-06"},
                {"id": "gpt-4"},
                {"id": "gpt-4-turbo"},
                {"id": "gpt-4-0613"},
                {"id": "gpt-4-turbo-preview"},
                {"id": "gpt-3.5-turbo"},
                {"id": "gpt-5.1-nano"},
                {"id": "codex-mini-latest"},
                {"id": "o3-mini"},
                {"id": "o1-preview"},
                {"id": "chatgpt-4o-latest"},
                {"id": "text-embedding-3-small"},
                {"id": "dall-e-3"},
                {"id": "whisper-1"},
                {"id": "tts-1"},
                {"id": "omni-moderation-latest"},
                {"id": "gpt-4o-realtime-preview"},
                {"id": "gpt-4o-audio-preview"},
                {"id": "gpt-image-1"},
            ]
        }
    )

    result = get_provider_models()

    assert result == {
        "openai": sorted(
            ["gpt-5.1", "gpt-5.1-mini", "gpt-5", "gpt-4.1", "gpt-4.1-mini"]
        )
    }


@patch("src.services.model_discovery.settings")
@patch("src.services.model_discovery.httpx.get")
def test_get_provider_models_both(mock_get, mock_settings):
    mock_settings.anthropic_api_key = "sk-ant-test"
    mock_settings.openai_api_key = "sk-test"
    mock_get.side_effect = [
        _mock_response({"data": [{"id": "claude-sonnet-4-6"}]}),
        _mock_response({"data": [{"id": "gpt-5.1"}]}),
    ]

    result = get_provider_models()

    assert result == {"anthropic": ["claude-sonnet-4-6"], "openai": ["gpt-5.1"]}


@patch("src.services.model_discovery.settings")
@patch("src.services.model_discovery.httpx.get")
def test_get_provider_models_returns_empty_list_on_upstream_error(
    mock_get, mock_settings
):
    mock_settings.anthropic_api_key = "sk-ant-test"
    mock_settings.openai_api_key = None
    mock_get.return_value = _mock_response({}, status_code=401)

    result = get_provider_models()

    assert result == {"anthropic": []}


@patch("src.services.model_discovery.settings")
@patch("src.services.model_discovery.httpx.get")
def test_get_provider_models_handles_timeout(mock_get, mock_settings):
    mock_settings.anthropic_api_key = "sk-ant-test"
    mock_settings.openai_api_key = None
    mock_get.side_effect = httpx.ReadTimeout("slow")

    result = get_provider_models()

    assert result == {"anthropic": []}


@patch("src.services.model_discovery.settings")
@patch("src.services.model_discovery.httpx.get")
def test_get_provider_models_one_provider_failure_does_not_affect_other(
    mock_get, mock_settings
):
    mock_settings.anthropic_api_key = "sk-ant-test"
    mock_settings.openai_api_key = "sk-test"
    mock_get.side_effect = [
        httpx.ConnectError("anthropic down"),
        _mock_response({"data": [{"id": "gpt-5.1"}]}),
    ]

    result = get_provider_models()

    assert result == {"anthropic": [], "openai": ["gpt-5.1"]}


@patch("src.services.model_discovery.settings")
@patch("src.services.model_discovery.httpx.get")
def test_get_provider_models_caches_within_ttl(mock_get, mock_settings):
    mock_settings.anthropic_api_key = "sk-ant-test"
    mock_settings.openai_api_key = None
    mock_get.return_value = _mock_response({"data": [{"id": "claude-sonnet-4-6"}]})

    get_provider_models()
    get_provider_models()
    get_provider_models()

    assert mock_get.call_count == 1


@patch("src.services.model_discovery.settings")
@patch("src.services.model_discovery.httpx.get")
def test_get_provider_models_no_keys_returns_empty(mock_get, mock_settings):
    mock_settings.anthropic_api_key = None
    mock_settings.openai_api_key = None

    result = get_provider_models()

    assert result == {}
    mock_get.assert_not_called()


@patch("src.services.model_discovery.settings")
@patch("src.services.model_discovery.httpx.get")
def test_get_provider_models_handles_malformed_json(mock_get, mock_settings):
    mock_settings.anthropic_api_key = "sk-ant-test"
    mock_settings.openai_api_key = None
    resp = MagicMock()
    resp.raise_for_status.return_value = None
    resp.json.side_effect = ValueError("not json")
    mock_get.return_value = resp

    result = get_provider_models()

    assert result == {"anthropic": []}


@patch("src.services.model_discovery.settings")
@patch("src.services.model_discovery.httpx.get")
def test_cache_separate_per_provider(mock_get, mock_settings):
    mock_settings.anthropic_api_key = "sk-ant-test"
    mock_settings.openai_api_key = "sk-test"
    mock_get.side_effect = [
        _mock_response({"data": [{"id": "claude-sonnet-4-6"}]}),
        _mock_response({"data": [{"id": "gpt-5.1"}]}),
    ]

    first = get_provider_models()
    second = get_provider_models()

    assert first == second
    assert mock_get.call_count == 2


@patch("src.services.model_discovery.settings")
@patch("src.services.model_discovery.httpx.get")
def test_cache_expiry_refetches(mock_get, mock_settings):
    mock_settings.anthropic_api_key = "sk-ant-test"
    mock_settings.openai_api_key = None
    mock_get.return_value = _mock_response({"data": [{"id": "claude-sonnet-4-6"}]})

    get_provider_models()
    # Force-expire by manipulating cache directly
    value, _ = model_discovery._cache["anthropic"]
    model_discovery._cache["anthropic"] = (value, 0.0)
    get_provider_models()

    assert mock_get.call_count == 2


def test_openai_chat_filter():
    # Kept: gpt-4.1+ unpinned aliases
    assert _is_openai_chat_model("gpt-4.1")
    assert _is_openai_chat_model("gpt-4.1-mini")
    assert _is_openai_chat_model("gpt-4.5")
    assert _is_openai_chat_model("gpt-5")
    assert _is_openai_chat_model("gpt-5.1")
    assert _is_openai_chat_model("gpt-5.1-mini")
    # Dropped: 4o family
    assert not _is_openai_chat_model("gpt-4o")
    assert not _is_openai_chat_model("gpt-4o-mini")
    assert not _is_openai_chat_model("chatgpt-4o-latest")
    # Dropped: pre-4.1 legacy
    assert not _is_openai_chat_model("gpt-4")
    assert not _is_openai_chat_model("gpt-4-turbo")
    assert not _is_openai_chat_model("gpt-3.5-turbo")
    assert not _is_openai_chat_model("gpt-3.5-turbo-instruct")
    # Dropped: "latest" aliases
    assert not _is_openai_chat_model("codex-mini-latest")
    # Dropped: reasoning/codex/nano variants
    assert not _is_openai_chat_model("o3-mini")
    assert not _is_openai_chat_model("o1-preview")
    assert not _is_openai_chat_model("o4-mini")
    assert not _is_openai_chat_model("gpt-5.1-nano")
    assert not _is_openai_chat_model("gpt-4.1-nano")
    # Dropped: previews
    assert not _is_openai_chat_model("gpt-4-turbo-preview")
    # Dropped: date-pinned snapshots
    assert not _is_openai_chat_model("gpt-5.1-mini-2025-04-14")
    assert not _is_openai_chat_model("gpt-4.1-2025-04-14")
    assert not _is_openai_chat_model("gpt-4-0613")
    assert not _is_openai_chat_model("gpt-4-0125-preview")
    # Dropped: non-chat modalities
    assert not _is_openai_chat_model("text-embedding-3-small")
    assert not _is_openai_chat_model("dall-e-3")
    assert not _is_openai_chat_model("whisper-1")
    assert not _is_openai_chat_model("tts-1")
    assert not _is_openai_chat_model("omni-moderation-latest")
    assert not _is_openai_chat_model("babbage-002")

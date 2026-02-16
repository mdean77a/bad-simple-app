from unittest.mock import MagicMock, patch

import pytest

from src.services.llm_factory import LLMConfigError
from src.services.rag_pipeline import (
    OutlineGenerationError,
    OutlineResult,
    OutlineSection,
    _build_prompt,
    _enforce_order,
    generate_outline,
)
from src.services.section_definitions import (
    ALL_SECTIONS,
    CONDITIONAL_SECTIONS,
    SIGNATURE_SECTIONS,
    STANDARD_SECTIONS,
)
from src.services.vector_store import VectorStoreError


def _make_outline_result(sections: list[dict] | None = None) -> OutlineResult:
    """Create a mock OutlineResult with default or custom sections."""
    if sections is None:
        sections = [
            {
                "sectionName": "Purpose of the Study",
                "category": "standard",
                "isConditional": False,
                "defaultChecked": True,
                "detectionReason": None,
            },
            {
                "sectionName": "Genetic Research",
                "category": "conditional",
                "isConditional": True,
                "defaultChecked": True,
                "detectionReason": "detected: genetic sample collection",
            },
            {
                "sectionName": "Adult Consent",
                "category": "signature",
                "isConditional": True,
                "defaultChecked": True,
                "detectionReason": "detected: participants ages 18-65",
            },
        ]
    return OutlineResult(
        sections=[OutlineSection(**s) for s in sections]
    )


# --- generate_outline ---


@patch("src.services.rag_pipeline.get_chat_model")
@patch("src.services.rag_pipeline.search_protocol")
def test_generate_outline_success(mock_search, mock_get_model):
    mock_search.return_value = ["Chunk 1: Study purpose...", "Chunk 2: Procedures..."]

    mock_model = MagicMock()
    mock_structured = MagicMock()
    mock_model.with_structured_output.return_value = mock_structured
    mock_structured.invoke.return_value = _make_outline_result()
    mock_get_model.return_value = mock_model

    result = generate_outline("protocol_test_123")

    assert len(result) == 3
    assert result[0]["sectionName"] == "Purpose of the Study"
    assert result[0]["category"] == "standard"
    assert result[0]["isConditional"] is False
    assert result[0]["defaultChecked"] is True
    assert result[1]["sectionName"] == "Genetic Research"
    assert result[1]["isConditional"] is True
    assert result[1]["detectionReason"] == "detected: genetic sample collection"
    mock_search.assert_called_once_with("protocol_test_123", mock_search.call_args[0][1], k=20)


@patch("src.services.rag_pipeline.get_chat_model")
@patch("src.services.rag_pipeline.search_protocol")
def test_generate_outline_calls_llm_with_structured_output(mock_search, mock_get_model):
    mock_search.return_value = ["Some protocol content"]

    mock_model = MagicMock()
    mock_structured = MagicMock()
    mock_model.with_structured_output.return_value = mock_structured
    mock_structured.invoke.return_value = _make_outline_result()
    mock_get_model.return_value = mock_model

    generate_outline("protocol_test_123")

    mock_model.with_structured_output.assert_called_once_with(OutlineResult)
    mock_structured.invoke.assert_called_once()
    prompt_arg = mock_structured.invoke.call_args[0][0]
    assert "Some protocol content" in prompt_arg
    assert "Standard Sections" in prompt_arg
    assert "Conditional Sections" in prompt_arg
    assert "Signature Pages" in prompt_arg


@patch("src.services.rag_pipeline.search_protocol")
def test_generate_outline_vector_store_error(mock_search):
    mock_search.side_effect = VectorStoreError("Connection refused")

    with pytest.raises(VectorStoreError, match="Connection refused"):
        generate_outline("protocol_test_123")


@patch("src.services.rag_pipeline.search_protocol")
def test_generate_outline_no_chunks_found(mock_search):
    mock_search.return_value = []

    with pytest.raises(VectorStoreError, match="No content found"):
        generate_outline("protocol_test_123")


@patch("src.services.rag_pipeline.get_chat_model")
@patch("src.services.rag_pipeline.search_protocol")
def test_generate_outline_retries_on_llm_failure(mock_search, mock_get_model):
    """LLM failure triggers retry up to 3 times."""
    mock_search.return_value = ["Protocol content"]

    mock_model = MagicMock()
    mock_structured = MagicMock()
    mock_model.with_structured_output.return_value = mock_structured
    mock_structured.invoke.side_effect = [
        RuntimeError("LLM timeout"),
        RuntimeError("LLM timeout"),
        _make_outline_result(),
    ]
    mock_get_model.return_value = mock_model

    result = generate_outline("protocol_test_123")

    assert len(result) == 3
    assert mock_structured.invoke.call_count == 3


@patch("src.services.rag_pipeline.get_chat_model")
@patch("src.services.rag_pipeline.search_protocol")
def test_generate_outline_fails_after_max_retries(mock_search, mock_get_model):
    """After 3 failed attempts, raises OutlineGenerationError."""
    mock_search.return_value = ["Protocol content"]

    mock_model = MagicMock()
    mock_structured = MagicMock()
    mock_model.with_structured_output.return_value = mock_structured
    mock_structured.invoke.side_effect = RuntimeError("LLM timeout")
    mock_get_model.return_value = mock_model

    with pytest.raises(OutlineGenerationError, match="failed after 3 attempts"):
        generate_outline("protocol_test_123")

    assert mock_structured.invoke.call_count == 3


@patch("src.services.rag_pipeline.get_chat_model")
@patch("src.services.rag_pipeline.search_protocol")
def test_generate_outline_llm_config_error_not_retried(mock_search, mock_get_model):
    """LLMConfigError is raised immediately without retrying."""
    mock_search.return_value = ["Protocol content"]
    mock_get_model.side_effect = LLMConfigError("ANTHROPIC_API_KEY is not configured")

    with pytest.raises(LLMConfigError, match="ANTHROPIC_API_KEY"):
        generate_outline("protocol_test_123")


@patch("src.services.rag_pipeline.get_chat_model")
@patch("src.services.rag_pipeline.search_protocol")
def test_generate_outline_returns_dicts(mock_search, mock_get_model):
    """Result is a list of plain dicts, not Pydantic models."""
    mock_search.return_value = ["Protocol content"]

    mock_model = MagicMock()
    mock_structured = MagicMock()
    mock_model.with_structured_output.return_value = mock_structured
    mock_structured.invoke.return_value = _make_outline_result()
    mock_get_model.return_value = mock_model

    result = generate_outline("protocol_test_123")

    assert isinstance(result, list)
    assert isinstance(result[0], dict)
    assert "sectionName" in result[0]


@patch("src.services.rag_pipeline.get_chat_model")
@patch("src.services.rag_pipeline.search_protocol")
def test_generate_outline_includes_all_categories(mock_search, mock_get_model):
    """Result includes standard, conditional, and signature categories."""
    mock_search.return_value = ["Protocol content"]

    mock_model = MagicMock()
    mock_structured = MagicMock()
    mock_model.with_structured_output.return_value = mock_structured
    mock_structured.invoke.return_value = _make_outline_result()
    mock_get_model.return_value = mock_model

    result = generate_outline("protocol_test_123")

    categories = {s["category"] for s in result}
    assert categories == {"standard", "conditional", "signature"}


# --- OutlineSection model ---


def test_outline_section_standard():
    section = OutlineSection(
        sectionName="Purpose of the Study",
        category="standard",
        isConditional=False,
        defaultChecked=True,
    )
    assert section.sectionName == "Purpose of the Study"
    assert section.detectionReason is None


def test_outline_section_conditional():
    section = OutlineSection(
        sectionName="Genetic Research",
        category="conditional",
        isConditional=True,
        defaultChecked=True,
        detectionReason="detected: genetic sample collection",
    )
    assert section.isConditional is True
    assert section.detectionReason == "detected: genetic sample collection"


def test_outline_result_model():
    result = _make_outline_result()
    assert len(result.sections) == 3
    dumped = [s.model_dump() for s in result.sections]
    assert dumped[0]["sectionName"] == "Purpose of the Study"


# --- _build_prompt ---


def test_build_prompt_includes_all_standard_sections():
    prompt = _build_prompt("test context")
    for s in STANDARD_SECTIONS:
        assert s.name in prompt


def test_build_prompt_includes_all_conditional_sections():
    prompt = _build_prompt("test context")
    for s in CONDITIONAL_SECTIONS:
        assert s.name in prompt
        assert s.detection_guidance in prompt


def test_build_prompt_includes_all_signature_sections():
    prompt = _build_prompt("test context")
    for s in SIGNATURE_SECTIONS:
        assert s.name in prompt
        assert s.detection_guidance in prompt


def test_build_prompt_includes_context():
    prompt = _build_prompt("My protocol content here")
    assert "My protocol content here" in prompt


def test_build_prompt_includes_section_order():
    prompt = _build_prompt("test context")
    assert "Section Order" in prompt
    for _, s in ALL_SECTIONS:
        assert f'"{s.name}"' in prompt


# --- _enforce_order ---


def test_enforce_order_sorts_by_canonical_order():
    """Sections returned out of order by LLM are reordered."""
    sections = [
        {"sectionName": "Adult Consent", "category": "signature"},
        {"sectionName": "Purpose of the Study", "category": "standard"},
        {"sectionName": "Genetic Research", "category": "conditional"},
    ]
    ordered = _enforce_order(sections)
    assert ordered[0]["sectionName"] == "Purpose of the Study"
    assert ordered[1]["sectionName"] == "Genetic Research"
    assert ordered[2]["sectionName"] == "Adult Consent"


def test_enforce_order_unknown_sections_go_last():
    """Sections not in ALL_SECTIONS are placed at the end."""
    sections = [
        {"sectionName": "Unknown Section", "category": "standard"},
        {"sectionName": "Purpose of the Study", "category": "standard"},
    ]
    ordered = _enforce_order(sections)
    assert ordered[0]["sectionName"] == "Purpose of the Study"
    assert ordered[1]["sectionName"] == "Unknown Section"


# --- section_definitions ---


def test_all_sections_has_correct_count():
    total = len(STANDARD_SECTIONS) + len(CONDITIONAL_SECTIONS) + len(SIGNATURE_SECTIONS)
    assert len(ALL_SECTIONS) == total


def test_all_sections_order_standard_first():
    """Standard sections come before conditional, which come before signature."""
    categories = [cat for cat, _ in ALL_SECTIONS]
    first_conditional = categories.index("conditional")
    first_signature = categories.index("signature")
    last_standard = len(STANDARD_SECTIONS) - 1
    assert last_standard < first_conditional < first_signature


def test_section_names_unique():
    names = [s.name for _, s in ALL_SECTIONS]
    assert len(names) == len(set(names))

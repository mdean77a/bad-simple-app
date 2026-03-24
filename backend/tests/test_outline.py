from unittest.mock import patch

import pytest

from src.services.llm_factory import LLMConfigError
from src.services.rag_pipeline import OutlineGenerationError
from src.services.vector_store import VectorStoreError


MOCK_SECTIONS = [
    {
        "sectionName": "Purpose of the Study",
        "category": "standard",
        "isConditional": False,
        "defaultChecked": True,
        "detectionReason": None,
    },
    {
        "sectionName": "Study Procedures",
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


# --- POST /api/v1/outline/generate ---


@pytest.mark.asyncio
@patch("src.api.routes.outline.generate_outline")
async def test_generate_outline_success(mock_gen, client):
    mock_gen.return_value = MOCK_SECTIONS

    response = await client.post(
        "/api/v1/outline/generate",
        json={"protocolId": "protocol_test_123"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["protocolId"] == "protocol_test_123"
    assert len(data["sections"]) == 4
    assert data["sections"][0]["sectionName"] == "Purpose of the Study"
    assert data["sections"][2]["isConditional"] is True
    assert data["sections"][2]["defaultChecked"] is True
    assert data["sections"][2]["detectionReason"] == "detected: genetic sample collection"
    mock_gen.assert_called_once_with(
        "protocol_test_123", provider=None, model_name=None
    )


@pytest.mark.asyncio
@patch("src.api.routes.outline.generate_outline")
async def test_generate_outline_response_structure(mock_gen, client):
    """Each section has exactly the expected fields."""
    mock_gen.return_value = MOCK_SECTIONS

    response = await client.post(
        "/api/v1/outline/generate",
        json={"protocolId": "protocol_test_123"},
    )

    assert response.status_code == 200
    section = response.json()["sections"][0]
    assert set(section.keys()) == {
        "sectionName",
        "category",
        "isConditional",
        "defaultChecked",
        "detectionReason",
    }


@pytest.mark.asyncio
async def test_generate_outline_missing_protocol_id(client):
    """Request without protocolId returns 422."""
    response = await client.post(
        "/api/v1/outline/generate",
        json={},
    )

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_generate_outline_empty_protocol_id(client):
    """Empty protocolId string returns validation error."""
    response = await client.post(
        "/api/v1/outline/generate",
        json={"protocolId": "   "},
    )

    assert response.status_code == 422
    data = response.json()
    assert data["code"] == "VALIDATION_ERROR"
    assert "protocolId" in data["detail"]


@pytest.mark.asyncio
@patch("src.api.routes.outline.generate_outline")
async def test_generate_outline_vector_db_error(mock_gen, client):
    mock_gen.side_effect = VectorStoreError("Connection refused")

    response = await client.post(
        "/api/v1/outline/generate",
        json={"protocolId": "protocol_test_123"},
    )

    assert response.status_code == 502
    data = response.json()
    assert data["code"] == "VECTOR_DB_ERROR"
    assert "Connection refused" in data["detail"]


@pytest.mark.asyncio
@patch("src.api.routes.outline.generate_outline")
async def test_generate_outline_llm_error(mock_gen, client):
    mock_gen.side_effect = OutlineGenerationError("Failed after 3 attempts")

    response = await client.post(
        "/api/v1/outline/generate",
        json={"protocolId": "protocol_test_123"},
    )

    assert response.status_code == 502
    data = response.json()
    assert data["code"] == "LLM_ERROR"
    assert "Failed after 3 attempts" in data["detail"]


@pytest.mark.asyncio
@patch("src.api.routes.outline.generate_outline")
async def test_generate_outline_llm_config_error(mock_gen, client):
    """LLMConfigError (missing API key) also returns LLM_ERROR."""
    mock_gen.side_effect = LLMConfigError("ANTHROPIC_API_KEY is not configured")

    response = await client.post(
        "/api/v1/outline/generate",
        json={"protocolId": "protocol_test_123"},
    )

    assert response.status_code == 502
    data = response.json()
    assert data["code"] == "LLM_ERROR"
    assert "ANTHROPIC_API_KEY" in data["detail"]


@pytest.mark.asyncio
@patch("src.api.routes.outline.generate_outline")
async def test_generate_outline_no_content_found(mock_gen, client):
    """VectorStoreError for empty protocol returns 502."""
    mock_gen.side_effect = VectorStoreError("No content found for protocol: xyz")

    response = await client.post(
        "/api/v1/outline/generate",
        json={"protocolId": "xyz"},
    )

    assert response.status_code == 502
    data = response.json()
    assert data["code"] == "VECTOR_DB_ERROR"
    assert "No content found" in data["detail"]


# --- Provider/model override tests ---


@pytest.mark.asyncio
@patch("src.api.routes.outline.generate_outline")
async def test_generate_outline_with_provider_model(mock_gen, client):
    """Provider and model are passed through to generate_outline."""
    mock_gen.return_value = MOCK_SECTIONS

    response = await client.post(
        "/api/v1/outline/generate",
        json={"protocolId": "proto-1", "provider": "openai", "model": "gpt-5.1"},
    )

    assert response.status_code == 200
    mock_gen.assert_called_once_with(
        "proto-1", provider="openai", model_name="gpt-5.1"
    )


@pytest.mark.asyncio
@patch("src.api.routes.outline.generate_outline")
async def test_generate_outline_without_provider_model(mock_gen, client):
    """Missing provider/model passes None (backward compatible)."""
    mock_gen.return_value = MOCK_SECTIONS

    response = await client.post(
        "/api/v1/outline/generate",
        json={"protocolId": "proto-1"},
    )

    assert response.status_code == 200
    mock_gen.assert_called_once_with(
        "proto-1", provider=None, model_name=None
    )

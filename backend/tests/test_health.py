import pytest


@pytest.mark.asyncio
async def test_health_check_returns_ok(client):
    """Test that health endpoint returns status ok."""
    response = await client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_health_check_content_type(client):
    """Test that health endpoint returns JSON content type."""
    response = await client.get("/api/v1/health")

    assert response.headers["content-type"] == "application/json"

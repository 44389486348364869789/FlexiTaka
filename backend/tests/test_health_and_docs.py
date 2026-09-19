"""
Tests for Health Check, Root Endpoint, and OpenAPI Documentation.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_endpoints(client: AsyncClient, clean_db):
    res = await client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "https://flexitaka.online/api/v1" in data["api_base"]
    assert "https://flexitaka.com" in data["customer_website"]

    v1_res = await client.get("/api/v1/health")
    assert v1_res.status_code == 200
    assert v1_res.json()["status"] == "healthy"


@pytest.mark.asyncio
async def test_root_endpoint(client: AsyncClient):
    res = await client.get("/")
    assert res.status_code == 200
    data = res.json()
    assert data["api_prefix"] == "/api/v1"
    assert "flexitaka.com" in data["notice"]


@pytest.mark.asyncio
async def test_openapi_schema_generation(client: AsyncClient):
    res = await client.get("/api/v1/openapi.json")
    assert res.status_code == 200
    schema = res.json()
    assert "paths" in schema
    assert "/api/v1/operators" in schema["paths"]
    assert "/api/v1/cashout/orders" in schema["paths"]
    assert "/api/v1/recharge/orders" in schema["paths"]
    assert "/api/v1/admin/orders" in schema["paths"]

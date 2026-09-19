"""
Tests for Guest Sessions and Authentication.
"""

from datetime import datetime, timedelta, timezone
import pytest
from httpx import AsyncClient
from app.core.security import hash_password


@pytest.mark.asyncio
async def test_guest_session_creation_and_lookup(client: AsyncClient, clean_db):
    res = await client.post("/api/v1/guest/session")
    assert res.status_code == 200, res.text
    data = res.json()
    assert "guest_session_id" in data
    assert "session_token" in data
    assert data["guest_session_id"].startswith("FT-G-")

    guest_id = data["guest_session_id"]
    # Check session
    check_res = await client.get("/api/v1/guest/session", headers={"X-Guest-Session-ID": guest_id})
    assert check_res.status_code == 200
    assert check_res.json()["active"] is True
    assert check_res.json()["guest_session_id"] == guest_id


@pytest.mark.asyncio
async def test_expired_guest_session_handling(client: AsyncClient, clean_db):
    res = await client.post("/api/v1/guest/session")
    guest_id = res.json()["guest_session_id"]

    # Manually expire the session in MongoDB
    db = clean_db
    past_time = datetime.now(timezone.utc) - timedelta(days=1)
    await db.guest_sessions.update_one(
        {"guest_session_id": guest_id},
        {"$set": {"expires_at": past_time}}
    )

    # Trying to query session or place order with expired session
    check_res = await client.get("/api/v1/guest/session", headers={"X-Guest-Session-ID": guest_id})
    assert check_res.status_code == 401
    assert check_res.json()["error"]["code"] == "SESSION_EXPIRED"


@pytest.mark.asyncio
async def test_otp_auth_flow(client: AsyncClient, clean_db):
    phone = "01712345678"

    # Request OTP
    req_res = await client.post("/api/v1/auth/request-otp", json={"phone": phone})
    assert req_res.status_code == 200
    assert req_res.json()["success"] is True

    # Invalid OTP fails
    bad_res = await client.post("/api/v1/auth/verify-otp", json={"phone": phone, "otp": "999999"})
    assert bad_res.status_code == 422
    assert bad_res.json()["error"]["code"] == "INVALID_OTP"

    # Valid OTP (123456 in dev/test) succeeds and creates account
    good_res = await client.post("/api/v1/auth/verify-otp", json={"phone": phone, "otp": "123456"})
    assert good_res.status_code == 200
    data = good_res.json()
    assert "access_token" in data
    assert data["user_id"].startswith("FT-U-")
    assert data["phone"] == phone


@pytest.mark.asyncio
async def test_admin_login(client: AsyncClient, clean_db):
    db = clean_db
    email = "verifier@flexitaka.online"
    password = "SecretPassword123"

    await db.admin_users.insert_one({
        "admin_user_id": "ADM-TEST-01",
        "email": email,
        "name": "Test Verifier",
        "password_hash": hash_password(password),
        "role": "VERIFIER",
        "status": "ACTIVE",
        "created_at": "2026-09-19T00:00:00Z"
    })

    # Wrong password fails
    fail_res = await client.post("/api/v1/auth/admin-login", json={"email": email, "password": "WrongPassword"})
    assert fail_res.status_code == 401

    # Correct password succeeds
    ok_res = await client.post("/api/v1/auth/admin-login", json={"email": email, "password": password})
    assert ok_res.status_code == 200
    assert "access_token" in ok_res.json()
    assert ok_res.json()["role"] == "VERIFIER"

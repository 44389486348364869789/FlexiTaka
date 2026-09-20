"""
Comprehensive Automated Tests for SMS Provider Abstraction and OTP Authentication.
Validates:
- Provider selection (ZendSMS, Generic HTTP, Mock)
- ZendSMS provider mocked success and failure
- Generic provider mocked success and failure
- OTP Redis storage and 5-minute TTL
- Successful verification and single-use invalidation
- Wrong OTP handling and attempt limit lockout
- Expired OTP rejection
- Resend cooldown enforcement
- Production rejection of universal 123456 bypass
- Production logs containing no OTP
- Zero credential leakage in API responses
"""

import asyncio
import logging
from unittest.mock import AsyncMock, patch
import pytest
import httpx
from httpx import AsyncClient, Response
from app.core.config import settings
from app.core.exceptions import RateLimitException, ServiceUnavailableException, ValidationException
from app.db.redis import get_redis
from app.db.repositories.users_repo import UsersRepository
from app.modules.auth.service import AuthService, normalize_bd_phone
from app.modules.auth.sms.factory import get_sms_provider
from app.modules.auth.sms.generic_http import GenericHttpSMSProvider
from app.modules.auth.sms.mock import MockSMSProvider
from app.modules.auth.sms.zendsms import ZendSMSProvider


# 1. Provider Selection Test
def test_provider_selection():
    p_zend = get_sms_provider("zendsms")
    assert isinstance(p_zend, ZendSMSProvider)
    assert p_zend.name == "zendsms"

    p_generic = get_sms_provider("generic_http")
    assert isinstance(p_generic, GenericHttpSMSProvider)
    assert p_generic.name == "generic_http"

    p_mock = get_sms_provider("mock")
    assert isinstance(p_mock, MockSMSProvider)
    assert p_mock.name == "mock"

    p_fallback = get_sms_provider("non_existent_provider")
    assert isinstance(p_fallback, MockSMSProvider)


# 2. ZendSMS Mocked Success
@pytest.mark.asyncio
async def test_zendsms_mocked_success():
    provider = ZendSMSProvider(
        api_key="test-zendsms-secret-key-12345",
        base_url="https://api.zendsms.com",
        sender_id="8809612781023",
        brand="FlexiTaka",
        expiry=300
    )

    mock_resp = Response(
        status_code=200,
        json={
            "success": True,
            "code": 200,
            "message": "OTP sent successfully",
            "data": {
                "message_id": "zend-msg-998877",
                "otp_id": "otp-123456",
                "recipient": "8801712345678",
                "expires_in": 300
            }
        },
        request=httpx.Request("POST", "https://api.zendsms.com/api/v1/otp/send")
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp
        result = await provider.send_otp("01712345678", "654321")

        assert result.success is True
        assert result.provider == "zendsms"
        assert result.message_id in ("zend-msg-998877", "otp-123456")
        assert result.raw_status_code == 200

        # Assert correct ZendSMS payload contract
        called_args, called_kwargs = mock_post.call_args
        assert called_kwargs["json"]["sender_id"] == "8809612781023"
        assert called_kwargs["json"]["recipient"] == "8801712345678"
        assert called_kwargs["json"]["expiry"] == 300
        assert called_kwargs["json"]["brand"] == "FlexiTaka"
        assert "Authorization" in called_kwargs["headers"]
        assert "Bearer test-zendsms-secret-key-12345" == called_kwargs["headers"]["Authorization"]


# 3. ZendSMS Mocked Failure & Malformed Response
@pytest.mark.asyncio
async def test_zendsms_mocked_failure():
    provider = ZendSMSProvider(
        api_key="test-zendsms-secret-key-12345",
        base_url="https://api.zendsms.com",
        sender_id="8809612781023",
        brand="FlexiTaka",
        expiry=300
    )

    # Subcase A: HTTP 401 Unauthorized
    mock_resp_401 = Response(
        status_code=401,
        json={"error": "Unauthorized", "message": "Invalid API Key"},
        request=httpx.Request("POST", "https://api.zendsms.com/api/v1/otp/send")
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp_401
        result = await provider.send_otp("01712345678", "654321")

        assert result.success is False
        assert result.raw_status_code == 401
        # Assure secrets are not exposed in result
        assert "test-zendsms-secret-key-12345" not in (result.error_message or "")

    # Subcase B: Provider 200 with rejected success=False
    mock_resp_reject = Response(
        status_code=200,
        json={"success": False, "code": 402, "message": "Insufficient wallet balance"},
        request=httpx.Request("POST", "https://api.zendsms.com/api/v1/otp/send")
    )
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp_reject
        result = await provider.send_otp("01712345678", "654321")
        assert result.success is False
        assert "Insufficient wallet balance" in (result.error_message or "")

    # Subcase C: Malformed JSON response with error status
    mock_resp_malformed = Response(
        status_code=500,
        content=b"Internal Gateway Error",
        request=httpx.Request("POST", "https://api.zendsms.com/api/v1/otp/send")
    )
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp_malformed
        result = await provider.send_otp("01712345678", "654321")
        assert result.success is False
        assert result.raw_status_code == 500


# 4. Generic Provider Mocked Success
@pytest.mark.asyncio
async def test_generic_provider_mocked_success():
    provider = GenericHttpSMSProvider(
        base_url="https://sms.example.com",
        api_key="generic-secret-token",
        auth_header="X-API-KEY",
        auth_scheme="",
        send_path="/api/send-sms"
    )

    mock_resp = Response(
        status_code=200,
        json={"status": "success", "id": "gen-tx-1001"},
        request=httpx.Request("POST", "https://sms.example.com/api/send-sms")
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp
        result = await provider.send_otp("01812345678", "123987")

        assert result.success is True
        assert result.provider == "generic_http"
        assert result.message_id == "gen-tx-1001"

        called_args, called_kwargs = mock_post.call_args
        assert called_kwargs["headers"]["X-API-KEY"] == "generic-secret-token"
        assert called_kwargs["json"]["phone"] == "01812345678"
        assert called_kwargs["json"]["otp"] == "123987"


# 5. Generic Provider Mocked Failure
@pytest.mark.asyncio
async def test_generic_provider_mocked_failure():
    provider = GenericHttpSMSProvider(
        base_url="https://sms.example.com",
        api_key="generic-secret-token",
        send_path="/api/send-sms"
    )

    mock_resp = Response(
        status_code=500,
        text="Internal Server Error",
        request=httpx.Request("POST", "https://sms.example.com/api/send-sms")
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp
        result = await provider.send_otp("01812345678", "123987")

        assert result.success is False
        assert result.raw_status_code == 500
        assert "500" in (result.error_message or "")


# 6. OTP Redis Storage and 5-Minute TTL
@pytest.mark.asyncio
async def test_otp_redis_storage_and_5min_ttl(clean_db):
    users_repo = UsersRepository(clean_db)
    mock_provider = MockSMSProvider()
    service = AuthService(users_repo, sms_provider=mock_provider)

    phone = "01711223344"
    res = await service.request_otp(phone)
    assert res["success"] is True
    assert res["expires_in_seconds"] == 300

    r = get_redis()
    stored = await r.get(f"otp:{phone}")
    assert stored is not None
    ttl = await r.ttl(f"otp:{phone}")
    assert 280 <= ttl <= 300


# 7. Successful Verification & Single-Use Deletion
@pytest.mark.asyncio
async def test_successful_verification_and_single_use(clean_db):
    users_repo = UsersRepository(clean_db)
    mock_provider = MockSMSProvider()
    service = AuthService(users_repo, sms_provider=mock_provider)

    phone = "01722334455"
    await service.request_otp(phone)

    r = get_redis()
    stored_otp = (await r.get(f"otp:{phone}")).decode("utf-8") if isinstance(await r.get(f"otp:{phone}"), bytes) else await r.get(f"otp:{phone}")

    # Verify first time
    auth_data = await service.verify_otp(phone, stored_otp)
    assert "access_token" in auth_data
    assert auth_data["phone"] == phone

    # Verify OTP was deleted from Redis immediately (single-use)
    assert await r.get(f"otp:{phone}") is None

    # Second attempt with same OTP must fail
    with pytest.raises(ValidationException) as exc_info:
        await service.verify_otp(phone, stored_otp)
    assert "Invalid or expired" in str(exc_info.value.message)


# 8. Wrong OTP and Verification-Attempt Lockout
@pytest.mark.asyncio
async def test_wrong_otp_and_attempt_limit_lockout(clean_db):
    users_repo = UsersRepository(clean_db)
    mock_provider = MockSMSProvider()
    service = AuthService(users_repo, sms_provider=mock_provider)

    phone = "01733445566"
    await service.request_otp(phone)

    # 4 invalid attempts
    for attempt in range(1, 5):
        with pytest.raises(ValidationException) as exc_info:
            await service.verify_otp(phone, "000000")
        assert f"{5 - attempt} attempt(s) remaining" in exc_info.value.message

    # 5th invalid attempt triggers lockout
    with pytest.raises(ValidationException) as exc_info:
        await service.verify_otp(phone, "000000")
    assert "Too many invalid verification attempts" in exc_info.value.message

    # Verify OTP was destroyed in Redis
    r = get_redis()
    assert await r.get(f"otp:{phone}") is None


# 9. Expired OTP Rejection
@pytest.mark.asyncio
async def test_expired_otp_rejection(clean_db):
    users_repo = UsersRepository(clean_db)
    service = AuthService(users_repo, sms_provider=MockSMSProvider())

    phone = "01744556677"
    # No OTP in Redis
    with pytest.raises(ValidationException) as exc_info:
        await service.verify_otp(phone, "987654")
    assert "Invalid or expired" in exc_info.value.message


# 10. Resend Cooldown Enforcement
@pytest.mark.asyncio
async def test_resend_cooldown_enforcement(clean_db):
    users_repo = UsersRepository(clean_db)
    mock_provider = MockSMSProvider()
    service = AuthService(users_repo, sms_provider=mock_provider)

    phone = "01755667788"
    first = await service.request_otp(phone)
    assert first["success"] is True

    # Immediate second request must trigger RateLimitException
    with pytest.raises(RateLimitException) as exc_info:
        await service.request_otp(phone)
    assert "Please wait" in exc_info.value.message


# 11. Production Rejects Universal 123456 Bypass
@pytest.mark.asyncio
async def test_production_rejects_universal_123456(clean_db, monkeypatch):
    monkeypatch.setattr(settings, "APP_ENV", "production")
    users_repo = UsersRepository(clean_db)
    mock_provider = MockSMSProvider()
    service = AuthService(users_repo, sms_provider=mock_provider)

    phone = "01766778899"
    await service.request_otp(phone)

    r = get_redis()
    stored_otp = (await r.get(f"otp:{phone}")).decode("utf-8") if isinstance(await r.get(f"otp:{phone}"), bytes) else await r.get(f"otp:{phone}")

    # Ensure generated OTP is 6 digits and distinct from 123456 if random generated
    assert len(stored_otp) == 6

    # If stored_otp is not 123456, trying 123456 MUST fail
    if stored_otp != "123456":
        with pytest.raises(ValidationException):
            await service.verify_otp(phone, "123456")


# 12. Production Logs Contain No OTP
@pytest.mark.asyncio
async def test_production_logs_contain_no_otp(clean_db, monkeypatch, caplog):
    monkeypatch.setattr(settings, "APP_ENV", "production")
    users_repo = UsersRepository(clean_db)
    mock_provider = MockSMSProvider()
    service = AuthService(users_repo, sms_provider=mock_provider)

    phone = "01777889900"
    with caplog.at_level(logging.INFO):
        await service.request_otp(phone)

    r = get_redis()
    stored_otp = (await r.get(f"otp:{phone}")).decode("utf-8") if isinstance(await r.get(f"otp:{phone}"), bytes) else await r.get(f"otp:{phone}")

    # Assert stored OTP does NOT appear anywhere in the captured log records
    for record in caplog.records:
        assert stored_otp not in record.message
        assert stored_otp not in record.getMessage()


# 13. Credentials Never Appear in API Responses
@pytest.mark.asyncio
async def test_credentials_never_appear_in_api_responses(client: AsyncClient, clean_db, monkeypatch):
    monkeypatch.setattr(settings, "SMS_PROVIDER", "mock")
    monkeypatch.setattr(settings, "ZENDSMS_API_KEY", "super-secret-zendsms-key-xyz")
    monkeypatch.setattr(settings, "SMS_API_KEY", "super-secret-generic-sms-key-abc")

    # 1. Successful OTP request
    res = await client.post("/api/v1/auth/request-otp", json={"phone": "01788990011"})
    assert res.status_code == 200
    res_text = res.text
    assert "super-secret" not in res_text
    assert "API_KEY" not in res_text

    # 2. Failed OTP verification
    bad_res = await client.post("/api/v1/auth/verify-otp", json={"phone": "01788990011", "otp": "000000"})
    assert bad_res.status_code == 422
    assert "super-secret" not in bad_res.text
    assert "API_KEY" not in bad_res.text


# 14. ZendSMS Full Flow: OTP Authority, Storage of otp_id, Verify API & Single-Use
@pytest.mark.asyncio
async def test_zendsms_full_flow_otp_authority(clean_db, monkeypatch):
    monkeypatch.setattr(settings, "APP_ENV", "production")
    users_repo = UsersRepository(clean_db)
    
    zend_provider = ZendSMSProvider(
        api_key="test-zendsms-secret",
        base_url="https://api.zendsms.com",
        sender_id="8809612781023",
        brand="FlexiTaka",
        expiry=300
    )
    service = AuthService(users_repo, sms_provider=zend_provider)
    phone = "01799112233"

    send_resp = Response(
        status_code=200,
        json={
            "success": True,
            "code": 200,
            "message": "OTP sent successfully",
            "data": {
                "otp_id": "zendsms-otp-ref-8844",
                "recipient": "8801799112233",
                "expires_in": 300
            }
        },
        request=httpx.Request("POST", "https://api.zendsms.com/api/v1/otp/send")
    )

    verify_success_resp = Response(
        status_code=200,
        json={
            "success": True,
            "code": 200,
            "message": "OTP verified successfully"
        },
        request=httpx.Request("POST", "https://api.zendsms.com/api/v1/otp/verify")
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = send_resp
        req_res = await service.request_otp(phone)
        assert req_res["success"] is True

        r = get_redis()
        # Ensure NO plaintext OTP was saved in Redis
        assert await r.get(f"otp:{phone}") is None
        # Ensure provider verification reference (otp_id) was stored
        raw_ref = await r.get(f"otp_ref:{phone}")
        stored_ref = raw_ref.decode("utf-8") if isinstance(raw_ref, bytes) else str(raw_ref)
        assert stored_ref == "zendsms-otp-ref-8844"

        # Now verify with the SMS OTP sent by ZendSMS
        mock_post.return_value = verify_success_resp
        auth_res = await service.verify_otp(phone, "951753")
        assert "access_token" in auth_res
        assert auth_res["phone"] == phone

        # Verify call arguments sent to ZendSMS verify API
        called_args, called_kwargs = mock_post.call_args
        assert called_kwargs["json"]["recipient"] == "8801799112233"
        assert called_kwargs["json"]["otp"] == "951753"
        assert called_kwargs["json"]["otp_id"] == "zendsms-otp-ref-8844"

        # Ensure single-use: otp_ref deleted from Redis
        assert await r.get(f"otp_ref:{phone}") is None


# 15. ZendSMS Verify Failure and Lockout
@pytest.mark.asyncio
async def test_zendsms_verify_failure_and_lockout(clean_db, monkeypatch):
    monkeypatch.setattr(settings, "APP_ENV", "production")
    users_repo = UsersRepository(clean_db)
    
    zend_provider = ZendSMSProvider(
        api_key="test-zendsms-secret",
        base_url="https://api.zendsms.com"
    )
    service = AuthService(users_repo, sms_provider=zend_provider)
    phone = "01788223344"

    send_resp = Response(
        status_code=200,
        json={"success": True, "data": {"otp_id": "ref-4433"}},
        request=httpx.Request("POST", "https://api.zendsms.com/api/v1/otp/send")
    )
    verify_fail_resp = Response(
        status_code=200,
        json={"success": False, "code": 400, "message": "Invalid OTP"},
        request=httpx.Request("POST", "https://api.zendsms.com/api/v1/otp/verify")
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = send_resp
        await service.request_otp(phone)

        mock_post.return_value = verify_fail_resp
        for attempt in range(1, 5):
            with pytest.raises(ValidationException) as exc_info:
                await service.verify_otp(phone, "000000")
            assert f"{5 - attempt} attempt(s) remaining" in exc_info.value.message

        # 5th failure triggers lockout
        with pytest.raises(ValidationException) as exc_info:
            await service.verify_otp(phone, "000000")
        assert "Too many attempts" in exc_info.value.message

        r = get_redis()
        assert await r.get(f"otp_ref:{phone}") is None


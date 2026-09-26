"""
Tests for FlexiTaka Customer Account & Linked SIMs System.
Verifies registration, OTP login, logout revocation, profile updates,
multi-SIM linkage under one account, operator OTP verification, duplicate prevention, and IDOR protection.
"""

import pytest
from httpx import AsyncClient
from motor.motor_asyncio import AsyncIOMotorDatabase


@pytest.mark.asyncio
async def test_account_otp_registration_and_profile(client: AsyncClient, clean_db: AsyncIOMotorDatabase):
    phone = "01799887766"

    # 1. Request OTP for FlexiTaka Account Login
    req_res = await client.post("/api/v1/auth/request-otp", json={"phone": phone})
    assert req_res.status_code == 200, req_res.text
    data = req_res.json()
    assert data["success"] is True

    # 2. Verify OTP (mock default: 123456 in test mode)
    verify_res = await client.post("/api/v1/auth/verify-otp", json={
        "phone": phone,
        "otp": "123456"
    })
    assert verify_res.status_code == 200, verify_res.text
    vdata = verify_res.json()
    token = vdata["access_token"]
    user_id = vdata["user_id"]
    assert token is not None
    assert user_id is not None

    headers = {"Authorization": f"Bearer {token}"}

    # 3. Get Profile
    prof_res = await client.get("/api/v1/user/profile", headers=headers)
    assert prof_res.status_code == 200, prof_res.text
    prof = prof_res.json()
    assert prof["user_id"] == user_id
    assert prof["phone"] == phone
    assert prof["linked_sims_count"] == 0

    # 4. Update Profile
    update_res = await client.put("/api/v1/user/profile", json={
        "name": "Rahim Ahmed",
        "email": "rahim@example.com",
        "language_preference": "en"
    }, headers=headers)
    assert update_res.status_code == 200, update_res.text
    updated = update_res.json()
    assert updated["name"] == "Rahim Ahmed"
    assert updated["email"] == "rahim@example.com"
    assert updated["language_preference"] == "en"


@pytest.mark.asyncio
async def test_linked_sims_lifecycle_and_operator_verification(client: AsyncClient, clean_db: AsyncIOMotorDatabase):
    # Register customer account
    account_phone = "01710000001"
    await client.post("/api/v1/auth/request-otp", json={"phone": account_phone})
    v_res = await client.post("/api/v1/auth/verify-otp", json={"phone": account_phone, "otp": "123456"})
    token = v_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Add GP SIM
    add_gp = await client.post("/api/v1/user/sims", json={
        "phone": "01722334455",
        "label": "Personal GP SIM"
    }, headers=headers)
    assert add_gp.status_code == 200, add_gp.text
    gp_data = add_gp.json()
    assert gp_data["operator_code"] == "GP"
    assert gp_data["status"] == "UNVERIFIED"
    assert gp_data["is_primary"] is True
    gp_sim_id = gp_data["sim_id"]

    # 2. Add Robi SIM
    add_robi = await client.post("/api/v1/user/sims", json={
        "phone": "01822334455",
        "label": "Work Robi"
    }, headers=headers)
    assert add_robi.status_code == 200, add_robi.text
    robi_data = add_robi.json()
    assert robi_data["operator_code"] == "ROBI"
    assert robi_data["is_primary"] is False
    robi_sim_id = robi_data["sim_id"]

    # 3. Add Banglalink SIM
    add_bl = await client.post("/api/v1/user/sims", json={
        "phone": "01922334455",
        "label": "Backup BL"
    }, headers=headers)
    assert add_bl.status_code == 200, add_bl.text
    bl_data = add_bl.json()
    assert bl_data["operator_code"] == "BANGLALINK"

    # 4. List Linked SIMs (Should have 3 SIMs under ONE account)
    list_res = await client.get("/api/v1/user/sims", headers=headers)
    assert list_res.status_code == 200
    sims = list_res.json()
    assert len(sims) == 3

    # 5. Check profile reflects 3 linked SIMs
    prof_res = await client.get("/api/v1/user/profile", headers=headers)
    assert prof_res.json()["linked_sims_count"] == 3

    # 6. Request Operator Verification OTP for GP SIM
    otp_req = await client.post(f"/api/v1/user/sims/{gp_sim_id}/request-otp", headers=headers)
    assert otp_req.status_code == 200, otp_req.text
    ref_id = otp_req.json().get("reference_id")

    # 7. Verify Operator OTP for GP SIM
    verify_sim = await client.post(f"/api/v1/user/sims/{gp_sim_id}/verify-otp", json={
        "otp": "1234",
        "reference_id": ref_id
    }, headers=headers)
    assert verify_sim.status_code == 200, verify_sim.text
    verified_data = verify_sim.json()
    assert verified_data["status"] == "VERIFIED"
    assert verified_data["verified_at"] is not None

    # 8. Duplicate SIM rejection in same account
    dup_res = await client.post("/api/v1/user/sims", json={
        "phone": "01722334455",
        "label": "Duplicate GP"
    }, headers=headers)
    assert dup_res.status_code == 422
    assert "already linked" in dup_res.text.lower()

    # 9. Duplicate verified SIM rejection in another user account
    # Create User B
    await client.post("/api/v1/auth/request-otp", json={"phone": "01755667788"})
    user_b_res = await client.post("/api/v1/auth/verify-otp", json={"phone": "01755667788", "otp": "123456"})
    token_b = user_b_res.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    dup_other_user = await client.post("/api/v1/user/sims", json={
        "phone": "01722334455",
        "label": "Claiming A's verified GP"
    }, headers=headers_b)
    assert dup_other_user.status_code == 422
    assert "already verified under another account" in dup_other_user.text.lower()

    # 10. IDOR Protection: User B cannot delete or verify User A's SIM
    del_idor = await client.delete(f"/api/v1/user/sims/{gp_sim_id}", headers=headers_b)
    assert del_idor.status_code == 404

    # 11. User A removes Robi SIM
    del_res = await client.delete(f"/api/v1/user/sims/{robi_sim_id}", headers=headers)
    assert del_res.status_code == 200

    list_after = await client.get("/api/v1/user/sims", headers=headers)
    assert len(list_after.json()) == 2


@pytest.mark.asyncio
async def test_session_logout_revocation(client: AsyncClient, clean_db: AsyncIOMotorDatabase):
    phone = "01733445566"
    await client.post("/api/v1/auth/request-otp", json={"phone": phone})
    v_res = await client.post("/api/v1/auth/verify-otp", json={"phone": phone, "otp": "123456"})
    token = v_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Verify access works before logout
    ok_res = await client.get("/api/v1/user/profile", headers=headers)
    assert ok_res.status_code == 200

    # Call logout
    logout_res = await client.post("/api/v1/auth/logout", headers=headers)
    assert logout_res.status_code == 200

    # Subsequent access with same token is revoked
    revoked_res = await client.get("/api/v1/user/profile", headers=headers)
    assert revoked_res.status_code == 401


@pytest.mark.asyncio
async def test_operator_customer_id_gp_bl_robi_and_unavailable(client: AsyncClient, clean_db: AsyncIOMotorDatabase):
    """
    Authoritative test suite for Linked SIM Customer ID:
    - Verifies GP operator customer ID
    - Verifies Banglalink operator customer ID
    - Verifies Robi operator customer ID
    - Verifies unverified SIM has customer_id=None
    - Verifies unavailable operator customer ID is None (never faked/invented)
    """
    # 1. Register customer account
    account_phone = "01744556677"
    await client.post("/api/v1/auth/request-otp", json={"phone": account_phone})
    v_res = await client.post("/api/v1/auth/verify-otp", json={"phone": account_phone, "otp": "123456"})
    token = v_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Add GP SIM
    gp_res = await client.post("/api/v1/user/sims", json={"phone": "01711223344", "label": "My GP"}, headers=headers)
    assert gp_res.status_code == 200
    gp_sim = gp_res.json()
    gp_id = gp_sim["sim_id"]
    # Before verification, customer_id MUST be None
    assert gp_sim["customer_id"] is None

    # 3. Add Banglalink SIM
    bl_res = await client.post("/api/v1/user/sims", json={"phone": "01911223344", "label": "My Banglalink"}, headers=headers)
    assert bl_res.status_code == 200
    bl_sim = bl_res.json()
    bl_id = bl_sim["sim_id"]
    assert bl_sim["customer_id"] is None

    # 4. Add Robi SIM
    robi_res = await client.post("/api/v1/user/sims", json={"phone": "01811223344", "label": "My Robi"}, headers=headers)
    assert robi_res.status_code == 200
    robi_sim = robi_res.json()
    robi_id = robi_sim["sim_id"]
    assert robi_sim["customer_id"] is None

    # 5. Verify GP SIM -> check GP Customer ID
    gp_otp_req = await client.post(f"/api/v1/user/sims/{gp_id}/request-otp", headers=headers)
    assert gp_otp_req.status_code == 200
    gp_ref = gp_otp_req.json().get("reference_id")
    gp_v_res = await client.post(f"/api/v1/user/sims/{gp_id}/verify-otp", json={"otp": "1234", "reference_id": gp_ref}, headers=headers)
    assert gp_v_res.status_code == 200
    gp_verified = gp_v_res.json()
    assert gp_verified["status"] == "VERIFIED"
    assert gp_verified["customer_id"] is not None
    assert "8801711223344" in gp_verified["customer_id"] or "GP" in gp_verified["customer_id"]

    # 6. Verify Banglalink SIM -> check Banglalink Customer ID
    bl_otp_req = await client.post(f"/api/v1/user/sims/{bl_id}/request-otp", headers=headers)
    assert bl_otp_req.status_code == 200
    bl_ref = bl_otp_req.json().get("reference_id")
    bl_v_res = await client.post(f"/api/v1/user/sims/{bl_id}/verify-otp", json={"otp": "1234", "reference_id": bl_ref}, headers=headers)
    assert bl_v_res.status_code == 200
    bl_verified = bl_v_res.json()
    assert bl_verified["status"] == "VERIFIED"
    assert bl_verified["customer_id"] is not None
    assert bl_verified["customer_id"].startswith("BL")

    # 7. Verify Robi SIM -> check Robi Customer ID
    robi_otp_req = await client.post(f"/api/v1/user/sims/{robi_id}/request-otp", headers=headers)
    assert robi_otp_req.status_code == 200
    robi_ref = robi_otp_req.json().get("reference_id")
    robi_v_res = await client.post(f"/api/v1/user/sims/{robi_id}/verify-otp", json={"otp": "1234", "reference_id": robi_ref}, headers=headers)
    assert robi_v_res.status_code == 200
    robi_verified = robi_v_res.json()
    assert robi_verified["status"] == "VERIFIED"
    assert robi_verified["customer_id"] is not None
    assert robi_verified["customer_id"].startswith("ROBI")

    # 8. Check GET /api/v1/user/sims returns all customer_ids accurately
    list_res = await client.get("/api/v1/user/sims", headers=headers)
    assert list_res.status_code == 200
    all_sims = list_res.json()
    sim_map = {s["operator_code"]: s for s in all_sims}
    assert sim_map["GP"]["customer_id"] is not None
    assert sim_map["BANGLALINK"]["customer_id"] == bl_verified["customer_id"]
    assert sim_map["ROBI"]["customer_id"] == robi_verified["customer_id"]

    # 9. Verify unavailable handling:
    # If operator does NOT provide customer ID, customer_id MUST remain None
    from unittest.mock import AsyncMock, patch
    with patch("app.modules.operators.session_manager.OperatorSessionService.get_adapter") as mock_adapter_getter:
        mock_adapter = mock_adapter_getter.return_value
        mock_adapter.verify_login_otp = AsyncMock(return_value={
            "success": True,
            "access_token": "mock_token_no_cid",
            "refresh_token": "mock_ref_no_cid",
            "expire_at": 9999999999,
            "user_id": "test_user",
            "customer_account_id": None,
            "customer_id": None,
            "balance_bdt": 250.0,
            "sim_type": "Prepaid",
            "message": "Auth ok without customer ID"
        })
        # Add another SIM with no customer ID returned
        no_cid_add = await client.post("/api/v1/user/sims", json={"phone": "01788990011", "label": "No CID GP"}, headers=headers)
        no_cid_sim_id = no_cid_add.json()["sim_id"]
        no_cid_v_res = await client.post(f"/api/v1/user/sims/{no_cid_sim_id}/verify-otp", json={"otp": "1234"}, headers=headers)
        assert no_cid_v_res.status_code == 200
        no_cid_verified = no_cid_v_res.json()
        assert no_cid_verified["customer_id"] is None


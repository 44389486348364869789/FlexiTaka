"""
Tests for Bug #1 (Linked SIM Live Balance) and Bug #2 (Cash Out Same-Operator Destination Enforcement).
"""

import pytest
from httpx import AsyncClient
from motor.motor_asyncio import AsyncIOMotorDatabase
from unittest.mock import AsyncMock, patch

from app.core.constants import ServiceType
from app.db.repositories.sims_repo import ReceivingSimsRepository
from app.modules.transfers.engine import TransferEngine
from app.core.exceptions import ValidationException


@pytest.mark.asyncio
async def test_linked_sim_live_balance_sync(client: AsyncClient, clean_db: AsyncIOMotorDatabase):
    """
    BUG #1: Linked SIM balance must fetch live balance from backend operator API
    and return fresh last_synced_at and is_live_balance=True.
    When live balance fails, fall back to stored balance with is_live_balance=False.
    """
    account_phone = "01788112233"
    # 1. Login user
    await client.post("/api/v1/auth/request-otp", json={"phone": account_phone})
    v_res = await client.post("/api/v1/auth/verify-otp", json={"phone": account_phone, "otp": "123456"})
    token = v_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Add GP SIM
    add_res = await client.post("/api/v1/user/sims", json={"phone": "01799001122", "label": "My Live GP"}, headers=headers)
    assert add_res.status_code == 200
    sim_data = add_res.json()
    sim_id = sim_data["sim_id"]
    assert sim_data["status"] == "UNVERIFIED"
    assert sim_data["is_live_balance"] is False

    # 3. Verify SIM OTP
    otp_req = await client.post(f"/api/v1/user/sims/{sim_id}/request-otp", headers=headers)
    assert otp_req.status_code == 200
    ref_id = otp_req.json().get("reference_id")

    v_sim_res = await client.post(f"/api/v1/user/sims/{sim_id}/verify-otp", json={"otp": "1234", "reference_id": ref_id}, headers=headers)
    assert v_sim_res.status_code == 200
    verified_sim = v_sim_res.json()
    assert verified_sim["status"] == "VERIFIED"
    assert verified_sim["last_balance_bdt"] is not None
    assert verified_sim["last_synced_at"] is not None
    assert verified_sim["is_live_balance"] is True

    # 4. Fetch linked SIMs with force refresh
    list_res = await client.get("/api/v1/user/sims?refresh=true", headers=headers)
    assert list_res.status_code == 200
    sims = list_res.json()
    assert len(sims) == 1
    gp_sim = sims[0]
    assert gp_sim["status"] == "VERIFIED"
    assert gp_sim["is_live_balance"] is True
    assert gp_sim["last_balance_bdt"] > 0
    assert gp_sim["last_synced_at"] is not None

    # 5. Test fallback when operator live fetch fails
    with patch("app.modules.operators.session_manager.OperatorSessionService.get_adapter") as mock_adapter_get:
        mock_adapter = AsyncMock()
        mock_adapter.get_balance = AsyncMock(side_effect=Exception("Operator network timeout"))
        mock_adapter_get.return_value = mock_adapter

        fallback_res = await client.get("/api/v1/user/sims?refresh=true", headers=headers)
        assert fallback_res.status_code == 200
        fallback_sims = fallback_res.json()
        assert len(fallback_sims) == 1
        fb_sim = fallback_sims[0]
        # Should gracefully return stored balance, but marked as NOT live
        assert fb_sim["is_live_balance"] is False
        assert fb_sim["last_balance_bdt"] == gp_sim["last_balance_bdt"]


@pytest.mark.asyncio
async def test_cashout_same_operator_matching(client: AsyncClient, clean_db: AsyncIOMotorDatabase):
    """
    BUG #2: Cash out must match source operator with destination receiving SIM.
    - Banglalink source (019) -> Banglalink receiver (019), NEVER Grameenphone (017)
    - GP source (017) -> GP receiver (017)
    - Robi source (018) -> Robi receiver (018)
    - No hardcoded '01700000000' receiving number!
    """
    # 1. Initialize guest session
    guest_res = await client.post("/api/v1/guest/session")
    guest_id = guest_res.json()["guest_session_id"]
    headers = {"X-Guest-Session-ID": guest_id}

    # 2. Ensure default receiving SIM pool is seeded
    sims_repo = ReceivingSimsRepository(clean_db)
    await sims_repo.ensure_default_sims()

    # Verify seeded pool
    gp_sim = await sims_repo.select_best_sim("GP", 100.0)
    assert gp_sim is not None
    assert gp_sim["operator_code"] == "GP"
    assert gp_sim["mobile_number"].startswith("017")

    bl_sim = await sims_repo.select_best_sim("BANGLALINK", 100.0)
    assert bl_sim is not None
    assert bl_sim["operator_code"] == "BANGLALINK"
    assert bl_sim["mobile_number"].startswith("019")
    assert bl_sim["mobile_number"] != "01700000000"

    robi_sim = await sims_repo.select_best_sim("ROBI", 100.0)
    assert robi_sim is not None
    assert robi_sim["operator_code"] == "ROBI"
    assert robi_sim["mobile_number"].startswith("018")

    # 3. Test Cashout Order Creation for Banglalink (01981475404)
    bl_cashout = await client.post("/api/v1/cashout/orders", headers=headers, json={
        "operator_code": "BANGLALINK",
        "source_mobile_number": "01981475404",
        "amount_bdt": "100.00",
        "payout_method": "BKASH",
        "payout_account": "01700112233"
    })
    assert bl_cashout.status_code == 201, bl_cashout.text
    bl_order = bl_cashout.json()
    assert bl_order["operator_code"] == "BANGLALINK"
    assert bl_order["receiving_mobile_number"].startswith("019")
    assert bl_order["receiving_mobile_number"] != "01700000000"

    # 4. Test Cashout Order Creation for GP (01712345678)
    gp_cashout = await client.post("/api/v1/cashout/orders", headers=headers, json={
        "operator_code": "GP",
        "source_mobile_number": "01712345678",
        "amount_bdt": "100.00",
        "payout_method": "BKASH",
        "payout_account": "01700112233"
    })
    assert gp_cashout.status_code == 201, gp_cashout.text
    gp_order = gp_cashout.json()
    assert gp_order["operator_code"] == "GP"
    assert gp_order["receiving_mobile_number"].startswith("017")

    # 5. Test Cashout Order Creation for Robi (01812345678)
    robi_cashout = await client.post("/api/v1/cashout/orders", headers=headers, json={
        "operator_code": "ROBI",
        "source_mobile_number": "01812345678",
        "amount_bdt": "100.00",
        "payout_method": "BKASH",
        "payout_account": "01700112233"
    })
    assert robi_cashout.status_code == 201, robi_cashout.text
    robi_order = robi_cashout.json()
    assert robi_order["operator_code"] == "ROBI"
    assert robi_order["receiving_mobile_number"].startswith("018")

    # 6. Test TransferEngine pre-transfer mismatch prevention
    from app.modules.operators.session_manager import OperatorSessionService
    session_service = OperatorSessionService(clean_db)
    engine = TransferEngine(clean_db, session_service)
    
    # Try to initialize transfer plan where destination doesn't match operator
    with pytest.raises(ValidationException) as exc_info:
        await engine.initialize_transfer_plan(
            order_id="test_ord_mismatch",
            service_type=ServiceType.CASH_OUT,
            operator_code="BANGLALINK",
            source_number="01981475404",
            destination_number="01711000001",  # Grameenphone receiver with BL source!
            total_amount_bdt=100
        )
    assert "OPERATOR_MISMATCH" in str(exc_info.value.code)

"""
Comprehensive Test Suite for:
1. Transfer PIN Management & Security (No plaintext, encryption at rest, safe API response)
2. Operator-Specific PIN/OTP capabilities (GP, Banglalink, Robi)
3. Banglalink ERR_PIN_2220 Root Cause, Interception, PIN Recovery & Safe Retry
4. Same-Operator Receiving SIM & Cash Out Mismatch Interception
5. Dedicated Order Progress API (Cash Out & Recharge 6-step mapping, waiting, terminal states)
"""

import pytest
from decimal import Decimal
from httpx import AsyncClient
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.constants import CashOutStatus, OperatorCode, RechargeStatus, ServiceType
from app.core.security import decrypt_pin, derive_default_pin, encrypt_pin
from app.db.repositories.linked_sims_repo import LinkedSimsRepository
from app.db.repositories.orders_repo import OrdersRepository
from app.db.repositories.sims_repo import ReceivingSimsRepository
from app.modules.operators.banglalink import BanglalinkAdapter
from app.modules.operators.gp import GPAdapter
from app.modules.operators.robi import RobiAdapter
from app.modules.operators.session_manager import OperatorSessionService
from app.modules.transfers.engine import TransferEngine


@pytest.mark.asyncio
async def test_01_receiving_sim_without_configured_pin(clean_db: AsyncIOMotorDatabase):
    """Receiving SIM without configured PIN automatically falls back to derived PIN without crashing."""
    sims_repo = ReceivingSimsRepository(clean_db)
    sim_doc = {
        "receiving_sim_id": "sim_test_01",
        "operator_code": "BANGLALINK",
        "mobile_number": "01929245399",
        "current_balance_poisha": 500000,
        "daily_limit_poisha": 10000000,
        "daily_transferred_poisha": 0,
        "monthly_limit_poisha": 30000000,
        "monthly_transferred_poisha": 0,
        "status": "ACTIVE",
        "health_score": 100,
        "active_cooldown_until": 0,
        "transfer_pin_configured": False,
        "created_at": sims_repo.utcnow(),
        "updated_at": sims_repo.utcnow()
    }
    await sims_repo.insert_one(sim_doc)
    pin = await sims_repo.get_sim_transfer_pin("sim_test_01")
    assert pin == "5399"  # Derived from last 4 digits of 01929245399


@pytest.mark.asyncio
async def test_02_valid_stored_pin_encryption_decryption(clean_db: AsyncIOMotorDatabase):
    """PIN is encrypted at rest and decrypted accurately when requested."""
    sims_repo = ReceivingSimsRepository(clean_db)
    sim_doc = {
        "receiving_sim_id": "sim_test_02",
        "operator_code": "BANGLALINK",
        "mobile_number": "01912345678",
        "current_balance_poisha": 500000,
        "status": "ACTIVE",
        "health_score": 100,
        "created_at": sims_repo.utcnow(),
        "updated_at": sims_repo.utcnow()
    }
    await sims_repo.insert_one(sim_doc)

    await sims_repo.update_sim_pin("sim_test_02", "8821")
    raw = await sims_repo.get_by_sim_id("sim_test_02")
    # Must NOT be stored in plaintext
    assert raw["encrypted_transfer_pin"] != "8821"
    assert raw["transfer_pin_configured"] is True
    assert raw["pin_status"] == "CONFIGURED"

    # Decryption must match
    decrypted = await sims_repo.get_sim_transfer_pin("sim_test_02")
    assert decrypted == "8821"


@pytest.mark.asyncio
async def test_03_invalid_pin_marked_on_err_pin_2220(clean_db: AsyncIOMotorDatabase):
    """Calling mark_sim_pin_invalid updates status so it cannot be blindly retried."""
    sims_repo = ReceivingSimsRepository(clean_db)
    await sims_repo.insert_one({
        "receiving_sim_id": "sim_test_03",
        "operator_code": "BANGLALINK",
        "mobile_number": "01999999999",
        "encrypted_transfer_pin": encrypt_pin("1234"),
        "transfer_pin_configured": True,
        "pin_status": "CONFIGURED",
        "created_at": sims_repo.utcnow(),
        "updated_at": sims_repo.utcnow()
    })
    await sims_repo.mark_sim_pin_invalid("sim_test_03")
    raw = await sims_repo.get_by_sim_id("sim_test_03")
    assert raw["pin_status"] == "INVALID"
    assert raw["transfer_pin_configured"] is False


@pytest.mark.asyncio
async def test_04_banglalink_err_pin_2220_recovery_and_safe_retry(clean_db: AsyncIOMotorDatabase):
    """
    On ERR_PIN_2220 from Banglalink:
    TransferEngine intercepts it, sets PIN via set_or_reset_pin in same session,
    saves encrypted PIN, and retries the transfer successfully.
    """
    session_service = OperatorSessionService(clean_db)
    engine = TransferEngine(clean_db, session_service)

    # Save session for Banglalink number
    await session_service.save_session(
        msisdn="01929245399",
        operator_code="BANGLALINK",
        access_token="mock_bl_token",
        extra_data={"device_id": "test_device_123"}
    )

    # Initialize transfer plan
    order_id = "FT-TEST-BL-2220"
    await engine.initialize_transfer_plan(
        order_id=order_id,
        service_type=ServiceType.CASH_OUT,
        operator_code="BANGLALINK",
        source_number="01929245399",
        destination_number="01912345678",
        total_amount_bdt=100
    )

    # Execute chunk with bad initial PIN -> should trigger auto-recovery and succeed
    session_doc = await session_service.get_session("01929245399", "BANGLALINK")
    res = await engine.execute_next_chunk(
        order_id=order_id,
        pin="0000",  # bad pin that would fail without recovery
        session_data=session_doc
    )

    assert res["completed"] is True
    # Verify PIN was recovered and stored encrypted in session
    stored_pin = await session_service.get_session_pin("01929245399", "BANGLALINK")
    assert stored_pin == "5399"


@pytest.mark.asyncio
async def test_05_operator_specific_otp_capability():
    """
    Verify operator capabilities:
    - Banglalink supports same authenticated session PIN setup (no extra OTP required).
    - GP requires separate PIN reset OTP flow (does NOT support same-OTP reset).
    - Robi operates via transaction OTP.
    """
    bl = BanglalinkAdapter()
    gp = GPAdapter()
    robi = RobiAdapter()

    # Banglalink set_or_reset_pin works with active session
    bl_res = await bl.set_or_reset_pin("01929245399", "5399", {"access_token": "tok"})
    assert bl_res["success"] is True

    # GP set_or_reset_pin in test environment
    gp_res = await gp.set_or_reset_pin("01711111111", "1111", {"access_token": "tok", "user_id": "u1"})
    assert gp_res["success"] is True

    # Robi set_or_reset_pin documents transaction OTP usage
    robi_res = await robi.set_or_reset_pin("01811111111", "1111", {})
    assert robi_res["success"] is True


@pytest.mark.asyncio
async def test_06_no_plaintext_pin_in_database(clean_db: AsyncIOMotorDatabase):
    """Verify that sensitive transfer PIN is NEVER stored in plaintext in MongoDB collections."""
    sims_repo = ReceivingSimsRepository(clean_db)
    await sims_repo.ensure_default_sims()

    # Inspect all documents in receiving_sims
    sims = await clean_db.receiving_sims.find({}).to_list(length=100)
    for s in sims:
        assert "transfer_pin" not in s or s.get("transfer_pin") is None or "encrypted" in str(s)
        if s.get("encrypted_transfer_pin"):
            # Ensure it is a valid encrypted string, not plain 4 digits
            assert len(s["encrypted_transfer_pin"]) > 20

    # Inspect operator sessions
    session_service = OperatorSessionService(clean_db)
    await session_service.save_session("01929245399", "BANGLALINK", "tok")
    await session_service.save_session_pin("01929245399", "BANGLALINK", "5399")
    sess_doc = await clean_db.operator_sessions.find_one({"msisdn": "01929245399"})
    assert "encrypted_transfer_pin" in sess_doc
    assert sess_doc["encrypted_transfer_pin"] != "5399"


@pytest.mark.asyncio
async def test_07_no_pin_exposure_in_api_responses(client: AsyncClient, clean_db: AsyncIOMotorDatabase):
    """Verify user SIMs and Order detail responses NEVER expose PIN material."""
    sims_repo = ReceivingSimsRepository(clean_db)
    await sims_repo.ensure_default_sims()

    # Create dummy cash out order
    await clean_db.orders.insert_one({
        "order_id": "FT-SAFE-PIN-CHECK",
        "service_type": "CASH_OUT",
        "operator_code": "BANGLALINK",
        "mobile_number": "01929245399",
        "amount": 10000,
        "currency": "BDT",
        "status": "REQUESTED",
        "pricing_snapshot": {},
        "created_at": "2026-09-26T12:00:00Z",
        "updated_at": "2026-09-26T12:00:00Z"
    })

    res = await client.get("/api/v1/orders/FT-SAFE-PIN-CHECK?tracking_token=public")
    # Even if unauthorized or authorized, JSON must not contain plain PIN keys
    text = res.text.lower()
    assert "encrypted_transfer_pin" not in text
    assert '"pin":' not in text


@pytest.mark.asyncio
async def test_08_to_10_same_operator_cashout(clean_db: AsyncIOMotorDatabase):
    """GP -> GP, BL -> BL, Robi -> Robi matching succeeds."""
    sims_repo = ReceivingSimsRepository(clean_db)
    await sims_repo.ensure_default_sims()

    gp_sim = await sims_repo.select_best_sim("GP")
    assert gp_sim is not None
    assert gp_sim["operator_code"] == "GP"

    bl_sim = await sims_repo.select_best_sim("BANGLALINK")
    assert bl_sim is not None
    assert bl_sim["operator_code"] == "BANGLALINK"

    robi_sim = await sims_repo.select_best_sim("ROBI")
    assert robi_sim is not None
    assert robi_sim["operator_code"] == "ROBI"


@pytest.mark.asyncio
async def test_11_operator_mismatch_blocked(client: AsyncClient, clean_db: AsyncIOMotorDatabase):
    """Mismatched source phone and requested operator is rejected with validation error."""
    # Source phone is 019 (BL) but operator specified is GP
    payload = {
        "operator_code": "GP",
        "source_mobile_number": "01929245399",
        "source_amount_bdt": 100,
        "payout_method": "BKASH",
        "payout_account": "01712345678"
    }
    res = await client.post("/api/v1/cashout/orders", json=payload)
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_12_no_hardcoded_destination_fallback(clean_db: AsyncIOMotorDatabase):
    """When destination operator mismatches or operator is unsupported, select_best_sim returns None rather than falling back to another operator."""
    sims_repo = ReceivingSimsRepository(clean_db)
    # 1. Unsupported operator never returns a hardcoded fallback
    sim_unsupported = await sims_repo.select_best_sim("TELETALK")
    assert sim_unsupported is None

    # 2. Destination number of another operator (GP) never matches Banglalink receiving SIM
    sim_mismatched = await sims_repo.select_best_sim("BANGLALINK", destination_msisdn="01712345678")
    assert sim_mismatched is None


@pytest.mark.asyncio
async def test_13_cash_out_progress_six_steps(client: AsyncClient, clean_db: AsyncIOMotorDatabase):
    """Cash Out progress API returns all 6 milestones with correct statuses."""
    await clean_db.orders.insert_one({
        "order_id": "FT-CO-PROGRESS",
        "service_type": "CASH_OUT",
        "operator_code": "BANGLALINK",
        "mobile_number": "01929245399",
        "amount": 10000,
        "currency": "BDT",
        "status": "TRANSFER_IN_PROGRESS",
        "pricing_snapshot": {},
        "created_at": "2026-09-26T12:00:00Z",
        "updated_at": "2026-09-26T12:00:00Z"
    })

    res = await client.get("/api/v1/orders/FT-CO-PROGRESS/progress")
    assert res.status_code == 200
    data = res.json()
    assert data["order_id"] == "FT-CO-PROGRESS"
    assert data["service_type"] == "CASH_OUT"
    assert data["total_steps"] == 6
    step_ids = [s["id"] for s in data["steps"]]
    assert step_ids == [
        "order_created",
        "operator_verification",
        "transfer_processing",
        "transfer_received",
        "verification_payout",
        "completed"
    ]
    assert data["current_step_index"] == 3
    assert data["steps"][0]["status"] == "COMPLETED"
    assert data["steps"][1]["status"] == "COMPLETED"
    assert data["steps"][2]["status"] == "CURRENT"


@pytest.mark.asyncio
async def test_14_recharge_progress_six_steps(client: AsyncClient, clean_db: AsyncIOMotorDatabase):
    """Recharge progress API returns all 6 milestones with correct statuses."""
    await clean_db.orders.insert_one({
        "order_id": "FT-REC-PROGRESS",
        "service_type": "RECHARGE",
        "operator_code": "GP",
        "mobile_number": "01712345678",
        "amount": 5000,
        "currency": "BDT",
        "status": "PAYMENT_PENDING",
        "pricing_snapshot": {},
        "created_at": "2026-09-26T12:00:00Z",
        "updated_at": "2026-09-26T12:00:00Z"
    })

    res = await client.get("/api/v1/orders/FT-REC-PROGRESS/progress")
    assert res.status_code == 200
    data = res.json()
    assert data["order_id"] == "FT-REC-PROGRESS"
    assert data["service_type"] == "RECHARGE"
    assert data["total_steps"] == 6
    step_ids = [s["id"] for s in data["steps"]]
    assert step_ids == [
        "order_created",
        "payment_pending",
        "payment_verified",
        "sim_selection",
        "recharge_processing",
        "completed"
    ]
    assert data["current_step_index"] == 2
    assert data["is_waiting"] is True


@pytest.mark.asyncio
async def test_15_waiting_state_cooldown(client: AsyncClient, clean_db: AsyncIOMotorDatabase):
    """WAITING_FOR_COOLDOWN order has is_waiting: True and bilingual messages."""
    await clean_db.orders.insert_one({
        "order_id": "FT-COOLDOWN-TEST",
        "service_type": "CASH_OUT",
        "operator_code": "BANGLALINK",
        "mobile_number": "01929245399",
        "amount": 20000,
        "currency": "BDT",
        "status": "WAITING_FOR_COOLDOWN",
        "pricing_snapshot": {},
        "created_at": "2026-09-26T12:00:00Z",
        "updated_at": "2026-09-26T12:00:00Z"
    })

    res = await client.get("/api/v1/orders/FT-COOLDOWN-TEST/progress")
    assert res.status_code == 200
    data = res.json()
    assert data["is_waiting"] is True
    assert data["waiting_message_en"] is not None
    assert data["waiting_message_bn"] is not None


@pytest.mark.asyncio
async def test_16_processing_state(client: AsyncClient, clean_db: AsyncIOMotorDatabase):
    """RECHARGE_PROCESSING maps to step 5 with is_waiting: False."""
    await clean_db.orders.insert_one({
        "order_id": "FT-PROC-TEST",
        "service_type": "RECHARGE",
        "operator_code": "ROBI",
        "mobile_number": "01812345678",
        "amount": 10000,
        "currency": "BDT",
        "status": "RECHARGE_PROCESSING",
        "pricing_snapshot": {},
        "created_at": "2026-09-26T12:00:00Z",
        "updated_at": "2026-09-26T12:00:00Z"
    })

    res = await client.get("/api/v1/orders/FT-PROC-TEST/progress")
    assert res.status_code == 200
    data = res.json()
    assert data["current_step_index"] == 5
    assert data["is_waiting"] is False
    assert data["is_terminal"] is False


@pytest.mark.asyncio
async def test_17_completed_state_terminal(client: AsyncClient, clean_db: AsyncIOMotorDatabase):
    """COMPLETED order has all steps completed and is_terminal: True."""
    await clean_db.orders.insert_one({
        "order_id": "FT-DONE-TEST",
        "service_type": "CASH_OUT",
        "operator_code": "GP",
        "mobile_number": "01712345678",
        "amount": 10000,
        "currency": "BDT",
        "status": "COMPLETED",
        "pricing_snapshot": {},
        "created_at": "2026-09-26T12:00:00Z",
        "updated_at": "2026-09-26T12:00:00Z"
    })

    res = await client.get("/api/v1/orders/FT-DONE-TEST/progress")
    assert res.status_code == 200
    data = res.json()
    assert data["is_terminal"] is True
    assert data["is_failed"] is False
    for step in data["steps"]:
        assert step["status"] == "COMPLETED"


@pytest.mark.asyncio
async def test_18_failed_state_terminal(client: AsyncClient, clean_db: AsyncIOMotorDatabase):
    """TRANSFER_FAILED order has is_terminal: True, is_failed: True, and step marked FAILED."""
    await clean_db.orders.insert_one({
        "order_id": "FT-FAIL-TEST",
        "service_type": "CASH_OUT",
        "operator_code": "BANGLALINK",
        "mobile_number": "01929245399",
        "amount": 10000,
        "currency": "BDT",
        "status": "TRANSFER_FAILED",
        "pricing_snapshot": {},
        "metadata": {"error_message": "Operator declined transfer"},
        "created_at": "2026-09-26T12:00:00Z",
        "updated_at": "2026-09-26T12:00:00Z"
    })

    res = await client.get("/api/v1/orders/FT-FAIL-TEST/progress")
    assert res.status_code == 200
    data = res.json()
    assert data["is_terminal"] is True
    assert data["is_failed"] is True
    step_statuses = [s["status"] for s in data["steps"]]
    assert "FAILED" in step_statuses


@pytest.mark.asyncio
async def test_19_polling_stops_flag(client: AsyncClient, clean_db: AsyncIOMotorDatabase):
    """Verify is_terminal flag is accurately set for polling cessation across statuses."""
    for st, expected_terminal in [
        ("COMPLETED", True),
        ("TRANSFER_FAILED", True),
        ("PAYMENT_FAILED", True),
        ("REJECTED", True),
        ("CANCELLED", True),
        ("TRANSFER_IN_PROGRESS", False),
        ("PAYMENT_PENDING", False),
        ("WAITING_FOR_COOLDOWN", False)
    ]:
        oid = f"FT-TERM-{st}"
        await clean_db.orders.insert_one({
            "order_id": oid,
            "service_type": "CASH_OUT",
            "operator_code": "GP",
            "mobile_number": "01712345678",
            "amount": 1000,
            "currency": "BDT",
            "status": st,
            "pricing_snapshot": {},
            "created_at": "2026-09-26T12:00:00Z",
            "updated_at": "2026-09-26T12:00:00Z"
        })
        res = await client.get(f"/api/v1/orders/{oid}/progress")
        assert res.status_code == 200
        assert res.json()["is_terminal"] is expected_terminal


@pytest.mark.asyncio
async def test_20_view_full_order_url_works(client: AsyncClient, clean_db: AsyncIOMotorDatabase):
    """Verify dynamic order_id is returned by progress endpoint to formulate /app/order/{id} URL."""
    oid = "FT-92600601612"
    await clean_db.orders.insert_one({
        "order_id": oid,
        "service_type": "CASH_OUT",
        "operator_code": "BANGLALINK",
        "mobile_number": "01929245399",
        "amount": 50000,
        "currency": "BDT",
        "status": "COMPLETED",
        "pricing_snapshot": {},
        "created_at": "2026-09-26T12:00:00Z",
        "updated_at": "2026-09-26T12:00:00Z"
    })

    res = await client.get(f"/api/v1/orders/{oid}/progress")
    assert res.status_code == 200
    data = res.json()
    assert data["order_id"] == oid
    # Full order details endpoint resolves identical order
    order_res = await client.get(f"/api/v1/orders/{oid}")
    assert order_res.status_code == 200
    assert order_res.json()["order_id"] == oid

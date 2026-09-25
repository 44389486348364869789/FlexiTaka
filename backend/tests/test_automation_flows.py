"""
End-to-End Test Suite for FlexiTaka Automation Upgrade.
Covers Master Prompt Scenarios:
- Scenario A: Automated Cash Out (Operator OTP, auto-login, chunked transfer execution, progress)
- Scenario B: Automated Recharge via iPhone Shortcut SMS Gateway
- Scenario C: Duplicate Payment SMS Deduplication (never process same TrxID twice)
- Scenario D: Nagad Payment SMS Parsing & Order Matching
- Scenario E: Cooldown Handling and Transfer Progress Reporting
- Scenario F: Receiving SIM Reservation & Double-Spend Protection
"""

import time
import pytest
from httpx import AsyncClient
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.config import settings
from app.core.constants import OperatorCode, PayoutMethod, RechargeStatus, ServiceType
from app.modules.payments.sms_parser import SmsParser
from app.modules.transfers.engine import TransferEngine
from app.modules.operators.session_manager import OperatorSessionService
from app.db.repositories.sims_repo import ReceivingSimsRepository


@pytest.mark.asyncio
async def test_scenario_a_automated_cashout_flow(client: AsyncClient, clean_db: AsyncIOMotorDatabase):
    """
    Scenario A: Customer enters number -> Operator OTP sent -> Verified ->
    Account auto-linked -> Balance loaded -> Cash out order created with chunked transfer.
    """
    db = clean_db
    phone = "01712345678"

    # Seed receiving SIM for GP
    await db["receiving_sims"].insert_one({
        "receiving_sim_id": "SIM-GP-01",
        "operator_code": "GP",
        "mobile_number": "01711000001",
        "status": "ACTIVE",
        "available_balance": 500000,
        "reserved_balance": 0,
        "current_daily_usage": 0,
        "cooldown_until": 0,
        "transfer_pin": "1234",
        "created_at": "2026-09-25T00:00:00Z",
        "updated_at": "2026-09-25T00:00:00Z"
    })

    # 1. Request Operator OTP
    otp_req = await client.post("/api/v1/operators/auth/request-otp", json={"phone": phone})
    assert otp_req.status_code == 200
    otp_res = otp_req.json()
    assert otp_res["success"] is True
    assert otp_res["operator_code"] == "GP"

    # 2. Verify Operator OTP (Auto-links user and issues FlexiTaka JWT)
    verify_req = await client.post("/api/v1/operators/auth/verify-otp", json={
        "phone": phone,
        "otp": "1234",
        "reference_id": otp_res.get("reference_id")
    })
    assert verify_req.status_code == 200
    verify_res = verify_req.json()
    assert verify_res["success"] is True
    assert "access_token" in verify_res
    user_token = verify_res["access_token"]
    user_headers = {"Authorization": f"Bearer {user_token}"}

    # Verify session is stored server-side in DB, not exposed
    session = await db["operator_sessions"].find_one({"msisdn": phone})
    assert session is not None
    assert session["operator_code"] == "GP"

    # 3. Create Cash Out Order for 250 BDT
    # 250 BDT with 100 limit should automatically calculate chunks: 100, 100, 50
    order_req = await client.post(
        "/api/v1/cashout/orders",
        json={
            "operator_code": "GP",
            "source_mobile_number": phone,
            "amount_bdt": "250.00",
            "payout_method": "BKASH",
            "payout_account": "01811223344",
            "pin": "1234"
        },
        headers=user_headers
    )
    assert order_req.status_code == 201
    order_res = order_req.json()
    order_id = order_res["order_id"]
    assert order_id.startswith("FT-")

    # 4. Check Transfer Progress
    prog_req = await client.get(f"/api/v1/cashout/orders/{order_id}/progress")
    assert prog_req.status_code == 200
    prog_res = prog_req.json()
    assert prog_res["order_id"] == order_id
    assert prog_res["total_amount_bdt"] == 250
    assert prog_res["total_chunks"] == 3  # 100, 100, 50
    assert len(prog_res["chunks"]) == 3
    assert prog_res["chunks"][0]["chunk_amount_bdt"] == 100
    assert prog_res["chunks"][1]["chunk_amount_bdt"] == 100
    assert prog_res["chunks"][2]["chunk_amount_bdt"] == 50


@pytest.mark.asyncio
async def test_scenario_b_recharge_sms_gateway_flow(client: AsyncClient, clean_db: AsyncIOMotorDatabase):
    """
    Scenario B: Customer creates Recharge order -> Pays via bKash ->
    iPhone Shortcut POSTs payment SMS to /api/gateway/verify-payment-ios-shortcut-method ->
    SMS is parsed, matched, verified, and automated recharge transfer is initiated.
    """
    db = clean_db

    # Seed receiving SIM for Robi
    await db["receiving_sims"].insert_one({
        "receiving_sim_id": "SIM-ROBI-01",
        "operator_code": "ROBI",
        "mobile_number": "01811000001",
        "status": "ACTIVE",
        "available_balance": 500000,
        "reserved_balance": 0,
        "current_daily_usage": 0,
        "cooldown_until": 0,
        "transfer_pin": "1234",
        "created_at": "2026-09-25T00:00:00Z",
        "updated_at": "2026-09-25T00:00:00Z"
    })

    # 1. Create Recharge Order: 100 BDT face value -> 5% discount -> 95 BDT customer pays
    create_req = await client.post(
        "/api/v1/recharge/orders",
        json={
            "operator_code": "ROBI",
            "recharge_mobile_number": "01819998877",
            "recharge_amount_bdt": "100.00"
        },
        headers={"X-Guest-Session-ID": "gst_test_recharge_123"}
    )
    assert create_req.status_code == 201
    order_data = create_req.json()
    order_id = order_data["order_id"]
    assert order_data["customer_pay_amount_bdt"] == "95.00"

    # 2. Simulate iPhone Shortcut forwarding bKash Payment SMS
    raw_sms = (
        f"You have received Tk 95.00 from 01819998877. "
        f"Ref {order_id}. Fee Tk 0.00. Balance Tk 50,000.00. "
        f"TrxID BL12XYZ987 at 25/09/2026 15:30"
    )

    gateway_headers = {
        "X-Gateway-Secret": settings.SHORTCUT_GATEWAY_SECRET
    }

    sms_req = await client.post(
        "/api/gateway/verify-payment-ios-shortcut-method",
        json={
            "raw_sms": raw_sms,
            "secret": settings.SHORTCUT_GATEWAY_SECRET,
            "source_device": "iPhone-FlexiTaka-01"
        },
        headers=gateway_headers
    )

    assert sms_req.status_code == 200
    sms_res = sms_req.json()
    assert sms_res["success"] is True
    assert sms_res["status"] == "PAYMENT_VERIFIED_AND_RECHARGE_INITIATED"
    assert sms_res["order_id"] == order_id
    assert sms_res["transaction_id"] == "BL12XYZ987"

    # 3. Verify Order State Transition in Database
    updated_order = await db["orders"].find_one({"order_id": order_id})
    assert updated_order is not None
    assert updated_order["status"] in [RechargeStatus.PAYMENT_VERIFIED.value, RechargeStatus.COMPLETED.value, "RECHARGE_PROCESSING"]
    assert updated_order["payment_id"] == "PAY-BL12XYZ987"

    # 4. Verify SMS transaction record in DB
    tx_record = await db["sms_transactions"].find_one({"transaction_id": "BL12XYZ987"})
    assert tx_record is not None
    assert tx_record["verification_status"] == "VERIFIED"
    assert tx_record["matched_order_id"] == order_id


@pytest.mark.asyncio
async def test_scenario_c_duplicate_sms_deduplication(client: AsyncClient, clean_db: AsyncIOMotorDatabase):
    """
    Scenario C: Same SMS sent twice -> first may verify -> second must be safely
    rejected as DUPLICATE_TRANSACTION. Never process same TrxID twice.
    """
    db = clean_db

    # Create Recharge order
    create_req = await client.post(
        "/api/v1/recharge/orders",
        json={
            "operator_code": "GP",
            "recharge_mobile_number": "01711223344",
            "recharge_amount_bdt": "100.00"
        },
        headers={"X-Guest-Session-ID": "gst_dup_test_1"}
    )
    assert create_req.status_code == 201
    order_id = create_req.json()["order_id"]

    raw_sms = (
        f"You have received Tk 95.00 from 01711223344. "
        f"Ref {order_id}. Fee Tk 0.00. Balance Tk 10,000.00. "
        f"TrxID DUPTRX1234 at 25/09/2026 16:00"
    )

    gateway_payload = {
        "raw_sms": raw_sms,
        "secret": settings.SHORTCUT_GATEWAY_SECRET
    }

    # First Submission
    res1 = await client.post("/api/gateway/verify-payment-ios-shortcut-method", json=gateway_payload)
    assert res1.status_code == 200

    # Second Duplicate Submission
    res2 = await client.post("/api/gateway/verify-payment-ios-shortcut-method", json=gateway_payload)
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["success"] is False
    assert data2["status"] == "DUPLICATE_TRANSACTION"
    assert "already been processed" in data2["message"]


@pytest.mark.asyncio
async def test_scenario_d_nagad_sms_parser_and_matching(client: AsyncClient, clean_db: AsyncIOMotorDatabase):
    """
    Scenario D: Nagad SMS parsing, TxnID extraction, and order matching.
    """
    raw_nagad_sms = (
        "Money Received: Tk 190.00 from 01911223344. "
        "TxnID: 7BCA9812. Ref: FT-RC-NAGAD01. "
        "Balance: Tk 2,500.00. Date: 25/09/2026 16:15"
    )

    parsed = SmsParser.parse_sms(raw_nagad_sms)
    assert parsed["is_valid"] is True
    assert parsed["provider"] == "NAGAD"
    assert parsed["transaction_id"] == "7BCA9812"
    assert parsed["amount_bdt"] == 190.0
    assert parsed["amount_poisha"] == 19000
    assert parsed["reference_code"] == "FT-RC-NAGAD01"
    assert parsed["sender_number"] == "01911223344"


@pytest.mark.asyncio
async def test_scenario_e_cooldown_and_transfer_progress(clean_db: AsyncIOMotorDatabase):
    """
    Scenario E: Transfer cooldown handling. If an operator reports a cooldown
    (e.g. Banglalink error 1310), TransferEngine marks WAITING_FOR_COOLDOWN with next_retry_at.
    """
    db = clean_db
    session_service = OperatorSessionService(db)
    engine = TransferEngine(db, session_service)

    order_id = "FT-CO-COOLTEST"
    # Create transfer plan of 200 BDT (2 chunks of 100 BDT)
    plan = await engine.initialize_transfer_plan(
        order_id=order_id,
        service_type=ServiceType.CASH_OUT,
        operator_code="BANGLALINK",
        source_number="01912345678",
        destination_number="01911000001",
        total_amount_bdt=200
    )

    assert len(plan) == 2

    # Simulate chunk 1 success, chunk 2 cooldown
    await db["transfer_ledger"].update_one(
        {"order_id": order_id, "sequence_number": 1},
        {"$set": {"status": "SUCCESS"}}
    )
    future_cooldown = int(time.time()) + 1800
    await db["transfer_ledger"].update_one(
        {"order_id": order_id, "sequence_number": 2},
        {"$set": {
            "status": "WAITING_FOR_COOLDOWN",
            "next_retry_at": future_cooldown,
            "error_code": "1310",
            "error_message": "Banglalink transfer cooldown: Next eligible transfer in 30 minutes."
        }}
    )

    # Check progress calculation
    progress = await engine.get_transfer_progress(order_id)
    assert progress["total_amount_bdt"] == 200
    assert progress["completed_amount_bdt"] == 100
    assert progress["completed_chunks"] == 1
    assert progress["is_cooldown"] is True
    assert progress["cooldown_seconds_remaining"] > 0
    assert progress["is_completed"] is False


@pytest.mark.asyncio
async def test_scenario_f_receiving_sim_concurrency_reservation(clean_db: AsyncIOMotorDatabase):
    """
    Scenario F: Receiving SIM reservation and double-spend protection.
    Two orders requesting SIM balance should atomically respect available capacity.
    """
    db = clean_db
    sims_repo = ReceivingSimsRepository(db)

    # Insert a SIM with exactly 150 BDT available (15000 poisha)
    sim_doc = {
        "receiving_sim_id": "SIM-CONC-01",
        "operator_code": "GP",
        "mobile_number": "01799000001",
        "status": "ACTIVE",
        "available_balance": 15000,
        "reserved_balance": 0,
        "current_daily_usage": 0,
        "cooldown_until": 0,
        "created_at": "2026-09-25T00:00:00Z",
        "updated_at": "2026-09-25T00:00:00Z"
    }
    await db["receiving_sims"].insert_one(sim_doc)

    # First reservation: 100 BDT (10000 poisha) -> Should succeed
    res1 = await sims_repo.reserve_sim_balance("SIM-CONC-01", 10000)
    assert res1 is True

    # Second reservation: 100 BDT (10000 poisha) -> Only 50 BDT left, so must fail (returns False)
    res2 = await sims_repo.reserve_sim_balance("SIM-CONC-01", 10000)
    assert res2 is False  # Double-spend prevented!

    # Third reservation: 50 BDT (5000 poisha) -> Exact remaining -> Should succeed
    res3 = await sims_repo.reserve_sim_balance("SIM-CONC-01", 5000)
    assert res3 is True

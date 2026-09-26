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


@pytest.mark.asyncio
async def test_operator_number_mismatch_rejection(client: AsyncClient):
    """
    Requirement 1: Selected operator must match detected operator.
    GP + Robi -> REJECTED (OPERATOR_NUMBER_MISMATCH)
    Robi + GP -> REJECTED
    BL + GP -> REJECTED
    """
    from app.modules.operators.resolver import validate_operator_match
    from app.core.exceptions import ValidationException

    # 1. Direct validation helper check
    with pytest.raises(ValidationException) as exc1:
        validate_operator_match("GP", "01812345678")
    assert exc1.value.code == "OPERATOR_NUMBER_MISMATCH"

    with pytest.raises(ValidationException) as exc2:
        validate_operator_match("ROBI", "01712345678")
    assert exc2.value.code == "OPERATOR_NUMBER_MISMATCH"

    with pytest.raises(ValidationException) as exc3:
        validate_operator_match("BANGLALINK", "01712345678")
    assert exc3.value.code == "OPERATOR_NUMBER_MISMATCH"

    # Matching pairs succeed
    assert validate_operator_match("GP", "01712345678") == "GP"
    assert validate_operator_match("ROBI", "01812345678") == "ROBI"
    assert validate_operator_match("BANGLALINK", "01912345678") == "BANGLALINK"

    # 2. API Level rejection via Pricing Cashout Quote
    resp = await client.post("/api/v1/pricing/cashout-quote", json={
        "operator_code": "GP",
        "amount_bdt": "100.00",
        "phone": "01812345678"  # Robi number with GP operator
    })
    assert resp.status_code == 422
    data = resp.json()
    assert data["error"]["code"] == "OPERATOR_NUMBER_MISMATCH"


@pytest.mark.asyncio
async def test_receiving_sim_operator_mismatch_audit_and_selection(clean_db: AsyncIOMotorDatabase):
    """
    Requirement 2: Receiving SIM operator label & phone prefix mismatch must be blocked.
    Mismatched SIMs must be deactivated by integrity audit.
    """
    db = clean_db
    sims_repo = ReceivingSimsRepository(db)

    # Insert a SIM labeled BANGLALINK but with GP prefix (017)
    await db["receiving_sims"].insert_one({
        "receiving_sim_id": "SIM-MISMATCH-01",
        "operator_code": "BANGLALINK",
        "mobile_number": "01712000001",
        "status": "ACTIVE",
        "available_balance": 100000,
        "reserved_balance": 0,
        "current_daily_usage": 0,
        "cooldown_until": 0,
        "created_at": "2026-09-25T00:00:00Z",
        "updated_at": "2026-09-25T00:00:00Z"
    })

    # Run integrity audit
    audit_res = await sims_repo.audit_sim_integrity()
    assert audit_res["invalid_mismatched_sims"] >= 1

    # Verify status changed to BLOCKED with invalid_mismatch flag
    doc = await db["receiving_sims"].find_one({"receiving_sim_id": "SIM-MISMATCH-01"})
    assert doc["status"] == "BLOCKED"
    assert doc["invalid_mismatch"] is True

    # select_best_sim must NOT return this mismatched SIM
    best = await sims_repo.select_best_sim(operator_code="BANGLALINK", amount_poisha=5000)
    assert best is None


@pytest.mark.asyncio
async def test_authoritative_prefix_registry_and_admin_crud(client: AsyncClient, clean_db: AsyncIOMotorDatabase, staff_headers):
    """
    Requirement 3 & 4: Central 01X prefix registry with Admin CRUD and caching.
    """
    from app.db.repositories.operator_prefix_repo import OperatorPrefixRepository
    from app.modules.operators.resolver import resolve_operator, normalize_msisdn
    from app.core.exceptions import ValidationException
    from app.core.constants import AdminRole

    admin_hdr = staff_headers("ADM-TEST", AdminRole.SUPER_ADMIN)

    repo = OperatorPrefixRepository(clean_db)
    await repo.seed_default_prefixes()
    await repo.load_cache()

    # Normal resolution
    assert resolve_operator("01712345678") == "GP"
    assert resolve_operator("01312345678") == "GP"
    assert resolve_operator("01812345678") == "ROBI"
    assert resolve_operator("01612345678") == "ROBI"
    assert resolve_operator("01912345678") == "BANGLALINK"
    assert resolve_operator("01412345678") == "BANGLALINK"

    # Unknown prefix
    with pytest.raises(ValidationException) as exc:
        resolve_operator("01112345678")
    assert exc.value.code == "UNSUPPORTED_OPERATOR_PREFIX"

    # Admin CRUD via API
    # 1. List prefixes
    list_res = await client.get("/api/v1/admin/operator-prefixes", headers=admin_hdr)
    assert list_res.status_code == 200
    prefixes = list_res.json()["prefixes"]
    assert len(prefixes) >= 6

    # 2. Add new prefix 015 -> TELETALK
    add_res = await client.post("/api/v1/admin/operator-prefixes", json={
        "prefix": "015",
        "operator_code": "TELETALK",
        "notes": "State-owned Teletalk operator"
    }, headers=admin_hdr)
    assert add_res.status_code in (200, 201)

    # Reload cache and verify resolution
    await repo.load_cache()
    assert resolve_operator("01512345678") == "TELETALK"

    # 3. Duplicate prefix rejection
    dup_res = await client.post("/api/v1/admin/operator-prefixes", json={
        "prefix": "015",
        "operator_code": "TELETALK"
    }, headers=admin_hdr)
    assert dup_res.status_code == 409

    # 4. Toggle active status
    put_res = await client.put("/api/v1/admin/operator-prefixes/015", json={
        "is_active": False
    }, headers=admin_hdr)
    assert put_res.status_code == 200
    await repo.load_cache()

    # Once inactive, resolution fails with UNSUPPORTED_OPERATOR_PREFIX
    with pytest.raises(ValidationException) as exc_inactive:
        resolve_operator("01512345678")
    assert exc_inactive.value.code == "UNSUPPORTED_OPERATOR_PREFIX"


@pytest.mark.asyncio
async def test_mobile_number_length_11_digits_enforcement(client: AsyncClient):
    """
    Requirement 5: Phone number must be exactly 11 digits after normalization.
    10 digits -> REJECTED
    12 digits -> REJECTED
    Letters/symbols -> REJECTED
    """
    from app.modules.operators.resolver import normalize_msisdn
    from app.core.exceptions import ValidationException

    # 11 digits valid
    assert normalize_msisdn("01712345678") == "01712345678"
    assert normalize_msisdn("+8801712345678") == "01712345678"
    assert normalize_msisdn("8801712345678") == "01712345678"

    # 10 digits -> Rejected
    with pytest.raises(ValidationException) as exc10:
        normalize_msisdn("0171234567")
    assert exc10.value.code == "INVALID_MOBILE_NUMBER"

    # 12 digits -> Rejected
    with pytest.raises(ValidationException) as exc12:
        normalize_msisdn("017123456789")
    assert exc12.value.code == "INVALID_MOBILE_NUMBER"

    # Letters -> Rejected
    with pytest.raises(ValidationException) as exc_alpha:
        normalize_msisdn("0171234567a")
    assert exc_alpha.value.code == "INVALID_MOBILE_NUMBER"


@pytest.mark.asyncio
async def test_amount_limits_10_to_50000_bdt(client: AsyncClient):
    """
    Requirement 6: Minimum amount is 10 BDT, maximum is 50,000 BDT.
    9 BDT -> REJECTED (422)
    10 BDT -> ACCEPTED (200)
    50 BDT -> ACCEPTED (200)
    50,000 BDT -> ACCEPTED (200)
    50,001 BDT -> REJECTED (422)
    """
    # 9 BDT -> Below minimum
    res_9 = await client.post("/api/v1/pricing/cashout-quote", json={
        "operator_code": "GP",
        "amount_bdt": "9.00"
    })
    assert res_9.status_code == 422

    # 10 BDT -> Minimum accepted
    res_10 = await client.post("/api/v1/pricing/cashout-quote", json={
        "operator_code": "GP",
        "amount_bdt": "10.00"
    })
    assert res_10.status_code == 200
    assert float(res_10.json()["source_amount_bdt"]) == 10.0

    # 50,000 BDT -> Maximum accepted
    res_50k = await client.post("/api/v1/pricing/cashout-quote", json={
        "operator_code": "GP",
        "amount_bdt": "50000.00"
    })
    assert res_50k.status_code == 200

    # 50,001 BDT -> Above maximum
    res_50001 = await client.post("/api/v1/pricing/cashout-quote", json={
        "operator_code": "GP",
        "amount_bdt": "50001.00"
    })
    assert res_50001.status_code == 422


@pytest.mark.asyncio
async def test_cashout_live_balance_check_prevents_transfer(client: AsyncClient, clean_db: AsyncIOMotorDatabase):
    """
    Requirement 7: Live balance must be checked before transfer.
    If balance (9 BDT) < requested amount (50 BDT) -> STOP with INSUFFICIENT_BALANCE!
    Do NOT create transfer chunks or execute.
    """
    db = clean_db
    phone = "01722334455"

    # Set up session with live balance = 9 BDT
    await db["operator_sessions"].insert_one({
        "msisdn": phone,
        "operator_code": "GP",
        "access_token": "mock-token",
        "refresh_token": "mock-refresh",
        "balance_bdt": 9.0,
        "balance_poisha": 900,
        "expire_at": int(time.time()) + 86400,
        "is_active": True,
        "created_at": "2026-09-25T00:00:00Z",
        "updated_at": "2026-09-25T00:00:00Z"
    })

    # Seed receiving SIM
    await db["receiving_sims"].insert_one({
        "receiving_sim_id": "SIM-GP-BAL-01",
        "operator_code": "GP",
        "mobile_number": "01711000099",
        "status": "ACTIVE",
        "available_balance": 500000,
        "reserved_balance": 0,
        "current_daily_usage": 0,
        "cooldown_until": 0,
        "created_at": "2026-09-25T00:00:00Z",
        "updated_at": "2026-09-25T00:00:00Z"
    })

    # Attempt cash out order for 50 BDT with balance 9 BDT
    order_req = await client.post(
        "/api/v1/cashout/orders",
        json={
            "operator_code": "GP",
            "source_mobile_number": phone,
            "amount_bdt": "50.00",
            "payout_method": "BKASH",
            "payout_account": "01811223344"
        },
        headers={"X-Guest-Session-ID": "gst_bal_test"}
    )
    assert order_req.status_code == 422
    err_data = order_req.json()
    assert err_data["error"]["code"] == "INSUFFICIENT_BALANCE"

    # Verify zero chunks or ledger rows created
    ledger_count = await db["transfer_ledger"].count_documents({"source_msisdn": phone})
    assert ledger_count == 0


def test_chunking_exact_calculations():
    """
    Requirement 8: Chunking must never exceed remaining order amount.
    50 BDT -> [50] (never 100!)
    100 BDT -> [100]
    101 BDT -> [100, 1]
    250 BDT -> [100, 100, 50]
    350 BDT -> [100, 100, 100, 50]
    """
    # 50 BDT
    chunks_50 = TransferEngine.calculate_chunks(50, 100)
    assert chunks_50 == [50]

    # 100 BDT
    chunks_100 = TransferEngine.calculate_chunks(100, 100)
    assert chunks_100 == [100]

    # 101 BDT
    chunks_101 = TransferEngine.calculate_chunks(101, 100)
    assert chunks_101 == [100, 1]

    # 250 BDT
    chunks_250 = TransferEngine.calculate_chunks(250, 100)
    assert chunks_250 == [100, 100, 50]

    # 350 BDT
    chunks_350 = TransferEngine.calculate_chunks(350, 100)
    assert chunks_350 == [100, 100, 100, 50]


@pytest.mark.asyncio
async def test_payment_accounts_db_endpoint(client: AsyncClient, clean_db: AsyncIOMotorDatabase):
    """
    Test Requirement 7: Authoritative DB-driven Payment Accounts.
    GET /api/v1/payments/accounts returns authoritative accounts for bKash, Nagad, Rocket, Bangla QR.
    """
    res = await client.get("/api/v1/payments/accounts")
    assert res.status_code == 200
    accounts = res.json()
    assert len(accounts) >= 4
    methods = [acc["method"] for acc in accounts]
    assert "BKASH" in methods
    assert "NAGAD" in methods
    assert "ROCKET" in methods
    assert "BANGLA_QR" in methods
    for acc in accounts:
        assert acc["is_active"] is True
        assert "account_number" in acc
        assert "display_number" in acc


@pytest.mark.asyncio
async def test_recharge_orders_no_otp_for_all_operators(client: AsyncClient, clean_db: AsyncIOMotorDatabase):
    """
    Test Requirement 1 & 13: Recharge MUST NOT require operator OTP or ZendSMS.
    Direct order creation succeeds for GP, Robi, and Banglalink.
    """
    operators_data = [
        ("GP", "01712345678"),
        ("ROBI", "01812345678"),
        ("BANGLALINK", "01912345678")
    ]
    for op, phone in operators_data:
        res = await client.post(
            "/api/v1/recharge/orders",
            json={
                "operator_code": op,
                "recharge_mobile_number": phone,
                "recharge_amount_bdt": "100.00"
            },
            headers={"X-Guest-Session-ID": f"gst_{op.lower()}_test"}
        )
        assert res.status_code == 201, f"Failed for operator {op}: {res.text}"
        data = res.json()
        assert data["order_id"].startswith("FT-")
        assert data["operator_code"] == op
        assert data["recharge_mobile_number"] == phone
        assert data["status"] == "PAYMENT_PENDING"
        assert "payment_account_number" in data


@pytest.mark.asyncio
async def test_recharge_operator_mismatch_and_digit_validation(client: AsyncClient, clean_db: AsyncIOMotorDatabase):
    """
    Test Requirement 4 & 5:
    - Never allow GP + Robi number, etc.
    - Reject 12-digit or invalid numbers.
    """
    # 1. Operator mismatch: GP operator code with Robi number (018...)
    res_mismatch = await client.post(
        "/api/v1/recharge/orders",
        json={
            "operator_code": "GP",
            "recharge_mobile_number": "01812345678",
            "recharge_amount_bdt": "100.00"
        },
        headers={"X-Guest-Session-ID": "gst_mismatch_test"}
    )
    assert res_mismatch.status_code == 422
    assert "OPERATOR_NUMBER_MISMATCH" in res_mismatch.text

    # 2. 12-digit number rejected
    res_12_digits = await client.post(
        "/api/v1/recharge/orders",
        json={
            "operator_code": "GP",
            "recharge_mobile_number": "017123456789",  # 12 digits
            "recharge_amount_bdt": "100.00"
        },
        headers={"X-Guest-Session-ID": "gst_12_test"}
    )
    assert res_12_digits.status_code == 422
    assert "INVALID_MOBILE_NUMBER" in res_12_digits.text


@pytest.mark.asyncio
async def test_recharge_amount_limits(client: AsyncClient, clean_db: AsyncIOMotorDatabase):
    """
    Test Requirement 6:
    Amount 9 -> rejected (< 10)
    Amount 10 -> accepted
    Amount 50,000 -> accepted
    Amount 50,001 -> rejected (> 50,000)
    """
    # 1. Amount 9 rejected
    res_9 = await client.post(
        "/api/v1/recharge/orders",
        json={
            "operator_code": "GP",
            "recharge_mobile_number": "01712345678",
            "recharge_amount_bdt": "9.00"
        },
        headers={"X-Guest-Session-ID": "gst_amt_9"}
    )
    assert res_9.status_code == 422
    assert "AMOUNT_OUT_OF_RANGE" in res_9.text

    # 2. Amount 10 accepted
    res_10 = await client.post(
        "/api/v1/recharge/orders",
        json={
            "operator_code": "GP",
            "recharge_mobile_number": "01712345678",
            "recharge_amount_bdt": "10.00"
        },
        headers={"X-Guest-Session-ID": "gst_amt_10"}
    )
    assert res_10.status_code == 201

    # 3. Amount 50000 accepted
    res_50000 = await client.post(
        "/api/v1/recharge/orders",
        json={
            "operator_code": "GP",
            "recharge_mobile_number": "01712345678",
            "recharge_amount_bdt": "50000.00"
        },
        headers={"X-Guest-Session-ID": "gst_amt_50k"}
    )
    assert res_50000.status_code == 201

    # 4. Amount 50001 rejected
    res_50001 = await client.post(
        "/api/v1/recharge/orders",
        json={
            "operator_code": "GP",
            "recharge_mobile_number": "01712345678",
            "recharge_amount_bdt": "50001.00"
        },
        headers={"X-Guest-Session-ID": "gst_amt_50001"}
    )
    assert res_50001.status_code == 422
    assert "AMOUNT_OUT_OF_RANGE" in res_50001.text



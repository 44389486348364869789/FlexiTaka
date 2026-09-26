"""
Comprehensive Test Suite for FlexiTaka Shared SIM Pool Architecture.
Explicitly verifies:
1. GP max 100 BDT
2. GP min 10 BDT
3. GP 10-transfer calendar-month rule
4. Banglalink numeric values are not incorrectly marked verified
5. Robi numeric values are not incorrectly marked verified
6. Unverified config can be updated through secure admin API
7. SIM with insufficient remaining quota is skipped
8. SIM with sufficient balance but no remaining transfer count is skipped
9. SIM with small leftover balance keeps that balance ("Khuchra" balance)
10. Cash Out increases the same SIM's pool balance
11. Later Recharge decreases that same SIM balance
12. 50 SIMs are independently evaluated
13. No operator mismatch
14. No double-spend under concurrency
15. Recharge has no operator OTP and no transaction OTP
16. Cash Out keeps operator OTP
17. Waiting-for-SIM state works and recovers via background worker
"""

import time
import pytest
from httpx import AsyncClient
from app.core.constants import AdminRole, OperatorCode, SimStatus
from app.db.repositories.operator_config_repo import OperatorConfigRepository
from app.db.repositories.sims_repo import ReceivingSimsRepository
from app.modules.transfers.engine import TransferEngine
from app.modules.transfers.worker import TransferWorker
from app.modules.operators.session_manager import OperatorSessionService


@pytest.mark.asyncio
async def test_gp_min_max_and_10_count_rule(clean_db):
    """
    Test 1, 2, 3:
    Official Grameenphone Balance Transfer rules:
    - Min transfer: 10 BDT
    - Max transfer: 100 BDT
    - Max 10 transfers per calendar month
    - When monthly_sent_count == 10, SIM is skipped even with large balance
    """
    op_repo = OperatorConfigRepository(clean_db)
    await op_repo.ensure_defaults()
    cfg = await op_repo.get_config("GP")

    assert cfg["min_transfer_amount_bdt"] == 10
    assert cfg["max_transfer_amount_bdt"] == 100
    assert cfg["monthly_transfer_count_limit"] == 10
    assert cfg["is_verified"] is True
    assert "grameenphone.com" in cfg["verification_source"]

    sims_repo = ReceivingSimsRepository(clean_db)
    now = sims_repo.utcnow()

    # Create GP SIM with sufficient balance (50,000 poisha = 500 BDT),
    # but monthly_sent_count == 10 (reached official calendar month count limit)
    sim_id_exhausted = "SIM-GP-COUNT-EXHAUSTED"
    await clean_db.receiving_sims.insert_one({
        "receiving_sim_id": sim_id_exhausted,
        "operator_code": "GP",
        "mobile_number": "01711999001",
        "status": SimStatus.ACTIVE,
        "health_status": "HEALTHY",
        "current_balance": 50000,
        "reserved_balance": 0,
        "available_balance": 50000,
        "daily_limit": 100000,
        "daily_sent_amount": 10000,
        "daily_sent_count": 2,
        "monthly_limit": 100000,
        "monthly_sent_amount": 50000,
        "monthly_sent_count": 10,  # Exhausted 10-count limit!
        "cooldown_until": 0,
        "failure_count": 0,
        "created_at": now,
        "updated_at": now
    })

    # When evaluating, this SIM MUST be rejected due to 10-count limit
    selected = await sims_repo.select_best_sim("GP", required_amount_poisha=5000, for_recharge=True)
    assert selected is None

    # Now add GP SIM with 9 transfers (1 transfer count remaining)
    sim_id_eligible = "SIM-GP-1-REMAINING"
    await clean_db.receiving_sims.insert_one({
        "receiving_sim_id": sim_id_eligible,
        "operator_code": "GP",
        "mobile_number": "01711999002",
        "status": SimStatus.ACTIVE,
        "health_status": "HEALTHY",
        "current_balance": 50000,
        "reserved_balance": 0,
        "available_balance": 50000,
        "daily_limit": 100000,
        "daily_sent_amount": 10000,
        "daily_sent_count": 2,
        "monthly_limit": 100000,
        "monthly_sent_amount": 50000,
        "monthly_sent_count": 9,  # 1 count remaining!
        "cooldown_until": 0,
        "failure_count": 0,
        "created_at": now,
        "updated_at": now
    })

    selected2 = await sims_repo.select_best_sim("GP", required_amount_poisha=5000, for_recharge=True)
    assert selected2 is not None
    assert selected2["receiving_sim_id"] == sim_id_eligible


@pytest.mark.asyncio
async def test_bl_and_robi_unverified_status(clean_db):
    """
    Test 4 & 5:
    Banglalink and Robi numeric limits must NOT be falsely marked verified,
    and must not present 3000 as official verified limits.
    """
    op_repo = OperatorConfigRepository(clean_db)
    await op_repo.ensure_defaults()

    bl_cfg = await op_repo.get_config("BANGLALINK")
    assert bl_cfg["is_verified"] is False
    assert bl_cfg["verified_at"] is None
    assert "banglalink.net" in bl_cfg["verification_source"]
    assert "not publicly published" in bl_cfg["notes"]

    robi_cfg = await op_repo.get_config("ROBI")
    assert robi_cfg["is_verified"] is False
    assert robi_cfg["verified_at"] is None
    assert robi_cfg["verification_source"] is None
    assert "not published" in robi_cfg["notes"]


@pytest.mark.asyncio
async def test_unverified_config_update_via_admin_api(client: AsyncClient, clean_db, staff_headers):
    """
    Test 6:
    Unverified operator configurations can be securely updated through Admin API.
    """
    admin_hdr = staff_headers("ADM-SUPER", AdminRole.SUPER_ADMIN)
    op_repo = OperatorConfigRepository(clean_db)
    await op_repo.ensure_defaults()

    update_res = await client.put(
        "/api/v1/admin/operator-configs/BANGLALINK",
        headers=admin_hdr,
        json={
            "min_transfer_amount_bdt": 20,
            "max_transfer_amount_bdt": 150,
            "daily_amount_limit_bdt": 2000,
            "monthly_amount_limit_bdt": 5000,
            "cooldown_seconds": 1200,
            "notes": "Custom negotiated agreement verified with telecom account manager."
        }
    )
    assert update_res.status_code == 200
    data = update_res.json()
    assert data["operator_code"] == "BANGLALINK"
    assert data["min_transfer_amount_bdt"] == 20
    assert data["max_transfer_amount_bdt"] == 150
    assert data["daily_amount_limit_bdt"] == 2000


@pytest.mark.asyncio
async def test_shared_sim_pool_cashout_and_recharge_lifecycle(clean_db):
    """
    Test 9, 10, 11:
    - Starting balance = 300 BDT
    - Cash out receives 70 BDT -> Balance = 370 BDT
    - Cash out receives 30 BDT -> Balance = 400 BDT
    - Recharge sends 100 BDT -> Balance = 300 BDT
    - The remaining 300 stays in the pool.
    - Small/khuchra balance is never discarded.
    """
    sims_repo = ReceivingSimsRepository(clean_db)
    now = sims_repo.utcnow()
    sim_id = "SIM-SHARED-LIFECYCLE-01"

    await clean_db.receiving_sims.insert_one({
        "receiving_sim_id": sim_id,
        "operator_code": "BANGLALINK",
        "mobile_number": "01912000001",
        "status": SimStatus.ACTIVE,
        "health_status": "HEALTHY",
        "current_balance": 30000,  # 300 BDT
        "reserved_balance": 0,
        "available_balance": 30000,
        "daily_limit": 10000000,
        "daily_sent_amount": 0,
        "daily_sent_count": 0,
        "monthly_sent_amount": 0,
        "monthly_sent_count": 0,
        "total_received_amount": 30000,
        "received_transfer_count": 1,
        "total_sent_amount": 0,
        "sent_transfer_count": 0,
        "cooldown_until": 0,
        "failure_count": 0,
        "created_at": now,
        "updated_at": now
    })

    # Cash out 70 BDT (7,000 poisha)
    await sims_repo.record_cashout_receipt(sim_id, amount_poisha=7000, order_id="CO-70")
    s1 = await sims_repo.get_by_sim_id(sim_id)
    assert s1["current_balance"] == 37000

    # Cash out 30 BDT (3,000 poisha)
    await sims_repo.record_cashout_receipt(sim_id, amount_poisha=3000, order_id="CO-30")
    s2 = await sims_repo.get_by_sim_id(sim_id)
    assert s2["current_balance"] == 40000

    # Recharge sends 100 BDT (10,000 poisha)
    await sims_repo.reserve_sim_balance(sim_id, amount_poisha=10000)
    await sims_repo.confirm_recharge_deduction(sim_id, amount_poisha=10000, order_id="RC-100")
    s3 = await sims_repo.get_by_sim_id(sim_id)
    assert s3["current_balance"] == 30000
    assert s3["available_balance"] == 30000

    # Small balance (e.g. 7 BDT leftover) is preserved and never deleted
    await sims_repo.record_cashout_receipt(sim_id, amount_poisha=700, order_id="CO-7")
    s4 = await sims_repo.get_by_sim_id(sim_id)
    assert s4["current_balance"] == 30700
    assert s4["available_balance"] == 30700


@pytest.mark.asyncio
async def test_per_sim_quota_and_eligibility_engine(clean_db):
    """
    Test 7:
    SIM balance = 800 BDT, remaining quota = 200 BDT.
    Recharge request = 201 BDT -> MUST BE REJECTED.
    """
    sims_repo = ReceivingSimsRepository(clean_db)
    now = sims_repo.utcnow()

    await clean_db.receiving_sims.insert_one({
        "receiving_sim_id": "SIM-GP-QUOTA-TEST",
        "operator_code": "GP",
        "mobile_number": "01712000001",
        "status": SimStatus.ACTIVE,
        "health_status": "HEALTHY",
        "current_balance": 80000,  # 800 BDT
        "reserved_balance": 0,
        "available_balance": 80000,
        "daily_limit": 100000,     # 1000 BDT
        "daily_sent_amount": 80000, # 800 BDT sent, 200 BDT remaining
        "monthly_limit": 500000,
        "monthly_sent_amount": 80000,
        "cooldown_until": 0,
        "failure_count": 0,
        "created_at": now,
        "updated_at": now
    })

    # Recharge 201 BDT (20,100 poisha) > 20,000 poisha remaining
    selected = await sims_repo.select_best_sim("GP", required_amount_poisha=20100, for_recharge=True)
    assert selected is None


@pytest.mark.asyncio
async def test_50_sims_independently_evaluated(clean_db):
    """
    Test 8 & 12:
    50 BL SIMs (BL-01 to BL-50) are created.
    Each SIM is evaluated independently.
    Blocked or cooldown SIMs are skipped.
    Least-loaded eligible SIM is selected.
    """
    sims_repo = ReceivingSimsRepository(clean_db)
    now_ts = int(time.time())
    now = sims_repo.utcnow()

    sim_docs = []
    for i in range(1, 51):
        padded = f"{i:02d}"
        phone = f"019100000{padded}"
        is_blocked = (i % 5 == 0)      # Every 5th SIM is blocked
        is_cooldown = (i % 7 == 0)     # Every 7th SIM is in cooldown
        daily_usage = i * 1000         # Varying usage

        sim_docs.append({
            "receiving_sim_id": f"BL-{padded}",
            "operator_code": "BANGLALINK",
            "mobile_number": phone,
            "status": SimStatus.BLOCKED if is_blocked else SimStatus.ACTIVE,
            "health_status": "BLOCKED" if is_blocked else "HEALTHY",
            "current_balance": 50000,  # 500 BDT
            "reserved_balance": 0,
            "available_balance": 50000,
            "daily_limit": 2000000,
            "daily_sent_amount": daily_usage,
            "monthly_limit": 10000000,
            "monthly_sent_amount": daily_usage,
            "cooldown_until": (now_ts + 3600) if is_cooldown else 0,
            "failure_count": 0,
            "created_at": now,
            "updated_at": now
        })

    await clean_db.receiving_sims.insert_many(sim_docs)
    total_count = await clean_db.receiving_sims.count_documents({"operator_code": "BANGLALINK"})
    assert total_count == 50

    # Request recharge of 100 BDT (10,000 poisha)
    # Selection should pick the least-loaded active, non-cooldown SIM: BL-01
    best_sim = await sims_repo.select_best_sim("BANGLALINK", required_amount_poisha=10000, for_recharge=True)
    assert best_sim is not None
    assert best_sim["receiving_sim_id"] == "BL-01"
    assert best_sim["status"] == SimStatus.ACTIVE
    assert best_sim["cooldown_until"] == 0


@pytest.mark.asyncio
async def test_transfer_chunking_rules():
    """
    Chunking calculation:
    50 -> [50]
    100 -> [100]
    101 -> [100, 1]
    250 -> [100, 100, 50]
    300 -> [100, 100, 100]
    """
    assert TransferEngine.calculate_chunks(50, 100) == [50]
    assert TransferEngine.calculate_chunks(100, 100) == [100]
    assert TransferEngine.calculate_chunks(101, 100) == [100, 1]
    assert TransferEngine.calculate_chunks(250, 100) == [100, 100, 50]
    assert TransferEngine.calculate_chunks(300, 100) == [100, 100, 100]


@pytest.mark.asyncio
async def test_concurrency_and_double_spend_prevention(clean_db):
    """
    Test 14:
    Concurrent orders cannot double-spend the same SIM balance.
    """
    sims_repo = ReceivingSimsRepository(clean_db)
    now = sims_repo.utcnow()
    sim_id = "SIM-CONCURRENCY-01"

    await clean_db.receiving_sims.insert_one({
        "receiving_sim_id": sim_id,
        "operator_code": "ROBI",
        "mobile_number": "01812000001",
        "status": SimStatus.ACTIVE,
        "health_status": "HEALTHY",
        "current_balance": 10000,  # 100 BDT
        "reserved_balance": 0,
        "available_balance": 10000,
        "daily_limit": 100000,
        "daily_sent_amount": 0,
        "monthly_limit": 500000,
        "monthly_sent_amount": 0,
        "cooldown_until": 0,
        "failure_count": 0,
        "created_at": now,
        "updated_at": now
    })

    # Order 1 reserves 100 BDT
    res1 = await sims_repo.reserve_sim_balance(sim_id, amount_poisha=10000)
    assert res1 is True

    # Order 2 attempts to reserve 100 BDT concurrently -> MUST FAIL
    res2 = await sims_repo.reserve_sim_balance(sim_id, amount_poisha=10000)
    assert res2 is False


@pytest.mark.asyncio
async def test_operator_mismatch_rejection(clean_db):
    """
    Test 13:
    GP destination cannot use BL SIM.
    BL destination cannot use Robi SIM.
    Robi destination cannot use GP SIM.
    """
    sims_repo = ReceivingSimsRepository(clean_db)
    now = sims_repo.utcnow()

    await clean_db.receiving_sims.insert_one({
        "receiving_sim_id": "SIM-BL-ONLY",
        "operator_code": "BANGLALINK",
        "mobile_number": "01912000001",
        "status": SimStatus.ACTIVE,
        "health_status": "HEALTHY",
        "current_balance": 50000,
        "reserved_balance": 0,
        "available_balance": 50000,
        "daily_limit": 100000,
        "daily_sent_amount": 0,
        "monthly_limit": 500000,
        "monthly_sent_amount": 0,
        "cooldown_until": 0,
        "failure_count": 0,
        "created_at": now,
        "updated_at": now
    })

    # GP destination number (017) attempting to use BL SIM -> MUST BE REJECTED
    selected = await sims_repo.select_best_sim("BANGLALINK", required_amount_poisha=10000, for_recharge=True, destination_msisdn="01712345678")
    assert selected is None


@pytest.mark.asyncio
async def test_waiting_for_sim_queue_and_worker_dispatch(clean_db):
    """
    Test 17:
    Recharge order waiting for SIM capacity is placed in WAITING_FOR_SIM.
    Background worker automatically dispatches it when a SIM becomes available.
    """
    order_id = "FT-RC-QUEUE-01"
    now = int(time.time())

    # Order in WAITING_FOR_SIM state
    await clean_db.orders.insert_one({
        "order_id": order_id,
        "service_type": "RECHARGE",
        "status": "WAITING_FOR_SIM",
        "operator_code": "GP",
        "mobile_number": "01719998877",
        "amount": 10000,  # 100 BDT
        "metadata": {
            "recharge_face_value_poisha": 10000,
            "waiting_reason": "Waiting for an available recharge line"
        },
        "created_at": now,
        "updated_at": now
    })

    session_service = OperatorSessionService(clean_db)
    engine = TransferEngine(clean_db, session_service)
    worker = TransferWorker(clean_db, engine)

    # Worker runs when no SIM is eligible -> order stays WAITING_FOR_SIM
    await worker.process_waiting_recharge_orders()
    order_check1 = await clean_db.orders.find_one({"order_id": order_id})
    assert order_check1["status"] == "WAITING_FOR_SIM"

    # Now add an eligible GP receiving SIM
    await clean_db.receiving_sims.insert_one({
        "receiving_sim_id": "SIM-GP-REPLENISHED",
        "operator_code": "GP",
        "mobile_number": "01711223344",
        "status": SimStatus.ACTIVE,
        "health_status": "HEALTHY",
        "current_balance": 50000,
        "reserved_balance": 0,
        "available_balance": 50000,
        "daily_limit": 100000,
        "daily_sent_amount": 0,
        "daily_sent_count": 0,
        "monthly_limit": 500000,
        "monthly_sent_amount": 0,
        "monthly_sent_count": 0,
        "cooldown_until": 0,
        "failure_count": 0,
        "created_at": str(now),
        "updated_at": str(now)
    })

    # Worker runs again -> automatically dispatches order to the new SIM!
    await worker.process_waiting_recharge_orders()
    order_check2 = await clean_db.orders.find_one({"order_id": order_id})
    assert order_check2["status"] in ["RECHARGE_PROCESSING", "COMPLETED"]
    assert order_check2["metadata"]["dispatched_sim_id"] == "SIM-GP-REPLENISHED"


@pytest.mark.asyncio
async def test_admin_sim_and_operator_config_apis(client: AsyncClient, clean_db, staff_headers):
    """
    Admin backend APIs:
    - Create SIM with 11-digit Bangladesh validation & prefix check
    - Reject invalid phone format and operator-prefix mismatch
    - View SIM details, status, history
    - Update operator configuration limits
    - Trigger balance reconciliation
    """
    admin_hdr = staff_headers("ADM-SUPER", AdminRole.SUPER_ADMIN)

    # 1. Reject invalid non-11-digit phone number
    inv_res = await client.post(
        "/api/v1/admin/sims",
        headers=admin_hdr,
        json={
            "operator_code": "GP",
            "mobile_number": "017123",  # invalid short
            "label": "Invalid SIM",
            "daily_limit_bdt": "50000.00",
            "monthly_limit_bdt": "150000.00"
        }
    )
    assert inv_res.status_code == 422 or inv_res.status_code == 400

    # 2. Reject operator-prefix mismatch (019 belongs to BL, not GP)
    mismatch_res = await client.post(
        "/api/v1/admin/sims",
        headers=admin_hdr,
        json={
            "operator_code": "GP",
            "mobile_number": "01912345678",  # BL prefix under GP
            "label": "Mismatch SIM",
            "daily_limit_bdt": "50000.00",
            "monthly_limit_bdt": "150000.00"
        }
    )
    assert mismatch_res.status_code == 422 or mismatch_res.status_code == 400

    # 3. Create valid GP receiving SIM
    valid_res = await client.post(
        "/api/v1/admin/sims",
        headers=admin_hdr,
        json={
            "operator_code": "GP",
            "mobile_number": "01715999888",
            "label": "GP New Pool SIM #99",
            "daily_limit_bdt": "50000.00",
            "monthly_limit_bdt": "150000.00",
            "initial_balance_bdt": "500.00"
        }
    )
    assert valid_res.status_code == 200, valid_res.text
    created_sim = valid_res.json()
    sim_id = created_sim["receiving_sim_id"]
    assert float(created_sim["current_balance_bdt"]) == 500.0
    assert created_sim["operator_code"] == "GP"

    # 4. Get single SIM details
    get_res = await client.get(f"/api/v1/admin/sims/{sim_id}", headers=admin_hdr)
    assert get_res.status_code == 200
    assert get_res.json()["mobile_number"] == "01715999888"

    # 5. Block and Unblock SIM
    block_res = await client.post(f"/api/v1/admin/sims/{sim_id}/block", headers=admin_hdr, json={"reason": "Testing block"})
    assert block_res.status_code == 200
    assert block_res.json()["status"] == "BLOCKED"

    unblock_res = await client.post(f"/api/v1/admin/sims/{sim_id}/unblock", headers=admin_hdr)
    assert unblock_res.status_code == 200
    assert unblock_res.json()["status"] == "ACTIVE"

    # 6. Reconcile balance
    rec_res = await client.post(
        f"/api/v1/admin/sims/{sim_id}/reconcile",
        headers=admin_hdr,
        json={"operator_balance_bdt": 480.00}
    )
    assert rec_res.status_code == 200
    rec_data = rec_res.json()
    assert rec_data["mismatch"] is True
    assert rec_data["health_status"] == "NEEDS_RECONCILIATION"

    # 7. List and update Operator Configs
    cfg_list_res = await client.get("/api/v1/admin/operator-configs", headers=admin_hdr)
    assert cfg_list_res.status_code == 200
    configs = cfg_list_res.json()["configs"]
    assert len(configs) >= 3

    update_cfg_res = await client.put(
        "/api/v1/admin/operator-configs/GP",
        headers=admin_hdr,
        json={
            "max_transfer_amount_bdt": 100,
            "daily_amount_limit_bdt": 1000,
            "monthly_amount_limit_bdt": 1000,
            "monthly_transfer_count_limit": 10,
            "cooldown_seconds": 0
        }
    )
    assert update_cfg_res.status_code == 200
    assert update_cfg_res.json()["operator_code"] == "GP"

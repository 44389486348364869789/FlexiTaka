"""
Tests for Secure Guest-to-User Order Linking in FlexiTaka.

Covers all 12 core test requirements:
1. Guest creates one order -> logs in -> order linked.
2. Guest creates multiple orders -> logs in -> all eligible orders linked.
3. Guest has Cash Out + Recharge -> both appear in account history.
4. New account creation via OTP -> guest orders linked.
5. Existing account login via OTP -> guest orders linked.
6. No guest orders -> login still works normally.
7. Same linking operation repeated -> idempotent / no duplicates.
8. Concurrent linking attempts -> atomic / no duplicate reassignment.
9. Order belonging to another user -> never modified.
10. Wrong guest session -> cannot claim orders.
11. Invalid/expired guest session -> no linking.
12. Existing authenticated user without guest session -> normal login behavior unchanged.
"""

import asyncio
from datetime import datetime, timedelta, timezone
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_guest_creates_one_order_and_logs_in_links_order(client: AsyncClient, clean_db):
    """1. Guest creates one order -> logs in -> order linked."""
    # Step A: Create guest session
    guest_res = await client.post("/api/v1/guest/session")
    assert guest_res.status_code == 200
    guest_id = guest_res.json()["guest_session_id"]
    headers = {"X-Guest-Session-ID": guest_id}

    # Step B: Create Cash Out order
    create_res = await client.post("/api/v1/cashout/orders", headers=headers, json={
        "operator_code": "GP",
        "source_mobile_number": "01712345678",
        "amount_bdt": "500.00",
        "payout_method": "BKASH",
        "payout_account": "01999888777"
    })
    assert create_res.status_code == 201
    order_id = create_res.json()["order_id"]

    # Before login: order user_id is None, guest_session_id matches
    db = clean_db
    order_before = await db["orders"].find_one({"order_id": order_id})
    assert order_before["user_id"] is None
    assert order_before["guest_session_id"] == guest_id

    # Step C: User requests and verifies OTP
    phone = "01711223344"
    req_otp = await client.post("/api/v1/auth/request-otp", json={"phone": phone})
    assert req_otp.status_code == 200

    verify_res = await client.post(
        "/api/v1/auth/verify-otp",
        headers=headers,
        json={"phone": phone, "otp": "123456", "guest_session_id": guest_id}
    )
    assert verify_res.status_code == 200
    token_data = verify_res.json()
    assert token_data["orders_linked"] == 1
    user_id = token_data["user_id"]
    auth_token = token_data["access_token"]

    # After login: order user_id is set to user_id, guest_session_id retained
    order_after = await db["orders"].find_one({"order_id": order_id})
    assert order_after["user_id"] == user_id
    assert order_after["guest_session_id"] == guest_id
    assert order_after["linked_from_guest_session_id"] == guest_id

    # Check order events timeline
    events = await db["order_events"].find({"order_id": order_id}).to_list(10)
    assert any("linked from guest session" in (e.get("note") or "").lower() for e in events)

    # Check audit log
    audit_logs = await db["audit_logs"].find({"action": "GUEST_ORDERS_LINKED_TO_USER"}).to_list(10)
    assert len(audit_logs) >= 1
    assert audit_logs[0]["actor_id"] == user_id
    assert audit_logs[0]["resource_id"] == guest_id

    # Authenticated user querying /api/v1/orders sees the linked order
    user_headers = {"Authorization": f"Bearer {auth_token}"}
    orders_res = await client.get("/api/v1/orders", headers=user_headers)
    assert orders_res.status_code == 200
    user_orders = orders_res.json()
    assert len(user_orders) == 1
    assert user_orders[0]["order_id"] == order_id
    assert user_orders[0]["linked_from_guest_session_id"] == guest_id


@pytest.mark.asyncio
async def test_guest_creates_multiple_orders_all_linked(client: AsyncClient, clean_db):
    """2. Guest creates multiple orders -> logs in -> all eligible orders linked."""
    guest_res = await client.post("/api/v1/guest/session")
    guest_id = guest_res.json()["guest_session_id"]
    headers = {"X-Guest-Session-ID": guest_id}

    # Create 3 cashout orders
    order_ids = []
    for i in range(3):
        res = await client.post("/api/v1/cashout/orders", headers=headers, json={
            "operator_code": "ROBI",
            "source_mobile_number": f"0181234567{i}",
            "amount_bdt": f"{200 + i * 100}.00",
            "payout_method": "NAGAD",
            "payout_account": "01888777666"
        })
        assert res.status_code == 201
        order_ids.append(res.json()["order_id"])

    phone = "01811223344"
    await client.post("/api/v1/auth/request-otp", json={"phone": phone})
    verify_res = await client.post(
        "/api/v1/auth/verify-otp",
        headers=headers,
        json={"phone": phone, "otp": "123456"}
    )
    assert verify_res.status_code == 200
    token_data = verify_res.json()
    assert token_data["orders_linked"] == 3
    user_id = token_data["user_id"]

    db = clean_db
    for oid in order_ids:
        doc = await db["orders"].find_one({"order_id": oid})
        assert doc["user_id"] == user_id
        assert doc["guest_session_id"] == guest_id


@pytest.mark.asyncio
async def test_guest_cashout_and_recharge_both_unified(client: AsyncClient, clean_db):
    """3. Guest has Cash Out + Recharge -> both appear in account history."""
    guest_res = await client.post("/api/v1/guest/session")
    guest_id = guest_res.json()["guest_session_id"]
    headers = {"X-Guest-Session-ID": guest_id}

    # Cashout order
    co_res = await client.post("/api/v1/cashout/orders", headers=headers, json={
        "operator_code": "GP",
        "source_mobile_number": "01700112233",
        "amount_bdt": "1000.00",
        "payout_method": "BKASH",
        "payout_account": "01799887766"
    })
    assert co_res.status_code == 201
    co_id = co_res.json()["order_id"]

    # Recharge order
    rc_res = await client.post("/api/v1/recharge/orders", headers=headers, json={
        "operator_code": "BANGLALINK",
        "recharge_mobile_number": "01900112233",
        "recharge_amount_bdt": "500.00"
    })
    assert rc_res.status_code == 201
    rc_id = rc_res.json()["order_id"]

    phone = "01955443322"
    await client.post("/api/v1/auth/request-otp", json={"phone": phone})
    verify_res = await client.post(
        "/api/v1/auth/verify-otp",
        headers=headers,
        json={"phone": phone, "otp": "123456"}
    )
    assert verify_res.status_code == 200
    assert verify_res.json()["orders_linked"] == 2
    auth_token = verify_res.json()["access_token"]

    # Check unified /orders list
    orders_res = await client.get("/api/v1/orders", headers={"Authorization": f"Bearer {auth_token}"})
    assert orders_res.status_code == 200
    items = orders_res.json()
    assert len(items) == 2
    returned_ids = {o["order_id"] for o in items}
    assert co_id in returned_ids
    assert rc_id in returned_ids


@pytest.mark.asyncio
async def test_new_account_creation_via_otp_links_orders(client: AsyncClient, clean_db):
    """4. New account creation via OTP -> guest orders linked."""
    guest_res = await client.post("/api/v1/guest/session")
    guest_id = guest_res.json()["guest_session_id"]
    headers = {"X-Guest-Session-ID": guest_id}

    res = await client.post("/api/v1/cashout/orders", headers=headers, json={
        "operator_code": "GP",
        "source_mobile_number": "01712345678",
        "amount_bdt": "300.00",
        "payout_method": "BKASH",
        "payout_account": "01799887766"
    })
    assert res.status_code == 201
    order_id = res.json()["order_id"]

    new_phone = "01699990000"
    db = clean_db
    assert await db["users"].find_one({"phone": new_phone}) is None

    await client.post("/api/v1/auth/request-otp", json={"phone": new_phone})
    verify_res = await client.post(
        "/api/v1/auth/verify-otp",
        headers=headers,
        json={"phone": new_phone, "otp": "123456"}
    )
    assert verify_res.status_code == 200
    user_id = verify_res.json()["user_id"]
    assert verify_res.json()["orders_linked"] == 1

    # Verify user exists in database
    user_doc = await db["users"].find_one({"phone": new_phone})
    assert user_doc is not None
    assert user_doc["user_id"] == user_id

    # Verify order linked to new user
    order_doc = await db["orders"].find_one({"order_id": order_id})
    assert order_doc["user_id"] == user_id


@pytest.mark.asyncio
async def test_existing_account_login_via_otp_links_orders(client: AsyncClient, clean_db):
    """5. Existing account login via OTP -> guest orders linked."""
    db = clean_db
    existing_user_id = "FT-U-PRE-EXISTING"
    phone = "01722334455"
    await db["users"].insert_one({
        "user_id": existing_user_id,
        "phone": phone,
        "role": "USER",
        "status": "ACTIVE"
    })

    # Guest session creates an order
    guest_res = await client.post("/api/v1/guest/session")
    guest_id = guest_res.json()["guest_session_id"]
    headers = {"X-Guest-Session-ID": guest_id}

    res = await client.post("/api/v1/cashout/orders", headers=headers, json={
        "operator_code": "GP",
        "source_mobile_number": "01722334455",
        "amount_bdt": "400.00",
        "payout_method": "BKASH",
        "payout_account": "01799999999"
    })
    order_id = res.json()["order_id"]

    await client.post("/api/v1/auth/request-otp", json={"phone": phone})
    verify_res = await client.post(
        "/api/v1/auth/verify-otp",
        headers=headers,
        json={"phone": phone, "otp": "123456"}
    )
    assert verify_res.status_code == 200
    assert verify_res.json()["user_id"] == existing_user_id
    assert verify_res.json()["orders_linked"] == 1

    order_doc = await db["orders"].find_one({"order_id": order_id})
    assert order_doc["user_id"] == existing_user_id


@pytest.mark.asyncio
async def test_no_guest_orders_login_still_works_normally(client: AsyncClient, clean_db):
    """6. No guest orders -> login still works normally."""
    guest_res = await client.post("/api/v1/guest/session")
    guest_id = guest_res.json()["guest_session_id"]
    headers = {"X-Guest-Session-ID": guest_id}

    phone = "01733445566"
    await client.post("/api/v1/auth/request-otp", json={"phone": phone})
    verify_res = await client.post(
        "/api/v1/auth/verify-otp",
        headers=headers,
        json={"phone": phone, "otp": "123456"}
    )
    assert verify_res.status_code == 200
    assert verify_res.json()["orders_linked"] == 0
    assert "access_token" in verify_res.json()


@pytest.mark.asyncio
async def test_same_linking_operation_repeated_is_idempotent(client: AsyncClient, clean_db):
    """7. Same linking operation repeated -> no duplicates, idempotent."""
    guest_res = await client.post("/api/v1/guest/session")
    guest_id = guest_res.json()["guest_session_id"]
    headers = {"X-Guest-Session-ID": guest_id}

    res = await client.post("/api/v1/cashout/orders", headers=headers, json={
        "operator_code": "ROBI",
        "source_mobile_number": "01800001111",
        "amount_bdt": "600.00",
        "payout_method": "BKASH",
        "payout_account": "01899999999"
    })
    order_id = res.json()["order_id"]

    phone = "01800001111"

    # First login
    await client.post("/api/v1/auth/request-otp", json={"phone": phone})
    verify_res_1 = await client.post(
        "/api/v1/auth/verify-otp",
        headers=headers,
        json={"phone": phone, "otp": "123456"}
    )
    assert verify_res_1.status_code == 200
    assert verify_res_1.json()["orders_linked"] == 1
    user_id = verify_res_1.json()["user_id"]

    # Second login with same guest session
    await client.post("/api/v1/auth/request-otp", json={"phone": phone})
    verify_res_2 = await client.post(
        "/api/v1/auth/verify-otp",
        headers=headers,
        json={"phone": phone, "otp": "123456"}
    )
    assert verify_res_2.status_code == 200
    # Already linked, so count is 0
    assert verify_res_2.json()["orders_linked"] == 0

    # Total order count remains exactly 1
    db = clean_db
    count = await db["orders"].count_documents({"user_id": user_id})
    assert count == 1


@pytest.mark.asyncio
async def test_concurrent_linking_attempts_safe_and_atomic(client: AsyncClient, clean_db):
    """8. Concurrent linking attempts -> atomic, no duplicates or errors."""
    guest_res = await client.post("/api/v1/guest/session")
    guest_id = guest_res.json()["guest_session_id"]
    headers = {"X-Guest-Session-ID": guest_id}

    res = await client.post("/api/v1/cashout/orders", headers=headers, json={
        "operator_code": "GP",
        "source_mobile_number": "01744556677",
        "amount_bdt": "750.00",
        "payout_method": "BKASH",
        "payout_account": "01799998888"
    })
    order_id = res.json()["order_id"]

    db = clean_db
    user_id = "FT-U-CONCURRENT-TEST"
    await db["users"].insert_one({
        "user_id": user_id,
        "phone": "01744556677",
        "role": "USER",
        "status": "ACTIVE"
    })

    from app.db.repositories.orders_repo import OrdersRepository
    orders_repo = OrdersRepository(db)

    # Launch 10 simultaneous link requests
    results = await asyncio.gather(
        *(orders_repo.link_guest_orders_to_user(guest_id, user_id) for _ in range(10))
    )

    # Exactly one request links the order, all other 9 return 0
    assert sum(results) == 1
    assert results.count(1) == 1
    assert results.count(0) == 9

    # Order in database has user_id set cleanly
    doc = await db["orders"].find_one({"order_id": order_id})
    assert doc["user_id"] == user_id


@pytest.mark.asyncio
async def test_order_belonging_to_another_user_never_modified(client: AsyncClient, clean_db):
    """9. Order belonging to another user -> never modified."""
    db = clean_db
    other_user_id = "FT-U-OTHER-VICTIM"
    attacker_guest_id = "FT-G-ATTACKER-999"

    # Order already belongs to other_user_id, even if guest_session_id matches attacker
    await db["orders"].insert_one({
        "order_id": "FT-C-ATTACK-TEST",
        "service_type": "CASH_OUT",
        "user_id": other_user_id,
        "guest_session_id": attacker_guest_id,
        "operator_code": "GP",
        "mobile_number": "01712345678",
        "amount": 50000,
        "status": "COMPLETED"
    })

    from app.db.repositories.orders_repo import OrdersRepository
    orders_repo = OrdersRepository(db)

    # Attacker tries to claim
    attacker_user_id = "FT-U-ATTACKER-111"
    linked = await orders_repo.link_guest_orders_to_user(attacker_guest_id, attacker_user_id)
    assert linked == 0

    doc = await db["orders"].find_one({"order_id": "FT-C-ATTACK-TEST"})
    assert doc["user_id"] == other_user_id


@pytest.mark.asyncio
async def test_wrong_guest_session_cannot_claim_orders(client: AsyncClient, clean_db):
    """10. Wrong guest session -> cannot claim orders."""
    # Guest session A creates order
    res_a = await client.post("/api/v1/guest/session")
    guest_a = res_a.json()["guest_session_id"]
    order_res = await client.post("/api/v1/cashout/orders", headers={"X-Guest-Session-ID": guest_a}, json={
        "operator_code": "GP",
        "source_mobile_number": "01711223300",
        "amount_bdt": "250.00",
        "payout_method": "BKASH",
        "payout_account": "01700000000"
    })
    order_id = order_res.json()["order_id"]

    # Guest session B attempts to claim with their login
    res_b = await client.post("/api/v1/guest/session")
    guest_b = res_b.json()["guest_session_id"]

    phone_b = "01799881122"
    await client.post("/api/v1/auth/request-otp", json={"phone": phone_b})
    verify_res = await client.post(
        "/api/v1/auth/verify-otp",
        headers={"X-Guest-Session-ID": guest_b},
        json={"phone": phone_b, "otp": "123456"}
    )
    assert verify_res.status_code == 200
    assert verify_res.json()["orders_linked"] == 0

    # Order still belongs to guest_a and user_id is None
    db = clean_db
    doc = await db["orders"].find_one({"order_id": order_id})
    assert doc["user_id"] is None
    assert doc["guest_session_id"] == guest_a


@pytest.mark.asyncio
async def test_invalid_or_expired_guest_session_no_linking(client: AsyncClient, clean_db):
    """11. Invalid/expired guest session -> no linking."""
    db = clean_db
    # Create expired guest session
    expired_guest_id = "FT-G-EXPIRED-SESSION"
    past = datetime.now(timezone.utc) - timedelta(days=2)
    await db["guest_sessions"].insert_one({
        "guest_session_id": expired_guest_id,
        "created_at": past.isoformat(),
        "expires_at": past.isoformat()
    })
    await db["orders"].insert_one({
        "order_id": "FT-C-EXP-TEST",
        "service_type": "CASH_OUT",
        "user_id": None,
        "guest_session_id": expired_guest_id,
        "operator_code": "GP",
        "mobile_number": "01711223300",
        "amount": 10000,
        "status": "WAITING_FOR_TRANSFER"
    })

    phone = "01788776655"
    await client.post("/api/v1/auth/request-otp", json={"phone": phone})
    verify_res = await client.post(
        "/api/v1/auth/verify-otp",
        headers={"X-Guest-Session-ID": expired_guest_id},
        json={"phone": phone, "otp": "123456"}
    )
    assert verify_res.status_code == 200
    # Linking must be rejected due to expired session
    assert verify_res.json()["orders_linked"] == 0

    doc = await db["orders"].find_one({"order_id": "FT-C-EXP-TEST"})
    assert doc["user_id"] is None


@pytest.mark.asyncio
async def test_cross_account_linking_rejected(client: AsyncClient, clean_db):
    """Bonus security rule: One guest session linked to User A cannot be claimed by User B."""
    guest_res = await client.post("/api/v1/guest/session")
    guest_id = guest_res.json()["guest_session_id"]
    headers = {"X-Guest-Session-ID": guest_id}

    await client.post("/api/v1/cashout/orders", headers=headers, json={
        "operator_code": "ROBI",
        "source_mobile_number": "01822334455",
        "amount_bdt": "500.00",
        "payout_method": "BKASH",
        "payout_account": "01899999999"
    })

    # User A logs in and links
    phone_a = "01822334455"
    await client.post("/api/v1/auth/request-otp", json={"phone": phone_a})
    res_a = await client.post(
        "/api/v1/auth/verify-otp",
        headers=headers,
        json={"phone": phone_a, "otp": "123456"}
    )
    assert res_a.json()["orders_linked"] == 1
    user_a = res_a.json()["user_id"]

    # User B tries to use the same guest_session_id
    phone_b = "01833445566"
    await client.post("/api/v1/auth/request-otp", json={"phone": phone_b})
    res_b = await client.post(
        "/api/v1/auth/verify-otp",
        headers=headers,
        json={"phone": phone_b, "otp": "123456"}
    )
    assert res_b.status_code == 200
    # Must be 0 because session is already linked to User A
    assert res_b.json()["orders_linked"] == 0

    # Ensure orders still belong to User A
    db = clean_db
    docs = await db["orders"].find({"guest_session_id": guest_id}).to_list(10)
    for d in docs:
        assert d["user_id"] == user_a


@pytest.mark.asyncio
async def test_normal_login_without_guest_session_unchanged(client: AsyncClient, clean_db):
    """12. Existing authenticated user without guest session -> normal login behavior unchanged."""
    phone = "01755667788"
    await client.post("/api/v1/auth/request-otp", json={"phone": phone})
    verify_res = await client.post(
        "/api/v1/auth/verify-otp",
        json={"phone": phone, "otp": "123456"}
    )
    assert verify_res.status_code == 200
    data = verify_res.json()
    assert "access_token" in data
    assert data["orders_linked"] == 0
    assert data["role"] == "USER"

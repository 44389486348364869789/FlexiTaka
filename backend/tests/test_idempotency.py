"""
Idempotency Tests.
Verifies that rapid double-clicks and repeated requests do not duplicate orders or transactions.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_order_creation_idempotency(client: AsyncClient, clean_db):
    headers = {
        "X-Guest-Session-ID": "FT-G-IDEM",
        "Idempotency-Key": "idempotency-key-unique-9988"
    }
    payload = {
        "operator_code": "GP",
        "source_mobile_number": "01799887766",
        "amount_bdt": "1000.00",
        "payout_method": "BKASH",
        "payout_account": "01799887766"
    }

    # First request
    res1 = await client.post("/api/v1/cashout/orders", headers=headers, json=payload)
    assert res1.status_code == 201, res1.text
    order_id1 = res1.json()["order_id"]

    # Immediate second request with identical Idempotency-Key (simulating double click)
    res2 = await client.post("/api/v1/cashout/orders", headers=headers, json=payload)
    assert res2.status_code in (200, 201)
    order_id2 = res2.json()["order_id"]

    # Must return the SAME order ID
    assert order_id1 == order_id2

    # Database must only have ONE order
    db = clean_db
    count = await db.orders.count_documents({"guest_session_id": "FT-G-IDEM"})
    assert count == 1, f"Expected 1 order in DB, found {count}"


@pytest.mark.asyncio
async def test_recharge_order_creation_idempotency(client: AsyncClient, clean_db):
    headers = {
        "X-Guest-Session-ID": "FT-G-RECH-IDEM",
        "Idempotency-Key": "idempotency-rech-key-5544"
    }
    payload = {
        "operator_code": "ROBI",
        "recharge_mobile_number": "01899887766",
        "recharge_amount_bdt": "500.00"
    }

    res1 = await client.post("/api/v1/recharge/orders", headers=headers, json=payload)
    assert res1.status_code == 201
    order_id1 = res1.json()["order_id"]

    res2 = await client.post("/api/v1/recharge/orders", headers=headers, json=payload)
    assert res2.status_code in (200, 201)
    order_id2 = res2.json()["order_id"]

    assert order_id1 == order_id2

    db = clean_db
    count = await db.orders.count_documents({"guest_session_id": "FT-G-RECH-IDEM"})
    assert count == 1

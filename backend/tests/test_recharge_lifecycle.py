"""
Tests for Recharge Complete Lifecycle and Balance Ledger Updates.
"""

import pytest
from httpx import AsyncClient
from app.core.constants import AdminRole


@pytest.mark.asyncio
async def test_recharge_complete_lifecycle(client: AsyncClient, clean_db, staff_headers):
    # 1. Initialize guest session
    guest_res = await client.post("/api/v1/guest/session")
    guest_id = guest_res.json()["guest_session_id"]
    headers = {"X-Guest-Session-ID": guest_id}

    # 2. Create Recharge Order (৳1,000 recharge -> ৳950 customer pay)
    create_res = await client.post("/api/v1/recharge/orders", headers=headers, json={
        "operator_code": "ROBI",
        "recharge_mobile_number": "01812345678",
        "recharge_amount_bdt": "1000.00"
    })
    assert create_res.status_code == 201, create_res.text
    order_data = create_res.json()
    order_id = order_data["order_id"]

    assert order_data["status"] == "PAYMENT_PENDING"
    assert order_data["customer_pay_amount_bdt"] == "950.00"
    assert order_data["discount_amount_bdt"] == "50.00"

    # 3. Customer submits payment record
    pay_res = await client.post("/api/v1/payments", json={
        "order_id": order_id,
        "method": "BKASH",
        "amount_bdt": "950.00",
        "payer_reference": "01812345678",
        "transaction_reference": "BKASH-IN-776655"
    })
    assert pay_res.status_code == 201, pay_res.text
    payment_id = pay_res.json()["payment_id"]

    # 4. Staff verifies payment
    admin_hdr = staff_headers("ADM-1", AdminRole.SUPER_ADMIN)
    db = clean_db
    from app.db.repositories.payments_repo import PaymentsRepository
    from app.modules.payments.service import PaymentsService
    from app.db.repositories.orders_repo import OrdersRepository
    from app.db.repositories.recharge_repo import RechargeRepository

    pay_service = PaymentsService(PaymentsRepository(db), OrdersRepository(db), RechargeRepository(db))
    await pay_service.verify_payment(payment_id, staff_id="ADM-1")

    # Verify order is now PAYMENT_VERIFIED
    order_chk = await client.get(f"/api/v1/orders/{order_id}", headers=headers)
    assert order_chk.json()["status"] == "PAYMENT_VERIFIED"

    # 5. Staff completes airtime recharge
    comp_res = await client.post(
        f"/api/v1/admin/orders/{order_id}/complete-recharge",
        headers=admin_hdr,
        json={"processing_reference": "ROBI-TOPUP-990011"}
    )
    assert comp_res.status_code == 200, comp_res.text
    assert comp_res.json()["status"] == "COMPLETED"

    # 6. Verify inventory movement was logged
    inv_res = await client.get("/api/v1/admin/inventory/movements?operator_code=ROBI", headers=admin_hdr)
    assert inv_res.status_code == 200
    movements = inv_res.json()
    assert len(movements) >= 1
    assert movements[0]["movement_type"] == "RECHARGE_CONSUMED"

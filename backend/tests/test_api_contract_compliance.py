"""
Comprehensive API Contract Compliance Test.
Verifies that all client endpoints in docs/API_CONTRACT_FOR_CLIENTS.md
are fully functional on the FastAPI application with correct schemas,
status codes, and response structures.
"""

import pytest
from httpx import AsyncClient
from app.core.constants import ServiceType


@pytest.mark.asyncio
async def test_full_api_contract_compliance(client: AsyncClient, clean_db):
    # Setup receiving SIM for GP
    await clean_db["receiving_sims"].insert_one({
        "receiving_sim_id": "FT-SIM-GP-01",
        "operator_code": "GP",
        "mobile_number": "01711000001",
        "label": "GP Primary Receiving SIM #1",
        "status": "ACTIVE",
        "available_balance": 5000000,
        "daily_limit": 10000000,
        "monthly_limit": 50000000,
        "current_usage": 0
    })

    # 1. Health Checks
    live_res = await client.get("/health")
    assert live_res.status_code == 200
    assert live_res.json()["status"] == "healthy"

    # 2. Operators Listing
    ops_res = await client.get("/api/v1/operators")
    assert ops_res.status_code == 200
    ops_data = ops_res.json()
    assert ops_data["success"] is True
    assert len(ops_data["operators"]) >= 3
    gp_op = next(o for o in ops_data["operators"] if o["operator_code"] == "GP")
    assert gp_op["name"] == "Grameenphone"

    # 3. Dynamic Cash Out Quote (Server-Calculated)
    co_quote_res = await client.post("/api/v1/pricing/cashout-quote", json={
        "operator_code": "GP",
        "amount_bdt": "1000.00"
    })
    assert co_quote_res.status_code == 200
    co_quote = co_quote_res.json()
    assert co_quote["operator_code"] == "GP"
    assert co_quote["source_amount_bdt"] == "1000.00"
    assert co_quote["platform_fee_amount_bdt"] == "200.00"
    assert co_quote["payout_amount_bdt"] == "800.00"

    # 4. Dynamic Recharge Quote (Server-Calculated)
    rec_quote_res = await client.post("/api/v1/pricing/recharge-quote", json={
        "operator_code": "ROBI",
        "recharge_amount_bdt": "1000.00"
    })
    assert rec_quote_res.status_code == 200
    rec_quote = rec_quote_res.json()
    assert rec_quote["discount_amount_bdt"] == "50.00"
    assert rec_quote["customer_pay_amount_bdt"] == "950.00"

    # 5. Guest Session Creation & Lookup
    guest_create = await client.post("/api/v1/guest/session")
    assert guest_create.status_code == 200
    guest_session_id = guest_create.json()["guest_session_id"]
    assert guest_session_id.startswith("FT-G-")

    guest_check = await client.get("/api/v1/guest/session", headers={"X-Guest-Session-ID": guest_session_id})
    assert guest_check.status_code == 200
    assert guest_check.json()["active"] is True
    assert guest_check.json()["guest_session_id"] == guest_session_id

    # 6. Optional Auth Flow (Request OTP & Verify)
    otp_req = await client.post("/api/v1/auth/request-otp", json={"phone": "01712345678"})
    assert otp_req.status_code == 200
    assert otp_req.json()["success"] is True

    verify_res = await client.post("/api/v1/auth/verify-otp", json={
        "phone": "01712345678",
        "otp": "123456"
    })
    assert verify_res.status_code == 200
    user_jwt = verify_res.json()["access_token"]
    assert len(user_jwt) > 10

    # 7. Cash Out Order Creation (with Idempotency Key)
    co_order_res = await client.post("/api/v1/cashout/orders", json={
        "operator_code": "GP",
        "source_mobile_number": "01712345678",
        "amount_bdt": "1000.00",
        "payout_method": "BKASH",
        "payout_account": "01911223344"
    }, headers={
        "X-Guest-Session-ID": guest_session_id,
        "Idempotency-Key": "test-client-key-co-001"
    })
    assert co_order_res.status_code == 201
    co_order = co_order_res.json()
    order_id = co_order["order_id"]
    tracking_token = co_order["tracking_token"]
    assert co_order["status"] == "WAITING_FOR_TRANSFER"
    assert co_order["receiving_mobile_number"] == "01711000001"

    # 8. Cash Out Confirm Transfer
    confirm_res = await client.post(f"/api/v1/cashout/orders/{order_id}/confirm-transfer", json={
        "transfer_reference": "TRX-VERIFY-12345"
    }, headers={"X-Guest-Session-ID": guest_session_id})
    assert confirm_res.status_code == 200
    assert confirm_res.json()["status"] == "UNDER_VERIFICATION"

    # 9. Order Details with Tracking Token (IDOR-Protected)
    detail_res = await client.get(f"/api/v1/orders/{order_id}?tracking_token={tracking_token}")
    assert detail_res.status_code == 200
    detail_data = detail_res.json()
    assert detail_data["order_id"] == order_id
    assert detail_data["status"] == "UNDER_VERIFICATION"
    assert len(detail_data["events"]) >= 2

    # 10. Recharge Order Creation
    rec_order_res = await client.post("/api/v1/recharge/orders", json={
        "operator_code": "ROBI",
        "recharge_mobile_number": "01812345678",
        "recharge_amount_bdt": "1000.00"
    }, headers={
        "X-Guest-Session-ID": guest_session_id,
        "Idempotency-Key": "test-client-key-rec-001"
    })
    assert rec_order_res.status_code == 201
    rec_order = rec_order_res.json()
    assert rec_order["status"] == "PAYMENT_PENDING"

    # 11. Payments Endpoint
    payment_res = await client.post("/api/v1/payments", json={
        "order_id": rec_order["order_id"],
        "method": "BKASH",
        "amount_bdt": "950.00",
        "payer_reference": "01812345678",
        "transaction_reference": "BKASH-TEST-PAY-001"
    })
    assert payment_res.status_code == 201
    assert payment_res.json()["status"] == "PENDING"

    # 12. Support Ticket Creation & Listing
    ticket_res = await client.post("/api/v1/support/tickets", json={
        "category": "ORDER_STATUS",
        "subject": "Question about my order",
        "message": "When will it be completed?",
        "order_id": order_id
    }, headers={"X-Guest-Session-ID": guest_session_id})
    assert ticket_res.status_code == 201
    ticket_id = ticket_res.json()["ticket_id"]

    tickets_list_res = await client.get("/api/v1/support/tickets", headers={"X-Guest-Session-ID": guest_session_id})
    assert tickets_list_res.status_code == 200
    assert len(tickets_list_res.json()) >= 1

    # 13. Notifications Listing
    notif_res = await client.get("/api/v1/notifications", headers={"X-Guest-Session-ID": guest_session_id})
    assert notif_res.status_code == 200
    assert isinstance(notif_res.json(), list)

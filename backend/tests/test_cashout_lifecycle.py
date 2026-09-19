"""
Tests for Cash Out Complete Lifecycle and State Transitions.
"""

import pytest
from httpx import AsyncClient
from app.core.constants import AdminRole


@pytest.mark.asyncio
async def test_cashout_complete_lifecycle(client: AsyncClient, clean_db, staff_headers):
    # 1. Initialize guest session
    guest_res = await client.post("/api/v1/guest/session")
    guest_id = guest_res.json()["guest_session_id"]
    headers = {"X-Guest-Session-ID": guest_id}

    # 2. Create Cash Out Order (৳1,000 -> ৳800 payout)
    create_res = await client.post("/api/v1/cashout/orders", headers=headers, json={
        "operator_code": "GP",
        "source_mobile_number": "01712345678",
        "amount_bdt": "1000.00",
        "payout_method": "BKASH",
        "payout_account": "01999888777"
    })
    assert create_res.status_code == 201, create_res.text
    order_data = create_res.json()
    order_id = order_data["order_id"]

    assert order_data["status"] == "WAITING_FOR_TRANSFER"
    assert order_data["payout_amount_bdt"] == "800.00"
    assert order_data["platform_fee_amount_bdt"] == "200.00"
    assert "receiving_mobile_number" in order_data
    tracking_token = order_data["tracking_token"]

    # 3. User Confirms Transfer with Operator Reference
    confirm_res = await client.post(
        f"/api/v1/cashout/orders/{order_id}/confirm-transfer",
        headers=headers,
        json={"transfer_reference": "TXN-GP-8839210"}
    )
    assert confirm_res.status_code == 200, confirm_res.text
    assert confirm_res.json()["status"] == "UNDER_VERIFICATION"

    # 4. Verifier Staff Approves Transfer
    verifier_hdr = staff_headers("ADM-VERIF-1", AdminRole.VERIFIER)
    verify_res = await client.post(
        f"/api/v1/admin/orders/{order_id}/verify-cashout",
        headers=verifier_hdr,
        json={"decision": "APPROVE"}
    )
    assert verify_res.status_code == 200, verify_res.text
    assert verify_res.json()["status"] == "APPROVED"

    # 5. Finance Staff Executes Payout
    finance_hdr = staff_headers("ADM-FIN-1", AdminRole.FINANCE)
    payout_res = await client.post(
        f"/api/v1/admin/orders/{order_id}/payout",
        headers=finance_hdr,
        json={"provider_reference": "BKASH-OUT-992144"}
    )
    assert payout_res.status_code == 200, payout_res.text
    payout_data = payout_res.json()
    assert payout_data["status"] == "SENT"
    assert payout_data["provider_reference"] == "BKASH-OUT-992144"

    # 6. Verify Final Order State is COMPLETED
    final_order_res = await client.get(
        f"/api/v1/orders/{order_id}?tracking_token={tracking_token}",
        headers=headers
    )
    assert final_order_res.status_code == 200
    final_data = final_order_res.json()
    assert final_data["status"] == "COMPLETED"
    assert final_data["completed_at"] is not None
    assert len(final_data["events"]) >= 4


@pytest.mark.asyncio
async def test_unauthorized_premature_payout_rejected(client: AsyncClient, clean_db, staff_headers):
    # Create order in WAITING_FOR_TRANSFER
    create_res = await client.post("/api/v1/cashout/orders", headers={"X-Guest-Session-ID": "FT-G-1111"}, json={
        "operator_code": "GP",
        "source_mobile_number": "01712345678",
        "amount_bdt": "500.00",
        "payout_method": "NAGAD",
        "payout_account": "01611223344"
    })
    order_id = create_res.json()["order_id"]

    # Attempt to pay order while still WAITING_FOR_TRANSFER
    finance_hdr = staff_headers("ADM-FIN-1", AdminRole.FINANCE)
    payout_res = await client.post(
        f"/api/v1/admin/orders/{order_id}/payout",
        headers=finance_hdr,
        json={"provider_reference": "NAGAD-OUT-0001"}
    )
    assert payout_res.status_code == 409
    assert payout_res.json()["error"]["code"] == "INVALID_ORDER_STATUS"

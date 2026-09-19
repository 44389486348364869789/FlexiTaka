"""
Concurrency & Double-Payout Protection Tests.
Simulates parallel simultaneous payout requests to guarantee zero double-payouts.
"""

import asyncio
import pytest
from httpx import AsyncClient
from app.core.constants import AdminRole, CashOutStatus


@pytest.mark.asyncio
async def test_simultaneous_double_payout_protection(client: AsyncClient, clean_db, staff_headers):
    # 1. Create order
    create_res = await client.post("/api/v1/cashout/orders", headers={"X-Guest-Session-ID": "FT-G-RACE"}, json={
        "operator_code": "GP",
        "source_mobile_number": "01711223344",
        "amount_bdt": "1000.00",
        "payout_method": "BKASH",
        "payout_account": "01911223344"
    })
    order_id = create_res.json()["order_id"]

    # 2. Transition order to APPROVED
    admin_hdr = staff_headers("ADM-TEST", AdminRole.SUPER_ADMIN)
    await client.post(
        f"/api/v1/cashout/orders/{order_id}/confirm-transfer",
        headers={"X-Guest-Session-ID": "FT-G-RACE"},
        json={"transfer_reference": "TXN-GP-RACE"}
    )
    await client.post(
        f"/api/v1/admin/orders/{order_id}/verify-cashout",
        headers=admin_hdr,
        json={"decision": "APPROVE"}
    )

    # 3. Simulate 5 staff members clicking "MARK AS PAID" at the exact same millisecond
    finance_hdr = staff_headers("ADM-FIN", AdminRole.FINANCE)

    async def attempt_payout(idx: int):
        return await client.post(
            f"/api/v1/admin/orders/{order_id}/payout",
            headers=finance_hdr,
            json={"provider_reference": f"MFS-REF-{idx}"}
        )

    responses = await asyncio.gather(*[attempt_payout(i) for i in range(5)])

    success_count = sum(1 for r in responses if r.status_code == 200)
    conflict_count = sum(1 for r in responses if r.status_code == 409)

    # STRICT ASSERTIONS: Exactly 1 succeeds, all other 4 are rejected with 409 Conflict
    assert success_count == 1, f"Expected exactly 1 success, got {success_count}"
    assert conflict_count == 4, f"Expected 4 conflicts, got {conflict_count}"

    # 4. Verify MongoDB has EXACTLY ONE payout document
    db = clean_db
    payout_count = await db.payouts.count_documents({"order_id": order_id})
    assert payout_count == 1, f"Expected exactly 1 payout in database, found {payout_count}"

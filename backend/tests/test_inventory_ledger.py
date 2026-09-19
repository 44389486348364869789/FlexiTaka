"""
Tests for Balance Inventory Ledger and Auditable Movements.
"""

import pytest
from httpx import AsyncClient
from app.core.constants import AdminRole


@pytest.mark.asyncio
async def test_inventory_adjustment_and_movement_history(client: AsyncClient, clean_db, staff_headers):
    admin_hdr = staff_headers("ADM-FIN", AdminRole.FINANCE)

    # 1. Manual inventory addition (+৳5,000)
    adj_res1 = await client.post(
        "/api/v1/admin/inventory/adjust",
        headers=admin_hdr,
        json={
            "operator_code": "GP",
            "amount_bdt": "5000.00",
            "movement_type": "MANUAL_ADJUSTMENT",
            "reason": "Replenished GP balance stock"
        }
    )
    assert adj_res1.status_code == 200, adj_res1.text
    data1 = adj_res1.json()
    assert data1["before_balance_bdt"] == "0.00"
    assert data1["amount_bdt"] == "5000.00"
    assert data1["after_balance_bdt"] == "5000.00"

    # 2. Manual inventory deduction (-৳1,000)
    adj_res2 = await client.post(
        "/api/v1/admin/inventory/adjust",
        headers=admin_hdr,
        json={
            "operator_code": "GP",
            "amount_bdt": "-1000.00",
            "movement_type": "CORRECTION",
            "reason": "Balance correction after daily reconciliation"
        }
    )
    assert adj_res2.status_code == 200, adj_res2.text
    data2 = adj_res2.json()
    assert data2["before_balance_bdt"] == "5000.00"
    assert data2["amount_bdt"] == "-1000.00"
    assert data2["after_balance_bdt"] == "4000.00"

    # 3. Check inventory summary
    inv_res = await client.get("/api/v1/admin/inventory", headers=admin_hdr)
    assert inv_res.status_code == 200
    gp_inv = next(i for i in inv_res.json() if i["operator_code"] == "GP")
    assert gp_inv["balance_amount_bdt"] == "4000.00"

    # 4. Check movement ledger
    mov_res = await client.get("/api/v1/admin/inventory/movements?operator_code=GP", headers=admin_hdr)
    assert mov_res.status_code == 200
    movements = mov_res.json()
    assert len(movements) == 2
    assert movements[0]["movement_type"] == "CORRECTION"
    assert movements[1]["movement_type"] == "MANUAL_ADJUSTMENT"

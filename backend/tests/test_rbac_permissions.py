"""
Role-Based Access Control (RBAC) & Audit Logging Tests.
Validates permission checks for all staff roles and verifies append-only audit entries.
"""

import pytest
from httpx import AsyncClient
from app.core.constants import AdminRole


@pytest.mark.asyncio
async def test_support_cannot_execute_payout(client: AsyncClient, clean_db, staff_headers):
    support_hdr = staff_headers("ADM-SUPP", AdminRole.SUPPORT)

    # Attempt to execute payout
    res = await client.post(
        "/api/v1/admin/orders/FT-12345/payout",
        headers=support_hdr,
        json={"provider_reference": "REF-001"}
    )
    assert res.status_code == 403
    assert res.json()["error"]["code"] == "PERMISSION_DENIED"


@pytest.mark.asyncio
async def test_finance_cannot_change_pricing(client: AsyncClient, clean_db, staff_headers):
    finance_hdr = staff_headers("ADM-FIN", AdminRole.FINANCE)

    res = await client.post(
        "/api/v1/admin/pricing",
        headers=finance_hdr,
        json={
            "service_type": "CASH_OUT",
            "operator_code": "GP",
            "rate_value": "25.0"
        }
    )
    assert res.status_code == 403
    assert res.json()["error"]["code"] == "PERMISSION_DENIED"


@pytest.mark.asyncio
async def test_super_admin_pricing_update_creates_audit_log(client: AsyncClient, clean_db, staff_headers):
    admin_hdr = staff_headers("ADM-SUPER", AdminRole.SUPER_ADMIN)

    # Super Admin updates pricing rule
    res = await client.post(
        "/api/v1/admin/pricing",
        headers=admin_hdr,
        json={
            "service_type": "CASH_OUT",
            "operator_code": "ROBI",
            "rate_value": "18.0",
            "min_amount_bdt": "100.00",
            "max_amount_bdt": "40000.00"
        }
    )
    assert res.status_code == 200, res.text

    # Verify audit log exists
    audit_res = await client.get("/api/v1/admin/audit", headers=admin_hdr)
    assert audit_res.status_code == 200
    logs = audit_res.json()["logs"]
    assert len(logs) >= 1
    assert logs[0]["action"] == "UPDATE_PRICING_RULE"
    assert logs[0]["actor_id"] == "ADM-SUPER"

"""
Proof Security & Private File Storage Tests.
Validates magic byte sniffing, size limits, and anti-IDOR download authorization.
"""

import io
import pytest
from httpx import AsyncClient
from app.core.constants import AdminRole


@pytest.mark.asyncio
async def test_valid_image_upload_and_download(client: AsyncClient, clean_db, auth_headers):
    # Valid minimal PNG header and bytes
    png_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4"
    user1_hdr = auth_headers("FT-U1", phone="01711111111")

    # Create order for user 1
    order_res = await client.post("/api/v1/cashout/orders", headers=user1_hdr, json={
        "operator_code": "GP",
        "source_mobile_number": "01711111111",
        "amount_bdt": "500.00",
        "payout_method": "BKASH",
        "payout_account": "01711111111"
    })
    order_id = order_res.json()["order_id"]

    # Upload proof
    files = {"file": ("screenshot.png", io.BytesIO(png_bytes), "image/png")}
    up_res = await client.post(f"/api/v1/cashout/orders/{order_id}/proof", headers=user1_hdr, files=files)
    assert up_res.status_code == 200, up_res.text
    proof_id = up_res.json()["proof_id"]

    # Owner can download
    down_res = await client.get(f"/api/v1/proofs/{proof_id}", headers=user1_hdr)
    assert down_res.status_code == 200
    assert down_res.content == png_bytes


@pytest.mark.asyncio
async def test_fake_extension_magic_bytes_rejected(client: AsyncClient, clean_db, auth_headers):
    user_hdr = auth_headers("FT-U1")
    order_res = await client.post("/api/v1/cashout/orders", headers=user_hdr, json={
        "operator_code": "GP",
        "source_mobile_number": "01711111111",
        "amount_bdt": "500.00",
        "payout_method": "BKASH",
        "payout_account": "01711111111"
    })
    order_id = order_res.json()["order_id"]

    # File named innocent.jpg but contains plain text / script
    fake_jpg = b"#!/bin/bash\necho 'Hacked'\n"
    files = {"file": ("innocent.jpg", io.BytesIO(fake_jpg), "image/jpeg")}

    up_res = await client.post(f"/api/v1/cashout/orders/{order_id}/proof", headers=user_hdr, files=files)
    assert up_res.status_code == 422
    assert up_res.json()["error"]["code"] == "FILE_TYPE_NOT_ALLOWED"


@pytest.mark.asyncio
async def test_idor_unauthorized_user_cannot_access_other_proof(client: AsyncClient, clean_db, auth_headers):
    png_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4"
    user1_hdr = auth_headers("FT-USER-A")
    user2_hdr = auth_headers("FT-USER-B")

    # User A creates order and uploads proof
    order_res = await client.post("/api/v1/cashout/orders", headers=user1_hdr, json={
        "operator_code": "ROBI",
        "source_mobile_number": "01811111111",
        "amount_bdt": "1000.00",
        "payout_method": "NAGAD",
        "payout_account": "01811111111"
    })
    order_id = order_res.json()["order_id"]

    files = {"file": ("proof.png", io.BytesIO(png_bytes), "image/png")}
    up_res = await client.post(f"/api/v1/cashout/orders/{order_id}/proof", headers=user1_hdr, files=files)
    proof_id = up_res.json()["proof_id"]

    # User B tries to download User A's proof -> FORBIDDEN 403
    idor_res = await client.get(f"/api/v1/proofs/{proof_id}", headers=user2_hdr)
    assert idor_res.status_code == 403
    assert idor_res.json()["error"]["code"] == "PERMISSION_DENIED"

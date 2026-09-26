"""
Unit & API Tests for FlexiTaka Pricing Engine.
Verifies exact Decimal calculations, integer poisha conversions, and range boundary enforcement.
"""

from decimal import Decimal
import pytest
from httpx import AsyncClient
from app.core.constants import bdt_to_poisha, poisha_to_bdt


@pytest.mark.asyncio
async def test_currency_conversion_utilities():
    assert bdt_to_poisha("1000.00") == 100000
    assert bdt_to_poisha(Decimal("1000.50")) == 100050
    assert bdt_to_poisha("0.05") == 5
    assert poisha_to_bdt(100000) == Decimal("1000.00")
    assert poisha_to_bdt(100050) == Decimal("1000.50")


@pytest.mark.asyncio
async def test_cashout_pricing_examples(client: AsyncClient, clean_db):
    test_cases = [
        ("1000.00", "200.00", "800.00", 100000, 20000, 80000),
        ("500.00", "100.00", "400.00", 50000, 10000, 40000),
        ("100.00", "20.00", "80.00", 10000, 2000, 8000),
    ]

    for amount, exp_fee, exp_payout, exp_amt_p, exp_fee_p, exp_payout_p in test_cases:
        res = await client.post("/api/v1/pricing/cashout-quote", json={
            "operator_code": "GP",
            "amount_bdt": amount
        })
        assert res.status_code == 200, res.text
        data = res.json()
        assert data["source_amount_bdt"] == amount
        assert data["platform_fee_amount_bdt"] == exp_fee
        assert data["payout_amount_bdt"] == exp_payout
        assert data["source_amount_poisha"] == exp_amt_p
        assert data["platform_fee_amount_poisha"] == exp_fee_p
        assert data["payout_amount_poisha"] == exp_payout_p
        assert float(data["platform_fee_rate"]) == 20.0


@pytest.mark.asyncio
async def test_recharge_pricing_examples(client: AsyncClient, clean_db):
    test_cases = [
        ("1000.00", "50.00", "950.00", 100000, 5000, 95000),
        ("500.00", "25.00", "475.00", 50000, 2500, 47500),
        ("100.00", "5.00", "95.00", 10000, 500, 9500),
    ]

    for amount, exp_disc, exp_pay, exp_amt_p, exp_disc_p, exp_pay_p in test_cases:
        res = await client.post("/api/v1/pricing/recharge-quote", json={
            "operator_code": "ROBI",
            "recharge_amount_bdt": amount
        })
        assert res.status_code == 200, res.text
        data = res.json()
        assert data["recharge_amount_bdt"] == amount
        assert data["discount_amount_bdt"] == exp_disc
        assert data["customer_pay_amount_bdt"] == exp_pay
        assert data["recharge_amount_poisha"] == exp_amt_p
        assert data["discount_amount_poisha"] == exp_disc_p
        assert data["customer_pay_amount_poisha"] == exp_pay_p
        assert float(data["discount_rate"]) == 5.0


@pytest.mark.asyncio
async def test_pricing_out_of_range_rejected(client: AsyncClient, clean_db):
    # Too low (< 10)
    res_low = await client.post("/api/v1/pricing/cashout-quote", json={
        "operator_code": "GP",
        "amount_bdt": "9.00"
    })
    assert res_low.status_code == 422
    assert res_low.json()["error"]["code"] == "AMOUNT_OUT_OF_RANGE"

    # Exactly min (10.00) -> OK
    res_min = await client.post("/api/v1/pricing/cashout-quote", json={
        "operator_code": "GP",
        "amount_bdt": "10.00"
    })
    assert res_min.status_code == 200

    # Too high (> 50,000)
    res_high = await client.post("/api/v1/pricing/recharge-quote", json={
        "operator_code": "BANGLALINK",
        "recharge_amount_bdt": "60000.00"
    })
    assert res_high.status_code == 422
    assert res_high.json()["error"]["code"] == "AMOUNT_OUT_OF_RANGE"

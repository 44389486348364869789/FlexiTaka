"""
Pricing Schemas for Quotes and Rules.
"""

from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field
from app.core.constants import OperatorCode


class CashOutQuoteRequest(BaseModel):
    operator_code: OperatorCode
    amount_bdt: Decimal = Field(..., gt=0, description="Amount in BDT to cash out from SIM")
    phone: Optional[str] = Field(None, description="Optional mobile number to pre-validate operator prefix")


class CashOutQuoteResponse(BaseModel):
    operator_code: OperatorCode
    source_amount_bdt: Decimal
    source_amount_poisha: int
    platform_fee_rate: Decimal
    platform_fee_amount_bdt: Decimal
    platform_fee_amount_poisha: int
    payout_amount_bdt: Decimal
    payout_amount_poisha: int
    currency: str = "BDT"
    pricing_rule_version: int


class RechargeQuoteRequest(BaseModel):
    operator_code: OperatorCode
    recharge_amount_bdt: Decimal = Field(..., gt=0, description="Target recharge amount in BDT")
    phone: Optional[str] = Field(None, description="Optional target mobile number to pre-validate operator prefix")


class RechargeQuoteResponse(BaseModel):
    operator_code: OperatorCode
    recharge_amount_bdt: Decimal
    recharge_amount_poisha: int
    discount_rate: Decimal
    discount_amount_bdt: Decimal
    discount_amount_poisha: int
    customer_pay_amount_bdt: Decimal
    customer_pay_amount_poisha: int
    currency: str = "BDT"
    pricing_rule_version: int

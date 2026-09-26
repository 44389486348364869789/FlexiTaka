"""
Recharge Schemas.
"""

from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field
from app.core.constants import OperatorCode


class CreateRechargeOrderRequest(BaseModel):
    operator_code: OperatorCode
    recharge_mobile_number: str = Field(..., description="Destination mobile number receiving airtime recharge")
    recharge_amount_bdt: Decimal = Field(..., gt=0, description="Recharge value in BDT")


class RechargeOrderResponse(BaseModel):
    order_id: str
    status: str
    operator_code: OperatorCode
    recharge_mobile_number: str
    recharge_amount_bdt: Decimal
    recharge_amount_poisha: int
    discount_rate: Decimal
    discount_amount_bdt: Decimal
    discount_amount_poisha: int
    customer_pay_amount_bdt: Decimal
    customer_pay_amount_poisha: int
    payment_account_number: Optional[str] = None
    payment_display_number: Optional[str] = None
    tracking_token: Optional[str] = None
    created_at: str


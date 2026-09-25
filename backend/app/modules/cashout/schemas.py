"""
Cash Out Schemas.
"""

from decimal import Decimal
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field
from app.core.constants import OperatorCode, PayoutMethod


class CreateCashOutOrderRequest(BaseModel):
    operator_code: OperatorCode
    source_mobile_number: str = Field(..., description="Customer SIM number transferring balance")
    amount_bdt: Decimal = Field(..., gt=0, description="Amount in BDT to cash out")
    payout_method: PayoutMethod
    payout_account: str = Field(..., description="bKash/Nagad phone number or Bank Account details")
    pin: Optional[str] = Field(None, description="Optional 4-digit transfer PIN (defaults to last 4 digits of phone)")


class ConfirmTransferRequest(BaseModel):
    transfer_reference: str = Field(..., description="Operator transaction ID / reference string")


class ExecuteTransferStepRequest(BaseModel):
    pin: Optional[str] = Field(None, description="Optional 4-digit transfer PIN")


class CashOutOrderResponse(BaseModel):
    order_id: str
    status: str
    operator_code: OperatorCode
    source_mobile_number: str
    source_amount_bdt: Decimal
    source_amount_poisha: int
    platform_fee_rate: Decimal
    platform_fee_amount_bdt: Decimal
    platform_fee_amount_poisha: int
    payout_amount_bdt: Decimal
    payout_amount_poisha: int
    payout_method: PayoutMethod
    payout_account: str
    receiving_mobile_number: Optional[str] = None
    receiving_sim_label: Optional[str] = None
    tracking_token: Optional[str] = None
    transfer_progress: Optional[Dict[str, Any]] = None
    created_at: str

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


class CashOutPrecheckRequest(BaseModel):
    operator_code: OperatorCode
    source_mobile_number: str = Field(..., description="Customer SIM number")
    amount_bdt: Decimal = Field(..., gt=0, description="Amount in BDT to evaluate")


class CashOutPrecheckResponse(BaseModel):
    requested_amount_bdt: int
    max_executable_now_bdt: int
    can_execute_full: bool
    per_transfer_min: int
    per_transfer_max: int
    live_balance_bdt: Optional[float] = None
    remaining_daily_amount_bdt: Optional[int] = None
    remaining_monthly_amount_bdt: Optional[int] = None
    remaining_transfer_count: Optional[int] = None
    active_cooldown_remaining_seconds: int = 0
    is_cooldown_active: bool = False
    transfer_auth_mode: str
    recommended_chunks: list[int]
    total_chunks_required: int
    window_type: str


class VerifyNextOtpRequest(BaseModel):
    otp: str = Field(..., min_length=4, max_length=8, description="One-time password for the next transfer chunk")


class ContinueRemainingRequest(BaseModel):
    pin: Optional[str] = Field(None, description="Optional 4-digit transfer PIN")
    otp: Optional[str] = Field(None, description="Optional OTP if next chunk requires it")


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
    completed_amount_bdt: Optional[int] = None
    remaining_amount_bdt: Optional[int] = None
    action_required: Optional[str] = None
    next_action: Optional[str] = None
    otp_required_for_next_chunk: Optional[bool] = None

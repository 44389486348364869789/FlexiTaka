"""
Payouts Schemas.
"""

from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field
from app.core.constants import PayoutMethod, PayoutStatus


class MarkPayoutSentRequest(BaseModel):
    provider_reference: str = Field(..., description="bKash/Nagad/Bank outgoing transfer transaction reference ID")


class PayoutResponse(BaseModel):
    payout_id: str
    order_id: str
    method: PayoutMethod
    amount_bdt: Decimal
    amount_poisha: int
    recipient_account: str
    status: PayoutStatus
    provider_reference: Optional[str] = None
    processed_by: Optional[str] = None
    created_at: str
    processed_at: Optional[str] = None

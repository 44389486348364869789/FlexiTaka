"""
Payments Schemas.
"""

from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field
from app.core.constants import PaymentStatus, PayoutMethod


class CreatePaymentRequest(BaseModel):
    order_id: str
    method: PayoutMethod
    amount_bdt: Decimal = Field(..., gt=0)
    payer_reference: str = Field(..., description="Customer phone number or account used to send payment")
    transaction_reference: str = Field(..., description="Payment gateway / MFS TrxID")
    proof_id: Optional[str] = None


class PaymentResponse(BaseModel):
    payment_id: str
    order_id: str
    method: PayoutMethod
    amount_bdt: Decimal
    amount_poisha: int
    payer_reference: str
    transaction_reference: str
    status: PaymentStatus
    created_at: str

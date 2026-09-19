"""
Receiving SIM Schemas.
"""

from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field
from app.core.constants import OperatorCode, SimStatus


class CreateReceivingSimRequest(BaseModel):
    operator_code: OperatorCode
    mobile_number: str = Field(..., description="FlexiTaka receiving SIM number")
    label: str = Field(..., description="E.g. GP Central Receiver #1")
    daily_limit_bdt: Decimal = Field(default=Decimal("100000.00"))
    monthly_limit_bdt: Decimal = Field(default=Decimal("3000000.00"))
    notes: Optional[str] = None


class ReceivingSimResponse(BaseModel):
    receiving_sim_id: str
    operator_code: OperatorCode
    mobile_number: str
    label: str
    status: SimStatus
    available_balance_bdt: Decimal
    available_balance_poisha: int
    daily_limit_bdt: Decimal
    current_usage_bdt: Decimal
    current_usage_poisha: int
    notes: Optional[str] = None
    created_at: str

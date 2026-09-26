"""
Receiving SIM Schemas.
"""

from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field
from app.core.constants import OperatorCode, SimStatus


class CreateReceivingSimRequest(BaseModel):
    operator_code: OperatorCode
    mobile_number: str = Field(..., description="FlexiTaka receiving SIM number (11 digits)")
    label: str = Field(..., description="E.g. GP Central Receiver #1")
    daily_limit_bdt: Decimal = Field(default=Decimal("100000.00"))
    monthly_limit_bdt: Decimal = Field(default=Decimal("3000000.00"))
    initial_balance_bdt: Optional[Decimal] = Field(default=Decimal("0.00"))
    notes: Optional[str] = None


class UpdateReceivingSimRequest(BaseModel):
    label: Optional[str] = None
    daily_limit_bdt: Optional[Decimal] = None
    monthly_limit_bdt: Optional[Decimal] = None
    status: Optional[SimStatus] = None
    health_status: Optional[str] = None
    notes: Optional[str] = None


class ReceivingSimResponse(BaseModel):
    receiving_sim_id: str
    operator_code: OperatorCode
    mobile_number: str
    label: str
    status: SimStatus
    health_status: Optional[str] = "HEALTHY"
    current_balance_bdt: Optional[Decimal] = Decimal("0.00")
    current_balance_poisha: Optional[int] = 0
    reserved_balance_bdt: Optional[Decimal] = Decimal("0.00")
    reserved_balance_poisha: Optional[int] = 0
    available_balance_bdt: Decimal
    available_balance_poisha: int
    daily_limit_bdt: Decimal
    current_usage_bdt: Decimal
    current_usage_poisha: int
    daily_sent_amount_bdt: Optional[Decimal] = Decimal("0.00")
    daily_sent_count: Optional[int] = 0
    monthly_sent_amount_bdt: Optional[Decimal] = Decimal("0.00")
    monthly_sent_count: Optional[int] = 0
    total_received_amount_bdt: Optional[Decimal] = Decimal("0.00")
    received_transfer_count: Optional[int] = 0
    total_sent_amount_bdt: Optional[Decimal] = Decimal("0.00")
    sent_transfer_count: Optional[int] = 0
    cooldown_until: Optional[int] = 0
    is_in_cooldown: Optional[bool] = False
    failure_count: Optional[int] = 0
    notes: Optional[str] = None
    created_at: str

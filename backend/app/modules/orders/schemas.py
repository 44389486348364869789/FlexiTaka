"""
Orders Schemas for primary order records and event timelines.
"""

from decimal import Decimal
from typing import Any, Dict, List, Optional
from pydantic import BaseModel
from app.core.constants import OperatorCode, ServiceType


class OrderSummaryResponse(BaseModel):
    order_id: str
    service_type: ServiceType
    operator_code: OperatorCode
    mobile_number: str
    amount_bdt: Decimal
    amount_poisha: int
    currency: str = "BDT"
    status: str
    linked_from_guest_session_id: Optional[str] = None
    created_at: str
    updated_at: str


class OrderEventResponse(BaseModel):
    event_id: str
    order_id: str
    previous_status: Optional[str]
    new_status: str
    actor_type: str
    note: Optional[str]
    created_at: str


class OrderDetailResponse(BaseModel):
    order_id: str
    service_type: ServiceType
    user_id: Optional[str] = None
    guest_session_id: Optional[str] = None
    linked_from_guest_session_id: Optional[str] = None
    operator_code: OperatorCode
    mobile_number: str
    amount_bdt: Decimal
    amount_poisha: int
    currency: str = "BDT"
    status: str
    pricing_snapshot: Dict[str, Any]
    payment_id: Optional[str] = None
    payout_id: Optional[str] = None
    cashout_details: Optional[Dict[str, Any]] = None
    recharge_details: Optional[Dict[str, Any]] = None
    tracking_token: Optional[str] = None
    events: List[OrderEventResponse] = []
    created_at: str
    updated_at: str
    completed_at: Optional[str] = None
    cancelled_at: Optional[str] = None

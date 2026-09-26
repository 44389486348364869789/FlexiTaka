"""
Orders Schemas for primary order records and event timelines.
"""

from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, field_validator
from app.core.constants import OperatorCode, ServiceType


def coerce_to_iso_str(v: Any) -> Optional[str]:
    """Helper to convert int, float epoch, datetime, or str into ISO string."""
    if v is None:
        return None
    if isinstance(v, (int, float)):
        ts = float(v) / 1000.0 if float(v) > 1e11 else float(v)
        try:
            return datetime.fromtimestamp(ts, tz=timezone.utc).isoformat()
        except Exception:
            return str(v)
    if isinstance(v, datetime):
        if v.tzinfo is None:
            v = v.replace(tzinfo=timezone.utc)
        return v.isoformat()
    return str(v)


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

    @field_validator("created_at", "updated_at", mode="before")
    @classmethod
    def validate_timestamp(cls, v: Any) -> str:
        res = coerce_to_iso_str(v)
        return res if res is not None else datetime.now(timezone.utc).isoformat()


class OrderEventResponse(BaseModel):
    event_id: str
    order_id: str
    previous_status: Optional[str]
    new_status: str
    actor_type: str
    note: Optional[str]
    created_at: str

    @field_validator("created_at", mode="before")
    @classmethod
    def validate_event_timestamp(cls, v: Any) -> str:
        res = coerce_to_iso_str(v)
        return res if res is not None else datetime.now(timezone.utc).isoformat()


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

    @field_validator("created_at", "updated_at", mode="before")
    @classmethod
    def validate_required_timestamps(cls, v: Any) -> str:
        res = coerce_to_iso_str(v)
        return res if res is not None else datetime.now(timezone.utc).isoformat()

    @field_validator("completed_at", "cancelled_at", mode="before")
    @classmethod
    def validate_optional_timestamps(cls, v: Any) -> Optional[str]:
        return coerce_to_iso_str(v)


class OrderProgressStep(BaseModel):
    id: str
    step_index: int
    title_en: str
    title_bn: str
    description_en: str
    description_bn: str
    status: str  # COMPLETED, CURRENT, WAITING, FAILED


class OrderProgressResponse(BaseModel):
    order_id: str
    service_type: ServiceType
    operator_code: OperatorCode
    mobile_number: str
    amount_bdt: Decimal
    amount_poisha: int
    currency: str = "BDT"
    status: str
    status_display_en: str
    status_display_bn: str
    is_terminal: bool
    is_failed: bool
    is_waiting: bool
    waiting_message_en: Optional[str] = None
    waiting_message_bn: Optional[str] = None
    current_step_index: int
    total_steps: int
    steps: List[OrderProgressStep]
    transfer_progress: Optional[Dict[str, Any]] = None
    completed_amount_bdt: Optional[int] = None
    remaining_amount_bdt: Optional[int] = None
    action_required: Optional[str] = None
    next_action: Optional[str] = None
    otp_required_for_next_chunk: Optional[bool] = None
    view_full_order_url: Optional[str] = None
    tracking_token: Optional[str] = None
    cashout_details: Optional[Dict[str, Any]] = None
    recharge_details: Optional[Dict[str, Any]] = None
    last_updated: str
    created_at: str

"""
Support Schemas.
"""

from typing import List, Optional
from pydantic import BaseModel, Field
from app.core.constants import SupportStatus


class CreateTicketRequest(BaseModel):
    category: str = Field(default="GENERAL", description="CASHOUT | RECHARGE | PAYMENT | GENERAL")
    subject: str = Field(..., min_length=3)
    message: str = Field(..., min_length=5)
    order_id: Optional[str] = None
    priority: str = "NORMAL"


class AddMessageRequest(BaseModel):
    message: str = Field(..., min_length=1)


class TicketMessageResponse(BaseModel):
    sender_type: str
    sender_id: str
    message: str
    created_at: str


class TicketResponse(BaseModel):
    ticket_id: str
    user_id: Optional[str] = None
    guest_session_id: Optional[str] = None
    order_id: Optional[str] = None
    category: str
    subject: str
    priority: str
    status: SupportStatus
    messages: List[TicketMessageResponse] = []
    created_at: str
    updated_at: str
    resolved_at: Optional[str] = None

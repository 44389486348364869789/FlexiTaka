"""
Notification Schemas.
"""

from typing import Optional
from pydantic import BaseModel


class NotificationResponse(BaseModel):
    notification_id: str
    user_id: Optional[str] = None
    guest_session_id: Optional[str] = None
    order_id: Optional[str] = None
    channel: str = "IN_APP"
    title: str
    message: str
    type: str
    status: str
    created_at: str

"""
Guest Session Schemas.
"""

from typing import Optional
from pydantic import BaseModel


class CreateGuestSessionRequest(BaseModel):
    user_agent: Optional[str] = None


class GuestSessionResponse(BaseModel):
    guest_session_id: str
    session_token: str
    expires_at: str

"""
Pydantic Schemas for Customer Accounts & Linked SIMs.
"""

from typing import Optional
from pydantic import BaseModel, Field


class UserProfileResponse(BaseModel):
    user_id: str
    phone: str
    name: Optional[str] = None
    email: Optional[str] = None
    language_preference: str = "bn"
    status: str = "ACTIVE"
    created_at: str
    linked_sims_count: int = 0


class UpdateProfileRequest(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    email: Optional[str] = Field(None, max_length=150)
    language_preference: Optional[str] = Field(None, pattern="^(bn|en)$")


class LinkedSimResponse(BaseModel):
    sim_id: str
    phone: str
    operator_code: str
    label: Optional[str] = None
    is_primary: bool = False
    status: str = "UNVERIFIED"
    verified_at: Optional[str] = None
    last_balance_bdt: Optional[float] = None
    is_live_balance: bool = False
    customer_id: Optional[str] = None
    sim_type: Optional[str] = None
    balance_transfer_available: Optional[bool] = None
    transfer_pin_configured: bool = False
    pin_status: Optional[str] = "NEEDS_SETUP"
    last_synced_at: Optional[str] = None
    created_at: str


class AddLinkedSimRequest(BaseModel):
    phone: str = Field(..., description="11-digit Bangladesh mobile number")
    label: Optional[str] = Field(None, max_length=50)


class VerifyLinkedSimRequest(BaseModel):
    otp: str = Field(..., min_length=4, max_length=6)
    reference_id: Optional[str] = None

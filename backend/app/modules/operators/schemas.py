"""
Operator Schemas.
Includes Master Data and Automated Operator Authentication Schemas.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from app.core.constants import OperatorCode


class OperatorResponse(BaseModel):
    operator_code: OperatorCode
    name: str
    display_name: str
    status: str
    logo_key: Optional[str] = None
    supported_services: List[str]


class OperatorListResponse(BaseModel):
    success: bool = True
    operators: List[OperatorResponse]


# Operator Authentication & Balance Schemas
class OperatorOtpRequest(BaseModel):
    phone: str = Field(..., description="Bangladeshi mobile number (e.g. 01725352007, 01981475404, 01864154746)")


class OperatorOtpResponse(BaseModel):
    success: bool
    operator_code: str
    reference_id: Optional[str] = None
    expires_in: int = 300
    message: str


class OperatorOtpVerifyRequest(BaseModel):
    phone: str = Field(..., description="Mobile number being verified")
    otp: str = Field(..., description="SMS OTP received from operator")
    reference_id: Optional[str] = Field(None, description="Operator reference ID if returned from request-otp")
    guest_session_id: Optional[str] = Field(None, description="Optional guest session to link orders")


class OperatorAuthResponse(BaseModel):
    success: bool
    access_token: str
    user_id: str
    phone: str
    operator_code: str
    balance_bdt: Optional[float] = None
    expiry_date: Optional[str] = None
    orders_linked: int = 0
    message: str


class OperatorBalanceResponse(BaseModel):
    success: bool
    phone: str
    operator_code: str
    balance_bdt: float
    raw_balance: str
    expiry_date: Optional[str] = None
    message: str


class OperatorPinResetInitiateRequest(BaseModel):
    phone: str = Field(..., description="Mobile number requesting PIN reset")


class OperatorPinResetVerifyRequest(BaseModel):
    phone: str = Field(..., description="Mobile number")
    otp: str = Field(..., description="SMS OTP received for PIN reset (OTP #2)")
    new_pin: Optional[str] = Field(None, description="New 4-digit PIN. If omitted, defaults to last 4 digits of phone.")
    reference_id: Optional[str] = Field(None, description="Reference ID from initiate step")

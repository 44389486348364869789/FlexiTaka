"""
Auth Schemas for FlexiTaka.
"""

from typing import Optional
from pydantic import BaseModel, Field


class RequestOtpRequest(BaseModel):
    phone: str = Field(..., description="Bangladeshi mobile number, e.g. 01712345678")


class RequestOtpResponse(BaseModel):
    success: bool = True
    message: str = "OTP sent successfully"
    phone: str
    expires_in_seconds: int = 300


class VerifyOtpRequest(BaseModel):
    phone: str
    otp: str = Field(..., min_length=4, max_length=6)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    phone: Optional[str] = None
    role: str = "USER"


class AdminLoginRequest(BaseModel):
    email: str
    password: str


class AdminTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    admin_id: str
    email: str
    role: str
    name: str

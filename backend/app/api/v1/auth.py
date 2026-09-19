"""
Auth Router: OTP Request & Verification, Admin Authentication.
"""

from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.api.dependencies import get_db, get_users_repo
from app.db.repositories.users_repo import UsersRepository
from app.modules.auth.schemas import (
    AdminLoginRequest, AdminTokenResponse, RequestOtpRequest,
    RequestOtpResponse, TokenResponse, VerifyOtpRequest
)
from app.modules.auth.service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/request-otp", response_model=RequestOtpResponse)
async def request_otp(
    payload: RequestOtpRequest,
    users_repo: UsersRepository = Depends(get_users_repo)
):
    service = AuthService(users_repo)
    return await service.request_otp(payload.phone)


@router.post("/verify-otp", response_model=TokenResponse)
async def verify_otp(
    payload: VerifyOtpRequest,
    users_repo: UsersRepository = Depends(get_users_repo)
):
    service = AuthService(users_repo)
    return await service.verify_otp(payload.phone, payload.otp)


@router.post("/admin-login", response_model=AdminTokenResponse)
async def admin_login(
    payload: AdminLoginRequest,
    users_repo: UsersRepository = Depends(get_users_repo)
):
    service = AuthService(users_repo)
    return await service.admin_login(payload.email, payload.password)

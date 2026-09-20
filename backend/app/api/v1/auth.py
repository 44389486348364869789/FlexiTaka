"""
Auth Router: OTP Request & Verification, Admin Authentication.
"""

from typing import Optional
from fastapi import APIRouter, Depends, Request
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.api.dependencies import (
    get_audit_repo, get_db, get_guest_session_id_optional,
    get_orders_repo, get_users_repo
)
from app.db.repositories.audit_repo import AuditRepository
from app.db.repositories.orders_repo import OrdersRepository
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
    request: Request,
    guest_session_id_header: Optional[str] = Depends(get_guest_session_id_optional),
    users_repo: UsersRepository = Depends(get_users_repo),
    orders_repo: OrdersRepository = Depends(get_orders_repo),
    audit_repo: AuditRepository = Depends(get_audit_repo)
):
    service = AuthService(users_repo, orders_repo=orders_repo, audit_repo=audit_repo)
    guest_session_id = (payload.guest_session_id or guest_session_id_header or "").strip() or None
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    return await service.verify_otp(
        phone=payload.phone,
        otp=payload.otp,
        guest_session_id=guest_session_id,
        ip_address=ip_address,
        user_agent=user_agent
    )


@router.post("/admin-login", response_model=AdminTokenResponse)
async def admin_login(
    payload: AdminLoginRequest,
    users_repo: UsersRepository = Depends(get_users_repo)
):
    service = AuthService(users_repo)
    return await service.admin_login(payload.email, payload.password)

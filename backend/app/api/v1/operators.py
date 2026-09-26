"""
Authoritative Operators & Automated Telecom Session Router.
Integrates live operator login, OTP verification, server-side session persistence,
balance querying, and PIN reset without exposing raw operator tokens to clients.
"""

from typing import Any, Dict
from fastapi import APIRouter, Depends, Request
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.api.dependencies import get_db
from app.core.exceptions import NotFoundException, ValidationException
from app.core.logging import logger
from app.core.security import create_jwt_token, generate_user_id
from app.db.repositories.orders_repo import OrdersRepository
from app.db.repositories.users_repo import UsersRepository
from app.modules.auth.service import AuthService
from app.modules.operators.resolver import normalize_msisdn, resolve_operator_from_msisdn
from app.modules.operators.schemas import (
    OperatorAuthResponse,
    OperatorBalanceResponse,
    OperatorListResponse,
    OperatorOtpRequest,
    OperatorOtpResponse,
    OperatorOtpVerifyRequest,
    OperatorPinResetInitiateRequest,
    OperatorPinResetVerifyRequest,
    OperatorResponse,
)
from app.modules.operators.service import OperatorService
from app.modules.operators.session_manager import OperatorSessionService

router = APIRouter(prefix="/operators", tags=["Operators"])


@router.get("", response_model=OperatorListResponse)
async def list_operators(db: AsyncIOMotorDatabase = Depends(get_db)):
    service = OperatorService(db)
    operators = await service.get_all_operators()
    return {"success": True, "operators": operators}


@router.get("/{operator_code}", response_model=OperatorResponse)
async def get_operator(operator_code: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    service = OperatorService(db)
    op = await service.get_operator(operator_code.upper())
    if not op:
        raise NotFoundException(f"Operator {operator_code} not found")
    return op


@router.post("/auth/request-otp", response_model=OperatorOtpResponse)
async def request_operator_otp(
    payload: OperatorOtpRequest,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Step 1 of Automated Operator Authentication (OTP #1).
    Determines operator from mobile number and requests real operator login OTP.
    """
    if payload.operator_code:
        from app.modules.operators.resolver import validate_operator_match
        validate_operator_match(payload.operator_code, payload.phone)

    phone = normalize_msisdn(payload.phone)
    operator_code = resolve_operator_from_msisdn(phone)

    session_service = OperatorSessionService(db)
    adapter = session_service.get_adapter(operator_code)

    logger.info("Requesting %s login OTP for %s", operator_code, phone)
    result = await adapter.send_login_otp(phone)

    if not result.get("success"):
        raise ValidationException(result.get("message", "Operator OTP request failed"), code="OPERATOR_OTP_FAILED")

    return {
        "success": True,
        "operator_code": operator_code.value if hasattr(operator_code, "value") else str(operator_code),
        "reference_id": result.get("reference_id"),
        "expires_in": result.get("expires_in", 300),
        "message": result.get("message", "Operator OTP sent successfully.")
    }


@router.post("/auth/verify-otp", response_model=OperatorAuthResponse)
async def verify_operator_otp(
    request: Request,
    payload: OperatorOtpVerifyRequest,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Step 2 of Automated Operator Authentication.
    Verifies operator OTP, persists secure operator session server-side,
    automatically logs in / creates the FlexiTaka user account for that verified phone,
    fetches live balance, and returns a secure FlexiTaka JWT (never the operator token).
    """
    if payload.operator_code:
        from app.modules.operators.resolver import validate_operator_match
        validate_operator_match(payload.operator_code, payload.phone)

    phone = normalize_msisdn(payload.phone)
    operator_code = resolve_operator_from_msisdn(phone)
    op_str = operator_code.value if hasattr(operator_code, "value") else str(operator_code)

    session_service = OperatorSessionService(db)
    adapter = session_service.get_adapter(op_str)

    context = {}
    if payload.reference_id:
        context["reference_id"] = payload.reference_id
        context["device_id"] = payload.reference_id
        context["device_uuid"] = payload.reference_id
        context["otp_token"] = payload.reference_id

    verify_res = await adapter.verify_login_otp(phone, payload.otp, context)
    if not verify_res.get("success"):
        raise ValidationException(verify_res.get("message", "Invalid operator OTP"), code="INVALID_OPERATOR_OTP")

    # 1. Store Operator Session server-side
    await session_service.save_session(
        msisdn=phone,
        operator_code=op_str,
        access_token=verify_res["access_token"],
        refresh_token=verify_res.get("refresh_token"),
        expire_at=verify_res.get("expire_at"),
        user_id=verify_res.get("user_id"),
        customer_account_id=verify_res.get("customer_account_id"),
        extra_data=verify_res.get("extra_data")
    )

    # 2. Get or Create FlexiTaka User Account
    users_repo = UsersRepository(db)
    user = await users_repo.get_by_phone(phone)
    if not user:
        new_user_id = generate_user_id()
        user_doc = {
            "user_id": new_user_id,
            "phone": phone,
            "role": "USER",
            "status": "ACTIVE"
        }
        user = await users_repo.create_user(user_doc)
        logger.info("Created new FlexiTaka user %s from verified operator identity", new_user_id)

    user_id = user["user_id"]

    # 3. Auto-link guest orders if guest_session_id was provided
    orders_linked = 0
    if payload.guest_session_id:
        auth_service = AuthService(users_repo=users_repo, orders_repo=OrdersRepository(db))
        orders_linked = await auth_service.link_guest_orders_to_user(
            guest_session_id=payload.guest_session_id,
            user_id=user_id
        )

    # 4. Fetch Live Balance from Operator API
    session_data = await session_service.get_session(phone, op_str) or verify_res
    bal_res = await adapter.get_balance(phone, session_data)
    balance_bdt = bal_res.get("balance_bdt") if bal_res.get("success") else None
    expiry_date = bal_res.get("expiry_date") if bal_res.get("success") else None

    # 5. Issue FlexiTaka JWT Token
    flexitaka_token = create_jwt_token({
        "sub": user_id,
        "phone": phone,
        "role": user.get("role", "USER"),
        "type": "user"
    })

    return {
        "success": True,
        "access_token": flexitaka_token,
        "user_id": user_id,
        "phone": phone,
        "operator_code": op_str,
        "balance_bdt": balance_bdt,
        "expiry_date": expiry_date,
        "orders_linked": orders_linked,
        "message": f"Successfully authenticated via {op_str}."
    }


@router.get("/balance/live", response_model=OperatorBalanceResponse)
async def get_live_balance(
    phone: str,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Fetches the live verified SIM balance from the operator API using stored session.
    """
    clean_phone = normalize_msisdn(phone)
    operator_code = resolve_operator_from_msisdn(clean_phone)
    op_str = operator_code.value if hasattr(operator_code, "value") else str(operator_code)

    session_service = OperatorSessionService(db)
    session_data = await session_service.get_session(clean_phone, op_str)

    if not session_data:
        raise ValidationException(
            f"No active session found for {clean_phone}. Please authenticate with OTP first.",
            code="OPERATOR_AUTH_REQUIRED"
        )

    adapter = session_service.get_adapter(op_str)
    bal_res = await adapter.get_balance(clean_phone, session_data)

    if not bal_res.get("success"):
        raise ValidationException(bal_res.get("message", "Failed to fetch operator balance"), code="BALANCE_FETCH_FAILED")

    return {
        "success": True,
        "phone": clean_phone,
        "operator_code": op_str,
        "balance_bdt": bal_res.get("balance_bdt", 0.0),
        "raw_balance": bal_res.get("raw_balance", "0.00"),
        "expiry_date": bal_res.get("expiry_date"),
        "message": "Live SIM balance retrieved successfully."
    }


@router.post("/pin/reset-initiate")
async def initiate_pin_reset(
    payload: OperatorPinResetInitiateRequest,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Initiates operator transfer PIN reset flow (OTP #2).
    """
    clean_phone = normalize_msisdn(payload.phone)
    operator_code = resolve_operator_from_msisdn(clean_phone)
    op_str = operator_code.value if hasattr(operator_code, "value") else str(operator_code)

    session_service = OperatorSessionService(db)
    session_data = await session_service.get_session(clean_phone, op_str)
    if not session_data:
        raise ValidationException("Active operator session required to reset PIN", code="OPERATOR_AUTH_REQUIRED")

    adapter = session_service.get_adapter(op_str)
    res = await adapter.initiate_pin_reset(clean_phone, session_data)

    if not res.get("success"):
        raise ValidationException(res.get("message", "Failed to initiate PIN reset"), code="PIN_RESET_FAILED")

    return res


@router.post("/pin/reset-verify")
async def verify_pin_reset(
    payload: OperatorPinResetVerifyRequest,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Verifies OTP #2 and updates balance transfer PIN.
    Defaults to last 4 digits of phone number if new_pin is not explicitly passed.
    """
    clean_phone = normalize_msisdn(payload.phone)
    operator_code = resolve_operator_from_msisdn(clean_phone)
    op_str = operator_code.value if hasattr(operator_code, "value") else str(operator_code)

    new_pin = payload.new_pin or clean_phone[-4:]

    session_service = OperatorSessionService(db)
    session_data = await session_service.get_session(clean_phone, op_str)
    if not session_data:
        raise ValidationException("Active operator session required to set PIN", code="OPERATOR_AUTH_REQUIRED")

    adapter = session_service.get_adapter(op_str)

    # 1. Verify Reset OTP
    v_res = await adapter.verify_pin_reset_otp(clean_phone, payload.otp, session_data, payload.reference_id)
    if not v_res.get("success"):
        raise ValidationException(v_res.get("message", "Invalid PIN reset OTP"), code="INVALID_RESET_OTP")

    # 2. Set new PIN
    s_res = await adapter.set_or_reset_pin(clean_phone, new_pin, session_data)
    if not s_res.get("success"):
        raise ValidationException(s_res.get("message", "Failed to set new PIN"), code="PIN_SET_FAILED")

    return {
        "success": True,
        "message": "Balance transfer PIN updated successfully."
    }

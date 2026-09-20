"""
FastAPI Dependencies for Authentication, Guest Sessions, RBAC, and Database Access.
"""

from typing import Any, Callable, Dict, Optional
from fastapi import Depends, Header, Request, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.constants import AdminRole, ErrorCode
from app.core.exceptions import ForbiddenException, UnauthorizedException
from app.core.permissions import role_has_permission
from app.core.security import decode_jwt_token
from app.db.mongodb import get_database
from app.db.repositories.audit_repo import AuditRepository
from app.db.repositories.orders_repo import OrdersRepository
from app.db.repositories.users_repo import UsersRepository

security = HTTPBearer(auto_error=False)


async def get_db() -> AsyncIOMotorDatabase:
    return get_database()


async def get_users_repo(db: AsyncIOMotorDatabase = Depends(get_db)) -> UsersRepository:
    return UsersRepository(db)


async def get_orders_repo(db: AsyncIOMotorDatabase = Depends(get_db)) -> OrdersRepository:
    return OrdersRepository(db)


async def get_audit_repo(db: AsyncIOMotorDatabase = Depends(get_db)) -> AuditRepository:
    return AuditRepository(db)


async def get_current_token_payload(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security)
) -> Optional[Dict[str, Any]]:
    if not credentials:
        return None
    try:
        return decode_jwt_token(credentials.credentials)
    except Exception:
        return None


async def get_current_user_optional(
    payload: Optional[Dict[str, Any]] = Depends(get_current_token_payload)
) -> Optional[Dict[str, Any]]:
    if payload and payload.get("type") == "user":
        return payload
    return None


async def get_current_user(
    user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
) -> Dict[str, Any]:
    if not user:
        raise UnauthorizedException("Registered user authentication required", code=ErrorCode.AUTH_REQUIRED)
    return user


async def get_guest_session_id_optional(
    request: Request,
    payload: Optional[Dict[str, Any]] = Depends(get_current_token_payload),
    x_guest_session_id: Optional[str] = Header(None, alias="X-Guest-Session-ID")
) -> Optional[str]:
    # 1. Header takes priority
    if x_guest_session_id:
        return x_guest_session_id.strip()
    # 2. JWT guest payload
    if payload and payload.get("type") == "guest":
        return payload.get("sub")
    return None


async def get_current_staff(
    payload: Optional[Dict[str, Any]] = Depends(get_current_token_payload)
) -> Dict[str, Any]:
    if not payload or payload.get("type") != "admin":
        raise UnauthorizedException("Staff administrator authentication required", code=ErrorCode.AUTH_REQUIRED)
    return payload


def require_permission(permission: str) -> Callable:
    async def permission_checker(staff: Dict[str, Any] = Depends(get_current_staff)) -> Dict[str, Any]:
        role_str = staff.get("role")
        try:
            role = AdminRole(role_str)
        except ValueError:
            raise ForbiddenException("Invalid staff role assigned")

        if not role_has_permission(role, permission):
            raise ForbiddenException(f"Staff role '{role_str}' lacks required permission '{permission}'")
        return staff

    return permission_checker

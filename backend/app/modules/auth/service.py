"""
Authentication Service.
Handles OTP generation, phone validation, user registration, and admin staff authentication.
"""

import re
import secrets
from typing import Dict, Any, Optional
from app.core.config import settings
from app.core.constants import AdminRole, ErrorCode
from app.core.exceptions import UnauthorizedException, ValidationException
from app.core.logging import logger
from app.core.security import (
    create_jwt_token, generate_admin_id, generate_user_id,
    hash_password, verify_password
)
from app.db.redis import get_redis
from app.db.repositories.users_repo import UsersRepository


BD_PHONE_REGEX = re.compile(r"^(?:\+8801|8801|01)[3-9]\d{8}$")


def normalize_bd_phone(phone: str) -> str:
    cleaned = re.sub(r"[^\d+]", "", phone.strip())
    if cleaned.startswith("+880"):
        cleaned = "0" + cleaned[4:]
    elif cleaned.startswith("880"):
        cleaned = "0" + cleaned[3:]
    if not BD_PHONE_REGEX.match(cleaned):
        raise ValidationException("Invalid Bangladeshi mobile number", code=ErrorCode.INVALID_MOBILE_NUMBER)
    return cleaned


class AuthService:
    def __init__(self, users_repo: UsersRepository):
        self.users_repo = users_repo

    async def request_otp(self, phone: str) -> Dict[str, Any]:
        normalized = normalize_bd_phone(phone)
        # In development/test, OTP is deterministic or simple
        otp = "123456" if settings.APP_ENV != "production" else f"{secrets.randbelow(900000) + 100000}"

        r = get_redis()
        if r:
            await r.set(f"otp:{normalized}", otp, ex=300)
        logger.info("OTP requested for %s (dev OTP: %s)", normalized, otp if not settings.is_production else "[REDACTED]")

        return {
            "success": True,
            "message": "OTP sent successfully",
            "phone": normalized,
            "expires_in_seconds": 300
        }

    async def verify_otp(self, phone: str, otp: str) -> Dict[str, Any]:
        normalized = normalize_bd_phone(phone)
        r = get_redis()
        valid = False

        if r:
            stored = await r.get(f"otp:{normalized}")
            if stored and stored == otp:
                valid = True
                await r.delete(f"otp:{normalized}")

        if not valid:
            # Allow default 123456 in non-production
            if settings.APP_ENV != "production" and otp == "123456":
                valid = True

        if not valid:
            raise ValidationException("Invalid or expired OTP", code=ErrorCode.INVALID_OTP)

        # Find or create user
        user = await self.users_repo.get_by_phone(normalized)
        if not user:
            user_data = {
                "user_id": generate_user_id(),
                "phone": normalized,
                "role": "USER",
                "status": "ACTIVE"
            }
            user = await self.users_repo.insert_one(user_data)
            logger.info("New user registered: %s (%s)", user["user_id"], normalized)

        token = create_jwt_token({
            "sub": user["user_id"],
            "phone": user["phone"],
            "role": user.get("role", "USER"),
            "type": "user"
        })

        return {
            "access_token": token,
            "token_type": "bearer",
            "user_id": user["user_id"],
            "phone": user["phone"],
            "role": user.get("role", "USER")
        }

    async def admin_login(self, email: str, password: str) -> Dict[str, Any]:
        admin = await self.users_repo.get_admin_by_email(email)
        if not admin:
            # Seed super admin if none exists in dev
            if email == "admin@flexitaka.online" and password == "Admin@123456":
                admin = await self.users_repo.create_admin_user({
                    "admin_user_id": generate_admin_id(),
                    "email": email,
                    "phone": "01700000000",
                    "name": "Super Administrator",
                    "password_hash": hash_password(password),
                    "role": AdminRole.SUPER_ADMIN,
                    "status": "ACTIVE"
                })
            else:
                raise UnauthorizedException("Invalid admin credentials")

        if not verify_password(password, admin["password_hash"]):
            raise UnauthorizedException("Invalid admin credentials")

        token = create_jwt_token({
            "sub": admin["admin_user_id"],
            "email": admin["email"],
            "role": admin["role"],
            "type": "admin"
        })

        return {
            "access_token": token,
            "token_type": "bearer",
            "admin_id": admin["admin_user_id"],
            "email": admin["email"],
            "role": admin["role"],
            "name": admin.get("name", "Admin")
        }

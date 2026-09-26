"""
Authoritative Operator Registry & Secure Session Manager.
Centralizes token storage, persistence, auto-refresh, and operator resolution.
Stores operator sessions in MongoDB `operator_sessions`, NEVER in plaintext files.
Tokens are NEVER returned to the frontend.
"""

import time
import uuid
from typing import Any, Dict, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.constants import OperatorCode
from app.core.exceptions import ValidationException
from app.core.logging import logger
from app.modules.operators.banglalink import BanglalinkAdapter
from app.modules.operators.base import BaseOperatorAdapter
from app.modules.operators.gp import GPAdapter
from app.modules.operators.resolver import normalize_msisdn, resolve_operator_from_msisdn
from app.modules.operators.robi import RobiAdapter


class OperatorSessionService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.operator_sessions
        # Initialize singleton operator adapters
        self.adapters: Dict[str, BaseOperatorAdapter] = {
            OperatorCode.GP: GPAdapter(),
            OperatorCode.BANGLALINK: BanglalinkAdapter(),
            OperatorCode.ROBI: RobiAdapter()
        }

    def get_adapter(self, operator_code: str) -> BaseOperatorAdapter:
        op = operator_code.upper()
        if op not in self.adapters:
            raise ValidationException(f"Unsupported operator: '{operator_code}'.", code="INVALID_OPERATOR")
        return self.adapters[op]

    def get_adapter_for_phone(self, phone: str) -> BaseOperatorAdapter:
        op_code = resolve_operator_from_msisdn(phone)
        return self.get_adapter(op_code)

    async def save_session(
        self,
        msisdn: str,
        operator_code: str,
        access_token: str,
        refresh_token: Optional[str] = None,
        expire_at: Optional[int] = None,
        user_id: Optional[str] = None,
        customer_account_id: Optional[str] = None,
        extra_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        normalized = normalize_msisdn(msisdn)
        now = int(time.time())
        doc = {
            "session_id": str(uuid.uuid4()),
            "msisdn": normalized,
            "operator_code": operator_code.upper(),
            "access_token": access_token,
            "refresh_token": refresh_token,
            "expire_at": expire_at or (now + 86400),
            "user_id": user_id,
            "customer_account_id": customer_account_id,
            "extra_data": extra_data or {},
            "updated_at": now
        }

        await self.collection.update_one(
            {"msisdn": normalized, "operator_code": operator_code.upper()},
            {"$set": doc, "$setOnInsert": {"created_at": now}},
            upsert=True
        )
        logger.info("Saved operator session for %s (%s)", normalized, operator_code)
        return doc

    async def get_session(self, msisdn: str, operator_code: str) -> Optional[Dict[str, Any]]:
        normalized = normalize_msisdn(msisdn)
        session = await self.collection.find_one({
            "msisdn": normalized,
            "operator_code": operator_code.upper()
        })
        if not session:
            return None

        # Check token expiration; if expired, auto-refresh if refresh_token exists
        expire_at = session.get("expire_at", 0)
        now = int(time.time())
        if now >= (expire_at - 60) and session.get("refresh_token"):
            adapter = self.get_adapter(operator_code)
            logger.info("Operator session for %s is near expiry. Refreshing...", normalized)
            ref_res = await adapter.refresh_session(normalized, session)
            if ref_res.get("success"):
                await self.collection.update_one(
                    {"msisdn": normalized, "operator_code": operator_code.upper()},
                    {"$set": {
                        "access_token": ref_res["access_token"],
                        "refresh_token": ref_res.get("refresh_token") or session.get("refresh_token"),
                        "expire_at": ref_res.get("expire_at", now + 86400),
                        "updated_at": now
                    }}
                )
                session["access_token"] = ref_res["access_token"]
                session["expire_at"] = ref_res.get("expire_at", now + 86400)
            else:
                logger.warning("Operator token refresh failed for %s", normalized)

        return session

    async def delete_session(self, msisdn: str, operator_code: str) -> bool:
        normalized = normalize_msisdn(msisdn)
        res = await self.collection.delete_one({
            "msisdn": normalized,
            "operator_code": operator_code.upper()
        })
        return res.deleted_count > 0

    async def save_session_pin(self, msisdn: str, operator_code: str, plain_pin: str) -> None:
        """Encrypts and securely stores the transfer PIN in the operator session."""
        from app.core.security import encrypt_pin
        normalized = normalize_msisdn(msisdn)
        now = int(time.time())
        encrypted = encrypt_pin(plain_pin)
        await self.collection.update_one(
            {"msisdn": normalized, "operator_code": operator_code.upper()},
            {"$set": {
                "encrypted_transfer_pin": encrypted,
                "transfer_pin_configured": True,
                "pin_status": "CONFIGURED",
                "pin_source": "OPERATOR_SESSION",
                "pin_last_changed_at": now,
                "updated_at": now
            }}
        )
        logger.info("Transfer PIN securely encrypted & stored in operator session for %s", normalized)

    async def get_session_pin(self, msisdn: str, operator_code: str) -> Optional[str]:
        """Retrieves and decrypts the stored transfer PIN from the session, if present."""
        from app.core.security import decrypt_pin
        normalized = normalize_msisdn(msisdn)
        doc = await self.collection.find_one({
            "msisdn": normalized,
            "operator_code": operator_code.upper()
        })
        if not doc or not doc.get("encrypted_transfer_pin"):
            return None
        return decrypt_pin(doc["encrypted_transfer_pin"])

    async def mark_session_pin_invalid(self, msisdn: str, operator_code: str) -> None:
        """Marks the transfer PIN as INVALID in the session upon operator rejection."""
        normalized = normalize_msisdn(msisdn)
        now = int(time.time())
        await self.collection.update_one(
            {"msisdn": normalized, "operator_code": operator_code.upper()},
            {"$set": {
                "pin_status": "INVALID",
                "updated_at": now
            }}
        )
        logger.warning("Transfer PIN marked INVALID in operator session for %s", normalized)

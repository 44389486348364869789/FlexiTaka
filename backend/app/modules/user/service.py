"""
Customer Account & Linked SIMs Management Service.
Manages customer profile, multi-SIM linkage under one account, and operator verification.
"""

import asyncio
from datetime import datetime, timezone
import secrets
from typing import Any, Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.constants import OperatorCode
from app.core.exceptions import NotFoundException, ValidationException
from app.core.logging import logger
from app.core.security import derive_default_pin
from app.db.repositories.audit_repo import AuditRepository
from app.db.repositories.linked_sims_repo import LinkedSimsRepository
from app.db.repositories.users_repo import UsersRepository
from app.modules.operators.resolver import normalize_msisdn, resolve_operator_from_msisdn
from app.modules.operators.session_manager import OperatorSessionService
from app.modules.user.schemas import (
    AddLinkedSimRequest,
    LinkedSimResponse,
    UpdateProfileRequest,
    UserProfileResponse,
    VerifyLinkedSimRequest,
)


class UserService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.users_repo = UsersRepository(db)
        self.linked_sims_repo = LinkedSimsRepository(db)
        self.audit_repo = AuditRepository(db)
        self.session_service = OperatorSessionService(db)

    # --- Profile Management ---
    async def get_profile(self, user_id: str) -> UserProfileResponse:
        user = await self.users_repo.get_by_user_id(user_id)
        if not user:
            raise NotFoundException("Customer account not found")

        sim_count = await self.linked_sims_repo.count_by_user(user_id)
        return UserProfileResponse(
            user_id=user["user_id"],
            phone=user["phone"],
            name=user.get("name"),
            email=user.get("email"),
            language_preference=user.get("language_preference", "bn"),
            status=user.get("status", "ACTIVE"),
            created_at=user.get("created_at", datetime.now(timezone.utc).isoformat()),
            linked_sims_count=sim_count,
        )

    async def update_profile(self, user_id: str, payload: UpdateProfileRequest) -> UserProfileResponse:
        user = await self.users_repo.get_by_user_id(user_id)
        if not user:
            raise NotFoundException("Customer account not found")

        update_fields: Dict[str, Any] = {}
        if payload.name is not None:
            update_fields["name"] = payload.name.strip()
        if payload.email is not None:
            update_fields["email"] = payload.email.strip().lower()
        if payload.language_preference is not None:
            update_fields["language_preference"] = payload.language_preference

        if update_fields:
            await self.users_repo.update_user_profile(user_id, update_fields)
            await self.audit_repo.log_action(
                actor_type="USER",
                actor_id=user_id,
                action="USER_PROFILE_UPDATED",
                resource_type="USER",
                resource_id=user_id,
                before={"name": user.get("name"), "email": user.get("email")},
                after=update_fields,
                reason="Customer updated personal profile details"
            )

        return await self.get_profile(user_id)

    # --- Linked SIMs Management ---
    async def list_linked_sims(self, user_id: str, force_refresh: bool = False) -> List[LinkedSimResponse]:
        sims = await self.linked_sims_repo.list_by_user(user_id)
        if not sims:
            return []

        now_dt = datetime.now(timezone.utc)
        now = now_dt.isoformat()

        async def _process_sim(s: Dict[str, Any]) -> LinkedSimResponse:
            balance_bdt = s.get("last_balance_bdt")
            cid = s.get("customer_id")
            sim_type = s.get("sim_type")
            bt_avail = s.get("balance_transfer_available")
            last_synced_at = s.get("last_synced_at") or s.get("verified_at")
            is_live_balance = s.get("is_live_balance", False)

            # If SIM is verified, attempt to fetch fresh balance from operator session
            if s.get("status") == "VERIFIED":
                should_fetch = True
                # Safe short-lived cache (10 seconds) to avoid spamming operator APIs if clicked in rapid bursts
                if not force_refresh and s.get("last_synced_at") and s.get("last_balance_bdt") is not None:
                    try:
                        synced_dt = datetime.fromisoformat(s["last_synced_at"])
                        if (now_dt - synced_dt).total_seconds() < 10:
                            should_fetch = False
                            is_live_balance = s.get("is_live_balance", True)
                    except Exception:
                        should_fetch = True

                if should_fetch:
                    try:
                        session = await self.session_service.get_session(s["phone"], s["operator_code"])
                        if session:
                            adapter = self.session_service.get_adapter(s["operator_code"])
                            bal_res = await adapter.get_balance(s["phone"], session)
                            if bal_res.get("success") and bal_res.get("balance_bdt") is not None:
                                balance_bdt = float(bal_res["balance_bdt"])
                                is_live_balance = True
                                last_synced_at = now
                                up_fields: Dict[str, Any] = {
                                    "last_balance_bdt": balance_bdt,
                                    "is_live_balance": True,
                                    "balance_updated_at": now,
                                    "last_synced_at": now
                                }
                                if not cid and session.get("customer_account_id"):
                                    cid = session.get("customer_account_id")
                                    up_fields["customer_id"] = cid
                                if not sim_type and bal_res.get("extra", {}).get("sim_type"):
                                    sim_type = bal_res.get("extra", {}).get("sim_type")
                                    up_fields["sim_type"] = sim_type
                                await self.linked_sims_repo.update_sim(s["sim_id"], up_fields)
                            else:
                                logger.info(
                                    "Live operator balance fetch for %s unsuccessful (%s). Using stored balance.",
                                    s["phone"], bal_res.get("message")
                                )
                                is_live_balance = False
                        else:
                            logger.info("No active operator session for %s. Using stored balance.", s["phone"])
                            is_live_balance = False
                    except Exception as e:
                        logger.warning("Error fetching live operator balance for %s: %s", s["phone"], e)
                        is_live_balance = False

            return LinkedSimResponse(
                sim_id=s["sim_id"],
                phone=s["phone"],
                operator_code=s["operator_code"],
                label=s.get("label"),
                is_primary=s.get("is_primary", False),
                status=s.get("status", "UNVERIFIED"),
                verified_at=s.get("verified_at"),
                last_balance_bdt=balance_bdt,
                is_live_balance=is_live_balance,
                customer_id=cid,
                sim_type=sim_type,
                balance_transfer_available=bt_avail,
                transfer_pin_configured=bool(s.get("transfer_pin_configured", False)),
                pin_status=s.get("pin_status", "CONFIGURED" if s.get("transfer_pin_configured") else "NEEDS_SETUP"),
                last_synced_at=last_synced_at,
                created_at=s.get("created_at", now),
            )

        results = await asyncio.gather(*[_process_sim(s) for s in sims])
        return list(results)

    async def add_linked_sim(self, user_id: str, payload: AddLinkedSimRequest) -> LinkedSimResponse:
        phone = normalize_msisdn(payload.phone)
        operator_code = resolve_operator_from_msisdn(phone)
        op_str = operator_code.value if hasattr(operator_code, "value") else str(operator_code)

        # 1. Prevent duplicate SIM in this account
        existing_in_account = await self.linked_sims_repo.find_by_user_and_phone(user_id, phone)
        if existing_in_account:
            raise ValidationException(
                "This SIM is already linked to your account / এই সিমটি ইতোমধ্যেই আপনার অ্যাকাউন্টে যুক্ত রয়েছে",
                code="SIM_ALREADY_LINKED"
            )

        # 2. Check if verified under another account
        existing_anywhere = await self.linked_sims_repo.find_by_phone(phone)
        if existing_anywhere and existing_anywhere.get("status") == "VERIFIED" and existing_anywhere.get("user_id") != user_id:
            raise ValidationException(
                "This mobile number is already verified under another account / এই মোবাইল নম্বরটি অন্য অ্যাকাউন্টে যাচাইকৃত রয়েছে",
                code="SIM_REGISTERED_TO_OTHER_ACCOUNT"
            )

        sim_id = f"lnk_{secrets.token_hex(6)}"
        now = datetime.now(timezone.utc).isoformat()

        # Check if user has other SIMs; if none, make this primary
        existing_count = await self.linked_sims_repo.count_by_user(user_id)
        is_primary = existing_count == 0

        sim_doc = {
            "sim_id": sim_id,
            "user_id": user_id,
            "phone": phone,
            "operator_code": op_str,
            "label": payload.label.strip() if payload.label else f"{op_str} SIM",
            "is_primary": is_primary,
            "status": "UNVERIFIED",
            "verified_at": None,
            "last_balance_bdt": None,
            "customer_id": None,
            "sim_type": None,
            "balance_transfer_available": None,
            "last_synced_at": None,
            "created_at": now,
            "updated_at": now,
        }

        created = await self.linked_sims_repo.add_sim(sim_doc)

        await self.audit_repo.log_action(
            actor_type="USER",
            actor_id=user_id,
            action="LINKED_SIM_ADDED",
            resource_type="LINKED_SIM",
            resource_id=sim_id,
            after={"phone": phone, "operator_code": op_str},
            reason="User added new SIM to account"
        )

        return LinkedSimResponse(
            sim_id=created["sim_id"],
            phone=created["phone"],
            operator_code=created["operator_code"],
            label=created.get("label"),
            is_primary=created.get("is_primary", False),
            status=created.get("status", "UNVERIFIED"),
            verified_at=created.get("verified_at"),
            last_balance_bdt=created.get("last_balance_bdt"),
            customer_id=created.get("customer_id"),
            sim_type=created.get("sim_type"),
            balance_transfer_available=created.get("balance_transfer_available"),
            transfer_pin_configured=False,
            pin_status="NEEDS_SETUP",
            last_synced_at=created.get("last_synced_at"),
            created_at=created.get("created_at", now),
        )
        

    async def request_sim_verification_otp(self, user_id: str, sim_id: str) -> Dict[str, Any]:
        sim = await self.linked_sims_repo.get_by_user_and_sim_id(user_id, sim_id)
        if not sim:
            raise NotFoundException("Linked SIM not found in your account")

        phone = sim["phone"]
        operator_code = sim["operator_code"]

        adapter = self.session_service.get_adapter(operator_code)
        logger.info("Requesting operator verification OTP for linked SIM %s (%s)", sim_id, phone)
        result = await adapter.send_login_otp(phone)

        if not result.get("success"):
            raise ValidationException(
                result.get("message", "Operator verification OTP request failed"),
                code="OPERATOR_OTP_FAILED"
            )

        return {
            "success": True,
            "sim_id": sim_id,
            "operator_code": operator_code,
            "reference_id": result.get("reference_id"),
            "expires_in": result.get("expires_in", 300),
            "message": result.get("message", "Operator verification OTP sent successfully.")
        }

    async def verify_sim_otp(self, user_id: str, sim_id: str, payload: VerifyLinkedSimRequest) -> LinkedSimResponse:
        sim = await self.linked_sims_repo.get_by_user_and_sim_id(user_id, sim_id)
        if not sim:
            raise NotFoundException("Linked SIM not found in your account")

        phone = sim["phone"]
        operator_code = sim["operator_code"]

        adapter = self.session_service.get_adapter(operator_code)
        context = {}
        if payload.reference_id:
            context["reference_id"] = payload.reference_id
            context["device_id"] = payload.reference_id
            context["otp_token"] = payload.reference_id

        verify_res = await adapter.verify_login_otp(phone, payload.otp, context)
        if not verify_res.get("success"):
            raise ValidationException(
                verify_res.get("message", "Invalid operator verification code"),
                code="INVALID_OPERATOR_OTP"
            )

        # 1. Save secure operator session server-side (tokens never exposed to frontend)
        await self.session_service.save_session(
            msisdn=phone,
            operator_code=operator_code,
            access_token=verify_res["access_token"],
            refresh_token=verify_res.get("refresh_token"),
            expire_at=verify_res.get("expire_at"),
            user_id=verify_res.get("user_id"),
            customer_account_id=verify_res.get("customer_account_id"),
            extra_data=verify_res.get("extra_data")
        )

        # 2. Establish transfer PIN in same authenticated OTP session if supported (Banglalink)
        if not sim.get("transfer_pin_configured") and operator_code == OperatorCode.BANGLALINK:
            try:
                derived_pin = derive_default_pin(phone)
                pin_session = {
                    "access_token": verify_res["access_token"],
                    "extra_data": verify_res.get("extra_data") or {}
                }
                pin_res = await adapter.set_or_reset_pin(phone, derived_pin, pin_session)
                if pin_res.get("success"):
                    await self.linked_sims_repo.save_sim_pin(sim_id, derived_pin)
                    await self.session_service.save_session_pin(phone, operator_code, derived_pin)
                    logger.info("Automatically established transfer PIN for Banglalink SIM %s in same OTP session", phone)
            except Exception as pe:
                logger.warning("Could not auto-setup transfer PIN for Banglalink %s: %s", phone, pe)

        # 3. Update linked SIM status
        now = datetime.now(timezone.utc).isoformat()
        balance_bdt = None
        if verify_res.get("balance_bdt") is not None:
            try:
                balance_bdt = float(verify_res["balance_bdt"])
            except (ValueError, TypeError):
                balance_bdt = None

        sim_type = verify_res.get("sim_type")
        if balance_bdt is None or not sim_type:
            try:
                session_doc = await self.session_service.get_session(phone, operator_code)
                if session_doc:
                    bal_res = await adapter.get_balance(phone, session_doc)
                    if bal_res.get("success"):
                        if bal_res.get("balance_bdt") is not None:
                            balance_bdt = float(bal_res["balance_bdt"])
                        if not sim_type and bal_res.get("extra", {}).get("sim_type"):
                            sim_type = bal_res.get("extra", {}).get("sim_type")
            except Exception as e:
                logger.warning("Could not auto-fetch balance for %s: %s", phone, e)

        raw_cust_id = (
            verify_res.get("customer_id")
            or verify_res.get("customer_account_id")
        )
        customer_id = str(raw_cust_id).strip() if raw_cust_id else None

        bt_available = verify_res.get("balance_transfer_available")
        if bt_available is None and verify_res.get("extra_data"):
            bt_available = verify_res["extra_data"].get("enable_balance_transfer")

        update_data = {
            "status": "VERIFIED",
            "verified_at": now,
            "updated_at": now,
            "last_synced_at": now,
            "sim_type": sim_type,
            "balance_transfer_available": bt_available,
            "customer_id": customer_id,
            "is_live_balance": balance_bdt is not None,
        }
        if balance_bdt is not None:
            update_data["last_balance_bdt"] = balance_bdt
            update_data["balance_updated_at"] = now

        await self.linked_sims_repo.update_sim(sim_id, update_data)

        # 4. Audit log
        await self.audit_repo.log_action(
            actor_type="USER",
            actor_id=user_id,
            action="LINKED_SIM_VERIFIED",
            resource_type="LINKED_SIM",
            resource_id=sim_id,
            after={"phone": phone, "operator_code": operator_code, "status": "VERIFIED"},
            reason="Customer completed operator authentication for linked SIM"
        )

        updated_sim = await self.linked_sims_repo.get_by_sim_id(sim_id)
        return LinkedSimResponse(
            sim_id=updated_sim["sim_id"],
            phone=updated_sim["phone"],
            operator_code=updated_sim["operator_code"],
            label=updated_sim.get("label"),
            is_primary=updated_sim.get("is_primary", False),
            status="VERIFIED",
            verified_at=now,
            last_balance_bdt=balance_bdt,
            is_live_balance=balance_bdt is not None,
            customer_id=updated_sim.get("customer_id"),
            sim_type=updated_sim.get("sim_type"),
            balance_transfer_available=updated_sim.get("balance_transfer_available"),
            transfer_pin_configured=bool(updated_sim.get("transfer_pin_configured", False)),
            pin_status=updated_sim.get("pin_status", "CONFIGURED" if updated_sim.get("transfer_pin_configured") else "NEEDS_SETUP"),
            last_synced_at=updated_sim.get("last_synced_at") or now,
            created_at=updated_sim.get("created_at", now),
        )

    async def remove_linked_sim(self, user_id: str, sim_id: str) -> bool:
        sim = await self.linked_sims_repo.get_by_user_and_sim_id(user_id, sim_id)
        if not sim:
            raise NotFoundException("Linked SIM not found in your account")

        deleted = await self.linked_sims_repo.delete_sim(user_id, sim_id)
        if deleted:
            await self.audit_repo.log_action(
                actor_type="USER",
                actor_id=user_id,
                action="LINKED_SIM_REMOVED",
                resource_type="LINKED_SIM",
                resource_id=sim_id,
                before={"phone": sim["phone"], "operator_code": sim["operator_code"]},
                reason="User removed linked SIM from account"
            )
        return deleted

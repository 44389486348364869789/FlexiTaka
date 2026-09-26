"""
Reusable Chunked Balance Transfer Engine for FlexiTaka.
Authoritatively orchestrates multi-chunk balance transfers for BOTH:
- Cash Out: Customer SIM -> FlexiTaka Receiving SIM
- Recharge: FlexiTaka Receiving SIM -> Customer Target Number

Ensures strict chunking (respecting operator limits), ledger tracking in `transfer_ledger`,
cooldown handling, idempotency, and timeout reconciliation.
"""

from datetime import datetime, timezone
import time
import uuid
from decimal import Decimal
from typing import Any, Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.constants import (
    ActorType, CashOutStatus, OperatorCode, QuotaWindowType,
    RechargeStatus, ServiceType, TransferAuthMode, poisha_to_bdt
)
from app.core.exceptions import ConflictException, ValidationException
from app.core.logging import logger
from app.core.security import decrypt_pin, derive_default_pin, encrypt_pin
from app.modules.operators.resolver import normalize_msisdn, resolve_operator_from_msisdn
from app.modules.operators.session_manager import OperatorSessionService


class TransferEngine:
    def __init__(self, db: AsyncIOMotorDatabase, session_service: OperatorSessionService):
        self.db = db
        self.ledger = db.transfer_ledger
        self.orders = db.orders
        self.session_service = session_service

    @staticmethod
    def calculate_chunks(total_amount_bdt: int, max_per_chunk: int = 100) -> List[int]:
        """
        Splits total amount into chunks adhering to operator limit (e.g. 100 BDT).
        Example: 350 BDT with limit 100 -> [100, 100, 100, 50]
        """
        if total_amount_bdt <= 0:
            return []
        chunks = []
        remaining = total_amount_bdt
        while remaining > 0:
            chunk = min(remaining, max_per_chunk)
            chunks.append(chunk)
            remaining -= chunk
        return chunks

    async def calculate_quota_and_executable(
        self,
        source_number: str,
        operator_code: str,
        requested_amount_bdt: int,
        session_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Quota Precheck:
        Calculates the maximum executable amount now considering:
        - live source balance
        - per-transfer min/max
        - remaining transfer count capacity (INCOMING for Cash Out)
        - remaining daily amount quota
        - remaining monthly/rolling quota
        - operator cooldown restriction
        - operator session capability
        """
        clean_source = normalize_msisdn(source_number)
        adapter = self.session_service.get_adapter(operator_code)

        # Load active operator config
        from app.db.repositories.operator_config_repo import OperatorConfigRepository
        cfg_repo = OperatorConfigRepository(self.db)
        op_cfg = await cfg_repo.get_config(operator_code)

        per_transfer_max = op_cfg.get("max_transfer_amount_bdt") or adapter.default_transfer_limit
        per_transfer_min = op_cfg.get("min_transfer_amount_bdt") or getattr(adapter, "min_transfer_amount_bdt", 10)
        daily_amount_limit = op_cfg.get("daily_amount_limit_bdt") or getattr(adapter, "daily_amount_limit_bdt", None)
        monthly_amount_limit = op_cfg.get("monthly_amount_limit_bdt") or getattr(adapter, "monthly_amount_limit_bdt", None)
        monthly_count_limit = op_cfg.get("monthly_transfer_count_limit") or getattr(adapter, "monthly_transfer_count_limit", None)
        daily_count_limit = op_cfg.get("daily_transfer_count_limit")
        cooldown_sec = op_cfg.get("cooldown_seconds", adapter.default_cooldown_seconds)
        window_type = op_cfg.get("window_type") or getattr(adapter, "window_type", "CALENDAR_MONTH")
        if hasattr(window_type, "value"):
            window_type = window_type.value

        now_ts = int(time.time())
        now_dt = datetime.fromtimestamp(now_ts, timezone.utc)

        # 1. Window bounds
        if window_type == "ROLLING_30_DAYS":
            window_start_ts = now_ts - (30 * 86400)
        else:  # CALENDAR_MONTH
            month_start_dt = now_dt.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            window_start_ts = int(month_start_dt.timestamp())

        day_start_dt = now_dt.replace(hour=0, minute=0, second=0, microsecond=0)
        day_start_ts = int(day_start_dt.timestamp())

        # 2. Historical ledger query for this source SIM (INCOMING transfers from customer SIM)
        ledger_window = await self.ledger.find({
            "source_number": clean_source,
            "status": "SUCCESS",
            "created_at": {"$gte": min(window_start_ts, day_start_ts)}
        }).to_list(length=1000)

        # Daily usage
        daily_txs = [r for r in ledger_window if r.get("created_at", 0) >= day_start_ts]
        used_daily_amount = sum(r.get("chunk_amount_bdt", 0) for r in daily_txs)
        used_daily_count = len(daily_txs)

        # Monthly / window usage
        window_txs = [r for r in ledger_window if r.get("created_at", 0) >= window_start_ts]
        used_window_amount = sum(r.get("chunk_amount_bdt", 0) for r in window_txs)
        used_window_count = len(window_txs)

        # Remaining quotas
        remaining_daily_amount = max(0, daily_amount_limit - used_daily_amount) if daily_amount_limit is not None else None
        remaining_monthly_amount = max(0, monthly_amount_limit - used_window_amount) if monthly_amount_limit is not None else None
        remaining_monthly_count = max(0, monthly_count_limit - used_window_count) if monthly_count_limit is not None else None
        remaining_daily_count = max(0, daily_count_limit - used_daily_count) if daily_count_limit is not None else None

        # Effective remaining transfer count
        counts_to_check = [c for c in [remaining_monthly_count, remaining_daily_count] if c is not None]
        effective_remaining_count = min(counts_to_check) if counts_to_check else None

        # 3. Live Balance Check
        live_balance = None
        if session_data:
            try:
                bal_res = await adapter.get_balance(clean_source, session_data)
                if bal_res.get("success"):
                    live_balance = float(bal_res.get("balance_bdt", 0.0))
            except Exception as e:
                logger.warning("Could not fetch live balance during precheck: %s", e)

        # 4. Cooldown Check
        recent_tx = await self.ledger.find_one(
            {"source_number": clean_source, "status": "SUCCESS"},
            sort=[("updated_at", -1)]
        )
        active_cooldown_remaining = 0
        if recent_tx and cooldown_sec > 0:
            last_ts = recent_tx.get("updated_at", 0)
            elapsed = now_ts - last_ts
            if elapsed < cooldown_sec:
                active_cooldown_remaining = cooldown_sec - elapsed

        # 5. Calculate max executable now = min of all applicable constraints
        limit_candidates = [requested_amount_bdt]

        if live_balance is not None:
            limit_candidates.append(int(live_balance))

        if remaining_daily_amount is not None:
            limit_candidates.append(remaining_daily_amount)

        if remaining_monthly_amount is not None:
            limit_candidates.append(remaining_monthly_amount)

        if effective_remaining_count is not None:
            # Capacity allowed by remaining transfer count: N transfers * per_transfer_max
            count_capacity = effective_remaining_count * per_transfer_max
            limit_candidates.append(count_capacity)

        max_executable_now = max(0, min(limit_candidates))
        can_execute_full = requested_amount_bdt <= max_executable_now

        # Generate recommended chunks
        rec_chunks = self.calculate_chunks(max_executable_now, per_transfer_max)

        auth_mode = getattr(adapter, "transfer_auth_mode", "SESSION_PLUS_PIN")
        auth_mode_str = auth_mode.value if hasattr(auth_mode, "value") else str(auth_mode)

        return {
            "requested_amount_bdt": requested_amount_bdt,
            "max_executable_now_bdt": max_executable_now,
            "can_execute_full": can_execute_full,
            "per_transfer_min": per_transfer_min,
            "per_transfer_max": per_transfer_max,
            "live_balance_bdt": live_balance,
            "remaining_daily_amount_bdt": remaining_daily_amount,
            "remaining_monthly_amount_bdt": remaining_monthly_amount,
            "remaining_transfer_count": effective_remaining_count,
            "active_cooldown_remaining_seconds": active_cooldown_remaining,
            "is_cooldown_active": active_cooldown_remaining > 0,
            "transfer_auth_mode": auth_mode_str,
            "recommended_chunks": rec_chunks,
            "total_chunks_required": len(rec_chunks),
            "window_type": window_type
        }

    async def initialize_transfer_plan(
        self,
        order_id: str,
        service_type: ServiceType,
        operator_code: str,
        source_number: str,
        destination_number: str,
        total_amount_bdt: int,
        custom_chunk_limit: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Generates and saves the immutable transfer plan into `transfer_ledger`.
        """
        # Validate source and destination operator match
        src_op = resolve_operator_from_msisdn(source_number)
        dst_op = resolve_operator_from_msisdn(destination_number)
        src_op_str = src_op.value if hasattr(src_op, "value") else str(src_op)
        dst_op_str = dst_op.value if hasattr(dst_op, "value") else str(dst_op)
        target_op_str = operator_code.value if hasattr(operator_code, "value") else str(operator_code)

        if src_op_str.upper() != target_op_str.upper() or dst_op_str.upper() != target_op_str.upper():
            logger.error(
                "Transfer plan rejected due to operator mismatch: source=%s (%s), dest=%s (%s), order_op=%s",
                source_number, src_op_str, destination_number, dst_op_str, target_op_str
            )
            raise ValidationException(
                f"Operator mismatch: Transfer requires matching operators (source: {src_op_str}, dest: {dst_op_str}, expected: {target_op_str})",
                code="OPERATOR_MISMATCH"
            )

        adapter = self.session_service.get_adapter(operator_code)
        chunk_limit = custom_chunk_limit or adapter.default_transfer_limit
        chunk_amounts = self.calculate_chunks(total_amount_bdt, chunk_limit)

        records = []
        now = int(time.time())

        for idx, amount in enumerate(chunk_amounts, start=1):
            transfer_id = f"TRX-{order_id}-{idx}"
            record = {
                "transfer_id": transfer_id,
                "order_id": order_id,
                "sequence_number": idx,
                "total_chunks": len(chunk_amounts),
                "service_type": service_type.value if hasattr(service_type, "value") else str(service_type),
                "operator_code": operator_code.upper(),
                "source_number": source_number,
                "destination_number": destination_number,
                "chunk_amount_bdt": amount,
                "chunk_amount_poisha": amount * 100,
                "status": "PENDING",  # PENDING, IN_PROGRESS, WAITING_FOR_COOLDOWN, SUCCESS, FAILED
                "operator_reference": None,
                "attempt_count": 0,
                "next_retry_at": now if idx == 1 else 0,
                "error_code": None,
                "error_message": None,
                "created_at": now,
                "updated_at": now
            }
            records.append(record)

        # Upsert records
        for r in records:
            await self.ledger.update_one(
                {"order_id": order_id, "sequence_number": r["sequence_number"]},
                {"$setOnInsert": r},
                upsert=True
            )

        logger.info(
            "Transfer plan initialized for order %s: %s chunks totaling %s BDT",
            order_id, len(chunk_amounts), total_amount_bdt
        )
        return records

    async def execute_next_chunk(
        self,
        order_id: str,
        pin: Optional[str] = None,
        session_data: Optional[Dict[str, Any]] = None,
        otp: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes the current eligible chunk for an order.
        Supports both SESSION_PLUS_PIN (GP, BL) and OTP_PER_TRANSFER (Robi).
        Handles success, cooldown, OTP verification, or retryable failure.
        """
        now = int(time.time())
        eligible_statuses = ["PENDING", "WAITING_FOR_COOLDOWN"]
        if otp:
            eligible_statuses.append("WAITING_FOR_OTP")

        chunk = await self.ledger.find_one({
            "order_id": order_id,
            "status": {"$in": eligible_statuses},
            "next_retry_at": {"$lte": now}
        }, sort=[("sequence_number", 1)])

        if not chunk:
            # Check if all chunks completed
            all_chunks = await self.ledger.find({"order_id": order_id}).sort("sequence_number", 1).to_list(length=100)
            if all_chunks and all(c["status"] == "SUCCESS" for c in all_chunks):
                await self._mark_order_transfer_complete(order_id)
                amt_done = sum(c["chunk_amount_bdt"] for c in all_chunks)
                return {
                    "completed": True,
                    "completed_amount_bdt": amt_done,
                    "remaining_amount_bdt": 0,
                    "message": "All transfer chunks completed successfully."
                }

            otp_chunk = await self.ledger.find_one({"order_id": order_id, "status": "WAITING_FOR_OTP"})
            if otp_chunk:
                return {
                    "completed": False,
                    "otp_required": True,
                    "chunk_number": otp_chunk["sequence_number"],
                    "chunk_amount_bdt": otp_chunk["chunk_amount_bdt"],
                    "reference_id": otp_chunk.get("operator_reference"),
                    "action_required": "OTP_REQUIRED",
                    "next_action": f"Next {otp_chunk['chunk_amount_bdt']} BDT transfer needs verification.",
                    "message": f"Transfer chunk {otp_chunk['sequence_number']} is waiting for OTP verification."
                }

            waiting_chunk = await self.ledger.find_one({
                "order_id": order_id,
                "status": "WAITING_FOR_COOLDOWN"
            })
            if waiting_chunk:
                wait_sec = max(0, waiting_chunk["next_retry_at"] - now)
                return {
                    "completed": False,
                    "cooldown": True,
                    "seconds_remaining": wait_sec,
                    "action_required": "COOLDOWN",
                    "message": f"Waiting for operator cooldown ({wait_sec}s remaining)."
                }

            return {"completed": False, "message": "No eligible chunks to process right now."}

        # Mark chunk IN_PROGRESS atomically
        updated = await self.ledger.find_one_and_update(
            {"transfer_id": chunk["transfer_id"], "status": chunk["status"]},
            {"$set": {"status": "IN_PROGRESS", "updated_at": now}, "$inc": {"attempt_count": 1}},
            return_document=True
        )
        if not updated:
            return {"completed": False, "message": "Chunk locked by concurrent worker."}

        adapter = self.session_service.get_adapter(chunk["operator_code"])

        # Re-check live balance before executing transfer chunk if session is active
        if session_data:
            try:
                bal_check = await adapter.get_balance(chunk["source_number"], session_data)
                if bal_check.get("success"):
                    live_bal = float(bal_check.get("balance_bdt", 0.0))
                    if live_bal < float(chunk["chunk_amount_bdt"]):
                        err_text = f"আপনার SIM-এ পর্যাপ্ত ব্যালান্স নেই। বর্তমান ব্যালান্স: ৳{live_bal:.2f} (Insufficient SIM balance. Current: ৳{live_bal:.2f})"
                        await self.ledger.update_one(
                            {"transfer_id": chunk["transfer_id"]},
                            {"$set": {
                                "status": "FAILED",
                                "error_message": err_text,
                                "error_code": "INSUFFICIENT_BALANCE",
                                "updated_at": now
                            }}
                        )
                        await self.orders.update_one(
                            {"order_id": order_id},
                            {"$set": {
                                "status": "INSUFFICIENT_BALANCE",
                                "metadata.error_code": "INSUFFICIENT_BALANCE",
                                "metadata.error_message": err_text,
                                "metadata.action_required": "INSUFFICIENT_BALANCE",
                                "updated_at": now
                            }}
                        )
                        return {
                            "completed": False,
                            "failed": True,
                            "error_code": "INSUFFICIENT_BALANCE",
                            "message": err_text
                        }
            except Exception as e:
                logger.warning("Could not pre-verify live balance before chunk: %s", e)

        # Strict pre-transfer safety check: source and destination operators must match chunk operator
        src_op = resolve_operator_from_msisdn(chunk["source_number"])
        dst_op = resolve_operator_from_msisdn(chunk["destination_number"])
        src_op_str = src_op.value if hasattr(src_op, "value") else str(src_op)
        dst_op_str = dst_op.value if hasattr(dst_op, "value") else str(dst_op)
        chunk_op_str = chunk["operator_code"].upper()

        if src_op_str.upper() != chunk_op_str or dst_op_str.upper() != chunk_op_str:
            err_text = (
                f"Operator mismatch abort: source={chunk['source_number']} ({src_op_str}), "
                f"dest={chunk['destination_number']} ({dst_op_str}), expected={chunk_op_str}. "
                f"Cross-operator balance transfer is prohibited."
            )
            logger.critical("SAFETY INTERCEPTION on chunk %s: %s", chunk["transfer_id"], err_text)
            await self.ledger.update_one(
                {"transfer_id": chunk["transfer_id"]},
                {"$set": {
                    "status": "FAILED",
                    "error_code": "OPERATOR_MISMATCH",
                    "error_message": err_text,
                    "updated_at": now
                }}
            )
            await self.orders.update_one(
                {"order_id": order_id},
                {"$set": {
                    "status": "TRANSFER_FAILED",
                    "metadata.error_code": "OPERATOR_MISMATCH",
                    "metadata.error_message": err_text,
                    "updated_at": now
                }}
            )
            return {
                "completed": False,
                "failed": True,
                "error_code": "OPERATOR_MISMATCH",
                "message": err_text
            }

        # Resolve transfer PIN securely (only if operator requires PIN)
        effective_pin = pin
        if getattr(adapter, "pin_required", True):
            if not effective_pin:
                effective_pin = await self.session_service.get_session_pin(chunk["source_number"], chunk["operator_code"])
            if not effective_pin:
                rec_sim = await self.db.receiving_sims.find_one({"mobile_number": chunk["source_number"]})
                if rec_sim and rec_sim.get("encrypted_transfer_pin"):
                    try:
                        effective_pin = decrypt_pin(rec_sim["encrypted_transfer_pin"])
                    except Exception:
                        pass
            if not effective_pin:
                lnk_sim = await self.db.linked_sims.find_one({"phone": chunk["source_number"]})
                if lnk_sim and lnk_sim.get("encrypted_transfer_pin"):
                    try:
                        effective_pin = decrypt_pin(lnk_sim["encrypted_transfer_pin"])
                    except Exception:
                        pass
            if not effective_pin:
                effective_pin = derive_default_pin(chunk["source_number"])

        active_session = dict(session_data) if session_data else {}
        if otp:
            active_session["transfer_otp"] = otp
            active_session["transfer_reference_id"] = chunk.get("operator_reference")

        result = await adapter.transfer_balance(
            msisdn=chunk["source_number"],
            recipient_msisdn=chunk["destination_number"],
            amount_bdt=chunk["chunk_amount_bdt"],
            pin=effective_pin or "",
            session_data=active_session
        )

        # 1. Check if adapter requested fresh OTP (e.g. Robi OTP_PER_TRANSFER)
        if result.get("otp_required"):
            ref_id = result.get("reference_id")
            await self.ledger.update_one(
                {"transfer_id": chunk["transfer_id"]},
                {"$set": {
                    "status": "WAITING_FOR_OTP",
                    "operator_reference": ref_id,
                    "updated_at": now
                }}
            )
            all_chunks = await self.ledger.find({"order_id": order_id}).to_list(length=100)
            completed_chunks = [c for c in all_chunks if c["status"] == "SUCCESS"]
            amt_done = sum(c["chunk_amount_bdt"] for c in completed_chunks)
            rem_amt = sum(c["chunk_amount_bdt"] for c in all_chunks if c["status"] != "SUCCESS")
            await self.orders.update_one(
                {"order_id": order_id},
                {"$set": {
                    "status": CashOutStatus.TRANSFER_IN_PROGRESS.value,
                    "completed_amount_bdt": amt_done,
                    "remaining_amount_bdt": rem_amt,
                    "completed_chunk_count": len(completed_chunks),
                    "total_chunks": len(all_chunks),
                    "next_chunk_number": chunk["sequence_number"],
                    "action_required": "OTP_REQUIRED",
                    "next_action": f"Next {chunk['chunk_amount_bdt']} BDT transfer needs verification.",
                    "otp_required_for_next_chunk": True,
                    "metadata.action_required": "OTP_REQUIRED",
                    "metadata.next_action": f"Next {chunk['chunk_amount_bdt']} BDT transfer needs verification.",
                    "metadata.otp_required_for_next_chunk": True,
                    "metadata.otp_reference_id": ref_id,
                    "metadata.next_chunk_number": chunk["sequence_number"],
                    "updated_at": now
                }}
            )
            return {
                "completed": False,
                "otp_required": True,
                "reference_id": ref_id,
                "chunk_number": chunk["sequence_number"],
                "chunk_amount_bdt": chunk["chunk_amount_bdt"],
                "action_required": "OTP_REQUIRED",
                "next_action": f"Next {chunk['chunk_amount_bdt']} BDT transfer needs verification.",
                "message": result.get("message") or f"Next {chunk['chunk_amount_bdt']} BDT transfer needs verification."
            }

        # 2. Check if OTP verification failed (for OTP_PER_TRANSFER)
        err_msg = result.get("message") or ""
        err_code = str(result.get("error_code") or "")
        is_otp_err = (
            not result.get("success")
            and (
                err_code in ["OTP_INVALID", "INVALID_OTP", "OTP_EXPIRED"]
                or ("otp" in err_msg.lower() and ("invalid" in err_msg.lower() or "incorrect" in err_msg.lower() or "wrong" in err_msg.lower()))
            )
        )
        if is_otp_err:
            await self.ledger.update_one(
                {"transfer_id": chunk["transfer_id"]},
                {"$set": {
                    "status": "WAITING_FOR_OTP",
                    "error_message": err_msg,
                    "error_code": "OTP_INVALID",
                    "updated_at": now
                }}
            )
            return {
                "completed": False,
                "failed": False,
                "otp_required": True,
                "otp_invalid": True,
                "error_code": "OTP_INVALID",
                "chunk_number": chunk["sequence_number"],
                "action_required": "OTP_REQUIRED",
                "message": err_msg or "Invalid transfer verification OTP."
            }

        # 3. Intercept ERR_PIN_2220 / INVALID_PIN for automatic PIN recovery & safe retry
        is_pin_err = (
            not result.get("success")
            and (
                err_code in ["ERR_PIN_2220", "INVALID_PIN"]
                or "2220" in err_code
                or "invalid pin" in err_msg.lower()
            )
        )

        if is_pin_err and not chunk.get("pin_recovery_attempted"):
            logger.warning(
                "Operator rejected PIN for %s (chunk %s, error: %s). Initiating secure PIN recovery flow...",
                chunk["source_number"], chunk["transfer_id"], err_code or err_msg
            )
            now_ts = int(time.time())
            # Mark stored PIN as INVALID in database (Never log plaintext PIN)
            await self.session_service.mark_session_pin_invalid(chunk["source_number"], chunk["operator_code"])
            await self.db.receiving_sims.update_many(
                {"mobile_number": chunk["source_number"]},
                {"$set": {"pin_status": "INVALID", "updated_at": now_ts}}
            )
            await self.db.linked_sims.update_many(
                {"phone": chunk["source_number"]},
                {"$set": {"pin_status": "INVALID", "updated_at": now_ts}}
            )

            # Check if operator supports same-session PIN setup/reset (e.g. Banglalink)
            if chunk["operator_code"] == OperatorCode.BANGLALINK and session_data:
                new_pin = derive_default_pin(chunk["source_number"])
                set_res = await adapter.set_or_reset_pin(chunk["source_number"], new_pin, session_data)
                if set_res.get("success"):
                    logger.info("Successfully established new transfer PIN for %s via Banglalink API", chunk["source_number"])
                    await self.session_service.save_session_pin(chunk["source_number"], chunk["operator_code"], new_pin)
                    enc_pin = encrypt_pin(new_pin)
                    await self.db.receiving_sims.update_many(
                        {"mobile_number": chunk["source_number"]},
                        {"$set": {
                            "encrypted_transfer_pin": enc_pin,
                            "transfer_pin_configured": True,
                            "pin_status": "CONFIGURED",
                            "pin_last_changed_at": now_ts,
                            "updated_at": now_ts
                        }}
                    )
                    await self.db.linked_sims.update_many(
                        {"phone": chunk["source_number"]},
                        {"$set": {
                            "encrypted_transfer_pin": enc_pin,
                            "transfer_pin_configured": True,
                            "pin_status": "CONFIGURED",
                            "pin_last_changed_at": now_ts,
                            "updated_at": now_ts
                        }}
                    )
                    await self.ledger.update_one(
                        {"transfer_id": chunk["transfer_id"]},
                        {"$set": {"pin_recovery_attempted": True}}
                    )
                    result = await adapter.transfer_balance(
                        msisdn=chunk["source_number"],
                        recipient_msisdn=chunk["destination_number"],
                        amount_bdt=chunk["chunk_amount_bdt"],
                        pin=new_pin,
                        session_data=session_data
                    )

        now = int(time.time())
        if result.get("success"):
            tx_ref = result.get("transaction_reference")
            await self.ledger.update_one(
                {"transfer_id": chunk["transfer_id"]},
                {"$set": {
                    "status": "SUCCESS",
                    "operator_reference": tx_ref,
                    "updated_at": now
                }}
            )

            all_chunks = await self.ledger.find({"order_id": order_id}).sort("sequence_number", 1).to_list(length=100)
            completed_chunks = [c for c in all_chunks if c["status"] == "SUCCESS"]
            amt_done = sum(c["chunk_amount_bdt"] for c in completed_chunks)
            cnt_done = len(completed_chunks)
            rem_chunks = [c for c in all_chunks if c["status"] != "SUCCESS"]
            rem_amt = sum(c["chunk_amount_bdt"] for c in rem_chunks)
            total_cnt = len(all_chunks)

            # Schedule cooldown for next chunk if operator imposes cooldown
            cooldown_sec = result.get("cooldown_seconds", adapter.default_cooldown_seconds)
            next_seq = chunk["sequence_number"] + 1

            if rem_amt == 0:
                await self._mark_order_transfer_complete(order_id)
                await self.orders.update_one(
                    {"order_id": order_id},
                    {"$set": {
                        "completed_amount_bdt": amt_done,
                        "completed_amount_poisha": amt_done * 100,
                        "remaining_amount_bdt": 0,
                        "remaining_amount_poisha": 0,
                        "completed_chunk_count": cnt_done,
                        "total_chunks": total_cnt,
                        "action_required": "NONE",
                        "next_action": "Completed",
                        "otp_required_for_next_chunk": False,
                        "metadata.completed_amount_bdt": amt_done,
                        "metadata.remaining_amount_bdt": 0,
                        "metadata.completed_chunk_count": cnt_done,
                        "metadata.total_chunks": total_cnt,
                        "metadata.action_required": "NONE",
                        "metadata.otp_required_for_next_chunk": False,
                        "updated_at": now
                    }}
                )
                return {
                    "completed": True,
                    "chunk": chunk["sequence_number"],
                    "completed_amount_bdt": amt_done,
                    "remaining_amount_bdt": 0,
                    "transaction_reference": tx_ref,
                    "action_required": "NONE",
                    "message": "Transfer finished completely."
                }

            # More chunks remain
            next_chunk = min(rem_chunks, key=lambda c: c["sequence_number"])
            is_otp_per_transfer = getattr(adapter, "transfer_auth_mode", None) == TransferAuthMode.OTP_PER_TRANSFER

            if cooldown_sec > 0:
                next_eligible = now + cooldown_sec
                await self.ledger.update_one(
                    {"order_id": order_id, "sequence_number": next_seq},
                    {"$set": {
                        "status": "WAITING_FOR_COOLDOWN",
                        "next_retry_at": next_eligible,
                        "updated_at": now
                    }}
                )
                await self.orders.update_one(
                    {"order_id": order_id},
                    {"$set": {
                        "status": "WAITING_FOR_COOLDOWN",
                        "completed_amount_bdt": amt_done,
                        "completed_amount_poisha": amt_done * 100,
                        "remaining_amount_bdt": rem_amt,
                        "remaining_amount_poisha": rem_amt * 100,
                        "completed_chunk_count": cnt_done,
                        "total_chunks": total_cnt,
                        "next_chunk_number": next_seq,
                        "action_required": "COOLDOWN",
                        "next_action": f"Transfer is waiting for the operator's next allowed transfer window ({cooldown_sec // 60}m).",
                        "otp_required_for_next_chunk": False,
                        "metadata.next_retry_at": next_eligible,
                        "metadata.completed_amount_bdt": amt_done,
                        "metadata.remaining_amount_bdt": rem_amt,
                        "metadata.completed_chunk_count": cnt_done,
                        "metadata.total_chunks": total_cnt,
                        "metadata.next_chunk_number": next_seq,
                        "metadata.action_required": "COOLDOWN",
                        "metadata.otp_required_for_next_chunk": False,
                        "updated_at": now
                    }}
                )
                return {
                    "completed": False,
                    "chunk": chunk["sequence_number"],
                    "completed_amount_bdt": amt_done,
                    "remaining_amount_bdt": rem_amt,
                    "transaction_reference": tx_ref,
                    "cooldown": True,
                    "cooldown_seconds": cooldown_sec,
                    "action_required": "COOLDOWN",
                    "next_action": f"Transfer is waiting for the operator's next allowed transfer window ({cooldown_sec // 60}m).",
                    "message": f"Chunk {chunk['sequence_number']} succeeded. Cooldown active for next chunk."
                }
            elif is_otp_per_transfer:
                await self.ledger.update_one(
                    {"order_id": order_id, "sequence_number": next_seq},
                    {"$set": {"status": "PENDING", "next_retry_at": now, "updated_at": now}}
                )
                await self.orders.update_one(
                    {"order_id": order_id},
                    {"$set": {
                        "status": CashOutStatus.TRANSFER_IN_PROGRESS.value,
                        "completed_amount_bdt": amt_done,
                        "completed_amount_poisha": amt_done * 100,
                        "remaining_amount_bdt": rem_amt,
                        "remaining_amount_poisha": rem_amt * 100,
                        "completed_chunk_count": cnt_done,
                        "total_chunks": total_cnt,
                        "next_chunk_number": next_seq,
                        "action_required": "OTP_REQUIRED",
                        "next_action": f"Next {next_chunk['chunk_amount_bdt']} BDT transfer needs verification.",
                        "otp_required_for_next_chunk": True,
                        "metadata.completed_amount_bdt": amt_done,
                        "metadata.remaining_amount_bdt": rem_amt,
                        "metadata.completed_chunk_count": cnt_done,
                        "metadata.total_chunks": total_cnt,
                        "metadata.next_chunk_number": next_seq,
                        "metadata.action_required": "OTP_REQUIRED",
                        "metadata.otp_required_for_next_chunk": True,
                        "updated_at": now
                    }}
                )
                return {
                    "completed": False,
                    "chunk": chunk["sequence_number"],
                    "completed_amount_bdt": amt_done,
                    "remaining_amount_bdt": rem_amt,
                    "transaction_reference": tx_ref,
                    "otp_required": True,
                    "next_chunk": next_seq,
                    "action_required": "OTP_REQUIRED",
                    "next_action": f"Next {next_chunk['chunk_amount_bdt']} BDT transfer needs verification.",
                    "message": f"৳{chunk['chunk_amount_bdt']} transferred successfully. Next {next_chunk['chunk_amount_bdt']} BDT transfer needs verification."
                }
            else:
                # Normal SESSION_PLUS_PIN with no cooldown (GP)
                await self.ledger.update_one(
                    {"order_id": order_id, "sequence_number": next_seq},
                    {"$set": {"status": "PENDING", "next_retry_at": now, "updated_at": now}}
                )
                await self.orders.update_one(
                    {"order_id": order_id},
                    {"$set": {
                        "status": CashOutStatus.TRANSFER_IN_PROGRESS.value,
                        "completed_amount_bdt": amt_done,
                        "completed_amount_poisha": amt_done * 100,
                        "remaining_amount_bdt": rem_amt,
                        "remaining_amount_poisha": rem_amt * 100,
                        "completed_chunk_count": cnt_done,
                        "total_chunks": total_cnt,
                        "next_chunk_number": next_seq,
                        "action_required": "NONE",
                        "next_action": f"Processing chunk {next_seq} of {total_cnt}",
                        "otp_required_for_next_chunk": False,
                        "metadata.completed_amount_bdt": amt_done,
                        "metadata.remaining_amount_bdt": rem_amt,
                        "metadata.completed_chunk_count": cnt_done,
                        "metadata.total_chunks": total_cnt,
                        "metadata.next_chunk_number": next_seq,
                        "metadata.action_required": "NONE",
                        "metadata.otp_required_for_next_chunk": False,
                        "updated_at": now
                    }}
                )
                return {
                    "completed": False,
                    "chunk": chunk["sequence_number"],
                    "completed_amount_bdt": amt_done,
                    "remaining_amount_bdt": rem_amt,
                    "transaction_reference": tx_ref,
                    "cooldown": False,
                    "next_chunk": next_seq,
                    "action_required": "NONE",
                    "message": f"Chunk {chunk['sequence_number']} succeeded."
                }
        else:
            err_msg = result.get("message") or "Transfer failed at operator API."
            err_code = result.get("error_code") or "TRANSFER_FAILED"
            cooldown_sec = result.get("cooldown_seconds", 0)

            if cooldown_sec > 0 or err_code == "OPERATOR_COOLDOWN":
                # Operator cooldown triggered
                next_eligible = now + (cooldown_sec or 1800)
                await self.ledger.update_one(
                    {"transfer_id": chunk["transfer_id"]},
                    {"$set": {
                        "status": "WAITING_FOR_COOLDOWN",
                        "next_retry_at": next_eligible,
                        "error_message": err_msg,
                        "error_code": err_code,
                        "updated_at": now
                    }}
                )
                await self.orders.update_one(
                    {"order_id": order_id},
                    {"$set": {
                        "status": "WAITING_FOR_COOLDOWN",
                        "action_required": "COOLDOWN",
                        "next_action": f"Transfer is waiting for the operator's next allowed transfer window ({cooldown_sec // 60}m).",
                        "metadata.next_retry_at": next_eligible,
                        "metadata.action_required": "COOLDOWN",
                        "updated_at": now
                    }}
                )
                return {
                    "completed": False,
                    "cooldown": True,
                    "seconds_remaining": cooldown_sec or 1800,
                    "action_required": "COOLDOWN",
                    "message": f"Operator requested cooldown: {err_msg}"
                }
            else:
                # Mark failed in ledger
                await self.ledger.update_one(
                    {"transfer_id": chunk["transfer_id"]},
                    {"$set": {
                        "status": "FAILED",
                        "error_message": err_msg,
                        "error_code": err_code,
                        "updated_at": now
                    }}
                )
                parent_order = await self.orders.find_one({"order_id": order_id})
                if parent_order and (parent_order.get("service_type") == ServiceType.RECHARGE or str(parent_order.get("service_type")).upper() == "RECHARGE"):
                    dispatched_sim_id = parent_order.get("metadata", {}).get("dispatched_sim_id")
                    if dispatched_sim_id:
                        recharge_face_val = parent_order.get("metadata", {}).get("recharge_face_value_poisha") or parent_order.get("amount", 0)
                        from app.db.repositories.sims_repo import ReceivingSimsRepository
                        sims_repo = ReceivingSimsRepository(self.db)
                        await sims_repo.release_sim_reservation(dispatched_sim_id, recharge_face_val, is_failure=True)

                # Check if some chunks already succeeded -> partial completion rather than total failure!
                all_chunks = await self.ledger.find({"order_id": order_id}).to_list(length=100)
                completed_chunks = [c for c in all_chunks if c["status"] == "SUCCESS"]
                amt_done = sum(c["chunk_amount_bdt"] for c in completed_chunks)
                rem_amt = sum(c["chunk_amount_bdt"] for c in all_chunks if c["status"] != "SUCCESS")

                new_order_status = "TRANSFER_FAILED" if amt_done == 0 else CashOutStatus.PARTIALLY_COMPLETED.value
                action_req = "RETRY" if amt_done == 0 else "CONTINUE_OR_CANCEL"

                await self.orders.update_one(
                    {"order_id": order_id},
                    {"$set": {
                        "status": new_order_status,
                        "completed_amount_bdt": amt_done,
                        "completed_amount_poisha": amt_done * 100,
                        "remaining_amount_bdt": rem_amt,
                        "remaining_amount_poisha": rem_amt * 100,
                        "action_required": action_req,
                        "metadata.error_code": err_code,
                        "metadata.error_message": err_msg,
                        "metadata.action_required": action_req,
                        "updated_at": now
                    }}
                )
                return {
                    "completed": False,
                    "failed": amt_done == 0,
                    "partially_completed": amt_done > 0,
                    "completed_amount_bdt": amt_done,
                    "remaining_amount_bdt": rem_amt,
                    "error_code": err_code,
                    "action_required": action_req,
                    "message": err_msg
                }

    async def execute_all_eligible_chunks(
        self,
        order_id: str,
        pin: Optional[str] = None,
        session_data: Optional[Dict[str, Any]] = None,
        otp: Optional[str] = None,
        max_iterations: int = 20
    ) -> Dict[str, Any]:
        """
        Executes eligible chunks sequentially until completion, cooldown, OTP required, or error.
        Ensures SESSION_PLUS_PIN operators (e.g. Grameenphone 350 BDT -> 4 chunks) run
        automatically without unnecessary user intervention.
        """
        last_result = await self.execute_next_chunk(
            order_id=order_id, pin=pin, session_data=session_data, otp=otp
        )
        iterations = 1
        while iterations < max_iterations:
            if last_result.get("completed"):
                break
            if last_result.get("otp_required") or last_result.get("cooldown") or last_result.get("failed"):
                break
            if last_result.get("action_required") not in [None, "NONE"]:
                break

            # Execute next chunk automatically under the same authenticated session
            last_result = await self.execute_next_chunk(
                order_id=order_id, pin=pin, session_data=session_data
            )
            iterations += 1

        return last_result

    async def continue_remaining_chunks(
        self,
        order_id: str,
        pin: Optional[str] = None,
        otp: Optional[str] = None,
        session_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Continues execution ONLY from unfinished chunks.
        Never reruns already successful chunks.
        Re-checks live balance, session, quota, count, cooldown, and PIN.
        """
        order = await self.orders.find_one({"order_id": order_id})
        if not order:
            raise ValidationException(f"Order {order_id} not found", code="ORDER_NOT_FOUND")

        operator_code = order["operator_code"]
        source_number = order["mobile_number"]
        adapter = self.session_service.get_adapter(operator_code)

        unfinished = await self.ledger.find(
            {"order_id": order_id, "status": {"$ne": "SUCCESS"}},
            sort=[("sequence_number", 1)]
        ).to_list(length=100)

        if not unfinished:
            all_chunks = await self.ledger.find({"order_id": order_id}).to_list(length=100)
            if all_chunks and all(c["status"] == "SUCCESS" for c in all_chunks):
                await self._mark_order_transfer_complete(order_id)
                return {"completed": True, "message": "All transfer chunks completed successfully."}
            return {"completed": False, "message": "No eligible chunks to continue."}

        if not session_data:
            session_data = await self.session_service.get_session(source_number, operator_code)

        if not session_data:
            await self.orders.update_one(
                {"order_id": order_id},
                {"$set": {
                    "status": CashOutStatus.PARTIALLY_COMPLETED.value,
                    "action_required": "REAUTHENTICATE",
                    "next_action": "Operator session expired. Verify SIM to Continue.",
                    "metadata.action_required": "REAUTHENTICATE",
                    "updated_at": int(time.time())
                }}
            )
            return {
                "completed": False,
                "action_required": "REAUTHENTICATE",
                "message": "Operator session expired. Please verify SIM to continue."
            }

        next_chunk = unfinished[0]

        # 1. Re-check live balance
        try:
            bal_check = await adapter.get_balance(source_number, session_data)
            if bal_check.get("success"):
                live_bal = float(bal_check.get("balance_bdt", 0.0))
                if live_bal < float(next_chunk["chunk_amount_bdt"]):
                    err_text = f"আপনার SIM-এ পর্যাপ্ত ব্যালান্স নেই। বর্তমান ব্যালান্স: ৳{live_bal:.2f} (Insufficient SIM balance: ৳{live_bal:.2f})"
                    return {
                        "completed": False,
                        "failed": False,
                        "action_required": "INSUFFICIENT_BALANCE",
                        "error_code": "INSUFFICIENT_BALANCE",
                        "message": err_text
                    }
        except Exception as e:
            logger.warning("Could not verify live balance during continue: %s", e)

        # 2. Re-check cooldown
        now_ts = int(time.time())
        cooldown_sec = getattr(adapter, "default_cooldown_seconds", 0)
        recent_tx = await self.ledger.find_one(
            {"source_number": source_number, "status": "SUCCESS"},
            sort=[("updated_at", -1)]
        )
        if recent_tx and cooldown_sec > 0:
            last_ts = recent_tx.get("updated_at", 0)
            elapsed = now_ts - last_ts
            if elapsed < cooldown_sec:
                wait_sec = cooldown_sec - elapsed
                return {
                    "completed": False,
                    "cooldown": True,
                    "seconds_remaining": wait_sec,
                    "action_required": "COOLDOWN",
                    "message": f"Waiting for operator cooldown ({wait_sec}s remaining)."
                }

        # 3. Ensure next chunk is ready for execution
        await self.ledger.update_one(
            {"transfer_id": next_chunk["transfer_id"]},
            {"$set": {"status": "PENDING", "next_retry_at": now_ts, "updated_at": now_ts}}
        )

        # 4. Execute eligible chunks automatically
        return await self.execute_all_eligible_chunks(
            order_id=order_id,
            pin=pin,
            session_data=session_data,
            otp=otp
        )

    async def cancel_remaining_chunks(
        self,
        order_id: str,
        pricing_service: Any,
        actor_id: str = "customer"
    ) -> Dict[str, Any]:
        """
        Finalizes only confirmed transfers and cancels uncompleted chunks.
        Recalculates payout authoritatively based ONLY on confirmed received amount.
        Never pays out for unconfirmed/cancelled amounts.
        """
        order = await self.orders.find_one({"order_id": order_id})
        if not order:
            raise ValidationException(f"Order {order_id} not found", code="ORDER_NOT_FOUND")

        now_ts = int(time.time())

        # 1. Cancel all unfinished chunks in ledger
        await self.ledger.update_many(
            {"order_id": order_id, "status": {"$ne": "SUCCESS"}},
            {"$set": {"status": "CANCELLED", "updated_at": now_ts}}
        )

        # 2. Calculate confirmed received amount
        success_chunks = await self.ledger.find(
            {"order_id": order_id, "status": "SUCCESS"}
        ).to_list(length=100)

        confirmed_bdt = sum(c.get("chunk_amount_bdt", 0) for c in success_chunks)
        confirmed_poisha = sum(c.get("chunk_amount_poisha", 0) for c in success_chunks)

        if confirmed_bdt == 0:
            # Nothing was transferred, cancel whole order
            await self.orders.update_one(
                {"order_id": order_id},
                {"$set": {
                    "status": CashOutStatus.CANCELLED.value,
                    "completed_amount_bdt": 0,
                    "remaining_amount_bdt": 0,
                    "action_required": "NONE",
                    "updated_at": now_ts
                }}
            )
            return {
                "cancelled": True,
                "confirmed_amount_bdt": 0,
                "payout_amount_bdt": "0.00",
                "status": CashOutStatus.CANCELLED.value,
                "message": "Order cancelled. No balance was transferred."
            }

        # 3. Recalculate quote authoritatively for confirmed received amount
        operator_code = order["operator_code"]
        new_quote = await pricing_service.calculate_cashout_quote(operator_code, str(confirmed_bdt))

        # 4. Finalize order to TRANSFER_RECEIVED with confirmed received amount
        original_poisha = order.get("amount", 0)
        await self.orders.update_one(
            {"order_id": order_id},
            {"$set": {
                "status": CashOutStatus.TRANSFER_RECEIVED.value,
                "amount": new_quote["source_amount_poisha"],
                "pricing_snapshot": new_quote,
                "transfer_completed_at": now_ts,
                "completed_amount_bdt": confirmed_bdt,
                "completed_amount_poisha": confirmed_poisha,
                "remaining_amount_bdt": 0,
                "remaining_amount_poisha": 0,
                "completed_chunk_count": len(success_chunks),
                "action_required": "NONE",
                "next_action": "Transfer received. Verifying for payout.",
                "metadata.is_partial_settlement": True,
                "metadata.original_requested_amount_poisha": original_poisha,
                "metadata.original_requested_amount_bdt": float(poisha_to_bdt(original_poisha)),
                "metadata.final_settled_amount_poisha": confirmed_poisha,
                "metadata.final_settled_amount_bdt": confirmed_bdt,
                "metadata.recalculated_quote": new_quote,
                "updated_at": now_ts
            }}
        )

        # 5. Update cashout_details collection
        await self.db.cashout_details.update_one(
            {"order_id": order_id},
            {"$set": {
                "source_amount": new_quote["source_amount_poisha"],
                "platform_fee_amount": new_quote["platform_fee_amount_poisha"],
                "payout_amount": new_quote["payout_amount_poisha"],
                "updated_at": now_ts
            }}
        )

        # 6. Record receipt on receiving SIM for the confirmed amount
        rec_sim_id = order.get("metadata", {}).get("receiving_sim_id")
        if rec_sim_id:
            from app.db.repositories.sims_repo import ReceivingSimsRepository
            sims_repo = ReceivingSimsRepository(self.db)
            await sims_repo.record_cashout_receipt(
                receiving_sim_id=rec_sim_id,
                amount_poisha=confirmed_poisha,
                order_id=order_id,
                transaction_reference=f"PARTIAL-{order_id}"
            )

        logger.info(
            "Cash Out order %s partially finalized: %s BDT confirmed, payout: %s BDT",
            order_id, confirmed_bdt, new_quote["payout_amount_bdt"]
        )

        return {
            "cancelled_remaining": True,
            "confirmed_amount_bdt": confirmed_bdt,
            "payout_amount_bdt": str(new_quote["payout_amount_bdt"]),
            "status": CashOutStatus.TRANSFER_RECEIVED.value,
            "message": f"৳{confirmed_bdt} transfer confirmed. Payout of ৳{new_quote['payout_amount_bdt']} submitted for processing."
        }

    async def _mark_order_transfer_complete(self, order_id: str) -> None:
        """Transitions order status once all transfer ledger chunks succeed."""
        order = await self.orders.find_one({"order_id": order_id})
        if not order:
            return

        service_type = order.get("service_type")
        now = int(time.time())

        if service_type == ServiceType.CASH_OUT:
            await self.orders.update_one(
                {"order_id": order_id},
                {"$set": {
                    "status": CashOutStatus.TRANSFER_RECEIVED.value,
                    "transfer_completed_at": now,
                    "updated_at": now
                }}
            )
            rec_sim_id = order.get("metadata", {}).get("receiving_sim_id")
            if rec_sim_id:
                amount_poisha = order.get("amount", 0)
                from app.db.repositories.sims_repo import ReceivingSimsRepository
                sims_repo = ReceivingSimsRepository(self.db)
                await sims_repo.record_cashout_receipt(
                    receiving_sim_id=rec_sim_id,
                    amount_poisha=amount_poisha,
                    order_id=order_id,
                    transaction_reference=order.get("metadata", {}).get("transaction_reference")
                )
            logger.info("Cash Out order %s all chunks received. Status: TRANSFER_RECEIVED", order_id)

        elif service_type == ServiceType.RECHARGE:
            await self.orders.update_one(
                {"order_id": order_id},
                {"$set": {
                    "status": RechargeStatus.COMPLETED.value,
                    "completed_at": now,
                    "updated_at": now
                }}
            )
            dispatched_sim_id = order.get("metadata", {}).get("dispatched_sim_id")
            if dispatched_sim_id:
                recharge_face_value_poisha = order.get("metadata", {}).get("recharge_face_value_poisha") or order.get("amount", 0)
                from app.db.repositories.sims_repo import ReceivingSimsRepository
                sims_repo = ReceivingSimsRepository(self.db)
                adapter = self.session_service.get_adapter(order.get("operator_code", "GP"))
                cooldown_sec = getattr(adapter, "default_cooldown_seconds", 0)
                await sims_repo.confirm_recharge_deduction(
                    receiving_sim_id=dispatched_sim_id,
                    amount_poisha=recharge_face_value_poisha,
                    order_id=order_id,
                    cooldown_seconds=cooldown_sec
                )
            logger.info("Recharge order %s all chunks transferred. Status: COMPLETED", order_id)

    async def get_transfer_progress(self, order_id: str) -> Dict[str, Any]:
        """Returns live chunk progress, cooldown status, and ledger records."""
        chunks = await self.ledger.find({"order_id": order_id}, sort=[("sequence_number", 1)]).to_list(length=100)
        total_chunks = len(chunks)
        completed_chunks = sum(1 for c in chunks if c["status"] == "SUCCESS")
        total_amount_bdt = sum(c["chunk_amount_bdt"] for c in chunks)
        completed_amount_bdt = sum(c["chunk_amount_bdt"] for c in chunks if c["status"] == "SUCCESS")
        remaining_amount_bdt = max(0, total_amount_bdt - completed_amount_bdt)

        now = int(time.time())
        cooldown_chunk = next((c for c in chunks if c["status"] == "WAITING_FOR_COOLDOWN"), None)
        cooldown_remaining = max(0, cooldown_chunk["next_retry_at"] - now) if cooldown_chunk else 0

        order = await self.orders.find_one({"order_id": order_id})
        order_status = order.get("status") if order else "UNKNOWN"
        service_type = order.get("service_type") if order else None
        operator_code = order.get("operator_code") if order else None
        is_recharge = order and (service_type == ServiceType.RECHARGE or str(service_type).upper() == "RECHARGE")

        clean_chunks = []
        for c in chunks:
            c_copy = dict(c)
            c_copy.pop("_id", None)
            if is_recharge:
                c_copy.pop("source_number", None)
            clean_chunks.append(c_copy)

        failed_chunk = next((c for c in chunks if c["status"] == "FAILED"), None)
        is_failed = failed_chunk is not None
        err_code = failed_chunk.get("error_code") if failed_chunk else None
        err_msg = failed_chunk.get("error_message") if failed_chunk else None

        if order_status in ["TRANSFER_FAILED", "FAILED", "INSUFFICIENT_BALANCE"]:
            is_failed = True
            err_code = err_code or order.get("metadata", {}).get("error_code") or order_status
            err_msg = err_msg or order.get("metadata", {}).get("error_message")

        # Determine next chunk number and action required
        unfinished_chunks = [c for c in chunks if c["status"] != "SUCCESS"]
        next_chunk_number = unfinished_chunks[0]["sequence_number"] if unfinished_chunks else None

        otp_chunk = next((c for c in chunks if c["status"] == "WAITING_FOR_OTP"), None)
        action_required = order.get("action_required") or order.get("metadata", {}).get("action_required") or "NONE"
        next_action = order.get("next_action") or order.get("metadata", {}).get("next_action") or "Processing"
        otp_required = order.get("metadata", {}).get("otp_required_for_next_chunk", False) or (otp_chunk is not None)

        if otp_chunk:
            action_required = "OTP_REQUIRED"
            next_action = f"Next {otp_chunk['chunk_amount_bdt']} BDT transfer needs verification."
            otp_required = True
        elif cooldown_remaining > 0:
            action_required = "COOLDOWN"
            next_action = f"Transfer is waiting for the operator's next allowed transfer window ({cooldown_remaining // 60}m)."
        elif completed_chunks > 0 and remaining_amount_bdt > 0:
            if order_status == CashOutStatus.PARTIALLY_COMPLETED.value:
                action_required = "CONTINUE_OR_CANCEL"
                next_action = f"৳{completed_amount_bdt} transferred successfully. ৳{remaining_amount_bdt} remaining."

        customer_status = "Processing"
        if order_status == "WAITING_FOR_SIM":
            customer_status = "Waiting for an available recharge line"
        elif order_status in ["PAYMENT_VERIFIED", "PAYMENT_VERIFIED_AWAITING_INVENTORY"]:
            customer_status = "Payment verified"
        elif order_status in ["COMPLETED", CashOutStatus.TRANSFER_RECEIVED.value]:
            customer_status = "Transfer received"
        elif order_status == CashOutStatus.PARTIALLY_COMPLETED.value:
            customer_status = f"৳{completed_amount_bdt} transferred, ৳{remaining_amount_bdt} remaining"
        elif is_failed:
            customer_status = "Transfer could not be completed"

        return {
            "order_id": order_id,
            "service_type": service_type,
            "operator_code": operator_code,
            "status": order_status,
            "customer_status": customer_status,
            "total_chunks": total_chunks,
            "completed_chunks": completed_chunks,
            "total_amount_bdt": total_amount_bdt,
            "completed_amount_bdt": completed_amount_bdt,
            "remaining_amount_bdt": remaining_amount_bdt,
            "next_chunk_number": next_chunk_number,
            "action_required": action_required,
            "next_action": next_action,
            "otp_required_for_next_chunk": otp_required,
            "is_completed": total_chunks > 0 and completed_chunks == total_chunks,
            "is_failed": is_failed,
            "error_code": err_code,
            "error_message": err_msg,
            "is_cooldown": cooldown_remaining > 0,
            "cooldown_seconds_remaining": cooldown_remaining,
            "view_full_order_url": f"https://www.flexitaka.com/app/order/{order_id}",
            "chunks": clean_chunks
        }

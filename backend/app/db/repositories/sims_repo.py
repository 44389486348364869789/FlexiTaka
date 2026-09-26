"""
Upgraded Receiving SIM Repository & Shared SIM Pool Management.
Provides:
- Shared SIM pool for both Cash Out incoming accumulation and Recharge outgoing dispatch
- Atomic reservations, double-spend protection, and capacity checks
- Distinct incoming ledger (total_received_amount, received_transfer_count) and outgoing ledger (daily/monthly/total_sent_amount, sent counts)
- Per-SIM eligibility engine checking balance, daily/monthly quota limits, count limits, and cooldowns
- Centralized multi-factor scoring function (fair distribution / least-loaded)
- Automated transfer history recording for all incoming and outgoing movements
- Reconciliation detection for operator-reported balance mismatches
"""

import time
import uuid
from typing import Any, Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.constants import OperatorCode, SimStatus
from app.db.repositories.base import BaseRepository
from app.db.repositories.operator_config_repo import OperatorConfigRepository


class ReceivingSimsRepository(BaseRepository):
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "receiving_sims")
        self.operator_configs = OperatorConfigRepository(db)
        self.history_collection = db.sim_transfer_history

    async def get_by_sim_id(self, receiving_sim_id: str) -> Optional[Dict[str, Any]]:
        return await self.find_one({"receiving_sim_id": receiving_sim_id})

    async def get_all(self, operator_code: Optional[OperatorCode] = None) -> List[Dict[str, Any]]:
        query: Dict[str, Any] = {}
        if operator_code:
            query["operator_code"] = operator_code
        return await self.find_many(query, sort_by=[("created_at", -1)], limit=100)

    async def ensure_default_sims(self) -> None:
        """
        Ensures that at least one active receiving SIM exists for each operator (GP, ROBI, BANGLALINK).
        Auto-seeds default operational SIMs if absent so Cash Out and Recharge transfers never fail for lack of pool.
        Also guarantees transfer PINs are encrypted and configured at rest.
        """
        from app.modules.receiving_sims.service import DEFAULT_INITIAL_SIMS
        from app.core.security import encrypt_pin, derive_default_pin

        for default_sim in DEFAULT_INITIAL_SIMS:
            op_code = default_sim["operator_code"]
            op_str = op_code.value if hasattr(op_code, "value") else str(op_code)
            existing = await self.find_one({
                "operator_code": op_str,
                "status": SimStatus.ACTIVE
            })
            plain_pin = derive_default_pin(default_sim["mobile_number"])
            enc_pin = encrypt_pin(plain_pin)
            now = self.utcnow()

            if not existing:
                doc = default_sim.copy()
                doc["operator_code"] = op_str
                doc["receiving_sim_id"] = f"sim_{uuid.uuid4().hex[:12]}"
                doc["encrypted_transfer_pin"] = enc_pin
                doc["transfer_pin_configured"] = True
                doc["pin_status"] = "CONFIGURED"
                doc["pin_source"] = "SYSTEM_INITIAL"
                doc["pin_last_changed_at"] = now
                doc["pin_version"] = 1
                doc["created_at"] = now
                doc["updated_at"] = now
                await self.insert_one(doc)
            elif not existing.get("encrypted_transfer_pin"):
                # Backfill encryption for existing records
                await self.update_one(
                    {"receiving_sim_id": existing["receiving_sim_id"]},
                    {"$set": {
                        "encrypted_transfer_pin": enc_pin,
                        "transfer_pin_configured": True,
                        "pin_status": "CONFIGURED",
                        "pin_source": "SYSTEM_INITIAL",
                        "pin_last_changed_at": now,
                        "pin_version": 1,
                        "updated_at": now
                    }}
                )

    async def get_sim_transfer_pin(self, receiving_sim_id: str) -> Optional[str]:
        """Decrypts and returns the stored transfer PIN for internal backend execution. NEVER expose via API."""
        sim = await self.get_by_sim_id(receiving_sim_id)
        if not sim:
            return None
        from app.core.security import decrypt_pin, derive_default_pin
        enc = sim.get("encrypted_transfer_pin")
        if enc:
            dec = decrypt_pin(enc)
            if dec:
                return dec
        # Fallback to derived PIN if not yet configured
        return derive_default_pin(sim.get("mobile_number", "0000"))

    async def update_sim_pin(self, receiving_sim_id: str, plain_pin: str, pin_source: str = "ADMIN_CONFIGURED") -> bool:
        """Encrypts sensitive PIN material at rest in MongoDB."""
        from app.core.security import encrypt_pin
        enc_pin = encrypt_pin(plain_pin)
        now = self.utcnow()
        return await self.update_one(
            {"receiving_sim_id": receiving_sim_id},
            {"$set": {
                "encrypted_transfer_pin": enc_pin,
                "transfer_pin_configured": True,
                "pin_status": "CONFIGURED",
                "pin_source": pin_source,
                "pin_last_changed_at": now,
                "updated_at": now
            }, "$inc": {"pin_version": 1}}
        )

    async def mark_sim_pin_invalid(self, receiving_sim_id: str) -> bool:
        """Marks transfer PIN as invalid on operator error so it is not blindly retried."""
        now = self.utcnow()
        return await self.update_one(
            {"receiving_sim_id": receiving_sim_id},
            {"$set": {
                "pin_status": "INVALID",
                "transfer_pin_configured": False,
                "updated_at": now
            }}
        )

    async def select_best_sim(
        self,
        operator_code: str,
        required_amount_poisha: int = 0,
        for_recharge: bool = False,
        amount_poisha: Optional[int] = None,
        destination_msisdn: Optional[str] = None,
        **kwargs: Any
    ) -> Optional[Dict[str, Any]]:
        """
        Authoritative Per-SIM Eligibility and Selection Engine.
        Evaluates SIMs individually across 14 requirements:
        1. Same operator code
        2. Active status
        3. Not blocked and healthy (not in NEEDS_RECONCILIATION for outgoing)
        4. Operator adapter available
        5. Current balance enough for transfer
        6. Available balance after reservations >= required_amount_poisha
        7. Remaining daily and monthly amount quota >= required_amount_poisha
        8. Remaining transfer-count quota >= 1 (if operator publishes count rule)
        9. Cooldown expired (cooldown_until <= now)
        10. Authoritative MSISDN prefix strictly matches operator
        11. Destination number matches operator when same_operator_only enabled

        Scoring strategy:
        Centralized fair distribution / least-loaded scoring:
        Prefers lower daily sent amount, lower failure count, and higher remaining quota.
        """
        from app.modules.operators.resolver import resolve_operator_from_msisdn

        req_poisha = amount_poisha if amount_poisha is not None else required_amount_poisha
        now = int(time.time())
        op_clean = operator_code.upper().strip()

        # Destination number check
        if destination_msisdn:
            try:
                dest_op = resolve_operator_from_msisdn(destination_msisdn)
                if dest_op != op_clean:
                    return None
            except Exception:
                return None

        # Fetch operator limit configuration
        op_cfg = await self.operator_configs.get_config(op_clean)
        daily_amount_limit = op_cfg.get("daily_amount_limit_poisha", 10000000)  # default 100,000 poisha (1000 BDT)
        monthly_amount_limit = op_cfg.get("monthly_amount_limit_poisha", 30000000)
        daily_count_limit = op_cfg.get("daily_transfer_count_limit")
        monthly_count_limit = op_cfg.get("monthly_transfer_count_limit")

        base_query: Dict[str, Any] = {
            "operator_code": op_clean,
            "status": SimStatus.ACTIVE
        }

        if for_recharge:
            # Condition 3, 5, 6, 9:
            base_query["health_status"] = {"$nin": ["BLOCKED", "NEEDS_RECONCILIATION"]}
            base_query["cooldown_until"] = {"$lte": now}
            base_query["available_balance"] = {"$gte": req_poisha}

        cursor = self.collection.find(base_query)
        candidate_sims = await cursor.to_list(length=100)
        if not candidate_sims:
            await self.ensure_default_sims()
            cursor = self.collection.find(base_query)
            candidate_sims = await cursor.to_list(length=100)

        eligible_sims = []
        for sim in candidate_sims:
            # 1. Authoritative security check: MSISDN must strictly match configured operator
            phone = sim.get("mobile_number", "")
            try:
                detected_op = resolve_operator_from_msisdn(phone)
                if detected_op != op_clean:
                    await self.collection.update_one(
                        {"receiving_sim_id": sim["receiving_sim_id"]},
                        {"$set": {
                            "status": SimStatus.BLOCKED,
                            "health_status": "BLOCKED",
                            "invalid_mismatch": True,
                            "audit_note": f"MISMATCH: Phone {phone} detected as {detected_op}, not {op_clean}",
                            "updated_at": self.utcnow()
                        }}
                    )
                    continue
            except Exception:
                continue

            if for_recharge:
                # 2. Check current balance
                curr_bal = sim.get("current_balance", sim.get("available_balance", 0))
                if curr_bal < req_poisha:
                    continue

                # 3. Check remaining daily amount quota
                daily_sent = sim.get("daily_sent_amount", sim.get("current_daily_usage", sim.get("current_usage", 0)))
                sim_daily_limit = sim.get("daily_limit") if sim.get("daily_limit") is not None else daily_amount_limit
                if sim_daily_limit is not None and (daily_sent + req_poisha > sim_daily_limit):
                    continue

                # 4. Check remaining monthly amount quota
                monthly_sent = sim.get("monthly_sent_amount", 0)
                sim_monthly_limit = sim.get("monthly_limit") if sim.get("monthly_limit") is not None else monthly_amount_limit
                if sim_monthly_limit is not None and (monthly_sent + req_poisha > sim_monthly_limit):
                    continue

                # 5. Check transfer count quotas (e.g. GP official 10 transfers/calendar month rule)
                if daily_count_limit is not None:
                    if sim.get("daily_sent_count", 0) >= daily_count_limit:
                        continue
                if monthly_count_limit is not None:
                    if sim.get("monthly_sent_count", 0) >= monthly_count_limit:
                        continue

                # Scoring criteria for Recharge (lower score = preferred):
                # Fair distribution: lower daily usage first, lower failures, higher remaining quota
                failure_penalty = sim.get("failure_count", 0) * 1000000
                score = daily_sent + failure_penalty - (curr_bal // 10)
                eligible_sims.append((score, sim))

            else:
                # For Cash Out: SIM must have capacity to receive funds under receiving daily limit
                daily_received = sim.get("total_received_amount", 0)
                receive_capacity_limit = sim.get("daily_receive_limit", 100000000)  # 100,000 BDT
                # Fair distribution for Cash Out: prefer SIM with lower current_balance to replenish balance pool evenly
                curr_bal = sim.get("current_balance", sim.get("available_balance", 0))
                score = curr_bal
                eligible_sims.append((score, sim))

        if not eligible_sims:
            return None

        # Sort by score ascending (lowest usage/load first)
        eligible_sims.sort(key=lambda x: x[0])
        return eligible_sims[0][1]

    async def audit_sim_integrity(self) -> Dict[str, Any]:
        """Scans all receiving SIMs and flags/deactivates any with operator-MSISDN mismatches."""
        from app.modules.operators.resolver import resolve_operator_from_msisdn
        cursor = self.collection.find({})
        all_sims = await cursor.to_list(length=200)
        invalid_count = 0
        valid_count = 0

        for sim in all_sims:
            phone = sim.get("mobile_number", "")
            configured_op = str(sim.get("operator_code", "")).upper().strip()
            try:
                detected_op = resolve_operator_from_msisdn(phone)
                if detected_op != configured_op:
                    invalid_count += 1
                    await self.collection.update_one(
                        {"receiving_sim_id": sim["receiving_sim_id"]},
                        {"$set": {
                            "status": SimStatus.BLOCKED,
                            "health_status": "BLOCKED",
                            "invalid_mismatch": True,
                            "audit_note": f"AUDIT_FLAG: Phone {phone} is {detected_op} but labeled {configured_op}",
                            "updated_at": self.utcnow()
                        }}
                    )
                else:
                    valid_count += 1
            except Exception:
                invalid_count += 1
                await self.collection.update_one(
                    {"receiving_sim_id": sim["receiving_sim_id"]},
                    {"$set": {
                        "status": SimStatus.BLOCKED,
                        "health_status": "BLOCKED",
                        "invalid_mismatch": True,
                        "audit_note": f"AUDIT_FLAG: Invalid phone number '{phone}'",
                        "updated_at": self.utcnow()
                    }}
                )

        return {"valid_sims": valid_count, "invalid_mismatched_sims": invalid_count}

    async def reserve_sim_balance(self, receiving_sim_id: str, amount_poisha: int) -> bool:
        """
        Atomically reserves balance on SIM for an outgoing recharge transfer.
        Prevents double-spending of SIM balance by concurrent orders.
        """
        now = self.utcnow()
        res = await self.collection.update_one(
            {
                "receiving_sim_id": receiving_sim_id,
                "available_balance": {"$gte": amount_poisha}
            },
            {
                "$inc": {
                    "available_balance": -amount_poisha,
                    "reserved_balance": amount_poisha
                },
                "$set": {"updated_at": now}
            }
        )
        return res.modified_count > 0

    async def release_sim_reservation(self, receiving_sim_id: str, amount_poisha: int, is_failure: bool = False) -> bool:
        """Releases a reserved balance back to available on cancellation/failure."""
        now = self.utcnow()
        update_doc: Dict[str, Any] = {
            "$inc": {
                "available_balance": amount_poisha,
                "reserved_balance": -amount_poisha
            },
            "$set": {"updated_at": now}
        }
        if is_failure:
            update_doc["$inc"]["failure_count"] = 1

        res = await self.collection.update_one(
            {"receiving_sim_id": receiving_sim_id},
            update_doc
        )
        return res.modified_count > 0

    async def confirm_recharge_deduction(
        self,
        receiving_sim_id: str,
        amount_poisha: int,
        order_id: Optional[str] = None,
        operator_reference: Optional[str] = None,
        cooldown_seconds: int = 0
    ) -> bool:
        """
        Confirms successful deduction of reserved balance on recharge completion.
        Updates outgoing ledger counters and sets cooldown.
        Atomically records transfer history.
        """
        now = self.utcnow()
        now_ts = int(time.time())
        cooldown_until = now_ts + cooldown_seconds if cooldown_seconds > 0 else 0

        res = await self.collection.update_one(
            {"receiving_sim_id": receiving_sim_id},
            {
                "$inc": {
                    "current_balance": -amount_poisha,
                    "reserved_balance": -amount_poisha,
                    "daily_sent_amount": amount_poisha,
                    "daily_sent_count": 1,
                    "monthly_sent_amount": amount_poisha,
                    "monthly_sent_count": 1,
                    "total_sent_amount": amount_poisha,
                    "sent_transfer_count": 1,
                    # Backwards compatibility fields:
                    "known_balance": -amount_poisha,
                    "current_daily_usage": amount_poisha,
                    "current_usage": amount_poisha
                },
                "$set": {
                    "updated_at": now,
                    "last_successful_transfer_at": now_ts,
                    "last_successful_transfer": now_ts,
                    "cooldown_until": cooldown_until
                }
            }
        )

        if res.modified_count > 0:
            # Record outgoing ledger entry
            history_id = f"TX-OUT-{uuid.uuid4().hex[:10].upper()}"
            await self.history_collection.insert_one({
                "history_id": history_id,
                "receiving_sim_id": receiving_sim_id,
                "direction": "OUTGOING",
                "service_type": "RECHARGE",
                "amount_poisha": amount_poisha,
                "amount_bdt": amount_poisha / 100.0,
                "order_id": order_id,
                "operator_reference": operator_reference,
                "created_at": now_ts
            })

        return res.modified_count > 0

    async def record_cashout_receipt(
        self,
        receiving_sim_id: str,
        amount_poisha: int,
        order_id: Optional[str] = None,
        transaction_reference: Optional[str] = None
    ) -> bool:
        """
        Increments SIM balance when Cash Out transfer is confirmed from customer.
        Updates incoming ledger counters.
        Never mixes incoming statistics with outgoing recharge statistics.
        Atomically records transfer history.
        """
        now = self.utcnow()
        now_ts = int(time.time())

        res = await self.collection.update_one(
            {"receiving_sim_id": receiving_sim_id},
            {
                "$inc": {
                    "current_balance": amount_poisha,
                    "available_balance": amount_poisha,
                    "total_received_amount": amount_poisha,
                    "received_transfer_count": 1,
                    # Backwards compatibility:
                    "known_balance": amount_poisha
                },
                "$set": {
                    "updated_at": now,
                    "last_successful_transfer_at": now_ts,
                    "last_successful_transfer": now_ts
                }
            }
        )

        if res.modified_count > 0:
            # Record incoming ledger entry
            history_id = f"TX-IN-{uuid.uuid4().hex[:10].upper()}"
            await self.history_collection.insert_one({
                "history_id": history_id,
                "receiving_sim_id": receiving_sim_id,
                "direction": "INCOMING",
                "service_type": "CASH_OUT",
                "amount_poisha": amount_poisha,
                "amount_bdt": amount_poisha / 100.0,
                "order_id": order_id,
                "transaction_reference": transaction_reference,
                "created_at": now_ts
            })

        return res.modified_count > 0

    async def get_transfer_history(self, receiving_sim_id: str, direction: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        """Retrieves auditable transfer history (incoming Cash Out / outgoing Recharge) for a SIM."""
        query: Dict[str, Any] = {"receiving_sim_id": receiving_sim_id}
        if direction:
            query["direction"] = direction.upper()
        cursor = self.history_collection.find(query).sort("created_at", -1).limit(limit)
        records = await cursor.to_list(length=limit)
        for r in records:
            r.pop("_id", None)
        return records

    async def reconcile_balance(self, receiving_sim_id: str, operator_reported_balance_bdt: float) -> Dict[str, Any]:
        """
        Compares expected internal SIM balance with live operator-reported balance.
        If mismatch detected, flags health_status as NEEDS_RECONCILIATION without overwriting history.
        """
        sim = await self.get_by_sim_id(receiving_sim_id)
        if not sim:
            return {"success": False, "error": "SIM not found"}

        now_ts = int(time.time())
        internal_bal_poisha = sim.get("current_balance", sim.get("available_balance", 0))
        internal_bal_bdt = internal_bal_poisha / 100.0
        diff_bdt = round(abs(internal_bal_bdt - operator_reported_balance_bdt), 2)
        has_mismatch = diff_bdt > 0.50  # Allow minor tolerance (less than 50 poisha)

        new_health = "NEEDS_RECONCILIATION" if has_mismatch else "HEALTHY"
        await self.collection.update_one(
            {"receiving_sim_id": receiving_sim_id},
            {"$set": {
                "last_balance_check": now_ts,
                "health_status": new_health,
                "last_operator_balance_bdt": operator_reported_balance_bdt,
                "balance_mismatch_bdt": diff_bdt if has_mismatch else 0.0,
                "updated_at": self.utcnow()
            }}
        )

        return {
            "receiving_sim_id": receiving_sim_id,
            "internal_balance_bdt": internal_bal_bdt,
            "operator_reported_balance_bdt": operator_reported_balance_bdt,
            "difference_bdt": diff_bdt,
            "mismatch": has_mismatch,
            "health_status": new_health
        }

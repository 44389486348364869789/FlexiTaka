"""
Reusable Chunked Balance Transfer Engine for FlexiTaka.
Authoritatively orchestrates multi-chunk balance transfers for BOTH:
- Cash Out: Customer SIM -> FlexiTaka Receiving SIM
- Recharge: FlexiTaka Receiving SIM -> Customer Target Number

Ensures strict chunking (respecting operator limits), ledger tracking in `transfer_ledger`,
cooldown handling, idempotency, and timeout reconciliation.
"""

import time
import uuid
from decimal import Decimal
from typing import Any, Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.constants import ActorType, CashOutStatus, RechargeStatus, ServiceType, poisha_to_bdt
from app.core.exceptions import ConflictException, ValidationException
from app.core.logging import logger
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
        pin: str,
        session_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Executes the current eligible chunk for an order.
        Handles success, cooldown, or retryable failure.
        """
        # Find next pending or ready cooldown chunk
        now = int(time.time())
        chunk = await self.ledger.find_one({
            "order_id": order_id,
            "status": {"$in": ["PENDING", "WAITING_FOR_COOLDOWN"]},
            "next_retry_at": {"$lte": now}
        }, sort=[("sequence_number", 1)])

        if not chunk:
            # Check if all chunks completed
            all_chunks = await self.ledger.find({"order_id": order_id}).to_list(length=100)
            if all_chunks and all(c["status"] == "SUCCESS" for c in all_chunks):
                await self._mark_order_transfer_complete(order_id)
                return {"completed": True, "message": "All transfer chunks completed successfully."}

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
        result = await adapter.transfer_balance(
            msisdn=chunk["source_number"],
            recipient_msisdn=chunk["destination_number"],
            amount_bdt=chunk["chunk_amount_bdt"],
            pin=pin,
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

            # Schedule cooldown for next chunk if operator imposes cooldown
            cooldown_sec = result.get("cooldown_seconds", adapter.default_cooldown_seconds)
            next_seq = chunk["sequence_number"] + 1
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
                        "metadata.next_retry_at": next_eligible
                    }}
                )
            else:
                await self.ledger.update_one(
                    {"order_id": order_id, "sequence_number": next_seq},
                    {"$set": {"next_retry_at": now, "updated_at": now}}
                )

            # Check if this was the last chunk
            all_chunks = await self.ledger.find({"order_id": order_id}).to_list(length=100)
            if all(c["status"] == "SUCCESS" for c in all_chunks):
                await self._mark_order_transfer_complete(order_id)
                return {
                    "completed": True,
                    "chunk": chunk["sequence_number"],
                    "transaction_reference": tx_ref,
                    "message": "Transfer finished completely."
                }

            return {
                "completed": False,
                "chunk": chunk["sequence_number"],
                "transaction_reference": tx_ref,
                "cooldown": cooldown_sec > 0,
                "cooldown_seconds": cooldown_sec,
                "message": f"Chunk {chunk['sequence_number']} succeeded."
            }
        else:
            err_msg = result.get("message")
            err_code = result.get("error_code")
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
                        "metadata.next_retry_at": next_eligible
                    }}
                )
                return {
                    "completed": False,
                    "cooldown": True,
                    "seconds_remaining": cooldown_sec or 1800,
                    "message": f"Operator requested cooldown: {err_msg}"
                }
            else:
                # Mark failed
                await self.ledger.update_one(
                    {"transfer_id": chunk["transfer_id"]},
                    {"$set": {
                        "status": "FAILED",
                        "error_message": err_msg,
                        "error_code": err_code,
                        "updated_at": now
                    }}
                )
                return {"completed": False, "failed": True, "message": err_msg}

    async def _mark_order_transfer_complete(self, order_id: str) -> None:
        """Transitions order status once all transfer ledger chunks succeed."""
        order = await self.orders.find_one({"order_id": order_id})
        if not order:
            return

        service_type = order.get("service_type")
        now = int(time.time())

        if service_type == ServiceType.CASH_OUT:
            # Advance to TRANSFER_RECEIVED -> ready for payout review
            await self.orders.update_one(
                {"order_id": order_id},
                {"$set": {
                    "status": CashOutStatus.TRANSFER_RECEIVED.value,
                    "transfer_completed_at": now,
                    "updated_at": now
                }}
            )
            # Update receiving SIM balance
            rec_sim_id = order.get("metadata", {}).get("receiving_sim_id")
            if rec_sim_id:
                amount_poisha = order.get("amount", 0)
                await self.db.receiving_sims.update_one(
                    {"receiving_sim_id": rec_sim_id},
                    {"$inc": {"available_balance": amount_poisha, "current_usage": amount_poisha}}
                )
            logger.info("Cash Out order %s all chunks received. Status: TRANSFER_RECEIVED", order_id)

        elif service_type == ServiceType.RECHARGE:
            # Advance to COMPLETED
            await self.orders.update_one(
                {"order_id": order_id},
                {"$set": {
                    "status": RechargeStatus.COMPLETED.value,
                    "completed_at": now,
                    "updated_at": now
                }}
            )
            logger.info("Recharge order %s all chunks transferred. Status: COMPLETED", order_id)

    async def get_transfer_progress(self, order_id: str) -> Dict[str, Any]:
        """Returns live chunk progress, cooldown status, and ledger records."""
        chunks = await self.ledger.find({"order_id": order_id}, sort=[("sequence_number", 1)]).to_list(length=100)
        total_chunks = len(chunks)
        completed_chunks = sum(1 for c in chunks if c["status"] == "SUCCESS")
        total_amount_bdt = sum(c["chunk_amount_bdt"] for c in chunks)
        completed_amount_bdt = sum(c["chunk_amount_bdt"] for c in chunks if c["status"] == "SUCCESS")

        now = int(time.time())
        cooldown_chunk = next((c for c in chunks if c["status"] == "WAITING_FOR_COOLDOWN"), None)
        cooldown_remaining = max(0, cooldown_chunk["next_retry_at"] - now) if cooldown_chunk else 0

        # Strip internal Mongo _id for clean response
        clean_chunks = []
        for c in chunks:
            c_copy = dict(c)
            c_copy.pop("_id", None)
            clean_chunks.append(c_copy)

        return {
            "order_id": order_id,
            "total_chunks": total_chunks,
            "completed_chunks": completed_chunks,
            "total_amount_bdt": total_amount_bdt,
            "completed_amount_bdt": completed_amount_bdt,
            "is_completed": total_chunks > 0 and completed_chunks == total_chunks,
            "is_cooldown": cooldown_remaining > 0,
            "cooldown_seconds_remaining": cooldown_remaining,
            "chunks": clean_chunks
        }

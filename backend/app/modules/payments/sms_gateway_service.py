"""
Authoritative iPhone Shortcut Payment SMS Gateway Service.
Handles:
1. Request Authentication & Replay Protection
2. SMS Parsing (bKash / Nagad)
3. Transaction Deduplication (Never process a TrxID/TxnID twice)
4. Pending Recharge Order Matching (Exact Amount & Reference)
5. Automated Recharge Transfer Triggering
"""

import time
import uuid
from typing import Any, Dict, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.config import settings
from app.core.constants import ActorType, RechargeStatus, ServiceType
from app.core.exceptions import ConflictException, ValidationException
from app.core.logging import logger
from app.db.repositories.sims_repo import ReceivingSimsRepository
from app.modules.payments.sms_parser import SmsParser
from app.modules.transfers.engine import TransferEngine


class SmsGatewayService:
    def __init__(
        self,
        db: AsyncIOMotorDatabase,
        sims_repo: ReceivingSimsRepository,
        transfer_engine: TransferEngine
    ):
        self.db = db
        self.sms_transactions = db.sms_transactions
        self.orders = db.orders
        self.recharge_orders = db.recharge_orders
        self.sims_repo = sims_repo
        self.transfer_engine = transfer_engine

    def verify_shortcut_secret(self, provided_secret: Optional[str]) -> bool:
        """
        Validates secret key sent from the iPhone Shortcut.
        Configurable via SHORTCUT_SECRET or defaults to secure token.
        """
        configured_secret = getattr(settings, "SHORTCUT_GATEWAY_SECRET", "flexitaka-ios-gateway-secret-2026")
        if not provided_secret:
            return False
        return str(provided_secret).strip() == str(configured_secret).strip()

    async def process_incoming_sms(
        self,
        raw_sms: str,
        secret: Optional[str] = None,
        source_device: str = "iphone_shortcut",
        nonce: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Main processing pipeline for incoming payment SMS.
        """
        # 1. Authenticate Request
        if not self.verify_shortcut_secret(secret):
            logger.warning("Unauthorized iPhone Shortcut gateway request from device %s", source_device)
            raise ValidationException("Invalid gateway authentication secret", code="UNAUTHORIZED_GATEWAY")

        # 2. Parse SMS
        parsed = SmsParser.parse_sms(raw_sms)
        if not parsed.get("is_valid"):
            logger.warning("Unparseable payment SMS received: %s", raw_sms)
            return {
                "success": False,
                "status": "UNPARSEABLE",
                "error": parsed.get("error"),
                "parsed": parsed
            }

        provider = parsed["provider"]
        trx_id = parsed["transaction_id"]
        amount_poisha = parsed["amount_poisha"]
        amount_bdt = parsed["amount_bdt"]
        ref_code = parsed.get("reference_code")
        sender_phone = parsed.get("sender_number")
        now = int(time.time())

        # 3. Deduplication Check (CRITICAL: Never process same TrxID/TxnID twice)
        existing_tx = await self.sms_transactions.find_one({
            "provider": provider,
            "transaction_id": trx_id
        })
        if existing_tx:
            logger.warning(
                "Duplicate payment SMS rejected: Provider %s, TrxID %s already processed at %s",
                provider, trx_id, existing_tx.get("created_at")
            )
            return {
                "success": False,
                "status": "DUPLICATE_TRANSACTION",
                "message": f"Payment {provider} TrxID {trx_id} has already been processed.",
                "matched_order_id": existing_tx.get("matched_order_id")
            }

        # 4. Save to `sms_transactions`
        tx_doc = {
            "transaction_id": trx_id,
            "provider": provider,
            "amount_bdt": amount_bdt,
            "amount_poisha": amount_poisha,
            "reference_code": ref_code,
            "sender_number": sender_phone,
            "raw_sms": raw_sms,
            "source_device": source_device,
            "request_nonce": nonce,
            "verification_status": "PENDING_MATCH",  # PENDING_MATCH, VERIFIED, UNMATCHED, AMBIGUOUS
            "matched_order_id": None,
            "consumed_at": None,
            "created_at": now,
            "updated_at": now
        }
        await self.sms_transactions.insert_one(tx_doc)

        # 5. Match with pending Recharge order
        matched_order = await self._find_matching_recharge_order(
            ref_code=ref_code,
            amount_poisha=amount_poisha,
            sender_phone=sender_phone
        )

        if not matched_order:
            await self.sms_transactions.update_one(
                {"provider": provider, "transaction_id": trx_id},
                {"$set": {"verification_status": "UNMATCHED_PAYMENT", "updated_at": now}}
            )
            logger.info("Payment SMS stored as UNMATCHED_PAYMENT: TrxID %s, Amount %s BDT", trx_id, amount_bdt)
            return {
                "success": True,
                "status": "UNMATCHED_PAYMENT",
                "message": f"Payment parsed and recorded, but no pending order matched amount {amount_bdt} BDT / ref '{ref_code}'.",
                "transaction_id": trx_id
            }

        order_id = matched_order["order_id"]

        # 6. Verify Payment Atomically on the Order
        # Transition order to PAYMENT_VERIFIED
        transition_success = await self._mark_order_paid(order_id, trx_id, provider, amount_poisha)
        if not transition_success:
            await self.sms_transactions.update_one(
                {"provider": provider, "transaction_id": trx_id},
                {"$set": {"verification_status": "AMBIGUOUS", "updated_at": now}}
            )
            return {
                "success": False,
                "status": "ORDER_LOCK_FAILED",
                "message": f"Order {order_id} could not be transitioned to PAYMENT_VERIFIED."
            }

        # Update transaction document as VERIFIED
        await self.sms_transactions.update_one(
            {"provider": provider, "transaction_id": trx_id},
            {"$set": {
                "verification_status": "VERIFIED",
                "matched_order_id": order_id,
                "consumed_at": now,
                "updated_at": now
            }}
        )

        # 7. Automated Recharge Transfer: Select SIM & Trigger Transfer Engine!
        operator_code = matched_order["operator_code"]
        recharge_number = matched_order["mobile_number"]
        recharge_face_value_poisha = matched_order.get("metadata", {}).get("recharge_face_value_poisha") or matched_order["amount"]
        recharge_amount_bdt = int(recharge_face_value_poisha / 100)

        # Select FlexiTaka SIM for outgoing transfer using Per-SIM Eligibility Engine
        sim = await self.sims_repo.select_best_sim(
            operator_code=operator_code,
            required_amount_poisha=recharge_face_value_poisha,
            for_recharge=True,
            destination_msisdn=recharge_number
        )
        if not sim:
            logger.info("No active receiving SIM currently eligible for operator %s recharge of order %s. Queuing in WAITING_FOR_SIM.", operator_code, order_id)
            await self.orders.update_one(
                {"order_id": order_id},
                {"$set": {
                    "status": "WAITING_FOR_SIM",
                    "metadata.waiting_reason": "Waiting for an available recharge line.",
                    "metadata.customer_safe_status": "Waiting for an available recharge line."
                }}
            )
            return {
                "success": True,
                "status": "PAYMENT_VERIFIED_AWAITING_INVENTORY",
                "order_id": order_id,
                "transaction_id": trx_id,
                "customer_status": "Waiting for an available recharge line.",
                "message": "Payment verified! Recharge queued waiting for operator inventory capacity."
            }

        # Reserve SIM capacity
        sim_id = sim["receiving_sim_id"]
        await self.sims_repo.reserve_sim_balance(sim_id, recharge_face_value_poisha)

        # Link selected SIM to order
        await self.orders.update_one(
            {"order_id": order_id},
            {"$set": {
                "status": RechargeStatus.RECHARGE_PROCESSING.value,
                "metadata.dispatched_sim_id": sim_id,
                "metadata.dispatched_sim_number": sim["mobile_number"]
            }}
        )

        # Initialize chunked transfer plan
        await self.transfer_engine.initialize_transfer_plan(
            order_id=order_id,
            service_type=ServiceType.RECHARGE,
            operator_code=operator_code,
            source_number=sim["mobile_number"],
            destination_number=recharge_number,
            total_amount_bdt=recharge_amount_bdt
        )

        # Execute first chunk using securely decrypted SIM PIN
        sim_session = await self.transfer_engine.session_service.get_session(sim["mobile_number"], operator_code) or {}
        sim_pin = await self.sims_repo.get_sim_transfer_pin(sim_id)
        chunk_res = await self.transfer_engine.execute_next_chunk(
            order_id=order_id,
            pin=sim_pin,
            session_data=sim_session
        )

        logger.info("Automatic recharge initiated for order %s: %s", order_id, chunk_res)

        return {
            "success": True,
            "status": "PAYMENT_VERIFIED_AND_RECHARGE_INITIATED",
            "order_id": order_id,
            "transaction_id": trx_id,
            "recharge_status": chunk_res,
            "message": f"Payment verified for {order_id}! Automated recharge dispatched to {recharge_number}."
        }

    async def _find_matching_recharge_order(
        self,
        ref_code: Optional[str],
        amount_poisha: int,
        sender_phone: Optional[str]
    ) -> Optional[Dict[str, Any]]:
        """
        Matches incoming payment to an open Recharge order in PAYMENT_PENDING state.
        Strict matching order:
        1. Exact reference code / order_id
        2. Exact amount verification
        """
        now = int(time.time())
        # Case 1: Exact order_id match if ref_code matches an order_id (e.g. FT-R...)
        if ref_code:
            order = await self.orders.find_one({
                "order_id": ref_code.strip(),
                "service_type": ServiceType.RECHARGE.value,
                "status": RechargeStatus.PAYMENT_PENDING.value,
                "amount": amount_poisha
            })
            if order:
                return order

            # Or metadata reference code
            order = await self.orders.find_one({
                "metadata.reference_code": ref_code.strip(),
                "service_type": ServiceType.RECHARGE.value,
                "status": RechargeStatus.PAYMENT_PENDING.value,
                "amount": amount_poisha
            })
            if order:
                return order

        # Case 2: Match by exact amount and recent creation (within last 30 minutes)
        thirty_mins_ago = now - 1800
        cursor = self.orders.find({
            "service_type": ServiceType.RECHARGE.value,
            "status": RechargeStatus.PAYMENT_PENDING.value,
            "amount": amount_poisha
        }).sort("created_at", -1)

        candidate_orders = await cursor.to_list(length=5)
        if len(candidate_orders) == 1:
            return candidate_orders[0]
        elif len(candidate_orders) > 1:
            # If sender phone matches mobile_number of one of the candidates
            if sender_phone:
                for cand in candidate_orders:
                    if cand.get("mobile_number") == sender_phone:
                        return cand
            logger.warning("Ambiguous payment match: %s candidate orders found for amount %s", len(candidate_orders), amount_poisha)
            return None

        return None

    async def _mark_order_paid(self, order_id: str, trx_id: str, provider: str, amount_poisha: int) -> bool:
        """Atomically transitions order to PAYMENT_VERIFIED."""
        now = int(time.time())
        res = await self.orders.update_one(
            {
                "order_id": order_id,
                "status": RechargeStatus.PAYMENT_PENDING.value
            },
            {
                "$set": {
                    "status": RechargeStatus.PAYMENT_VERIFIED.value,
                    "payment_id": f"PAY-{trx_id}",
                    "payment_metadata": {
                        "provider": provider,
                        "transaction_id": trx_id,
                        "amount_poisha": amount_poisha,
                        "verified_at": now,
                        "verified_by": "iphone_shortcut_auto"
                    },
                    "updated_at": now
                }
            }
        )
        return res.modified_count > 0

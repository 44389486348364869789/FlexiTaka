"""
Authoritative Cash Out Business Flow Service.
Automated SIM Balance -> Liquid Payout Workflow.
Integrates Reusable Transfer Engine for automated chunked balance transfers from customer SIM.
"""

from decimal import Decimal
import time
from typing import Any, Dict, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.config import settings
from app.core.constants import (
    ActorType, CashOutStatus, ErrorCode, ServiceType,
    bdt_to_poisha, poisha_to_bdt
)
from app.core.exceptions import ConflictException, NotFoundException, ValidationException
from app.core.logging import logger
from app.core.security import generate_order_id, generate_tracking_token
from app.db.repositories.cashout_repo import CashOutRepository
from app.db.repositories.orders_repo import OrdersRepository
from app.db.repositories.sims_repo import ReceivingSimsRepository
from app.modules.operators.resolver import normalize_msisdn
from app.modules.operators.session_manager import OperatorSessionService
from app.modules.pricing.service import PricingService
from app.modules.transfers.engine import TransferEngine


class CashOutService:
    def __init__(
        self,
        orders_repo: OrdersRepository,
        cashout_repo: CashOutRepository,
        sims_repo: ReceivingSimsRepository,
        pricing_service: PricingService,
        db: Optional[AsyncIOMotorDatabase] = None
    ):
        self.orders_repo = orders_repo
        self.cashout_repo = cashout_repo
        self.sims_repo = sims_repo
        self.pricing_service = pricing_service
        self.db = db if db is not None else orders_repo.db
        self.session_service = OperatorSessionService(self.db)
        self.transfer_engine = TransferEngine(self.db, self.session_service)

    async def create_cashout_order(
        self,
        operator_code: str,
        source_mobile_number: str,
        amount_bdt: str,
        payout_method: str,
        payout_account: str,
        pin: Optional[str] = None,
        user_id: Optional[str] = None,
        guest_session_id: Optional[str] = None
    ) -> Dict[str, Any]:
        if not user_id and not guest_session_id:
            raise ValidationException("Either user_id or guest_session_id is required", code=ErrorCode.AUTH_REQUIRED)

        source_phone = normalize_msisdn(source_mobile_number)
        num_amount = int(float(amount_bdt))

        # 1. Authoritative Pricing Quote
        quote = await self.pricing_service.calculate_cashout_quote(operator_code, amount_bdt)

        # 2. Server-side Receiving SIM Selection
        receiving_sim = await self.sims_repo.select_best_sim(operator_code, quote["source_amount_poisha"])
        receiving_sim_id = receiving_sim["receiving_sim_id"] if receiving_sim else None
        receiving_number = receiving_sim["mobile_number"] if receiving_sim else "01700000000"
        sim_label = receiving_sim.get("label", f"{operator_code} Central Receiver") if receiving_sim else f"{operator_code} Receiver"

        order_id = generate_order_id()
        transfer_pin = pin or source_phone[-4:]  # Standard requirement: last 4 digits of SIM number

        pricing_snapshot = {
            "source_amount_bdt": str(quote["source_amount_bdt"]),
            "source_amount_poisha": quote["source_amount_poisha"],
            "platform_fee_rate": str(quote["platform_fee_rate"]),
            "platform_fee_amount_bdt": str(quote["platform_fee_amount_bdt"]),
            "platform_fee_amount_poisha": quote["platform_fee_amount_poisha"],
            "payout_amount_bdt": str(quote["payout_amount_bdt"]),
            "payout_amount_poisha": quote["payout_amount_poisha"],
            "pricing_rule_version": quote["pricing_rule_version"]
        }

        # 3. Create Primary Order Record
        order_doc = {
            "order_id": order_id,
            "service_type": ServiceType.CASH_OUT,
            "user_id": user_id,
            "guest_session_id": guest_session_id,
            "operator_code": operator_code.upper(),
            "mobile_number": source_phone,
            "amount": quote["source_amount_poisha"],
            "currency": "BDT",
            "status": CashOutStatus.WAITING_FOR_TRANSFER.value,
            "pricing_snapshot": pricing_snapshot,
            "metadata": {
                "receiving_mobile_number": receiving_number,
                "receiving_sim_id": receiving_sim_id,
                "transfer_pin": transfer_pin,
                "payout_method": payout_method,
                "payout_account": payout_account
            }
        }
        saved_order = await self.orders_repo.create_order(order_doc)

        # 4. Create Cash Out Details
        cashout_doc = {
            "order_id": order_id,
            "source_operator": operator_code.upper(),
            "source_mobile_number": source_phone,
            "source_amount": quote["source_amount_poisha"],
            "platform_fee_amount": quote["platform_fee_amount_poisha"],
            "platform_fee_rate": float(quote["platform_fee_rate"]),
            "payout_amount": quote["payout_amount_poisha"],
            "payout_method": payout_method,
            "payout_account": payout_account,
            "receiving_sim_id": receiving_sim_id,
            "verification_status": "AUTOMATED_TRANSFER"
        }
        await self.cashout_repo.insert_one(cashout_doc)

        # 5. Initialize Automated Chunked Transfer Plan
        await self.transfer_engine.initialize_transfer_plan(
            order_id=order_id,
            service_type=ServiceType.CASH_OUT,
            operator_code=operator_code,
            source_number=source_phone,
            destination_number=receiving_number,
            total_amount_bdt=num_amount
        )

        # 6. Execute First Chunk if active session exists
        session_data = await self.session_service.get_session(source_phone, operator_code)
        transfer_result = {}
        if session_data:
            # Advance order status to TRANSFER_IN_PROGRESS
            await self.orders_repo.update_one(
                {"order_id": order_id},
                {"$set": {"status": "TRANSFER_IN_PROGRESS"}}
            )
            transfer_result = await self.transfer_engine.execute_next_chunk(
                order_id=order_id,
                pin=transfer_pin,
                session_data=session_data
            )

        tracking_token = generate_tracking_token(order_id, guest_session_id) if guest_session_id else None

        logger.info(
            "Cash out order created: %s | Amount: %s | Receiving SIM: %s | Transfer Status: %s",
            order_id, quote["source_amount_bdt"], receiving_number, transfer_result
        )

        return {
            "order_id": order_id,
            "status": "TRANSFER_IN_PROGRESS" if session_data else CashOutStatus.WAITING_FOR_TRANSFER.value,
            "operator_code": operator_code,
            "source_mobile_number": source_phone,
            "source_amount_bdt": quote["source_amount_bdt"],
            "source_amount_poisha": quote["source_amount_poisha"],
            "platform_fee_rate": quote["platform_fee_rate"],
            "platform_fee_amount_bdt": quote["platform_fee_amount_bdt"],
            "platform_fee_amount_poisha": quote["platform_fee_amount_poisha"],
            "payout_amount_bdt": quote["payout_amount_bdt"],
            "payout_amount_poisha": quote["payout_amount_poisha"],
            "payout_method": payout_method,
            "payout_account": payout_account,
            "receiving_mobile_number": receiving_number,
            "receiving_sim_label": sim_label,
            "tracking_token": tracking_token,
            "transfer_progress": transfer_result,
            "created_at": saved_order["created_at"]
        }

    async def get_transfer_progress(self, order_id: str) -> Dict[str, Any]:
        return await self.transfer_engine.get_transfer_progress(order_id)

    async def execute_transfer_step(self, order_id: str, pin: Optional[str] = None) -> Dict[str, Any]:
        order = await self.orders_repo.get_by_order_id(order_id)
        if not order:
            raise NotFoundException(f"Order {order_id} not found")

        source_phone = order["mobile_number"]
        operator_code = order["operator_code"]
        transfer_pin = pin or order.get("metadata", {}).get("transfer_pin") or source_phone[-4:]

        session_data = await self.session_service.get_session(source_phone, operator_code)
        if not session_data:
            raise ValidationException(f"No operator session for {source_phone}. Please authenticate.", code="OPERATOR_AUTH_REQUIRED")

        return await self.transfer_engine.execute_next_chunk(order_id, transfer_pin, session_data)

    async def confirm_transfer_and_proof(
        self,
        order_id: str,
        transfer_reference: str,
        proof_id: Optional[str] = None,
        actor_id: str = "customer"
    ) -> Dict[str, Any]:
        """Manual confirmation fallback."""
        order = await self.orders_repo.get_by_order_id(order_id)
        if not order:
            raise NotFoundException(f"Order {order_id} not found")

        if proof_id:
            await self.cashout_repo.attach_proof(order_id, proof_id, transfer_reference)
        else:
            await self.cashout_repo.update_one({"order_id": order_id}, {"$set": {"transfer_reference": transfer_reference}})

        updated = await self.orders_repo.transition_status(
            order_id=order_id,
            expected_current_status=order["status"],
            new_status=CashOutStatus.TRANSFER_RECEIVED,
            actor_type=ActorType.USER,
            actor_id=actor_id,
            note=f"Transfer reference provided: {transfer_reference}"
        )
        return updated

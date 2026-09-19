"""
Cash Out Business Flow Service.
Authoritatively orchestrates the SIM Balance -> Cash lifecycle.
"""

from decimal import Decimal
from typing import Any, Dict, Optional
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
from app.modules.auth.service import normalize_bd_phone
from app.modules.pricing.service import PricingService


class CashOutService:
    def __init__(
        self,
        orders_repo: OrdersRepository,
        cashout_repo: CashOutRepository,
        sims_repo: ReceivingSimsRepository,
        pricing_service: PricingService
    ):
        self.orders_repo = orders_repo
        self.cashout_repo = cashout_repo
        self.sims_repo = sims_repo
        self.pricing_service = pricing_service

    async def create_cashout_order(
        self,
        operator_code: str,
        source_mobile_number: str,
        amount_bdt: Decimal,
        payout_method: str,
        payout_account: str,
        user_id: Optional[str] = None,
        guest_session_id: Optional[str] = None
    ) -> Dict[str, Any]:
        if not user_id and not guest_session_id:
            raise ValidationException("Either user_id or guest_session_id is required", code=ErrorCode.AUTH_REQUIRED)

        source_phone = normalize_bd_phone(source_mobile_number)

        # 1. Authoritative Pricing Quote
        quote = await self.pricing_service.calculate_cashout_quote(operator_code, amount_bdt)

        # 2. Server-side Receiving SIM Selection
        receiving_sim = await self.sims_repo.select_best_sim(operator_code, quote["source_amount_poisha"])
        receiving_sim_id = receiving_sim["receiving_sim_id"] if receiving_sim else None
        receiving_number = receiving_sim["mobile_number"] if receiving_sim else "01700000000"
        sim_label = receiving_sim.get("label", f"{operator_code} Central Receiver") if receiving_sim else f"{operator_code} Receiver"

        order_id = generate_order_id()

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
            "operator_code": operator_code,
            "mobile_number": source_phone,
            "amount": quote["source_amount_poisha"],
            "currency": "BDT",
            "status": CashOutStatus.WAITING_FOR_TRANSFER,  # Immediately ready for operator transfer
            "pricing_snapshot": pricing_snapshot,
            "metadata": {
                "receiving_mobile_number": receiving_number,
                "receiving_sim_id": receiving_sim_id
            }
        }
        saved_order = await self.orders_repo.create_order(order_doc)

        # 4. Create Cash Out Details
        cashout_doc = {
            "order_id": order_id,
            "source_operator": operator_code,
            "source_mobile_number": source_phone,
            "source_amount": quote["source_amount_poisha"],
            "platform_fee_amount": quote["platform_fee_amount_poisha"],
            "platform_fee_rate": float(quote["platform_fee_rate"]),
            "payout_amount": quote["payout_amount_poisha"],
            "payout_method": payout_method,
            "payout_account": payout_account,
            "receiving_sim_id": receiving_sim_id,
            "verification_status": "PENDING"
        }
        await self.cashout_repo.insert_one(cashout_doc)

        tracking_token = generate_tracking_token(order_id, guest_session_id) if guest_session_id else None

        logger.info(
            "Cash out order created: %s | Amount: %s | Receiving SIM: %s",
            order_id, quote["source_amount_bdt"], receiving_number
        )

        return {
            "order_id": order_id,
            "status": CashOutStatus.WAITING_FOR_TRANSFER,
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
            "created_at": saved_order["created_at"]
        }

    async def confirm_transfer_and_proof(
        self,
        order_id: str,
        transfer_reference: str,
        proof_id: Optional[str] = None,
        actor_id: str = "customer"
    ) -> Dict[str, Any]:
        """
        User confirms balance transfer with reference / proof.
        Advances state: WAITING_FOR_TRANSFER -> TRANSFER_RECEIVED -> UNDER_VERIFICATION
        """
        order = await self.orders_repo.get_by_order_id(order_id)
        if not order:
            raise NotFoundException(f"Order {order_id} not found")

        current_status = order["status"]
        if current_status != CashOutStatus.WAITING_FOR_TRANSFER:
            raise ConflictException(f"Order {order_id} is in status '{current_status}', expected WAITING_FOR_TRANSFER")

        # Update cashout details
        if proof_id:
            await self.cashout_repo.attach_proof(order_id, proof_id, transfer_reference)
        else:
            await self.cashout_repo.update_one({"order_id": order_id}, {"$set": {"transfer_reference": transfer_reference}})

        # Transition to TRANSFER_RECEIVED then UNDER_VERIFICATION
        await self.orders_repo.transition_status(
            order_id=order_id,
            expected_current_status=CashOutStatus.WAITING_FOR_TRANSFER,
            new_status=CashOutStatus.TRANSFER_RECEIVED,
            actor_type=ActorType.USER,
            actor_id=actor_id,
            note=f"Transfer reference provided: {transfer_reference}"
        )

        updated = await self.orders_repo.transition_status(
            order_id=order_id,
            expected_current_status=CashOutStatus.TRANSFER_RECEIVED,
            new_status=CashOutStatus.UNDER_VERIFICATION,
            actor_type=ActorType.SYSTEM,
            actor_id="system",
            note="Order submitted for staff verification"
        )

        return updated

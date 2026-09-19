"""
Payments Service.
Handles customer payments for recharge orders and staff verification.
"""

from decimal import Decimal
from typing import Any, Dict, Optional
from app.core.constants import ActorType, PaymentStatus, RechargeStatus, bdt_to_poisha, poisha_to_bdt
from app.core.exceptions import ConflictException, NotFoundException, ValidationException
from app.core.security import generate_payment_id
from app.db.repositories.orders_repo import OrdersRepository
from app.db.repositories.payments_repo import PaymentsRepository
from app.db.repositories.recharge_repo import RechargeRepository


class PaymentsService:
    def __init__(
        self,
        payments_repo: PaymentsRepository,
        orders_repo: OrdersRepository,
        recharge_repo: RechargeRepository
    ):
        self.payments_repo = payments_repo
        self.orders_repo = orders_repo
        self.recharge_repo = recharge_repo

    async def create_payment(
        self,
        order_id: str,
        method: str,
        amount_bdt: Decimal,
        payer_reference: str,
        transaction_reference: str,
        proof_id: Optional[str] = None
    ) -> Dict[str, Any]:
        order = await self.orders_repo.get_by_order_id(order_id)
        if not order:
            raise NotFoundException(f"Order {order_id} not found")

        if order["status"] != RechargeStatus.PAYMENT_PENDING:
            raise ConflictException(f"Order {order_id} is not in PAYMENT_PENDING status")

        amount_poisha = bdt_to_poisha(amount_bdt)
        payment_id = generate_payment_id()

        payment_doc = {
            "payment_id": payment_id,
            "order_id": order_id,
            "method": method,
            "amount": amount_poisha,
            "payer_reference": payer_reference,
            "transaction_reference": transaction_reference,
            "proof_id": proof_id,
            "status": PaymentStatus.PENDING
        }
        await self.payments_repo.insert_one(payment_doc)

        # Link payment to recharge order
        await self.recharge_repo.link_payment(order_id, payment_id)
        await self.orders_repo.update_one({"order_id": order_id}, {"$set": {"payment_id": payment_id}})

        return {
            "payment_id": payment_id,
            "order_id": order_id,
            "method": method,
            "amount_bdt": amount_bdt,
            "amount_poisha": amount_poisha,
            "payer_reference": payer_reference,
            "transaction_reference": transaction_reference,
            "status": PaymentStatus.PENDING,
            "created_at": payment_doc["created_at"]
        }

    async def verify_payment(self, payment_id: str, staff_id: str) -> Dict[str, Any]:
        payment = await self.payments_repo.get_by_payment_id(payment_id)
        if not payment:
            raise NotFoundException(f"Payment {payment_id} not found")

        if payment["status"] == PaymentStatus.VERIFIED:
            return payment

        order_id = payment["order_id"]
        await self.payments_repo.verify_payment(payment_id, verified_by=staff_id)

        # Transition order to PAYMENT_VERIFIED
        await self.orders_repo.transition_status(
            order_id=order_id,
            expected_current_status=RechargeStatus.PAYMENT_PENDING,
            new_status=RechargeStatus.PAYMENT_VERIFIED,
            actor_type=ActorType.STAFF,
            actor_id=staff_id,
            note=f"Payment {payment_id} verified by {staff_id}"
        )

        return await self.payments_repo.get_by_payment_id(payment_id)

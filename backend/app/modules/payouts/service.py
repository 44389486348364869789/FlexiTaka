"""
Payouts Service with Multi-Layer Double-Payout Protection.
Enforces distributed locks, atomic database state transitions, and unique order index.
"""

from typing import Any, Dict, Optional
from app.core.constants import ActorType, CashOutStatus, ErrorCode, PayoutStatus, poisha_to_bdt
from app.core.exceptions import ConflictException, NotFoundException, ValidationException
from app.core.logging import logger
from app.core.security import generate_payout_id
from app.db.redis import distributed_lock
from app.db.repositories.audit_repo import AuditRepository
from app.db.repositories.cashout_repo import CashOutRepository
from app.db.repositories.orders_repo import OrdersRepository
from app.db.repositories.payouts_repo import PayoutsRepository


class PayoutsService:
    def __init__(
        self,
        payouts_repo: PayoutsRepository,
        orders_repo: OrdersRepository,
        cashout_repo: CashOutRepository,
        audit_repo: AuditRepository
    ):
        self.payouts_repo = payouts_repo
        self.orders_repo = orders_repo
        self.cashout_repo = cashout_repo
        self.audit_repo = audit_repo

    async def execute_payout(
        self,
        order_id: str,
        provider_reference: str,
        staff_id: str,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Processes a payout for an approved cashout order.
        Guarantees that an order CANNOT be paid twice even if multiple staff submit simultaneously.
        """
        # 1. Acquire Distributed Lock for this order
        async with distributed_lock(f"payout:{order_id}", timeout_seconds=15) as acquired:
            # 2. Verify Order Existence & Status
            order = await self.orders_repo.get_by_order_id(order_id)
            if not order:
                raise NotFoundException(f"Order {order_id} not found")

            cashout_detail = await self.cashout_repo.get_by_order_id(order_id)
            if not cashout_detail:
                raise NotFoundException(f"Cash out details for order {order_id} not found")

            # Must be in APPROVED status (or PAYOUT_PROCESSING if resuming)
            current_status = order["status"]
            if current_status not in (CashOutStatus.APPROVED, CashOutStatus.PAYOUT_PROCESSING):
                raise ConflictException(
                    f"Order {order_id} is in status '{current_status}'. Only APPROVED orders can be paid.",
                    code=ErrorCode.INVALID_ORDER_STATUS
                )

            # Check if payout already exists
            existing_payout = await self.payouts_repo.get_by_order_id(order_id)
            if existing_payout and existing_payout["status"] == PayoutStatus.SENT:
                raise ConflictException(
                    f"Order {order_id} has already been paid (Payout ID: {existing_payout['payout_id']})",
                    code=ErrorCode.PAYOUT_ALREADY_EXISTS
                )

            # 3. Atomic State Transition: APPROVED -> PAYOUT_PROCESSING
            if current_status == CashOutStatus.APPROVED:
                await self.orders_repo.transition_status(
                    order_id=order_id,
                    expected_current_status=CashOutStatus.APPROVED,
                    new_status=CashOutStatus.PAYOUT_PROCESSING,
                    actor_type=ActorType.STAFF,
                    actor_id=staff_id,
                    note=f"Payout initiated by staff {staff_id}"
                )

            # 4. Atomic Payout Record Creation (Guaranteed by unique index on order_id)
            if not existing_payout:
                payout_id = generate_payout_id()
                payout_doc = {
                    "payout_id": payout_id,
                    "order_id": order_id,
                    "method": cashout_detail["payout_method"],
                    "amount": cashout_detail["payout_amount"],
                    "recipient_account": cashout_detail["payout_account"],
                    "status": PayoutStatus.PROCESSING,
                    "provider_reference": None,
                    "processed_by": staff_id
                }
                payout = await self.payouts_repo.create_payout_atomic(payout_doc)
            else:
                payout_id = existing_payout["payout_id"]
                payout = existing_payout

            # 5. Mark Payout Sent
            updated_payout = await self.payouts_repo.mark_payout_sent(
                payout_id=payout_id,
                provider_reference=provider_reference,
                processed_by=staff_id
            )
            if not updated_payout:
                raise ConflictException("Failed to mark payout sent; status may have changed")

            # 6. Atomic State Transition: PAYOUT_PROCESSING -> COMPLETED
            await self.orders_repo.transition_status(
                order_id=order_id,
                expected_current_status=CashOutStatus.PAYOUT_PROCESSING,
                new_status=CashOutStatus.COMPLETED,
                actor_type=ActorType.STAFF,
                actor_id=staff_id,
                note=f"Payout completed with provider reference: {provider_reference}",
                extra_updates={"payout_id": payout_id}
            )

            # 7. Audit Log
            await self.audit_repo.log_action(
                actor_type="STAFF",
                actor_id=staff_id,
                action="MARK_ORDER_PAID",
                resource_type="PAYOUT",
                resource_id=payout_id,
                before={"order_status": current_status, "payout_status": "PENDING"},
                after={"order_status": CashOutStatus.COMPLETED, "payout_status": PayoutStatus.SENT, "reference": provider_reference},
                reason=f"Payout executed for order {order_id}",
                ip_address=ip_address
            )

            logger.info("Payout successfully sent for order %s: %s", order_id, payout_id)

            amt_poisha = updated_payout["amount"]
            return {
                "payout_id": updated_payout["payout_id"],
                "order_id": order_id,
                "method": updated_payout["method"],
                "amount_bdt": poisha_to_bdt(amt_poisha),
                "amount_poisha": amt_poisha,
                "recipient_account": updated_payout["recipient_account"],
                "status": updated_payout["status"],
                "provider_reference": updated_payout["provider_reference"],
                "processed_by": updated_payout["processed_by"],
                "created_at": updated_payout["created_at"],
                "processed_at": updated_payout["processed_at"]
            }

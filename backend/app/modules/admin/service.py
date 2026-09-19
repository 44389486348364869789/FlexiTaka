"""
Admin Business Operations Service.
Executes privileged actions with strict atomic state checks and audit logging.
"""

from decimal import Decimal
from typing import Any, Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.constants import (
    ActorType, CashOutStatus, ErrorCode, InventoryMovementType, RechargeStatus, ServiceType
)
from app.core.exceptions import ConflictException, NotFoundException, ValidationException
from app.core.logging import logger
from app.db.repositories.audit_repo import AuditRepository
from app.db.repositories.cashout_repo import CashOutRepository
from app.db.repositories.inventory_repo import InventoryRepository
from app.db.repositories.orders_repo import OrdersRepository
from app.db.repositories.pricing_repo import PricingRepository
from app.db.repositories.recharge_repo import RechargeRepository
from app.db.repositories.sims_repo import ReceivingSimsRepository


class AdminService:
    def __init__(
        self,
        db: AsyncIOMotorDatabase,
        orders_repo: OrdersRepository,
        cashout_repo: CashOutRepository,
        recharge_repo: RechargeRepository,
        sims_repo: ReceivingSimsRepository,
        inventory_repo: InventoryRepository,
        pricing_repo: PricingRepository,
        audit_repo: AuditRepository
    ):
        self.db = db
        self.orders_repo = orders_repo
        self.cashout_repo = cashout_repo
        self.recharge_repo = recharge_repo
        self.sims_repo = sims_repo
        self.inventory_repo = inventory_repo
        self.pricing_repo = pricing_repo
        self.audit_repo = audit_repo

    async def verify_cashout(
        self,
        order_id: str,
        decision: str,
        staff_id: str,
        rejection_reason: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """Staff verifies received operator balance transfer."""
        order = await self.orders_repo.get_by_order_id(order_id)
        if not order:
            raise NotFoundException(f"Order {order_id} not found")

        current_status = order["status"]
        if current_status not in (CashOutStatus.UNDER_VERIFICATION, CashOutStatus.TRANSFER_RECEIVED):
            raise ConflictException(
                f"Order {order_id} is in status '{current_status}', expected UNDER_VERIFICATION"
            )

        if decision.upper() == "APPROVE":
            new_status = CashOutStatus.APPROVED
            note = f"Transfer verified and approved by {staff_id}"
            verif_status = "APPROVED"

            # Record inventory increase (balance transferred into FlexiTaka receiving SIM)
            cashout_detail = await self.cashout_repo.get_by_order_id(order_id)
            if cashout_detail:
                await self.inventory_repo.record_movement(
                    operator_code=order["operator_code"],
                    amount_poisha=order["amount"],
                    movement_type=InventoryMovementType.TRANSFER_RECEIVED,
                    reason=f"Cash Out transfer received for order {order_id}",
                    actor_type=ActorType.STAFF,
                    actor_id=staff_id,
                    receiving_sim_id=cashout_detail.get("receiving_sim_id"),
                    order_id=order_id
                )
        elif decision.upper() == "REJECT":
            new_status = CashOutStatus.REJECTED
            note = f"Transfer rejected: {rejection_reason}"
            verif_status = "REJECTED"
        else:
            raise ValidationException("Decision must be either 'APPROVE' or 'REJECT'")

        # Update cashout details
        await self.cashout_repo.update_verification(
            order_id=order_id,
            verification_status=verif_status,
            verified_by=staff_id,
            rejection_reason=rejection_reason
        )

        # Transition order status
        updated = await self.orders_repo.transition_status(
            order_id=order_id,
            expected_current_status=current_status,
            new_status=new_status,
            actor_type=ActorType.STAFF,
            actor_id=staff_id,
            note=note
        )

        # Audit log
        await self.audit_repo.log_action(
            actor_type="STAFF",
            actor_id=staff_id,
            action=f"VERIFY_CASHOUT_{verif_status}",
            resource_type="ORDER",
            resource_id=order_id,
            before={"status": current_status},
            after={"status": new_status, "rejection_reason": rejection_reason},
            reason=note,
            ip_address=ip_address
        )

        logger.info("Order %s verification decided: %s by staff %s", order_id, verif_status, staff_id)
        return updated

    async def complete_recharge(
        self,
        order_id: str,
        processing_reference: str,
        staff_id: str,
        source_sim_id: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> Dict[str, Any]:
        order = await self.orders_repo.get_by_order_id(order_id)
        if not order:
            raise NotFoundException(f"Order {order_id} not found")

        current_status = order["status"]
        if current_status not in (RechargeStatus.PAYMENT_VERIFIED, RechargeStatus.RECHARGE_PROCESSING):
            raise ConflictException(
                f"Order {order_id} is in status '{current_status}'. Expected PAYMENT_VERIFIED or RECHARGE_PROCESSING"
            )

        if current_status == RechargeStatus.PAYMENT_VERIFIED:
            await self.orders_repo.transition_status(
                order_id=order_id,
                expected_current_status=RechargeStatus.PAYMENT_VERIFIED,
                new_status=RechargeStatus.RECHARGE_PROCESSING,
                actor_type=ActorType.STAFF,
                actor_id=staff_id,
                note=f"Recharge processing started by {staff_id}"
            )

        await self.recharge_repo.complete_recharge(
            order_id=order_id,
            processing_reference=processing_reference,
            source_sim_id=source_sim_id
        )

        updated = await self.orders_repo.transition_status(
            order_id=order_id,
            expected_current_status=RechargeStatus.RECHARGE_PROCESSING,
            new_status=RechargeStatus.COMPLETED,
            actor_type=ActorType.STAFF,
            actor_id=staff_id,
            note=f"Recharge completed with reference: {processing_reference}"
        )

        # Record inventory reduction (balance consumed to recharge customer phone)
        recharge_detail = await self.recharge_repo.get_by_order_id(order_id)
        recharge_face_value = recharge_detail.get("recharge_amount", order["amount"]) if recharge_detail else order["amount"]
        await self.inventory_repo.record_movement(
            operator_code=order["operator_code"],
            amount_poisha=-recharge_face_value,
            movement_type=InventoryMovementType.RECHARGE_CONSUMED,
            reason=f"Recharge balance consumed for order {order_id}",
            actor_type=ActorType.STAFF,
            actor_id=staff_id,
            receiving_sim_id=source_sim_id,
            order_id=order_id
        )

        await self.audit_repo.log_action(
            actor_type="STAFF",
            actor_id=staff_id,
            action="COMPLETE_RECHARGE",
            resource_type="ORDER",
            resource_id=order_id,
            before={"status": current_status},
            after={"status": RechargeStatus.COMPLETED, "reference": processing_reference},
            reason=f"Recharge delivered with ref {processing_reference}",
            ip_address=ip_address
        )

        return updated

    async def get_dashboard_summary(self) -> Dict[str, Any]:
        total_orders = await self.orders_repo.count({})
        pending_cashout = await self.orders_repo.count({"status": CashOutStatus.UNDER_VERIFICATION})
        pending_payouts = await self.orders_repo.count({"status": CashOutStatus.APPROVED})
        pending_payments = await self.orders_repo.count({"status": RechargeStatus.PAYMENT_PENDING})
        active_sims = await self.sims_repo.count({"status": "ACTIVE"})
        recent_audits = await self.audit_repo.find_many({}, sort_by=[("created_at", -1)], limit=10)

        return {
            "total_orders": total_orders,
            "pending_cashout_verifications": pending_cashout,
            "approved_payouts_pending": pending_payouts,
            "pending_recharge_payments": pending_payments,
            "active_receiving_sims": active_sims,
            "recent_audit_logs": recent_audits
        }

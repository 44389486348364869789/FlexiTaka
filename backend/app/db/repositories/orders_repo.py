"""
Orders Repository with Atomic State Machine Transitions and Event Auditing.
"""

from typing import Any, Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.constants import (
    ActorType, CashOutStatus, RechargeStatus, ServiceType,
    CASHOUT_ALLOWED_TRANSITIONS, RECHARGE_ALLOWED_TRANSITIONS
)
from app.core.exceptions import ConflictException, ValidationException
from app.core.security import generate_public_id
from app.db.repositories.base import BaseRepository


class OrdersRepository(BaseRepository):
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "orders")
        self.events_collection = db["order_events"]

    async def get_by_order_id(self, order_id: str) -> Optional[Dict[str, Any]]:
        return await self.find_one({"order_id": order_id})

    async def create_order(self, order_data: Dict[str, Any]) -> Dict[str, Any]:
        doc = await self.insert_one(order_data)
        # Record initial event
        await self.record_order_event(
            order_id=doc["order_id"],
            previous_status=None,
            new_status=doc["status"],
            actor_type=ActorType.SYSTEM,
            actor_id=doc.get("user_id") or doc.get("guest_session_id", "system"),
            note="Order created"
        )
        return doc

    async def transition_status(
        self,
        order_id: str,
        expected_current_status: str,
        new_status: str,
        actor_type: ActorType,
        actor_id: str,
        note: Optional[str] = None,
        extra_updates: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Atomically transition an order from expected_current_status to new_status.
        Enforces state transition rules and guarantees race condition immunity.
        """
        # Fetch current order to validate transition rule
        order = await self.get_by_order_id(order_id)
        if not order:
            raise ValidationException(f"Order {order_id} not found")

        current_status = order["status"]
        service_type = order["service_type"]

        # Validate transition matrix
        if service_type == ServiceType.CASH_OUT:
            allowed = CASHOUT_ALLOWED_TRANSITIONS.get(CashOutStatus(current_status), set())
            if CashOutStatus(new_status) not in allowed:
                raise ValidationException(
                    f"Illegal state transition for Cash Out: {current_status} -> {new_status}"
                )
        elif service_type == ServiceType.RECHARGE:
            allowed = RECHARGE_ALLOWED_TRANSITIONS.get(RechargeStatus(current_status), set())
            if RechargeStatus(new_status) not in allowed:
                raise ValidationException(
                    f"Illegal state transition for Recharge: {current_status} -> {new_status}"
                )

        set_fields = {
            "status": new_status,
            "updated_at": self.utcnow()
        }
        if new_status in {CashOutStatus.COMPLETED, RechargeStatus.COMPLETED}:
            set_fields["completed_at"] = self.utcnow()
        elif new_status in {CashOutStatus.CANCELLED, RechargeStatus.CANCELLED}:
            set_fields["cancelled_at"] = self.utcnow()

        if extra_updates:
            set_fields.update(extra_updates)

        # Atomic find_one_and_update ensures no other process changed the status in parallel
        updated_order = await self.collection.find_one_and_update(
            {"order_id": order_id, "status": expected_current_status},
            {"$set": set_fields},
            return_document=True
        )

        if not updated_order:
            raise ConflictException(
                f"Failed to transition order {order_id}: current status is not {expected_current_status}"
            )

        # Record immutable event log
        await self.record_order_event(
            order_id=order_id,
            previous_status=expected_current_status,
            new_status=new_status,
            actor_type=actor_type,
            actor_id=actor_id,
            note=note
        )

        return updated_order

    async def record_order_event(
        self,
        order_id: str,
        previous_status: Optional[str],
        new_status: str,
        actor_type: ActorType,
        actor_id: str,
        note: Optional[str] = None
    ) -> None:
        event = {
            "event_id": generate_public_id("EVT"),
            "order_id": order_id,
            "previous_status": previous_status,
            "new_status": new_status,
            "actor_type": actor_type,
            "actor_id": actor_id,
            "note": note,
            "created_at": self.utcnow()
        }
        await self.events_collection.insert_one(event)

    async def get_order_events(self, order_id: str) -> List[Dict[str, Any]]:
        cursor = self.events_collection.find({"order_id": order_id}).sort("created_at", 1)
        docs = await cursor.to_list(length=100)
        for d in docs:
            if "_id" in d:
                d["_id"] = str(d["_id"])
        return docs

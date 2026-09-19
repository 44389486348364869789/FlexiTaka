"""
Balance Inventory and Ledger Movement Repository.
Ensures every financial inventory change is auditable with an immutable movement record.
"""

from typing import Any, Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.constants import ActorType, InventoryMovementType
from app.core.security import generate_public_id
from app.db.repositories.base import BaseRepository


class InventoryRepository(BaseRepository):
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "balance_inventory")
        self.movements_collection = db["balance_movements"]

    async def get_by_operator(self, operator_code: str) -> Optional[Dict[str, Any]]:
        return await self.find_one({"operator_code": operator_code})

    async def record_movement(
        self,
        operator_code: str,
        amount_poisha: int,
        movement_type: InventoryMovementType,
        reason: str,
        actor_type: ActorType,
        actor_id: str,
        receiving_sim_id: Optional[str] = None,
        order_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Atomically adjust inventory and append an immutable movement record.
        amount_poisha > 0 increases balance, < 0 decreases balance.
        """
        # Ensure inventory record exists
        inv = await self.find_one({"operator_code": operator_code})
        if not inv:
            inv = await self.insert_one({
                "inventory_id": generate_public_id("INV"),
                "operator_code": operator_code,
                "receiving_sim_id": receiving_sim_id,
                "balance_amount": 0,
                "reserved_amount": 0,
                "available_amount": 0,
                "status": "ACTIVE"
            })

        before_balance = inv.get("balance_amount", 0)
        after_balance = before_balance + amount_poisha
        after_available = inv.get("available_amount", 0) + amount_poisha

        # Atomic balance update
        await self.collection.update_one(
            {"operator_code": operator_code},
            {
                "$inc": {
                    "balance_amount": amount_poisha,
                    "available_amount": amount_poisha
                },
                "$set": {
                    "last_reconciled_at": self.utcnow(),
                    "updated_at": self.utcnow()
                }
            }
        )

        # Create immutable movement audit document
        movement_doc = {
            "movement_id": generate_public_id("MOV"),
            "operator_code": operator_code,
            "receiving_sim_id": receiving_sim_id,
            "order_id": order_id,
            "movement_type": movement_type,
            "amount": amount_poisha,
            "before_balance": before_balance,
            "after_balance": after_balance,
            "reason": reason,
            "actor_type": actor_type,
            "actor_id": actor_id,
            "created_at": self.utcnow()
        }
        await self.movements_collection.insert_one(movement_doc)
        return movement_doc

    async def get_movements(
        self,
        operator_code: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        query = {"operator_code": operator_code} if operator_code else {}
        cursor = self.movements_collection.find(query).sort("created_at", -1).limit(limit)
        return await cursor.to_list(length=limit)

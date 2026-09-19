"""
Inventory Service.
Authoritative balance inventory ledger management and movement tracking.
"""

from decimal import Decimal
from typing import Any, Dict, List, Optional
from app.core.constants import ActorType, InventoryMovementType, OperatorCode, bdt_to_poisha, poisha_to_bdt
from app.db.repositories.inventory_repo import InventoryRepository


class InventoryService:
    def __init__(self, inventory_repo: InventoryRepository):
        self.inventory_repo = inventory_repo

    async def get_inventory_status(self) -> List[Dict[str, Any]]:
        results = []
        for op in [OperatorCode.GP, OperatorCode.ROBI, OperatorCode.BANGLALINK]:
            inv = await self.inventory_repo.get_by_operator(op)
            if not inv:
                # Initialize
                inv = await self.inventory_repo.insert_one({
                    "inventory_id": f"INV-{op}",
                    "operator_code": op,
                    "balance_amount": 0,
                    "reserved_amount": 0,
                    "available_amount": 0,
                    "status": "ACTIVE"
                })

            bal_poisha = inv.get("balance_amount", 0)
            avail_poisha = inv.get("available_amount", 0)
            results.append({
                "inventory_id": inv.get("inventory_id", f"INV-{op}"),
                "operator_code": op,
                "balance_amount_bdt": poisha_to_bdt(bal_poisha),
                "balance_amount_poisha": bal_poisha,
                "available_amount_bdt": poisha_to_bdt(avail_poisha),
                "available_amount_poisha": avail_poisha,
                "last_reconciled_at": inv.get("last_reconciled_at")
            })
        return results

    async def adjust_inventory(
        self,
        operator_code: OperatorCode,
        amount_bdt: Decimal,
        movement_type: InventoryMovementType,
        reason: str,
        actor_id: str,
        receiving_sim_id: Optional[str] = None
    ) -> Dict[str, Any]:
        amount_poisha = bdt_to_poisha(amount_bdt)
        movement = await self.inventory_repo.record_movement(
            operator_code=operator_code,
            amount_poisha=amount_poisha,
            movement_type=movement_type,
            reason=reason,
            actor_type=ActorType.STAFF,
            actor_id=actor_id,
            receiving_sim_id=receiving_sim_id
        )

        return {
            "movement_id": movement["movement_id"],
            "operator_code": movement["operator_code"],
            "movement_type": movement["movement_type"],
            "amount_bdt": poisha_to_bdt(amount_poisha),
            "amount_poisha": amount_poisha,
            "before_balance_bdt": poisha_to_bdt(movement["before_balance"]),
            "after_balance_bdt": poisha_to_bdt(movement["after_balance"]),
            "reason": movement["reason"],
            "actor_type": movement["actor_type"],
            "actor_id": movement["actor_id"],
            "created_at": movement["created_at"]
        }

    async def list_movements(self, operator_code: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        movements = await self.inventory_repo.get_movements(operator_code=operator_code, limit=limit)
        results = []
        for m in movements:
            amt_poisha = m["amount"]
            results.append({
                "movement_id": m["movement_id"],
                "operator_code": m["operator_code"],
                "movement_type": m["movement_type"],
                "amount_bdt": poisha_to_bdt(amt_poisha),
                "amount_poisha": amt_poisha,
                "before_balance_bdt": poisha_to_bdt(m["before_balance"]),
                "after_balance_bdt": poisha_to_bdt(m["after_balance"]),
                "reason": m["reason"],
                "actor_type": m["actor_type"],
                "actor_id": m["actor_id"],
                "created_at": m["created_at"]
            })
        return results

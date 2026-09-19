"""
Inventory Schemas.
"""

from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field
from app.core.constants import InventoryMovementType, OperatorCode


class AdjustInventoryRequest(BaseModel):
    operator_code: OperatorCode
    amount_bdt: Decimal = Field(..., description="Amount in BDT to adjust (positive for addition, negative for deduction)")
    movement_type: InventoryMovementType
    reason: str = Field(..., description="Auditable justification for inventory balance adjustment")
    receiving_sim_id: Optional[str] = None


class InventoryResponse(BaseModel):
    inventory_id: str
    operator_code: OperatorCode
    balance_amount_bdt: Decimal
    balance_amount_poisha: int
    available_amount_bdt: Decimal
    available_amount_poisha: int
    last_reconciled_at: Optional[str] = None


class InventoryMovementResponse(BaseModel):
    movement_id: str
    operator_code: OperatorCode
    movement_type: InventoryMovementType
    amount_bdt: Decimal
    amount_poisha: int
    before_balance_bdt: Decimal
    after_balance_bdt: Decimal
    reason: str
    actor_type: str
    actor_id: str
    created_at: str

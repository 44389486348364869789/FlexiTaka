"""
Admin Operations Router.
Protected by Role-Based Access Control (RBAC) and audited for all mutations.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query, Request
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.api.dependencies import get_db, require_permission
from app.core.exceptions import NotFoundException
from app.db.repositories.audit_repo import AuditRepository
from app.db.repositories.cashout_repo import CashOutRepository
from app.db.repositories.inventory_repo import InventoryRepository
from app.db.repositories.orders_repo import OrdersRepository
from app.db.repositories.payouts_repo import PayoutsRepository
from app.db.repositories.pricing_repo import PricingRepository
from app.db.repositories.recharge_repo import RechargeRepository
from app.db.repositories.sims_repo import ReceivingSimsRepository
from app.modules.admin.schemas import (
    AdminDashboardSummaryResponse, CompleteRechargeRequest,
    UpdatePricingRuleRequest, VerifyCashOutRequest
)
from app.modules.admin.service import AdminService
from app.modules.inventory.schemas import (
    AdjustInventoryRequest, InventoryMovementResponse, InventoryResponse
)
from app.modules.inventory.service import InventoryService
from app.modules.orders.schemas import OrderDetailResponse
from app.modules.orders.service import OrdersService
from app.modules.payouts.schemas import MarkPayoutSentRequest, PayoutResponse
from app.modules.payouts.service import PayoutsService
from app.modules.receiving_sims.schemas import (
    CreateReceivingSimRequest, ReceivingSimResponse
)
from app.modules.receiving_sims.service import ReceivingSimsService

router = APIRouter(prefix="/admin", tags=["Admin Panel"])


@router.get("/summary", response_model=AdminDashboardSummaryResponse)
async def get_dashboard_summary(
    staff: Dict[str, Any] = Depends(require_permission("orders:view")),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    service = AdminService(
        db=db,
        orders_repo=OrdersRepository(db),
        cashout_repo=CashOutRepository(db),
        recharge_repo=RechargeRepository(db),
        sims_repo=ReceivingSimsRepository(db),
        inventory_repo=InventoryRepository(db),
        pricing_repo=PricingRepository(db),
        audit_repo=AuditRepository(db)
    )
    return await service.get_dashboard_summary()


@router.get("/orders")
async def list_admin_orders(
    status: Optional[str] = None,
    service_type: Optional[str] = None,
    operator_code: Optional[str] = None,
    limit: int = Query(default=50, ge=1, le=100),
    skip: int = Query(default=0, ge=0),
    staff: Dict[str, Any] = Depends(require_permission("orders:view")),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    query: Dict[str, Any] = {}
    if status:
        query["status"] = status
    if service_type:
        query["service_type"] = service_type
    if operator_code:
        query["operator_code"] = operator_code

    orders_repo = OrdersRepository(db)
    orders = await orders_repo.find_many(query, sort_by=[("created_at", -1)], limit=limit, skip=skip)
    total = await orders_repo.count(query)
    return {"total": total, "orders": orders}


@router.get("/orders/{order_id}", response_model=OrderDetailResponse)
async def get_admin_order(
    order_id: str,
    staff: Dict[str, Any] = Depends(require_permission("orders:view")),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    service = OrdersService(
        orders_repo=OrdersRepository(db),
        cashout_repo=CashOutRepository(db),
        recharge_repo=RechargeRepository(db)
    )
    return await service.get_order_details(order_id=order_id, is_staff=True)


@router.post("/orders/{order_id}/verify-cashout")
async def verify_cashout_order(
    order_id: str,
    payload: VerifyCashOutRequest,
    request: Request,
    staff: Dict[str, Any] = Depends(require_permission("orders:verify")),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    service = AdminService(
        db=db,
        orders_repo=OrdersRepository(db),
        cashout_repo=CashOutRepository(db),
        recharge_repo=RechargeRepository(db),
        sims_repo=ReceivingSimsRepository(db),
        inventory_repo=InventoryRepository(db),
        pricing_repo=PricingRepository(db),
        audit_repo=AuditRepository(db)
    )
    ip = request.client.host if request.client else None
    staff_id = staff["sub"]
    return await service.verify_cashout(
        order_id=order_id,
        decision=payload.decision,
        staff_id=staff_id,
        rejection_reason=payload.rejection_reason,
        ip_address=ip
    )


@router.post("/orders/{order_id}/payout", response_model=PayoutResponse)
async def mark_payout_as_paid(
    order_id: str,
    payload: MarkPayoutSentRequest,
    request: Request,
    staff: Dict[str, Any] = Depends(require_permission("payouts:execute")),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    service = PayoutsService(
        payouts_repo=PayoutsRepository(db),
        orders_repo=OrdersRepository(db),
        cashout_repo=CashOutRepository(db),
        audit_repo=AuditRepository(db)
    )
    ip = request.client.host if request.client else None
    staff_id = staff["sub"]
    return await service.execute_payout(
        order_id=order_id,
        provider_reference=payload.provider_reference,
        staff_id=staff_id,
        ip_address=ip
    )


@router.post("/orders/{order_id}/complete-recharge")
async def complete_recharge_order(
    order_id: str,
    payload: CompleteRechargeRequest,
    request: Request,
    staff: Dict[str, Any] = Depends(require_permission("orders:verify")),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    service = AdminService(
        db=db,
        orders_repo=OrdersRepository(db),
        cashout_repo=CashOutRepository(db),
        recharge_repo=RechargeRepository(db),
        sims_repo=ReceivingSimsRepository(db),
        inventory_repo=InventoryRepository(db),
        pricing_repo=PricingRepository(db),
        audit_repo=AuditRepository(db)
    )
    ip = request.client.host if request.client else None
    staff_id = staff["sub"]
    return await service.complete_recharge(
        order_id=order_id,
        processing_reference=payload.processing_reference,
        staff_id=staff_id,
        source_sim_id=payload.source_sim_id,
        ip_address=ip
    )


# --- Receiving SIMs ---
@router.get("/sims", response_model=List[ReceivingSimResponse])
async def list_admin_sims(
    staff: Dict[str, Any] = Depends(require_permission("sims:view")),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    service = ReceivingSimsService(ReceivingSimsRepository(db))
    return await service.list_sims()


@router.post("/sims")
async def create_admin_sim(
    payload: CreateReceivingSimRequest,
    staff: Dict[str, Any] = Depends(require_permission("sims:manage")),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    service = ReceivingSimsService(ReceivingSimsRepository(db))
    return await service.create_sim(
        operator_code=payload.operator_code,
        mobile_number=payload.mobile_number,
        label=payload.label,
        daily_limit_bdt=payload.daily_limit_bdt,
        monthly_limit_bdt=payload.monthly_limit_bdt,
        notes=payload.notes
    )


# --- Inventory ---
@router.get("/inventory", response_model=List[InventoryResponse])
async def get_admin_inventory(
    staff: Dict[str, Any] = Depends(require_permission("inventory:view")),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    service = InventoryService(InventoryRepository(db))
    return await service.get_inventory_status()


@router.post("/inventory/adjust", response_model=InventoryMovementResponse)
async def adjust_admin_inventory(
    payload: AdjustInventoryRequest,
    staff: Dict[str, Any] = Depends(require_permission("inventory:adjust")),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    service = InventoryService(InventoryRepository(db))
    return await service.adjust_inventory(
        operator_code=payload.operator_code,
        amount_bdt=payload.amount_bdt,
        movement_type=payload.movement_type,
        reason=payload.reason,
        actor_id=staff["sub"],
        receiving_sim_id=payload.receiving_sim_id
    )


@router.get("/inventory/movements", response_model=List[InventoryMovementResponse])
async def list_inventory_movements(
    operator_code: Optional[str] = None,
    limit: int = Query(default=50, ge=1, le=100),
    staff: Dict[str, Any] = Depends(require_permission("inventory:view")),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    service = InventoryService(InventoryRepository(db))
    return await service.list_movements(operator_code=operator_code, limit=limit)


# --- Pricing Rules ---
@router.get("/pricing")
async def list_pricing_rules(
    staff: Dict[str, Any] = Depends(require_permission("pricing:view")),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    repo = PricingRepository(db)
    return await repo.list_rules()


@router.post("/pricing")
async def create_pricing_rule(
    payload: UpdatePricingRuleRequest,
    staff: Dict[str, Any] = Depends(require_permission("pricing:manage")),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    repo = PricingRepository(db)
    audit = AuditRepository(db)
    rule_doc = {
        "service_type": payload.service_type,
        "operator_code": payload.operator_code,
        "rate_type": "PERCENTAGE" if payload.service_type == "CASH_OUT" else "DISCOUNT_PERCENTAGE",
        "rate_value": float(payload.rate_value),
        "min_amount": float(payload.min_amount_bdt),
        "max_amount": float(payload.max_amount_bdt)
    }
    saved = await repo.create_or_update_rule(rule_doc, created_by=staff["sub"])
    await audit.log_action(
        actor_type="STAFF",
        actor_id=staff["sub"],
        action="UPDATE_PRICING_RULE",
        resource_type="PRICING_RULE",
        resource_id=saved["rule_id"],
        after=rule_doc,
        reason="Admin updated pricing parameters"
    )
    return saved


# --- Audit Logs ---
@router.get("/audit")
async def list_audit_logs(
    resource_id: Optional[str] = None,
    limit: int = Query(default=50, ge=1, le=100),
    staff: Dict[str, Any] = Depends(require_permission("audit:view")),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    audit_repo = AuditRepository(db)
    query = {"resource_id": resource_id} if resource_id else {}
    logs = await audit_repo.find_many(query, sort_by=[("created_at", -1)], limit=limit)
    return {"total": len(logs), "logs": logs}

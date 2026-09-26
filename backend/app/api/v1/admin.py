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
from app.core.constants import SimStatus
from app.modules.receiving_sims.schemas import (
    CreateReceivingSimRequest, ReceivingSimResponse, UpdateReceivingSimRequest
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
        initial_balance_bdt=payload.initial_balance_bdt,
        notes=payload.notes
    )


@router.get("/sims/{sim_id}", response_model=ReceivingSimResponse)
async def get_admin_sim(
    sim_id: str,
    staff: Dict[str, Any] = Depends(require_permission("sims:view")),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    service = ReceivingSimsService(ReceivingSimsRepository(db))
    return await service.get_sim(sim_id)


@router.patch("/sims/{sim_id}", response_model=ReceivingSimResponse)
async def update_admin_sim(
    sim_id: str,
    payload: UpdateReceivingSimRequest,
    staff: Dict[str, Any] = Depends(require_permission("sims:manage")),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    service = ReceivingSimsService(ReceivingSimsRepository(db))
    audit = AuditRepository(db)
    updated = await service.update_sim(sim_id, payload.dict(exclude_unset=True))
    await audit.log_action(
        actor_type="STAFF",
        actor_id=staff.get("sub", "ADMIN"),
        action="UPDATE_RECEIVING_SIM",
        resource_type="RECEIVING_SIM",
        resource_id=sim_id,
        after=updated,
        reason=f"Updated SIM {sim_id}"
    )
    return updated


@router.post("/sims/{sim_id}/activate", response_model=ReceivingSimResponse)
async def activate_admin_sim(
    sim_id: str,
    staff: Dict[str, Any] = Depends(require_permission("sims:manage")),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    service = ReceivingSimsService(ReceivingSimsRepository(db))
    audit = AuditRepository(db)
    res = await service.set_status(sim_id, SimStatus.ACTIVE)
    await audit.log_action(
        actor_type="STAFF",
        actor_id=staff.get("sub", "ADMIN"),
        action="ACTIVATE_SIM",
        resource_type="RECEIVING_SIM",
        resource_id=sim_id,
        after={"status": SimStatus.ACTIVE},
        reason=f"Activated SIM {sim_id}"
    )
    return res


@router.post("/sims/{sim_id}/deactivate", response_model=ReceivingSimResponse)
async def deactivate_admin_sim(
    sim_id: str,
    staff: Dict[str, Any] = Depends(require_permission("sims:manage")),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    service = ReceivingSimsService(ReceivingSimsRepository(db))
    audit = AuditRepository(db)
    res = await service.set_status(sim_id, SimStatus.INACTIVE)
    await audit.log_action(
        actor_type="STAFF",
        actor_id=staff.get("sub", "ADMIN"),
        action="DEACTIVATE_SIM",
        resource_type="RECEIVING_SIM",
        resource_id=sim_id,
        after={"status": SimStatus.INACTIVE},
        reason=f"Deactivated SIM {sim_id}"
    )
    return res


@router.post("/sims/{sim_id}/block", response_model=ReceivingSimResponse)
async def block_admin_sim(
    sim_id: str,
    request: Request,
    staff: Dict[str, Any] = Depends(require_permission("sims:manage")),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    body = await request.json() if request.headers.get("content-type") == "application/json" else {}
    reason = body.get("reason", "Administrative block")
    service = ReceivingSimsService(ReceivingSimsRepository(db))
    audit = AuditRepository(db)
    res = await service.set_status(sim_id, SimStatus.BLOCKED, reason=reason)
    await audit.log_action(
        actor_type="STAFF",
        actor_id=staff.get("sub", "ADMIN"),
        action="BLOCK_SIM",
        resource_type="RECEIVING_SIM",
        resource_id=sim_id,
        after={"status": SimStatus.BLOCKED, "reason": reason},
        reason=reason
    )
    return res


@router.post("/sims/{sim_id}/unblock", response_model=ReceivingSimResponse)
async def unblock_admin_sim(
    sim_id: str,
    staff: Dict[str, Any] = Depends(require_permission("sims:manage")),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    service = ReceivingSimsService(ReceivingSimsRepository(db))
    audit = AuditRepository(db)
    res = await service.set_status(sim_id, SimStatus.ACTIVE)
    await audit.log_action(
        actor_type="STAFF",
        actor_id=staff.get("sub", "ADMIN"),
        action="UNBLOCK_SIM",
        resource_type="RECEIVING_SIM",
        resource_id=sim_id,
        after={"status": SimStatus.ACTIVE},
        reason=f"Unblocked SIM {sim_id}"
    )
    return res


@router.get("/sims/{sim_id}/history")
async def get_admin_sim_history(
    sim_id: str,
    direction: Optional[str] = None,
    limit: int = Query(default=50, ge=1, le=100),
    staff: Dict[str, Any] = Depends(require_permission("sims:view")),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    service = ReceivingSimsService(ReceivingSimsRepository(db))
    records = await service.get_transfer_history(sim_id, direction=direction, limit=limit)
    return {"total": len(records), "history": records}


@router.post("/sims/{sim_id}/reconcile")
async def reconcile_admin_sim(
    sim_id: str,
    request: Request,
    staff: Dict[str, Any] = Depends(require_permission("sims:manage")),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    body = await request.json()
    operator_bal = float(body.get("operator_balance_bdt", 0.0))
    service = ReceivingSimsService(ReceivingSimsRepository(db))
    audit = AuditRepository(db)
    result = await service.reconcile(sim_id, operator_bal)
    await audit.log_action(
        actor_type="STAFF",
        actor_id=staff.get("sub", "ADMIN"),
        action="RECONCILE_SIM_BALANCE",
        resource_type="RECEIVING_SIM",
        resource_id=sim_id,
        after=result,
        reason=f"Balance reconciliation audit performed: mismatch={result.get('mismatch')}"
    )
    return result


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


# --- Operator Prefix Management ---
@router.get("/operator-prefixes")
async def list_operator_prefixes(
    staff: Dict[str, Any] = Depends(require_permission("orders:view")),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    from app.db.repositories.operator_prefix_repo import OperatorPrefixRepository
    repo = OperatorPrefixRepository(db)
    prefixes = await repo.list_all_prefixes()
    return {"total": len(prefixes), "prefixes": prefixes}


@router.post("/operator-prefixes")
async def add_operator_prefix(
    request: Request,
    staff: Dict[str, Any] = Depends(require_permission("pricing:manage")),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    from app.db.repositories.operator_prefix_repo import OperatorPrefixRepository
    from app.modules.operators.resolver import refresh_prefix_cache
    body = await request.json()
    repo = OperatorPrefixRepository(db)
    audit = AuditRepository(db)
    active_val = body.get("active") if "active" in body else body.get("is_active", True)
    result = await repo.add_prefix(
        prefix=body.get("prefix"),
        operator_code=body.get("operator_code"),
        active=active_val,
        notes=body.get("notes", ""),
        created_by=staff.get("sub", "ADMIN")
    )
    await refresh_prefix_cache(db)
    await audit.log_action(
        actor_type="STAFF",
        actor_id=staff.get("sub", "ADMIN"),
        action="ADD_OPERATOR_PREFIX",
        resource_type="OPERATOR_PREFIX",
        resource_id=body.get("prefix"),
        after=result,
        reason=f"Added prefix {body.get('prefix')} -> {body.get('operator_code')}"
    )
    return result


@router.put("/operator-prefixes/{prefix}")
async def update_operator_prefix(
    prefix: str,
    request: Request,
    staff: Dict[str, Any] = Depends(require_permission("pricing:manage")),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    from app.db.repositories.operator_prefix_repo import OperatorPrefixRepository
    from app.modules.operators.resolver import refresh_prefix_cache
    body = await request.json()
    repo = OperatorPrefixRepository(db)
    audit = AuditRepository(db)
    active_val = body.get("active") if "active" in body else body.get("is_active")
    result = await repo.update_prefix(
        prefix=prefix,
        operator_code=body.get("operator_code"),
        active=active_val,
        notes=body.get("notes"),
        updated_by=staff.get("sub", "ADMIN")
    )
    await refresh_prefix_cache(db)
    await audit.log_action(
        actor_type="STAFF",
        actor_id=staff.get("sub", "ADMIN"),
        action="UPDATE_OPERATOR_PREFIX",
        resource_type="OPERATOR_PREFIX",
        resource_id=prefix,
        after=result,
        reason=f"Updated prefix {prefix}"
    )
    return result


@router.get("/payment-accounts")
async def list_admin_payment_accounts(
    staff: Dict[str, Any] = Depends(require_permission("orders:view")),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    from app.db.repositories.payment_accounts_repo import PaymentAccountsRepository
    repo = PaymentAccountsRepository(db)
    await repo.ensure_defaults()
    return await repo.find_many({}, sort_by=[("method", 1)], limit=50)


@router.put("/payment-accounts/{account_id}")
async def update_admin_payment_account(
    account_id: str,
    request: Request,
    staff: Dict[str, Any] = Depends(require_permission("pricing:manage")),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    from app.db.repositories.payment_accounts_repo import PaymentAccountsRepository
    body = await request.json()
    repo = PaymentAccountsRepository(db)
    audit = AuditRepository(db)
    existing = await repo.get_by_account_id(account_id)
    if not existing:
        raise NotFoundException(f"Payment account {account_id} not found")

    allowed_fields = [
        "account_name", "account_number", "display_number",
        "account_type", "is_active", "qr_code_url",
        "instructions", "instructions_bn"
    ]
    updates = {k: v for k, v in body.items() if k in allowed_fields}
    await repo.update_account(account_id, updates)
    updated = await repo.get_by_account_id(account_id)
    await audit.log_action(
        actor_type="STAFF",
        actor_id=staff.get("sub", "ADMIN"),
        action="UPDATE_PAYMENT_ACCOUNT",
        resource_type="PAYMENT_ACCOUNT",
        resource_id=account_id,
        before=existing,
        after=updated,
        reason=f"Updated payment account {account_id}"
    )
    return updated


@router.post("/payment-accounts")
async def create_admin_payment_account(
    request: Request,
    staff: Dict[str, Any] = Depends(require_permission("pricing:manage")),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    from app.db.repositories.payment_accounts_repo import PaymentAccountsRepository
    body = await request.json()
    repo = PaymentAccountsRepository(db)
    audit = AuditRepository(db)
    created = await repo.create_account(body)
    await audit.log_action(
        actor_type="STAFF",
        actor_id=staff.get("sub", "ADMIN"),
        action="CREATE_PAYMENT_ACCOUNT",
        resource_type="PAYMENT_ACCOUNT",
        resource_id=body.get("account_id", "new"),
        after=created,
        reason=f"Created payment account {body.get('account_name')}"
    )
    return created


@router.post("/payment-accounts/{account_id}/toggle-status")
async def toggle_admin_payment_account_status(
    account_id: str,
    staff: Dict[str, Any] = Depends(require_permission("pricing:manage")),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    from app.db.repositories.payment_accounts_repo import PaymentAccountsRepository
    repo = PaymentAccountsRepository(db)
    audit = AuditRepository(db)
    existing = await repo.get_by_account_id(account_id)
    if not existing:
        raise NotFoundException(f"Payment account {account_id} not found")

    new_status = not existing.get("is_active", True)
    await repo.update_account(account_id, {"is_active": new_status})
    updated = await repo.get_by_account_id(account_id)
    await audit.log_action(
        actor_type="STAFF",
        actor_id=staff.get("sub", "ADMIN"),
        action="TOGGLE_PAYMENT_ACCOUNT_STATUS",
        resource_type="PAYMENT_ACCOUNT",
        resource_id=account_id,
        before=existing,
        after=updated,
        reason=f"Toggled active status of payment account {account_id} to {new_status}"
    )
    return updated


# --- Operator Limit Configurations ---
@router.get("/operator-configs")
async def list_admin_operator_configs(
    staff: Dict[str, Any] = Depends(require_permission("pricing:view")),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    from app.db.repositories.operator_config_repo import OperatorConfigRepository
    repo = OperatorConfigRepository(db)
    configs = await repo.list_configs()
    for c in configs:
        c.pop("_id", None)
    return {"total": len(configs), "configs": configs}


@router.get("/operator-configs/{operator_code}")
async def get_admin_operator_config(
    operator_code: str,
    staff: Dict[str, Any] = Depends(require_permission("pricing:view")),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    from app.db.repositories.operator_config_repo import OperatorConfigRepository
    repo = OperatorConfigRepository(db)
    cfg = await repo.get_config(operator_code)
    cfg.pop("_id", None)
    return cfg


@router.put("/operator-configs/{operator_code}")
async def update_admin_operator_config(
    operator_code: str,
    request: Request,
    staff: Dict[str, Any] = Depends(require_permission("pricing:manage")),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    from app.db.repositories.operator_config_repo import OperatorConfigRepository
    body = await request.json()
    repo = OperatorConfigRepository(db)
    audit = AuditRepository(db)
    updated = await repo.update_config(operator_code, body, updated_by=staff.get("sub", "ADMIN"))
    updated.pop("_id", None)
    await audit.log_action(
        actor_type="STAFF",
        actor_id=staff.get("sub", "ADMIN"),
        action="UPDATE_OPERATOR_CONFIG",
        resource_type="OPERATOR_CONFIG",
        resource_id=operator_code.upper(),
        after=updated,
        reason=f"Updated limits and config for operator {operator_code.upper()}"
    )
    return updated


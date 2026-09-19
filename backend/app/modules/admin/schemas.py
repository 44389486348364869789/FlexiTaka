"""
Admin Schemas for operational dashboards and staff actions.
"""

from decimal import Decimal
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from app.core.constants import AdminRole, CashOutStatus, RechargeStatus


class VerifyCashOutRequest(BaseModel):
    decision: str = Field(..., description="APPROVE | REJECT")
    rejection_reason: Optional[str] = None


class CompleteRechargeRequest(BaseModel):
    processing_reference: str = Field(..., description="Operator transaction ID confirming recharge delivery")
    source_sim_id: Optional[str] = None


class AdminDashboardSummaryResponse(BaseModel):
    total_orders: int
    pending_cashout_verifications: int
    approved_payouts_pending: int
    pending_recharge_payments: int
    active_receiving_sims: int
    recent_audit_logs: List[Dict[str, Any]] = []


class UpdatePricingRuleRequest(BaseModel):
    service_type: str = Field(..., description="CASH_OUT | RECHARGE")
    operator_code: str = Field(default="ALL")
    rate_value: Decimal = Field(..., gt=0)
    min_amount_bdt: Decimal = Field(default=Decimal("50"))
    max_amount_bdt: Decimal = Field(default=Decimal("50000"))

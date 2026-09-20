"""
Orders Service.
Orchestrates primary order queries, IDOR security enforcement, and event timeline retrieval.
"""

from typing import Any, Dict, List, Optional
from app.core.constants import ErrorCode, poisha_to_bdt
from app.core.exceptions import ForbiddenException, NotFoundException
from app.core.security import generate_tracking_token, verify_tracking_token
from app.db.repositories.cashout_repo import CashOutRepository
from app.db.repositories.orders_repo import OrdersRepository
from app.db.repositories.recharge_repo import RechargeRepository


class OrdersService:
    def __init__(
        self,
        orders_repo: OrdersRepository,
        cashout_repo: CashOutRepository,
        recharge_repo: RechargeRepository
    ):
        self.orders_repo = orders_repo
        self.cashout_repo = cashout_repo
        self.recharge_repo = recharge_repo

    async def get_order_details(
        self,
        order_id: str,
        user_id: Optional[str] = None,
        guest_session_id: Optional[str] = None,
        tracking_token: Optional[str] = None,
        is_staff: bool = False
    ) -> Dict[str, Any]:
        order = await self.orders_repo.get_by_order_id(order_id)
        if not order:
            raise NotFoundException(f"Order {order_id} not found", code=ErrorCode.ORDER_NOT_FOUND)

        # IDOR / Security Verification
        if not is_staff:
            is_owner = False
            if user_id and order.get("user_id") == user_id:
                is_owner = True
            elif guest_session_id and order.get("guest_session_id") == guest_session_id:
                is_owner = True
            elif tracking_token and order.get("guest_session_id"):
                if verify_tracking_token(order_id, order["guest_session_id"], tracking_token):
                    is_owner = True

            if not is_owner:
                raise ForbiddenException("You do not have permission to view this order")

        # Hydrate service details
        cashout_details = None
        recharge_details = None
        if order.get("service_type") == "CASH_OUT":
            cashout_details = await self.cashout_repo.get_by_order_id(order_id)
            if cashout_details:
                cashout_details = {
                    **cashout_details,
                    "_id": str(cashout_details.get("_id")) if cashout_details.get("_id") else None,
                    "source_amount_bdt": str(poisha_to_bdt(cashout_details.get("source_amount", 0))),
                    "platform_fee_amount_bdt": str(poisha_to_bdt(cashout_details.get("platform_fee_amount", 0))),
                    "payout_amount_bdt": str(poisha_to_bdt(cashout_details.get("payout_amount", 0))),
                }
        elif order.get("service_type") == "RECHARGE":
            recharge_details = await self.recharge_repo.get_by_order_id(order_id)
            if recharge_details:
                recharge_details = {
                    **recharge_details,
                    "_id": str(recharge_details.get("_id")) if recharge_details.get("_id") else None,
                    "recharge_amount_bdt": str(poisha_to_bdt(recharge_details.get("recharge_amount", 0))),
                    "discount_amount_bdt": str(poisha_to_bdt(recharge_details.get("discount_amount", 0))),
                    "customer_pay_amount_bdt": str(poisha_to_bdt(recharge_details.get("customer_pay_amount", 0))),
                }

        events = await self.orders_repo.get_order_events(order_id)

        # Generate tracking token for guest convenience
        guest_token = None
        if order.get("guest_session_id"):
            guest_token = generate_tracking_token(order_id, order["guest_session_id"])

        amount_poisha = order.get("amount", 0)
        return {
            "order_id": order["order_id"],
            "service_type": order["service_type"],
            "user_id": order.get("user_id"),
            "guest_session_id": order.get("guest_session_id"),
            "linked_from_guest_session_id": order.get("linked_from_guest_session_id"),
            "operator_code": order["operator_code"],
            "mobile_number": order["mobile_number"],
            "amount_bdt": poisha_to_bdt(amount_poisha),
            "amount_poisha": amount_poisha,
            "currency": order.get("currency", "BDT"),
            "status": order["status"],
            "pricing_snapshot": order.get("pricing_snapshot", {}),
            "payment_id": order.get("payment_id"),
            "payout_id": order.get("payout_id"),
            "cashout_details": cashout_details,
            "recharge_details": recharge_details,
            "tracking_token": guest_token,
            "events": events,
            "created_at": order.get("created_at"),
            "updated_at": order.get("updated_at"),
            "completed_at": order.get("completed_at"),
            "cancelled_at": order.get("cancelled_at")
        }

    async def list_orders(
        self,
        user_id: Optional[str] = None,
        guest_session_id: Optional[str] = None,
        limit: int = 50,
        skip: int = 0
    ) -> List[Dict[str, Any]]:
        query: Dict[str, Any] = {}
        if user_id:
            query["user_id"] = user_id
        elif guest_session_id:
            query["guest_session_id"] = guest_session_id
        else:
            return []

        orders = await self.orders_repo.find_many(query, sort_by=[("created_at", -1)], limit=limit, skip=skip)
        results = []
        for o in orders:
            amt_poisha = o.get("amount", 0)
            results.append({
                "order_id": o["order_id"],
                "service_type": o["service_type"],
                "operator_code": o["operator_code"],
                "mobile_number": o["mobile_number"],
                "amount_bdt": poisha_to_bdt(amt_poisha),
                "amount_poisha": amt_poisha,
                "currency": o.get("currency", "BDT"),
                "status": o["status"],
                "linked_from_guest_session_id": o.get("linked_from_guest_session_id"),
                "created_at": o.get("created_at"),
                "updated_at": o.get("updated_at")
            })
        return results

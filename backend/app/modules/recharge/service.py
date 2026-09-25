"""
Recharge Business Flow Service.
Authoritatively orchestrates Discounted Airtime Recharge orders.
"""

from decimal import Decimal
from typing import Any, Dict, Optional
from app.core.config import settings
from app.core.constants import ActorType, ErrorCode, RechargeStatus, ServiceType, bdt_to_poisha
from app.core.exceptions import ValidationException
from app.core.logging import logger
from app.core.security import generate_order_id, generate_tracking_token
from app.db.redis import get_redis
from app.db.repositories.orders_repo import OrdersRepository
from app.db.repositories.recharge_repo import RechargeRepository
from app.modules.auth.service import normalize_bd_phone
from app.modules.pricing.service import PricingService


class RechargeService:
    def __init__(
        self,
        orders_repo: OrdersRepository,
        recharge_repo: RechargeRepository,
        pricing_service: PricingService
    ):
        self.orders_repo = orders_repo
        self.recharge_repo = recharge_repo
        self.pricing_service = pricing_service

    async def create_recharge_order(
        self,
        operator_code: str,
        recharge_mobile_number: str,
        recharge_amount_bdt: Decimal,
        user_id: Optional[str] = None,
        guest_session_id: Optional[str] = None
    ) -> Dict[str, Any]:
        if not user_id and not guest_session_id:
            raise ValidationException("Either user_id or guest_session_id is required")

        dest_phone = normalize_bd_phone(recharge_mobile_number)

        # Enforce mobile OTP verification if enabled
        if getattr(settings, "REQUIRE_ORDER_OTP", False):
            r = get_redis()
            is_verified = False
            if r:
                if guest_session_id and await r.get(f"phone_verified:{guest_session_id}:{dest_phone}"):
                    is_verified = True
                elif await r.get(f"phone_verified:{dest_phone}"):
                    is_verified = True
            if not is_verified:
                raise ValidationException(
                    "মোবাইল নম্বর যাচাই করা আবশ্যক : Mobile number must be verified via OTP before placing an order",
                    code=ErrorCode.OTP_REQUIRED
                )

        # 1. Authoritative Pricing Quote
        quote = await self.pricing_service.calculate_recharge_quote(operator_code, recharge_amount_bdt)

        order_id = generate_order_id()

        pricing_snapshot = {
            "recharge_amount_bdt": str(quote["recharge_amount_bdt"]),
            "recharge_amount_poisha": quote["recharge_amount_poisha"],
            "discount_rate": str(quote["discount_rate"]),
            "discount_amount_bdt": str(quote["discount_amount_bdt"]),
            "discount_amount_poisha": quote["discount_amount_poisha"],
            "customer_pay_amount_bdt": str(quote["customer_pay_amount_bdt"]),
            "customer_pay_amount_poisha": quote["customer_pay_amount_poisha"],
            "pricing_rule_version": quote["pricing_rule_version"]
        }

        # 2. Create Primary Order Record in PAYMENT_PENDING
        order_doc = {
            "order_id": order_id,
            "service_type": ServiceType.RECHARGE,
            "user_id": user_id,
            "guest_session_id": guest_session_id,
            "operator_code": operator_code,
            "mobile_number": dest_phone,
            "amount": quote["customer_pay_amount_poisha"],  # Amount customer actually pays
            "currency": "BDT",
            "status": RechargeStatus.PAYMENT_PENDING,
            "pricing_snapshot": pricing_snapshot,
            "metadata": {
                "recharge_face_value_poisha": quote["recharge_amount_poisha"]
            }
        }
        saved_order = await self.orders_repo.create_order(order_doc)

        # 3. Create Recharge Detail Document
        recharge_doc = {
            "order_id": order_id,
            "operator_code": operator_code,
            "recharge_mobile_number": dest_phone,
            "recharge_amount": quote["recharge_amount_poisha"],
            "discount_rate": float(quote["discount_rate"]),
            "discount_amount": quote["discount_amount_poisha"],
            "customer_pay_amount": quote["customer_pay_amount_poisha"],
            "payment_id": None
        }
        await self.recharge_repo.insert_one(recharge_doc)

        tracking_token = generate_tracking_token(order_id, guest_session_id) if guest_session_id else None

        logger.info("Recharge order created: %s | Amount: %s", order_id, quote["recharge_amount_bdt"])

        return {
            "order_id": order_id,
            "status": RechargeStatus.PAYMENT_PENDING,
            "operator_code": operator_code,
            "recharge_mobile_number": dest_phone,
            "recharge_amount_bdt": quote["recharge_amount_bdt"],
            "recharge_amount_poisha": quote["recharge_amount_poisha"],
            "discount_rate": quote["discount_rate"],
            "discount_amount_bdt": quote["discount_amount_bdt"],
            "discount_amount_poisha": quote["discount_amount_poisha"],
            "customer_pay_amount_bdt": quote["customer_pay_amount_bdt"],
            "customer_pay_amount_poisha": quote["customer_pay_amount_poisha"],
            "tracking_token": tracking_token,
            "created_at": saved_order["created_at"]
        }

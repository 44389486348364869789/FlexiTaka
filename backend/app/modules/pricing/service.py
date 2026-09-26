"""
Pricing Engine Service.
Authoritative calculation of platform fees, discounts, and payout amounts using Decimal.
"""

from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Any, Optional
from app.core.constants import ErrorCode, ServiceType, bdt_to_poisha, poisha_to_bdt
from app.core.exceptions import ValidationException
from app.db.repositories.pricing_repo import PricingRepository


class PricingService:
    def __init__(self, pricing_repo: PricingRepository):
        self.pricing_repo = pricing_repo

    async def calculate_cashout_quote(self, operator_code: str, amount_bdt: Decimal, phone: Optional[str] = None) -> Dict[str, Any]:
        if phone:
            from app.modules.operators.resolver import validate_operator_match
            validate_operator_match(operator_code, phone)

        rule = await self.pricing_repo.get_active_rule(ServiceType.CASH_OUT, operator_code)
        min_amt = Decimal(str(rule.get("min_amount", 10)))
        max_amt = Decimal(str(rule.get("max_amount", 50000)))

        amount_bdt = Decimal(str(amount_bdt)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        if amount_bdt < min_amt or amount_bdt > max_amt:
            raise ValidationException(
                f"Cash Out amount must be between ৳{min_amt} and ৳{max_amt} / পরিমাণ অবশ্যই ৳{min_amt} থেকে ৳{max_amt} এর মধ্যে হতে হবে",
                code=ErrorCode.AMOUNT_OUT_OF_RANGE
            )

        fee_rate = Decimal(str(rule.get("rate_value", 20)))
        fee_amount = (amount_bdt * (fee_rate / Decimal("100"))).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        payout_amount = (amount_bdt - fee_amount).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        source_poisha = bdt_to_poisha(amount_bdt)
        fee_poisha = bdt_to_poisha(fee_amount)
        payout_poisha = source_poisha - fee_poisha

        return {
            "operator_code": operator_code,
            "source_amount_bdt": amount_bdt,
            "source_amount_poisha": source_poisha,
            "platform_fee_rate": fee_rate,
            "platform_fee_amount_bdt": fee_amount,
            "platform_fee_amount_poisha": fee_poisha,
            "payout_amount_bdt": payout_amount,
            "payout_amount_poisha": payout_poisha,
            "currency": "BDT",
            "pricing_rule_version": rule.get("version", 1)
        }

    async def calculate_recharge_quote(self, operator_code: str, recharge_amount_bdt: Decimal, phone: Optional[str] = None) -> Dict[str, Any]:
        if phone:
            from app.modules.operators.resolver import validate_operator_match
            validate_operator_match(operator_code, phone)

        rule = await self.pricing_repo.get_active_rule(ServiceType.RECHARGE, operator_code)
        min_amt = Decimal(str(rule.get("min_amount", 10)))
        max_amt = Decimal(str(rule.get("max_amount", 50000)))

        recharge_amount_bdt = Decimal(str(recharge_amount_bdt)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        if recharge_amount_bdt < min_amt or recharge_amount_bdt > max_amt:
            raise ValidationException(
                f"Recharge amount must be between ৳{min_amt} and ৳{max_amt} / পরিমাণ অবশ্যই ৳{min_amt} থেকে ৳{max_amt} এর মধ্যে হতে হবে",
                code=ErrorCode.AMOUNT_OUT_OF_RANGE
            )

        discount_rate = Decimal(str(rule.get("rate_value", 5)))
        discount_amount = (recharge_amount_bdt * (discount_rate / Decimal("100"))).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        customer_pay_amount = (recharge_amount_bdt - discount_amount).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        recharge_poisha = bdt_to_poisha(recharge_amount_bdt)
        discount_poisha = bdt_to_poisha(discount_amount)
        pay_poisha = recharge_poisha - discount_poisha

        return {
            "operator_code": operator_code,
            "recharge_amount_bdt": recharge_amount_bdt,
            "recharge_amount_poisha": recharge_poisha,
            "discount_rate": discount_rate,
            "discount_amount_bdt": discount_amount,
            "discount_amount_poisha": discount_poisha,
            "customer_pay_amount_bdt": customer_pay_amount,
            "customer_pay_amount_poisha": pay_poisha,
            "currency": "BDT",
            "pricing_rule_version": rule.get("version", 1)
        }

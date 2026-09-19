"""
Pricing Rules Repository for pricing_rules collection.
Authoritative source for fee and discount rates.
"""

from typing import Any, Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.config import settings
from app.core.constants import ServiceType
from app.core.security import generate_rule_id
from app.db.repositories.base import BaseRepository


class PricingRepository(BaseRepository):
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "pricing_rules")

    async def get_active_rule(self, service_type: ServiceType, operator_code: Optional[str] = None) -> Dict[str, Any]:
        """
        Fetch active pricing rule for service and operator.
        Falls back to default rule if no specific operator rule exists.
        """
        query: Dict[str, Any] = {
            "service_type": service_type,
            "status": "ACTIVE"
        }
        if operator_code:
            # Try operator-specific first
            rule = await self.find_one({**query, "operator_code": operator_code})
            if rule:
                return rule

        # Fallback to general (ALL or null operator)
        rule = await self.find_one({**query, "operator_code": {"$in": ["ALL", None]}})
        if rule:
            return rule

        # System fallback if database is empty initially
        if service_type == ServiceType.CASH_OUT:
            return {
                "rule_id": "DEFAULT-CASHOUT",
                "service_type": ServiceType.CASH_OUT,
                "operator_code": "ALL",
                "rate_type": "PERCENTAGE",
                "rate_value": settings.DEFAULT_CASHOUT_FEE_PERCENT,
                "min_amount": settings.MIN_ORDER_AMOUNT_BDT,
                "max_amount": settings.MAX_ORDER_AMOUNT_BDT,
                "version": 1,
                "status": "ACTIVE"
            }
        else:
            return {
                "rule_id": "DEFAULT-RECHARGE",
                "service_type": ServiceType.RECHARGE,
                "operator_code": "ALL",
                "rate_type": "DISCOUNT_PERCENTAGE",
                "rate_value": settings.DEFAULT_RECHARGE_DISCOUNT_PERCENT,
                "min_amount": settings.MIN_ORDER_AMOUNT_BDT,
                "max_amount": settings.MAX_ORDER_AMOUNT_BDT,
                "version": 1,
                "status": "ACTIVE"
            }

    async def list_rules(self) -> List[Dict[str, Any]]:
        return await self.find_many({}, sort_by=[("service_type", 1), ("created_at", -1)])

    async def create_or_update_rule(self, rule_data: Dict[str, Any], created_by: str) -> Dict[str, Any]:
        rule = rule_data.copy()
        rule["rule_id"] = generate_rule_id()
        rule["created_by"] = created_by
        rule["status"] = "ACTIVE"
        rule["version"] = rule.get("version", 1)
        return await self.insert_one(rule)

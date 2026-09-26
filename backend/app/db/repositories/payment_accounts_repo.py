"""
Authoritative Payment Accounts Repository for payment_accounts collection.
Maintains DB-driven source of truth for FlexiTaka receiving payment accounts:
- bKash
- Nagad
- Rocket
- Bangla QR
"""

from typing import Any, Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.db.repositories.base import BaseRepository

DEFAULT_PAYMENT_ACCOUNTS: List[Dict[str, Any]] = [
    {
        "account_id": "pa_bkash",
        "method": "BKASH",
        "account_name": "bKash Personal Account",
        "account_number": "01981475404",
        "display_number": "01981475404",
        "account_type": "Personal",
        "is_active": True,
        "qr_code_url": None,
        "instructions": "Send Money to this bKash number with Order ID in Reference field",
        "instructions_bn": "রেফারেন্স অপশনে অর্ডার আইডি দিয়ে এই বিকাশ নম্বরে Send Money করুন"
    },
    {
        "account_id": "pa_nagad",
        "method": "NAGAD",
        "account_name": "Nagad Personal Account",
        "account_number": "01981475404",
        "display_number": "01981475404",
        "account_type": "Personal",
        "is_active": True,
        "qr_code_url": None,
        "instructions": "Send Money to this Nagad number with Order ID in Reference field",
        "instructions_bn": "রেফারেন্স অপশনে অর্ডার আইডি দিয়ে এই নগদ নম্বরে Send Money করুন"
    },
    {
        "account_id": "pa_rocket",
        "method": "ROCKET",
        "account_name": "Rocket Personal Account",
        "account_number": "01981475404",
        "display_number": "01981475404",
        "account_type": "Personal",
        "is_active": True,
        "qr_code_url": None,
        "instructions": "Send Money to this Rocket number with Order ID in Reference field",
        "instructions_bn": "রেফারেন্স অপশনে অর্ডার আইডি দিয়ে এই রকেট নম্বরে Send Money করুন"
    },
    {
        "account_id": "pa_bangla_qr",
        "method": "BANGLA_QR",
        "account_name": "FlexiTaka Bangla QR Merchant",
        "account_number": "01981475404",
        "display_number": "01981475404",
        "account_type": "Merchant",
        "is_active": True,
        "qr_code_url": "/logos/bangla-qr.svg",
        "instructions": "Scan Bangla QR with any banking or MFS app and enter Order ID in Reference",
        "instructions_bn": "যেকোনো ব্যাংকিং বা MFS অ্যাপ থেকে বাংলা কিউআর স্ক্যান করে রেফারেন্সে অর্ডার আইডি দিন"
    }
]


class PaymentAccountsRepository(BaseRepository):
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "payment_accounts")

    async def ensure_defaults(self) -> None:
        """Seed default payment accounts into MongoDB if collection is empty."""
        count = await self.collection.count_documents({})
        if count == 0:
            for acc in DEFAULT_PAYMENT_ACCOUNTS:
                doc = acc.copy()
                doc["created_at"] = self.utcnow()
                doc["updated_at"] = self.utcnow()
                await self.collection.insert_one(doc)

    async def get_active_accounts(self) -> List[Dict[str, Any]]:
        """Returns all currently active payment accounts."""
        await self.ensure_defaults()
        docs = await self.find_many({"is_active": True}, sort_by=[("method", 1)], limit=50)
        return docs

    async def get_by_method(self, method: str) -> Optional[Dict[str, Any]]:
        """Finds active payment account for the specified payment method."""
        await self.ensure_defaults()
        clean_method = str(method).upper().strip()
        return await self.find_one({"method": clean_method, "is_active": True})

    async def get_by_account_id(self, account_id: str) -> Optional[Dict[str, Any]]:
        return await self.find_one({"account_id": account_id})

    async def update_account(self, account_id: str, updates: Dict[str, Any]) -> bool:
        return await self.update_one({"account_id": account_id}, {"$set": updates})

    async def create_account(self, account_data: Dict[str, Any]) -> Dict[str, Any]:
        now = self.utcnow()
        doc = dict(account_data)
        doc["created_at"] = now
        doc["updated_at"] = now
        await self.collection.insert_one(doc)
        return doc

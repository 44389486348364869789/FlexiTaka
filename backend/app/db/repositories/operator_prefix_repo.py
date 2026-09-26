"""
Authoritative Operator Prefix Repository for operator_prefixes collection.
Single authoritative source of truth for Bangladeshi mobile network operator prefixes.
"""

import time
import re
from typing import Any, Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.constants import OperatorCode
from app.core.exceptions import ConflictException, ValidationException
from app.core.logging import logger
from app.db.repositories.base import BaseRepository

DEFAULT_PREFIXES = [
    {"prefix": "017", "operator_code": OperatorCode.GP.value, "active": True, "notes": "Grameenphone Primary", "source": "SYSTEM_SEEDED"},
    {"prefix": "013", "operator_code": OperatorCode.GP.value, "active": True, "notes": "Grameenphone Secondary", "source": "SYSTEM_SEEDED"},
    {"prefix": "019", "operator_code": OperatorCode.BANGLALINK.value, "active": True, "notes": "Banglalink Primary", "source": "SYSTEM_SEEDED"},
    {"prefix": "014", "operator_code": OperatorCode.BANGLALINK.value, "active": True, "notes": "Banglalink Secondary", "source": "SYSTEM_SEEDED"},
    {"prefix": "018", "operator_code": OperatorCode.ROBI.value, "active": True, "notes": "Robi Primary", "source": "SYSTEM_SEEDED"},
    {"prefix": "016", "operator_code": OperatorCode.ROBI.value, "active": True, "notes": "Robi / Airtel", "source": "SYSTEM_SEEDED"},
]


class OperatorPrefixRepository(BaseRepository):
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db, "operator_prefixes")

    async def ensure_indexes_and_seed(self) -> None:
        """Create unique index on prefix and seed default prefixes if collection is empty."""
        try:
            await self.collection.create_index("prefix", unique=True)
            await self.collection.create_index([("operator_code", 1), ("active", 1)])
        except Exception as e:
            logger.warning("Could not create index on operator_prefixes: %s", e)

        count = await self.collection.count_documents({})
        if count == 0:
            logger.info("Seeding initial authoritative operator prefixes into database...")
            now = int(time.time())
            for item in DEFAULT_PREFIXES:
                doc = {
                    **item,
                    "created_at": now,
                    "updated_at": now,
                    "created_by": "SYSTEM",
                    "updated_by": "SYSTEM"
                }
                await self.collection.update_one({"prefix": item["prefix"]}, {"$setOnInsert": doc}, upsert=True)

    async def get_active_prefix_map(self) -> Dict[str, str]:
        """Returns mapping of active prefix -> operator_code, e.g. {'017': 'GP', ...}."""
        cursor = self.collection.find({"active": True})
        prefixes = await cursor.to_list(length=100)
        mapping = {}
        for p in prefixes:
            mapping[p["prefix"]] = p["operator_code"].upper()
        # Fallback to defaults if DB returned empty
        if not mapping:
            for item in DEFAULT_PREFIXES:
                if item["active"]:
                    mapping[item["prefix"]] = item["operator_code"].upper()
        return mapping

    async def list_all_prefixes(self) -> List[Dict[str, Any]]:
        """List all prefixes (active and inactive) for admin review."""
        cursor = self.collection.find({}).sort("prefix", 1)
        prefixes = await cursor.to_list(length=100)
        results = []
        for p in prefixes:
            p_copy = dict(p)
            p_copy.pop("_id", None)
            results.append(p_copy)
        return results

    async def add_prefix(
        self,
        prefix: str,
        operator_code: str,
        active: bool = True,
        notes: str = "",
        created_by: str = "ADMIN"
    ) -> Dict[str, Any]:
        """Add a new authoritative 01X prefix."""
        prefix = str(prefix or "").strip()
        if not re.match(r"^01\d$", prefix):
            raise ValidationException(
                f"Prefix '{prefix}' is invalid. Must be exactly 3 digits starting with 01 (e.g. 017).",
                code="VALIDATION_ERROR"
            )

        op_code = operator_code.upper().strip()
        if op_code not in [OperatorCode.GP.value, OperatorCode.BANGLALINK.value, OperatorCode.ROBI.value, "TELETALK"]:
            raise ValidationException(
                f"Unsupported operator code '{operator_code}'. Must be GP, BANGLALINK, ROBI, or TELETALK.",
                code="INVALID_OPERATOR"
            )

        existing = await self.collection.find_one({"prefix": prefix})
        if existing:
            raise ConflictException(f"Prefix '{prefix}' is already registered to {existing.get('operator_code')}.")

        now = int(time.time())
        doc = {
            "prefix": prefix,
            "operator_code": op_code,
            "active": bool(active),
            "notes": str(notes or "").strip(),
            "source": "ADMIN_CONFIGURED",
            "created_at": now,
            "updated_at": now,
            "created_by": created_by,
            "updated_by": created_by
        }
        await self.collection.insert_one(doc)
        doc.pop("_id", None)
        return doc

    async def seed_default_prefixes(self) -> None:
        await self.ensure_indexes_and_seed()

    async def load_cache(self) -> Dict[str, str]:
        from app.modules.operators.resolver import update_memory_cache
        m = await self.get_active_prefix_map()
        update_memory_cache(m)
        return m

    async def update_prefix(
        self,
        prefix: str,
        operator_code: Optional[str] = None,
        active: Optional[bool] = None,
        notes: Optional[str] = None,
        updated_by: str = "ADMIN"
    ) -> Dict[str, Any]:
        """Update existing prefix status or operator mapping."""
        prefix = str(prefix or "").strip()
        existing = await self.collection.find_one({"prefix": prefix})
        if not existing:
            raise ValidationException(f"Prefix '{prefix}' not found in registry.", code="NOT_FOUND")

        now = int(time.time())
        updates: Dict[str, Any] = {"updated_at": now, "updated_by": updated_by}

        if operator_code is not None:
            op_code = operator_code.upper().strip()
            if op_code not in [OperatorCode.GP.value, OperatorCode.BANGLALINK.value, OperatorCode.ROBI.value]:
                raise ValidationException(
                    f"Unsupported operator code '{operator_code}'. Must be GP, BANGLALINK, or ROBI.",
                    code="INVALID_OPERATOR"
                )
            updates["operator_code"] = op_code

        if active is not None:
            updates["active"] = bool(active)

        if notes is not None:
            updates["notes"] = str(notes).strip()

        await self.collection.update_one({"prefix": prefix}, {"$set": updates})
        updated_doc = await self.collection.find_one({"prefix": prefix})
        if updated_doc:
            updated_doc.pop("_id", None)
        return updated_doc or {}

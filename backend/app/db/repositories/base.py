"""
Base Repository for MongoDB CRUD operations.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorCollection, AsyncIOMotorDatabase


class BaseRepository:
    def __init__(self, db: AsyncIOMotorDatabase, collection_name: str):
        self.db = db
        self.collection_name = collection_name
        self.collection: AsyncIOMotorCollection = db[collection_name]

    @staticmethod
    def utcnow() -> str:
        return datetime.now(timezone.utc).isoformat()

    @staticmethod
    def _clean_doc(doc: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        if doc and "_id" in doc:
            doc["_id"] = str(doc["_id"])
        return doc

    async def find_one(self, filter_query: Dict[str, Any], projection: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        doc = await self.collection.find_one(filter_query, projection)
        return self._clean_doc(doc)

    async def insert_one(self, document: Dict[str, Any]) -> Dict[str, Any]:
        doc = document.copy()
        now = self.utcnow()
        if "created_at" not in doc:
            doc["created_at"] = now
        if "updated_at" not in doc:
            doc["updated_at"] = now
        # Also mutate original document if passed
        document["created_at"] = doc["created_at"]
        document["updated_at"] = doc["updated_at"]
        res = await self.collection.insert_one(doc)
        doc["_id"] = str(res.inserted_id)
        return doc

    async def update_one(
        self,
        filter_query: Dict[str, Any],
        update_data: Dict[str, Any],
        upsert: bool = False
    ) -> bool:
        if "$set" in update_data:
            update_data["$set"]["updated_at"] = self.utcnow()
        else:
            update_data["$set"] = {"updated_at": self.utcnow()}
        res = await self.collection.update_one(filter_query, update_data, upsert=upsert)
        return res.modified_count > 0 or (upsert and res.upserted_id is not None)

    async def find_and_modify(
        self,
        filter_query: Dict[str, Any],
        update_data: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        if "$set" in update_data:
            update_data["$set"]["updated_at"] = self.utcnow()
        else:
            update_data["$set"] = {"updated_at": self.utcnow()}
        doc = await self.collection.find_one_and_update(
            filter_query,
            update_data,
            return_document=True
        )
        return self._clean_doc(doc)

    async def find_many(
        self,
        filter_query: Dict[str, Any],
        sort_by: Optional[List[tuple]] = None,
        limit: int = 50,
        skip: int = 0
    ) -> List[Dict[str, Any]]:
        cursor = self.collection.find(filter_query)
        if sort_by:
            cursor = cursor.sort(sort_by)
        cursor = cursor.skip(skip).limit(limit)
        docs = await cursor.to_list(length=limit)
        return [self._clean_doc(d) for d in docs]

    async def count(self, filter_query: Dict[str, Any]) -> int:
        return await self.collection.count_documents(filter_query)

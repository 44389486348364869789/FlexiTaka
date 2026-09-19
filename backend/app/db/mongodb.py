"""
MongoDB Database Lifecycle and Motor Connection Pool.
"""

from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.core.config import settings
from app.core.logging import logger

client: Optional[AsyncIOMotorClient] = None
db: Optional[AsyncIOMotorDatabase] = None


async def connect_to_mongo() -> None:
    global client, db
    try:
        masked_uri = settings.MONGODB_URI.split("@")[-1] if "@" in settings.MONGODB_URI else "localhost"
        logger.info("Connecting to MongoDB at %s", masked_uri)
        client = AsyncIOMotorClient(
            settings.MONGODB_URI,
            maxPoolSize=50,
            minPoolSize=10,
            serverSelectionTimeoutMS=10000
        )
        # Verify connection
        await client.admin.command('ping')
        db = client[settings.MONGODB_DATABASE]
        logger.info("Successfully connected to MongoDB database '%s'", settings.MONGODB_DATABASE)
    except Exception as exc:
        logger.error("Failed to connect to MongoDB: %s", exc)
        raise


async def close_mongo_connection() -> None:
    global client, db
    if client:
        logger.info("Closing MongoDB connection pool")
        client.close()
        client = None
        db = None


def get_database() -> AsyncIOMotorDatabase:
    if db is None:
        raise RuntimeError("MongoDB is not initialized. Call connect_to_mongo() first.")
    return db

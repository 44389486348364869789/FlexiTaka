"""
Redis Connection Lifecycle, Distributed Locks, and Idempotency Utilities.
"""

import json
from contextlib import asynccontextmanager
from typing import Any, AsyncGenerator, Optional, Tuple
import redis.asyncio as aioredis
from app.core.config import settings
from app.core.exceptions import ConflictException
from app.core.logging import logger

redis_client: Optional[aioredis.Redis] = None


async def connect_to_redis() -> None:
    global redis_client
    try:
        masked_redis = settings.REDIS_URL.split("@")[-1] if "@" in settings.REDIS_URL else "localhost"
        logger.info("Connecting to Redis at %s", masked_redis)
        redis_client = aioredis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            max_connections=50
        )
        await redis_client.ping()
        logger.info("Successfully connected to Redis")
    except Exception as exc:
        logger.warning("Could not connect to Redis: %s (falling back to memory where possible)", exc)
        redis_client = None


async def close_redis_connection() -> None:
    global redis_client
    if redis_client:
        logger.info("Closing Redis connection")
        await redis_client.aclose()
        redis_client = None


def get_redis() -> Optional[aioredis.Redis]:
    return redis_client


@asynccontextmanager
async def distributed_lock(
    lock_key: str,
    timeout_seconds: int = 10,
    blocking_timeout: float = 5.0
) -> AsyncGenerator[bool, None]:
    """
    Acquire a distributed lock using Redis to protect critical financial operations.
    If Redis is unavailable, logs a warning and proceeds with database-level isolation.
    """
    r = get_redis()
    acquired = False
    lock = None

    if r:
        try:
            lock = r.lock(f"lock:{lock_key}", timeout=timeout_seconds, blocking_timeout=blocking_timeout)
            acquired = await lock.acquire()
            if not acquired:
                raise ConflictException(f"Resource is currently being processed: {lock_key}")
        except ConflictException:
            raise
        except Exception as e:
            logger.warning("Failed to acquire Redis lock for %s: %s", lock_key, e)
            acquired = False

    try:
        yield acquired
    finally:
        if r and lock and acquired:
            try:
                await lock.release()
            except Exception as e:
                logger.warning("Failed to release Redis lock for %s: %s", lock_key, e)


async def get_cached_idempotency(key: str) -> Optional[Tuple[int, Any]]:
    """Check if an idempotency key was previously processed."""
    r = get_redis()
    if not r or not key:
        return None
    try:
        data = await r.get(f"idempotency:{key}")
        if data:
            parsed = json.loads(data)
            return parsed.get("status_code", 200), parsed.get("response")
    except Exception as e:
        logger.warning("Error reading idempotency key %s: %s", key, e)
    return None


async def save_cached_idempotency(key: str, status_code: int, response: Any, ttl_seconds: int = 86400) -> None:
    """Cache the response of an idempotency key."""
    r = get_redis()
    if not r or not key:
        return
    try:
        payload = json.dumps({"status_code": status_code, "response": response})
        await r.set(f"idempotency:{key}", payload, ex=ttl_seconds)
    except Exception as e:
        logger.warning("Error saving idempotency key %s: %s", key, e)

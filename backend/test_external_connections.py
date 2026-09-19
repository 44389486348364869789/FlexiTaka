import asyncio
import sys
from app.core.config import settings
from motor.motor_asyncio import AsyncIOMotorClient
import redis.asyncio as aioredis

async def test_mongo():
    try:
        client = AsyncIOMotorClient(settings.MONGODB_URI, serverSelectionTimeoutMS=8000)
        # Verify connection
        res = await client.admin.command('ping')
        db = client[settings.MONGODB_DATABASE]
        cols = await db.list_collection_names()
        print("MongoDB Connection: SUCCESS (Ping: ok, DB accessible)")
        client.close()
        return True
    except Exception as e:
        print(f"MongoDB Connection: FAILED - {type(e).__name__}")
        return False

async def test_redis():
    try:
        r = aioredis.from_url(settings.REDIS_URL, socket_timeout=8.0)
        pong = await r.ping()
        await r.set("ft_conn_test", "ok", ex=60)
        val = await r.get("ft_conn_test")
        await r.close()
        if pong and val == b"ok":
            print("MongoDB / Redis -> Redis Connection: SUCCESS (PING/PONG and read/write ok)")
            return True
        else:
            print("Redis Connection: FAILED (Unexpected response)")
            return False
    except Exception as e:
        print(f"Redis Connection: FAILED - {type(e).__name__}")
        return False

async def main():
    m = await test_mongo()
    r = await test_redis()
    if m and r:
        print("EXTERNAL CONNECTIONS: ALL PASS")
        sys.exit(0)
    else:
        print("EXTERNAL CONNECTIONS: FAILED")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())

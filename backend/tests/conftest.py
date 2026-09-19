"""
Pytest Test Fixtures and Async Client Configuration.
Uses the local MongoDB and Redis instances with a dedicated test database.
"""

import os
import sys
from typing import AsyncGenerator, Dict
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

# Add backend directory to sys.path
sys.path.insert(0, "/root/flexitaka/backend")

os.environ["APP_ENV"] = "test"
os.environ["MONGODB_DATABASE"] = "flexitaka_test"
os.environ["STORAGE_ROOT"] = "/root/flexitaka/backend/uploads_test"

from app.core.constants import AdminRole
from app.core.security import create_jwt_token
from app.db.indexes import ensure_indexes
from app.db.mongodb import close_mongo_connection, connect_to_mongo, get_database
from app.db.redis import close_redis_connection, connect_to_redis, get_redis
from app.main import app


_indexes_ensured = False


@pytest_asyncio.fixture(autouse=True)
async def clean_db():
    global _indexes_ensured
    import asyncio
    await connect_to_mongo()
    await connect_to_redis()
    db = get_database()
    r = get_redis()
    if r:
        await r.flushdb()
    if not _indexes_ensured:
        await ensure_indexes(db)
        _indexes_ensured = True
    # Fast parallel collection clearing
    col_names = [c for c in await db.list_collection_names() if not c.startswith("system.")]
    if col_names:
        await asyncio.gather(*(db[c].delete_many({}) for c in col_names))
    yield db
    if r:
        await r.flushdb()
    await close_redis_connection()
    await close_mongo_connection()


@pytest_asyncio.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="https://flexitaka.online") as ac:
        yield ac


@pytest.fixture
def auth_headers():
    def _make_headers(user_id: str = "FT-U99999", role: str = "USER", phone: str = "01711112222") -> Dict[str, str]:
        token = create_jwt_token({
            "sub": user_id,
            "role": role,
            "phone": phone,
            "type": "user"
        })
        return {"Authorization": f"Bearer {token}"}
    return _make_headers


@pytest.fixture
def staff_headers():
    def _make_headers(staff_id: str = "ADM-1001", role: AdminRole = AdminRole.SUPER_ADMIN) -> Dict[str, str]:
        token = create_jwt_token({
            "sub": staff_id,
            "email": f"{role.value.lower()}@flexitaka.online",
            "role": role.value,
            "type": "admin"
        })
        return {"Authorization": f"Bearer {token}"}
    return _make_headers

"""
Guest Session Service.
Issues secure ephemeral guest sessions with cryptographic session tokens.
"""

from datetime import datetime, timezone
from typing import Any, Dict, Optional
from app.core.constants import ErrorCode
from app.core.exceptions import UnauthorizedException
from app.core.security import create_jwt_token, generate_guest_id
from app.db.repositories.users_repo import UsersRepository


class GuestService:
    def __init__(self, users_repo: UsersRepository):
        self.users_repo = users_repo

    async def create_session(self, ip: Optional[str] = None, user_agent: Optional[str] = None) -> Dict[str, Any]:
        guest_id = generate_guest_id()
        session_token = create_jwt_token({
            "sub": guest_id,
            "type": "guest"
        })

        session_doc = {
            "guest_session_id": guest_id,
            "ip": ip,
            "user_agent": user_agent
        }
        saved = await self.users_repo.create_guest_session(session_doc)

        return {
            "guest_session_id": guest_id,
            "session_token": session_token,
            "expires_at": saved["expires_at"].isoformat() if isinstance(saved["expires_at"], datetime) else str(saved["expires_at"])
        }

    async def validate_session(self, guest_session_id: str) -> Dict[str, Any]:
        session = await self.users_repo.get_guest_session(guest_session_id)
        if not session:
            raise UnauthorizedException("Guest session not found or expired", code=ErrorCode.SESSION_EXPIRED)

        expires_at = session.get("expires_at")
        if isinstance(expires_at, datetime):
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at < datetime.now(timezone.utc):
                raise UnauthorizedException("Guest session expired", code=ErrorCode.SESSION_EXPIRED)
        elif isinstance(expires_at, str):
            try:
                exp_dt = datetime.fromisoformat(expires_at)
                if exp_dt.tzinfo is None:
                    exp_dt = exp_dt.replace(tzinfo=timezone.utc)
                if exp_dt < datetime.now(timezone.utc):
                    raise UnauthorizedException("Guest session expired", code=ErrorCode.SESSION_EXPIRED)
            except ValueError:
                pass

        return session

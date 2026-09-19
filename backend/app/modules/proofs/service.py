"""
Transaction Proof Storage Service.
Validates magic bytes, enforces size limits, and securely manages private VPS storage.
"""

import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional, Tuple
from fastapi import UploadFile
from app.core.config import settings
from app.core.constants import ErrorCode
from app.core.exceptions import ForbiddenException, NotFoundException, ValidationException
from app.core.logging import logger
from app.core.security import generate_proof_id, verify_tracking_token
from app.db.repositories.orders_repo import OrdersRepository
from app.db.repositories.proofs_repo import ProofsRepository


MAGIC_BYTE_SIGNATURES = [
    (b"\xff\xd8\xff", "image/jpeg"),
    (b"\x89PNG\r\n\x1a\n", "image/png"),
    (b"RIFF", "image/webp"),  # Starts with RIFF
    (b"%PDF-", "application/pdf")
]


def validate_magic_bytes(header: bytes) -> str:
    """Validate true MIME type via magic bytes; never trust only extension or header."""
    for sig, mime in MAGIC_BYTE_SIGNATURES:
        if header.startswith(sig):
            return mime
    raise ValidationException(
        "Invalid file content. Allowed formats: JPEG, PNG, WEBP, PDF",
        code=ErrorCode.FILE_TYPE_NOT_ALLOWED
    )


class ProofsService:
    def __init__(self, proofs_repo: ProofsRepository, orders_repo: OrdersRepository):
        self.proofs_repo = proofs_repo
        self.orders_repo = orders_repo

    async def upload_proof(
        self,
        order_id: str,
        file: UploadFile,
        uploaded_by_type: str,
        uploaded_by_id: str
    ) -> Dict[str, Any]:
        order = await self.orders_repo.get_by_order_id(order_id)
        if not order:
            raise NotFoundException(f"Order {order_id} not found")

        # Read header to validate magic bytes
        header = await file.read(16)
        if len(header) < 4:
            raise ValidationException("File is empty or corrupted", code=ErrorCode.FILE_TYPE_NOT_ALLOWED)

        detected_mime = validate_magic_bytes(header)

        # Read remaining content and enforce size limits
        remaining = await file.read()
        full_content = header + remaining
        file_size = len(full_content)

        if file_size > settings.MAX_UPLOAD_SIZE_BYTES:
            raise ValidationException(
                f"File size exceeds limit of {settings.MAX_UPLOAD_SIZE_BYTES // (1024*1024)}MB",
                code=ErrorCode.FILE_TOO_LARGE
            )

        proof_id = generate_proof_id()
        now = datetime.now(timezone.utc)
        storage_rel_dir = f"{now.year}/{now.month:02d}"
        target_dir = settings.resolved_storage_root / storage_rel_dir
        target_dir.mkdir(parents=True, exist_ok=True)

        ext = detected_mime.split("/")[-1]
        if ext == "jpeg":
            ext = "jpg"
        file_name = f"{proof_id}_{file.filename}"
        file_path = target_dir / file_name

        with open(file_path, "wb") as f:
            f.write(full_content)

        proof_doc = {
            "proof_id": proof_id,
            "order_id": order_id,
            "file_key": str(file_path),
            "file_name": file.filename or file_name,
            "mime_type": detected_mime,
            "size_bytes": file_size,
            "uploaded_by_type": uploaded_by_type,
            "uploaded_by_id": uploaded_by_id,
            "status": "SUBMITTED"
        }
        await self.proofs_repo.insert_one(proof_doc)

        logger.info("Proof uploaded: %s for order %s (%s bytes)", proof_id, order_id, file_size)

        return {
            "proof_id": proof_id,
            "order_id": order_id,
            "file_name": proof_doc["file_name"],
            "mime_type": detected_mime,
            "size_bytes": file_size,
            "created_at": proof_doc["created_at"]
        }

    async def get_proof_for_download(
        self,
        proof_id: str,
        user_id: Optional[str] = None,
        guest_session_id: Optional[str] = None,
        tracking_token: Optional[str] = None,
        is_staff: bool = False
    ) -> Tuple[Path, str, str]:
        proof = await self.proofs_repo.get_by_proof_id(proof_id)
        if not proof:
            raise NotFoundException(f"Proof {proof_id} not found")

        order = await self.orders_repo.get_by_order_id(proof["order_id"])
        if not order:
            raise NotFoundException("Associated order not found")

        # Ownership / Permission Check
        if not is_staff:
            is_owner = False
            if user_id and order.get("user_id") == user_id:
                is_owner = True
            elif guest_session_id and order.get("guest_session_id") == guest_session_id:
                is_owner = True
            elif tracking_token and order.get("guest_session_id"):
                if verify_tracking_token(order["order_id"], order["guest_session_id"], tracking_token):
                    is_owner = True

            if not is_owner:
                raise ForbiddenException("Permission denied to access this proof file")

        file_path = Path(proof["file_key"])
        if not file_path.exists():
            raise NotFoundException("Proof file not found on storage")

        return file_path, proof["mime_type"], proof["file_name"]

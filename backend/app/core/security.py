"""
Security and Cryptographic Operations.
Handles password hashing, JWT generation, tracking secret verification, and ID generation.
"""

import hmac
import hashlib
import secrets
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
import jwt
from passlib.context import CryptContext
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_jwt_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"iat": now, "exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_jwt_token(token: str) -> Dict[str, Any]:
    return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])


def generate_tracking_token(order_id: str, guest_session_id: str) -> str:
    """Generate a tamper-proof tracking token for guest order inspection."""
    raw = f"{order_id}:{guest_session_id}:{settings.JWT_SECRET}"
    return hashlib.sha256(raw.encode()).hexdigest()[:32]


def verify_tracking_token(order_id: str, guest_session_id: str, token: str) -> bool:
    expected = generate_tracking_token(order_id, guest_session_id)
    return hmac.compare_digest(expected, token)


def generate_public_id(prefix: str) -> str:
    """Generate high-entropy human-readable public IDs (e.g. FT-108249)."""
    ts = int(time.time() * 1000) % 100000
    rand = secrets.randbelow(900000) + 100000
    return f"{prefix}-{ts}{rand}"


def generate_order_id() -> str:
    return generate_public_id("FT")


def generate_guest_id() -> str:
    return generate_public_id("FT-G")


def generate_user_id() -> str:
    return generate_public_id("FT-U")


def generate_admin_id() -> str:
    return generate_public_id("ADM")


def generate_proof_id() -> str:
    return generate_public_id("PRF")


def generate_payout_id() -> str:
    return generate_public_id("OUT")


def generate_payment_id() -> str:
    return generate_public_id("PAY")


def generate_sim_id() -> str:
    return generate_public_id("SIM")


def generate_ticket_id() -> str:
    return generate_public_id("TCK")


def generate_notification_id() -> str:
    return generate_public_id("NTF")


def generate_audit_id() -> str:
    return generate_public_id("AUD")


def generate_inventory_id() -> str:
    return generate_public_id("INV")


def generate_rule_id() -> str:
    return generate_public_id("RULE")


# --- Transfer PIN Cryptographic Encryption at Rest ---
import base64
from cryptography.fernet import Fernet


def _get_fernet() -> Fernet:
    """Derives a deterministic 32-byte Fernet key from the application secret."""
    key_material = hashlib.sha256(f"flexitaka-transfer-pin-encryption:{settings.JWT_SECRET}".encode()).digest()
    urlsafe_key = base64.urlsafe_b64encode(key_material)
    return Fernet(urlsafe_key)


def encrypt_pin(plain_pin: str) -> str:
    """Encrypts a plaintext PIN at rest using AES-128-CBC + HMAC-SHA256 authenticated encryption."""
    if not plain_pin:
        return ""
    fernet = _get_fernet()
    return fernet.encrypt(str(plain_pin).strip().encode("utf-8")).decode("utf-8")


def decrypt_pin(encrypted_pin: Optional[str]) -> Optional[str]:
    """Decrypts an encrypted transfer PIN. Returns None if decryption fails or token is empty."""
    if not encrypted_pin:
        return None
    try:
        fernet = _get_fernet()
        return fernet.decrypt(str(encrypted_pin).strip().encode("utf-8")).decode("utf-8")
    except Exception:
        return None


def derive_default_pin(msisdn: str) -> str:
    """
    Business rule: New Transfer PIN = last 4 digits of SIM number.
    Ensures 4 numeric digits.
    """
    digits = "".join(c for c in str(msisdn) if c.isdigit())
    if len(digits) >= 4:
        return digits[-4:]
    return "1234"


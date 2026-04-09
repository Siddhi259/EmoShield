"""
backend/src/utils/encryption.py — EmoShield
AES-256 encryption for all platform tokens stored in DB.
User data is always encrypted before saving and decrypted on read.
"""

import base64
import hashlib
import secrets
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC


def _get_fernet() -> Fernet:
    """Build Fernet cipher from app secret key."""
    from src.utils.config import settings
    key_material = settings.SECRET_KEY.encode()
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=b"emoshield_v1_salt",
        iterations=100000,
    )
    key = base64.urlsafe_b64encode(kdf.derive(key_material))
    return Fernet(key)


def encrypt(plaintext: str) -> str:
    """Encrypt a string. Returns base64 ciphertext."""
    if not plaintext:
        return ""
    f = _get_fernet()
    return base64.urlsafe_b64encode(
        f.encrypt(plaintext.encode("utf-8"))
    ).decode("utf-8")


def decrypt(ciphertext: str) -> str:
    """Decrypt an encrypted string. Returns original plaintext."""
    if not ciphertext:
        return ""
    try:
        f   = _get_fernet()
        enc = base64.urlsafe_b64decode(ciphertext.encode("utf-8"))
        return f.decrypt(enc).decode("utf-8")
    except Exception:
        return ""


def hash_phone(phone: str) -> str:
    """One-way hash a phone number for privacy."""
    return hashlib.sha256(phone.encode()).hexdigest()


def generate_otp(length: int = 6) -> str:
    """Generate a secure random numeric OTP."""
    return "".join([str(secrets.randbelow(10)) for _ in range(length)])

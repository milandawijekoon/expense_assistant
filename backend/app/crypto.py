"""Encryption at rest for secrets users store in the app (their LLM API keys).

The Fernet key is derived from JWT_SECRET, so rotating JWT_SECRET makes stored keys
undecryptable; users then just enter their key again.
"""

import base64
import hashlib
from functools import lru_cache

from cryptography.fernet import Fernet, InvalidToken

from app.config import get_settings


@lru_cache
def _fernet() -> Fernet:
    secret = get_settings().jwt_secret.get_secret_value().encode()
    return Fernet(base64.urlsafe_b64encode(hashlib.sha256(b"llm-key:" + secret).digest()))


def encrypt(value: str) -> str:
    return _fernet().encrypt(value.encode()).decode()


def decrypt(token: str) -> str | None:
    try:
        return _fernet().decrypt(token.encode()).decode()
    except InvalidToken:
        return None

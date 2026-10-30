from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import get_settings
from app.security import decode_access_token


def rate_limit_key(request: Request) -> str:
    """Limit per authenticated user; fall back to client IP."""
    auth = request.headers.get("authorization", "")
    if auth.lower().startswith("bearer "):
        user_id = decode_access_token(auth[7:])
        if user_id:
            return f"user:{user_id}"
    return get_remote_address(request)


limiter = Limiter(key_func=rate_limit_key, enabled=get_settings().rate_limit_enabled)


def llm_limit() -> str:
    return get_settings().llm_rate_limit


def auth_limit() -> str:
    return get_settings().auth_rate_limit

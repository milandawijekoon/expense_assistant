from typing import Annotated

from fastapi import Depends, Query
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.errors import AuthError
from app.llm.base import LLMClient
from app.models import User
from app.security import decode_access_token
from app.services import llm_settings_service
from app.utils.dates import MONTH_PATTERN

_bearer = HTTPBearer(auto_error=False)

DbSession = Annotated[Session, Depends(get_db)]
MonthParam = Annotated[str, Query(pattern=MONTH_PATTERN, description="YYYY-MM")]


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
    db: DbSession,
) -> User:
    if credentials is None:
        raise AuthError()
    user_id = decode_access_token(credentials.credentials)
    user = db.get(User, user_id) if user_id else None
    if user is None:
        raise AuthError("Invalid or expired token.")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def get_llm(user: CurrentUser, db: DbSession) -> LLMClient:
    """The caller's own LLM settings, falling back to the server's environment config."""
    return llm_settings_service.get_client(db, user)


LLM = Annotated[LLMClient, Depends(get_llm)]

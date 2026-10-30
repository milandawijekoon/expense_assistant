from fastapi import APIRouter, Request

from app.deps import CurrentUser, DbSession
from app.rate_limit import auth_limit, limiter
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserOut, UserUpdate
from app.security import create_access_token
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=201)
@limiter.limit(auth_limit)
def register(request: Request, body: RegisterRequest, db: DbSession) -> TokenResponse:
    user = auth_service.register(db, body)
    return TokenResponse(access_token=create_access_token(user.id))


@router.post("/login", response_model=TokenResponse)
@limiter.limit(auth_limit)
def login(request: Request, body: LoginRequest, db: DbSession) -> TokenResponse:
    user = auth_service.authenticate(db, body.email, body.password)
    return TokenResponse(access_token=create_access_token(user.id))


@router.get("/me", response_model=UserOut)
def me(user: CurrentUser) -> UserOut:
    return UserOut.model_validate(user)


@router.patch("/me", response_model=UserOut)
def update_me(body: UserUpdate, user: CurrentUser, db: DbSession) -> UserOut:
    """Change the currency used for new expenses and for totals, summaries and reports."""
    user.default_currency = body.default_currency
    db.commit()
    return UserOut.model_validate(user)

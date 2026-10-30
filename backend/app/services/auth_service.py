from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.errors import AuthError, ConflictError
from app.models import User
from app.schemas.auth import RegisterRequest
from app.security import DUMMY_HASH, hash_password, verify_password


def register(db: Session, data: RegisterRequest) -> User:
    email = data.email.lower().strip()
    if db.scalar(select(User.id).where(User.email == email)):
        raise ConflictError("An account with this email already exists.")
    user = User(
        email=email,
        password_hash=hash_password(data.password),
        default_currency=data.default_currency,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise ConflictError("An account with this email already exists.") from exc
    return user


def authenticate(db: Session, email: str, password: str) -> User:
    user = db.scalar(select(User).where(User.email == email.lower().strip()))
    if user is None:
        verify_password(password, DUMMY_HASH)
        raise AuthError("Incorrect email or password.")
    if not verify_password(password, user.password_hash):
        raise AuthError("Incorrect email or password.")
    return user

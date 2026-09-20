"""JWT auth + password helpers."""
from datetime import datetime, timedelta, timezone
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from .config import settings
from .database import get_db
from .models import User

ALGORITHM = settings.jwt_algorithm
SECRET = settings.jwt_secret

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token", auto_error=False)


def hash_password(p: str) -> str:
    return pwd_context.hash(p)


def verify_password(p: str, h: str) -> bool:
    return pwd_context.verify(p, h)


def create_token(user_id: int, is_guest: bool = False) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {"sub": str(user_id), "guest": is_guest, "exp": expire}
    return jwt.encode(payload, SECRET, algorithm=ALGORITHM)


def decode_token(token: str | None):
    if not token:
        return None
    try:
        return jwt.decode(token, SECRET, algorithms=[ALGORITHM])
    except JWTError:
        return None


def get_current_user(
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    cred_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_token(token)
    if payload is None:
        raise cred_exc
    try:
        user_id = int(payload.get("sub"))
    except (TypeError, ValueError):
        raise cred_exc
    user = db.get(User, user_id)
    if user is None:
        raise cred_exc
    return user


def optional_user(
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User | None:
    """Returns the user if a valid token is present, else None (guest/visitor)."""
    payload = decode_token(token)
    if payload is None:
        return None
    try:
        user_id = int(payload.get("sub"))
    except (TypeError, ValueError):
        return None
    return db.get(User, user_id)


# ===================== ADMIN AUTH =====================
from .models import AdminUser, ROLE_PERMISSIONS


def create_admin_token(admin_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.admin_token_expire_minutes)
    payload = {"sub": str(admin_id), "admin": True, "exp": expire}
    return jwt.encode(payload, SECRET, algorithm=ALGORITHM)


def get_current_admin(
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> AdminUser:
    cred_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Admin login required",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_token(token)
    if payload is None or not payload.get("admin"):
        raise cred_exc
    try:
        admin_id = int(payload.get("sub"))
    except (TypeError, ValueError):
        raise cred_exc
    admin = db.get(AdminUser, admin_id)
    if admin is None or not admin.is_active:
        raise cred_exc
    return admin


def require_permission(scope: str):
    """Dependency factory: ensure the logged-in admin has `scope` permission."""
    def _dep(admin: AdminUser = Depends(get_current_admin)) -> AdminUser:
        if scope not in ROLE_PERMISSIONS.get(admin.role, set()):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Your role ({admin.role}) cannot access '{scope}'.",
            )
        return admin
    return _dep


def admin_token_url() -> str:
    return "admin/token"

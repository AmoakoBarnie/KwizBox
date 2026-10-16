"""Auth + user routes: register, login, guest, profile."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, AdminUser
from ..auth import hash_password, verify_password, create_token, get_current_user
from ..progress import build_progress
from ..schemas import (
    RegisterRequest, LoginRequest, GuestRequest, TokenResponse, PublicUser,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def to_public(user: User, db=None) -> PublicUser:
    progress = None
    if db is not None:
        try:
            progress = build_progress(db, user)
        except Exception:
            progress = None
    return PublicUser(
        id=user.id,
        nickname=user.nickname,
        class_level=user.class_level,
        school_code=user.school_code,
        is_guest=user.is_guest,
        lifetime_score=user.lifetime_score or 0,
        total_questions=user.total_questions or 0,
        total_correct=user.total_correct or 0,
        current_streak=user.current_streak or 0,
        longest_streak=user.longest_streak or 0,
        progress=progress,
    )


@router.post("/register", response_model=TokenResponse)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(
        User.nickname == body.nickname, User.is_guest.is_(False)
    ).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Nickname already taken")
    user = User(
        nickname=body.nickname,
        class_level=body.class_level,
        school_code=body.school_code,
        is_guest=False,
        password_hash=hash_password(body.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return TokenResponse(access_token=create_token(user.id), user=to_public(user, db))


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):

    # 1. Registered (non-guest) user lookup by nickname
    user = db.query(User).filter(
        User.nickname == body.nickname, User.is_guest.is_(False)
    ).first()
    if user and user.password_hash and verify_password(body.password, user.password_hash):
        from ..auth import create_token as mk_token
        return TokenResponse(
            access_token=mk_token(user.id),
            user=to_public(user, db)
        )

    # 2. Admin user lookup by username (admin_users table)
    admin = db.query(AdminUser).filter(
        AdminUser.username == body.nickname
    ).first()
    if admin and admin.password_hash and verify_password(body.password, admin.password_hash):
        from ..auth import create_admin_token as mk_token
        # Build a minimal PublicUser for admin login
        return TokenResponse(
            access_token=mk_token(admin.id),
            user=PublicUser(
                id=admin.id,
                nickname=admin.username,
                class_level=None,
                school_code=None,
                is_guest=False,
                lifetime_score=0,
                total_questions=0,
                total_correct=0,
                current_streak=0,
                longest_streak=0,
                progress=None,
            )
        )

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid nickname or password")


@router.post("/guest", response_model=TokenResponse)
def guest(body: GuestRequest, db: Session = Depends(get_db)):
    user = User(
        nickname=body.nickname or "Guest",
        class_level=body.class_level,
        school_code=body.school_code,
        is_guest=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return TokenResponse(access_token=create_token(user.id, is_guest=True), user=to_public(user, db))


@router.get("/me", response_model=PublicUser)
def me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return to_public(user, db)

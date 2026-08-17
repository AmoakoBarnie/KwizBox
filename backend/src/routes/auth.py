"""Auth + user routes: register, login, guest, profile."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User
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
    user = db.query(User).filter(
        User.nickname == body.nickname, User.is_guest.is_(False)
    ).first()
    if not user or not user.password_hash or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid nickname or password")
    return TokenResponse(access_token=create_token(user.id), user=to_public(user, db))


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

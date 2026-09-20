"""Auth + user routes: register, login, guest, profile, account deletion."""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone, timedelta

from ..database import get_db
from ..rate_limit import limiter
from ..models import User, AdminUser, QuizSession, TopicProgress, SubjectProgress, UserQuestionSeen
from ..auth import hash_password, verify_password, create_token, get_current_user
from ..progress import build_progress
from ..schemas import (
    RegisterRequest, LoginRequest, GuestRequest, TokenResponse, PublicUser,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _client_ip(request: Request) -> str:
    """Extract client IP from request, accounting for proxies."""
    if request and request.client:
        return request.client.host
    return "0.0.0.0"


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
        avatar={
            "skin": getattr(user, "avatar_skin", "warm") or "warm",
            "hat": getattr(user, "avatar_hat", "none") or "none",
            "accessory": getattr(user, "avatar_accessory", "none") or "none",
            "gender": getattr(user, "avatar_gender", "male") or "male",
        },
    )


@router.post("/register", response_model=TokenResponse)
@limiter.limit("10/minute")
def register(request: Request, body: RegisterRequest, db: Session = Depends(get_db)):
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
        last_ip=_client_ip(request),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return TokenResponse(access_token=create_token(user.id), user=to_public(user, db))


@router.post("/login", response_model=TokenResponse)
@limiter.limit("15/minute")
def login(request: Request, body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        User.nickname == body.nickname, User.is_guest.is_(False)
    ).first()
    if user and user.password_hash and verify_password(body.password, user.password_hash):
        from ..auth import create_token as mk_token
        user.last_ip = _client_ip(request)
        user.last_login = datetime.now(timezone.utc)
        db.commit()
        return TokenResponse(
            access_token=mk_token(user.id),
            user=to_public(user, db)
        )
    admin = db.query(AdminUser).filter(AdminUser.username == body.nickname).first()
    if admin and admin.password_hash and verify_password(body.password, admin.password_hash):
        from ..auth import create_admin_token as mk_token
        return TokenResponse(
            access_token=mk_token(admin.id),
            user=PublicUser(
                id=admin.id, nickname=admin.username, class_level=None, school_code=None,
                is_guest=False, lifetime_score=0, total_questions=0, total_correct=0,
                current_streak=0, longest_streak=0, progress=None,
            )
        )
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid nickname or password")


@router.post("/guest", response_model=TokenResponse)
@limiter.limit("20/minute")
def guest(request: Request, body: GuestRequest, db: Session = Depends(get_db)):
    user = User(
        nickname=body.nickname or "Guest",
        class_level=body.class_level,
        school_code=body.school_code,
        is_guest=True,
        is_active=True,
        last_ip=_client_ip(request),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return TokenResponse(access_token=create_token(user.id, is_guest=True), user=to_public(user, db))


@router.get("/me", response_model=PublicUser)
def me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return to_public(user, db)


class AvatarUpdateRequest(BaseModel):
    skin: Optional[str] = None
    hat: Optional[str] = None
    accessory: Optional[str] = None
    gender: Optional[str] = None


VALID_AVATAR_SKINS = {"warm", "deep", "light", "cool"}
VALID_AVATAR_HATS = {"none", "kente_cap", "school_cap", "beanie", "sun_hat"}
VALID_AVATAR_ACCESSORIES = {"none", "glasses", "watch", "necklace", "school_bag", "bow_tie"}
VALID_AVATAR_GENDERS = {"male", "female"}


def _validate_avatar(field, value, valid_set, default):
    if value is None:
        return default
    if value not in valid_set:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid {field} '{value}'. Must be one of: {', '.join(sorted(valid_set))}"
        )
    return value


@router.patch("/me/avatar", response_model=PublicUser)
def update_avatar(body: AvatarUpdateRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if body.skin is not None or body.hat is not None or body.accessory is not None or body.gender is not None:
        user.avatar_skin = _validate_avatar("skin", body.skin, VALID_AVATAR_SKINS, user.avatar_skin)
        user.avatar_hat = _validate_avatar("hat", body.hat, VALID_AVATAR_HATS, user.avatar_hat)
        user.avatar_accessory = _validate_avatar("accessory", body.accessory, VALID_AVATAR_ACCESSORIES, user.avatar_accessory)
        user.avatar_gender = _validate_avatar("gender", body.gender, VALID_AVATAR_GENDERS, user.avatar_gender)
        db.add(user)
        db.commit()
        db.refresh(user)
    return to_public(user, db)


# ============ PASSWORD CHANGE ============
class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6, max_length=100)


@router.put("/me/password")
def change_password(
    body: PasswordChangeRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Allow a logged-in user to change their password (requires current password)."""
    if user.is_guest:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Guest accounts cannot change password")
    if not user.password_hash:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No password set for this account")
    if not verify_password(body.current_password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Current password is incorrect")
    user.password_hash = hash_password(body.new_password)
    db.commit()
    return {"detail": "Password updated successfully"}


# ============ ACCOUNT DELETION ============
class DeleteAccountRequest(BaseModel):
    password: str


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(
    body: DeleteAccountRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete the current user's account and all associated data."""
    if user.is_guest:
        # Guest accounts: no password check needed, just delete
        pass
    else:
        if not user.password_hash:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No password set for this account")
        if not verify_password(body.password, user.password_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Password is incorrect")

    # Delete related data (cascade should handle most, but be explicit for safety)
    db.query(UserQuestionSeen).filter(UserQuestionSeen.user_id == user.id).delete(synchronize_session=False)
    db.query(TopicProgress).filter(TopicProgress.user_id == user.id).delete(synchronize_session=False)
    db.query(SubjectProgress).filter(SubjectProgress.user_id == user.id).delete(synchronize_session=False)
    db.query(QuizSession).filter(QuizSession.user_id == user.id).delete(synchronize_session=False)

    # Delete the user
    db.delete(user)
    db.commit()
    return None

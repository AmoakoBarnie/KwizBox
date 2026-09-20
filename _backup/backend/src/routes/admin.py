"""Admin API: secure, role-based management dashboard.

All endpoints require a valid admin JWT (get_current_admin) and, where noted,
a specific permission scope (require_permission). Every mutating action writes
an AuditLog row.
"""
from datetime import datetime, timezone, timedelta
from typing import Optional
import csv, io, secrets, random, string

from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from ..database import get_db
from ..models import (
    User, Question, QuizSession, LeaderboardPeriod, SchoolCode,
    UserQuestionSeen, AdminUser, AuditLog, SystemSetting,
    SubjectProgress, TopicProgress, ROLE_PERMISSIONS,
)
from ..auth import (
    get_current_admin, require_permission, create_admin_token,
    hash_password, verify_password,
)
from ..schemas_admin import (
    AdminLogin, AdminTokenOut, DashboardStats, UserOut, UserDetailOut,
    SetUserStatus, QuestionOut, QuestionCreate, QuestionUpdate,
    SchoolCodeCreate, SchoolCodeOut, SchoolCodeUpdate, GameActivityOut,
    SettingUpdate, AuditLogOut, LeaderboardQuery,
)
from pydantic import BaseModel
from typing import Optional as Opt
from ..question_types import options_from_question, pad_options, validate_question_fields

router = APIRouter(prefix="/admin", tags=["admin"])


# ---------- helpers ----------
def audit(db, admin, action, target=None, detail=None, ip=None):
    db.add(AuditLog(
        admin_id=admin.id, admin_username=admin.username,
        action=action, target=target, detail=detail, ip=ip,
    ))
    db.commit()


def record_from_session(s):
    return {
        "id": s.id,
        "date": (s.ended_at or s.created_at).isoformat() if (s.ended_at or s.created_at) else None,
        "score": s.score,
        "total": s.total,
        "correct": s.correct,
        "subject": s.subject,
        "status": s.status,
        "accuracy": round(s.accuracy, 3),
    }


# ===================== AUTH =====================
@router.post("/token", response_model=AdminTokenOut)
def admin_login(body: AdminLogin, db: Session = Depends(get_db), response: Response = None):
    admin = db.query(AdminUser).filter(AdminUser.username == body.username).first()
    if not admin or not admin.is_active or not verify_password(body.password, admin.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin credentials")
    admin.last_login = datetime.now(timezone.utc)
    db.commit()
    token = create_admin_token(admin.id)
    return AdminTokenOut(access_token=token, role=admin.role, username=admin.username, full_name=admin.full_name)


@router.post("/logout")
def admin_logout(admin: AdminUser = Depends(get_current_admin), db: Session = Depends(get_db)):
    # Stateless JWT: client discards token. Log the event for the audit trail.
    audit(db, admin, "admin.logout")
    return {"detail": "logged out"}


@router.get("/me")
def admin_me(admin: AdminUser = Depends(get_current_admin)):
    return {
        "id": admin.id, "username": admin.username, "full_name": admin.full_name,
        "role": admin.role, "permissions": sorted(ROLE_PERMISSIONS.get(admin.role, set())),
        "is_active": admin.is_active, "last_login": admin.last_login,
    }


# ===================== ADMIN MANAGEMENT (super_admin only) =====================
class AdminCreate(BaseModel):
    username: str
    password: str
    full_name: Opt[str] = None
    role: str = "moderator"  # super_admin | question_manager | school_manager | moderator


@router.get("/admins")
def list_admins(
    admin: AdminUser = Depends(require_permission("users")),
    db: Session = Depends(get_db),
):
    rows = db.query(AdminUser).order_by(AdminUser.id).all()
    return [{"id": a.id, "username": a.username, "full_name": a.full_name, "role": a.role,
             "is_active": a.is_active, "last_login": a.last_login} for a in rows]


@router.post("/admins")
def create_admin(
    body: AdminCreate,
    admin: AdminUser = Depends(require_permission("settings")),  # only super_admin by default
    db: Session = Depends(get_db),
):
    if body.role not in ROLE_PERMISSIONS:
        raise HTTPException(400, "invalid role")
    if db.query(AdminUser).filter(AdminUser.username == body.username).first():
        raise HTTPException(400, "username already exists")
    a = AdminUser(username=body.username, full_name=body.full_name, role=body.role,
                  password_hash=hash_password(body.password), is_active=True, created_by=admin.id)
    db.add(a); db.commit()
    audit(db, admin, "admin.create", target=f"admin:{a.username}", detail=f"role={body.role}")
    return {"detail": "ok", "id": a.id, "username": a.username, "role": a.role}


@router.post("/admins/{admin_id}/status")
def set_admin_status(
    admin_id: int, body: SetUserStatus,
    admin: AdminUser = Depends(require_permission("settings")),
    db: Session = Depends(get_db),
):
    a = db.query(AdminUser).filter(AdminUser.id == admin_id).first()
    if not a:
        raise HTTPException(404, "admin not found")
    a.is_active = body.is_active
    db.commit()
    audit(db, admin, "admin.status", target=f"admin:{a.username}", detail=f"active={body.is_active}")
    return {"detail": "ok"}


# ===================== DASHBOARD =====================
@router.get("/dashboard", response_model=DashboardStats)
def dashboard(
    admin: AdminUser = Depends(require_permission("users")),
    db: Session = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    day_ago = now - timedelta(hours=24)
    users = db.query(User).filter(User.is_guest.is_(False))
    registered = users.count()
    active_players = users.filter(User.last_played >= day_ago).count()
    # online = users with an 'active' (in-progress) session
    active_session_user_ids = db.query(QuizSession.user_id).filter(QuizSession.status == "active").distinct()
    online_players = active_session_user_ids.count()
    total_q = db.query(Question).count()
    active_q = db.query(Question).filter(Question.is_active.is_(True)).count()
    schools = db.query(SchoolCode).count()
    games = db.query(QuizSession)
    games_played = games.count()
    # avg accuracy across all answered
    tot = db.query(func.sum(User.total_questions)).scalar() or 0
    cor = db.query(func.sum(User.total_correct)).scalar() or 0
    avg_acc = round(cor / tot, 4) if tot else 0.0
    total_codes = db.query(SchoolCode).count()

    # recent activity (last 15 audit logs + key events)
    recent = []
    for a in db.query(AuditLog).order_by(desc(AuditLog.created_at)).limit(15).all():
        recent.append({
            "time": a.created_at.isoformat() if a.created_at else None,
            "text": f"{a.admin_username or 'system'}: {a.action}" + (f" ({a.target})" if a.target else ""),
        })
    # also surface latest user registrations / game completions
    for u in users.order_by(desc(User.created_at)).limit(5).all():
        recent.append({"time": u.created_at.isoformat() if u.created_at else None,
                       "text": f"{u.nickname} registered"})
    recent.sort(key=lambda x: x["time"] or "", reverse=True)
    recent = recent[:15]

    return DashboardStats(
        registered_users=registered, active_players=active_players, online_players=online_players,
        total_questions=total_q, active_questions=active_q, schools=schools,
        games_played=games_played, avg_accuracy=avg_acc, total_school_codes=total_codes,
        recent_activity=recent,
    )


# ===================== USER MANAGEMENT =====================
@router.get("/users", response_model=list[UserOut])
def list_users(
    admin: AdminUser = Depends(require_permission("users")),
    db: Session = Depends(get_db),
    search: Optional[str] = Query(None),
    school_code: Optional[str] = Query(None),
    status: Optional[str] = Query(None),  # active|disabled|all
    limit: int = 100, offset: int = 0,
):
    q = db.query(User).filter(User.is_guest.is_(False))
    if search:
        q = q.filter(User.nickname.ilike(f"%{search}%"))
    if school_code:
        q = q.filter(User.school_code == school_code)
    if status == "active":
        q = q.filter(User.password_hash.isnot(None))  # registered & (we model disabled via a flag)
    rows = q.order_by(desc(User.created_at)).limit(limit).offset(offset).all()
    out = []
    active_ids = set(r[0] for r in db.query(QuizSession.user_id).filter(QuizSession.status == "active").all())
    for u in rows:
        tot = u.total_questions or 0
        cor = u.total_correct or 0
        out.append(UserOut(
            id=u.id, nickname=u.nickname, class_level=u.class_level, school_code=u.school_code,
            is_guest=u.is_guest, created_at=u.created_at, last_played=u.last_played,
            lifetime_score=u.lifetime_score or 0, total_questions=tot, total_correct=cor,
            accuracy=round(cor / tot, 4) if tot else 0.0,
            account_status="active" if u.is_active else "disabled", is_online=u.id in active_ids,
        ))
    return out


@router.get("/users/{user_id}", response_model=UserDetailOut)
def user_detail(
    user_id: int,
    admin: AdminUser = Depends(require_permission("users")),
    db: Session = Depends(get_db),
):
    u = db.query(User).filter(User.id == user_id, User.is_guest.is_(False)).first()
    if not u:
        raise HTTPException(404, "user not found")
    tot = u.total_questions or 0
    cor = u.total_correct or 0
    sessions = db.query(QuizSession).filter(QuizSession.user_id == u.id).order_by(desc(QuizSession.created_at)).limit(20).all()
    school = db.query(SchoolCode).filter(SchoolCode.code == u.school_code).first()
    subj_rows = db.query(SubjectProgress).filter(SubjectProgress.user_id == u.id).all()
    subject_accuracy = [
        {"subject": s.subject, "accuracy": round(s.correct / s.questions_answered, 4) if s.questions_answered else 0.0,
         "questions": s.questions_answered}
        for s in subj_rows
    ]
    mastered_count = db.query(TopicProgress).filter(
        TopicProgress.user_id == u.id, TopicProgress.mastered.is_(True)).count()
    return UserDetailOut(
        id=u.id, nickname=u.nickname, class_level=u.class_level, school_code=u.school_code,
        school=school.school if school else None, is_guest=u.is_guest,
        created_at=u.created_at, last_played=u.last_played, lifetime_score=u.lifetime_score or 0,
        total_questions=tot, total_correct=cor, accuracy=round(cor / tot, 4) if tot else 0.0,
        current_streak=u.current_streak or 0, longest_streak=u.longest_streak or 0,
        account_status="active" if u.is_active else "disabled", games_played=db.query(QuizSession).filter(QuizSession.user_id == u.id).count(),
        games=[record_from_session(s) for s in sessions],
        subject_accuracy=subject_accuracy, mastered_count=mastered_count,
    )


@router.post("/users/{user_id}/status")
def set_user_status(
    user_id: int, body: SetUserStatus,
    admin: AdminUser = Depends(require_permission("users")),
    db: Session = Depends(get_db),
):
    # Account disable: we model it by nulling the password_hash (cannot log in)
    # while preserving all progress. Re-activate restores a reset token flow.
    u = db.query(User).filter(User.id == user_id, User.is_guest.is_(False)).first()
    if not u:
        raise HTTPException(404, "user not found")
    if body.is_active:
        u.is_active = True
    else:
        u.is_active = False
    db.commit()
    audit(db, admin, "user.status", target=f"user:{user_id}", detail=f"active={body.is_active}")
    return {"detail": "ok", "account_status": "active" if body.is_active else "disabled"}


# ===================== QUESTION MANAGEMENT =====================
@router.get("/questions", response_model=list[QuestionOut])
def list_questions(
    admin: AdminUser = Depends(require_permission("questions")),
    db: Session = Depends(get_db),
    search: Optional[str] = Query(None),
    class_level: Optional[str] = Query(None),
    subject: Optional[str] = Query(None),
    difficulty: Optional[str] = Query(None),
    question_type: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    limit: int = 100, offset: int = 0,
):
    q = db.query(Question)
    if search:
        q = q.filter(Question.question.ilike(f"%{search}%"))
    if class_level:
        q = q.filter(Question.class_level == class_level)
    if subject:
        q = q.filter(Question.subject == subject)
    if difficulty:
        q = q.filter(Question.difficulty == difficulty)
    if question_type:
        q = q.filter(Question.question_type == question_type)
    if is_active is not None:
        q = q.filter(Question.is_active.is_(is_active))
    rows = q.order_by(Question.id).limit(limit).offset(offset).all()
    return [_q_out(x) for x in rows]


def _q_out(x: Question):
    rate = round(x.times_correct / x.times_answered, 4) if (x.times_answered and x.times_correct) else None
    return QuestionOut(
        id=x.id, class_level=x.class_level, subject=x.subject, topic=x.topic,
        sub_topic=getattr(x, "sub_topic", None),
        strand=x.strand,
        difficulty=x.difficulty, question=x.question,
        options=options_from_question(x), answer_index=x.answer_index,
        explanation=x.explanation, is_active=x.is_active, times_answered=x.times_answered or 0,
        times_correct=x.times_correct or 0, correct_rate=rate,
        question_type=getattr(x, "question_type", None) or "mcq",
        image_url=getattr(x, "image_url", None) or None,
    )


@router.post("/questions", response_model=QuestionOut)
def create_question(
    body: QuestionCreate,
    admin: AdminUser = Depends(require_permission("questions")),
    db: Session = Depends(get_db),
):
    qtype = validate_question_fields(
        body.question_type, body.options, body.answer_index, body.image_url, require_image=True,
    )
    a, b, c, d = pad_options(qtype, body.options)
    q = Question(
        class_level=body.class_level, subject=body.subject, topic=body.topic, strand=body.strand,
        difficulty=body.difficulty, question=body.question,
        option_a=a, option_b=b, option_c=c, option_d=d,
        answer_index=body.answer_index, explanation=body.explanation, is_active=True,
        question_type=qtype, image_url=(body.image_url or None),
    )
    db.add(q); db.commit(); db.refresh(q)
    audit(db, admin, "question.create", target=f"question:{q.id}")
    return _q_out(q)


@router.put("/questions/{qid}", response_model=QuestionOut)
def update_question(
    qid: int, body: QuestionUpdate,
    admin: AdminUser = Depends(require_permission("questions")),
    db: Session = Depends(get_db),
):
    q = db.query(Question).filter(Question.id == qid).first()
    if not q:
        raise HTTPException(404, "question not found")
    data = body.dict(exclude_unset=True)
    new_type = data.get("question_type", q.question_type or "mcq")
    new_opts = data["options"] if "options" in data and data["options"] is not None else [
        q.option_a, q.option_b, q.option_c, q.option_d,
    ]
    new_idx = data["answer_index"] if "answer_index" in data and data["answer_index"] is not None else q.answer_index
    if "image_url" in data:
        new_img = data["image_url"]
    else:
        new_img = q.image_url
    validate_question_fields(
        new_type, new_opts, new_idx, new_img, require_image=(new_type == "image_mcq"),
    )
    if "options" in data and data["options"] is not None:
        a, b, c, d = pad_options(new_type, data.pop("options"))
        q.option_a, q.option_b, q.option_c, q.option_d = a, b, c, d
    elif "question_type" in data:
        # type changed without new options: re-pad current values
        a, b, c, d = pad_options(new_type, [q.option_a, q.option_b, q.option_c, q.option_d])
        q.option_a, q.option_b, q.option_c, q.option_d = a, b, c, d
    for k, v in data.items():
        if k == "image_url":
            q.image_url = v or None
        elif v is not None:
            setattr(q, k, v)
    db.commit()
    audit(db, admin, "question.update", target=f"question:{qid}")
    return _q_out(q)


@router.delete("/questions/{qid}")
def delete_question(
    qid: int,
    admin: AdminUser = Depends(require_permission("questions")),
    db: Session = Depends(get_db),
):
    q = db.query(Question).filter(Question.id == qid).first()
    if not q:
        raise HTTPException(404, "question not found")
    db.delete(q); db.commit()
    audit(db, admin, "question.delete", target=f"question:{qid}")
    return {"detail": "deleted"}


@router.post("/questions/{qid}/active")
def set_question_active(
    qid: int, body: SetUserStatus,  # reuse {is_active: bool}
    admin: AdminUser = Depends(require_permission("questions")),
    db: Session = Depends(get_db),
):
    q = db.query(Question).filter(Question.id == qid).first()
    if not q:
        raise HTTPException(404, "question not found")
    q.is_active = body.is_active
    db.commit()
    audit(db, admin, "question.active", target=f"question:{qid}", detail=f"active={body.is_active}")
    return {"detail": "ok"}


# ===================== SCHOOL CODE MANAGEMENT =====================
def gen_code(db):
    while True:
        c = "GH-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
        if not db.query(SchoolCode).filter(SchoolCode.code == c).first():
            return c


@router.post("/school-codes", response_model=list[SchoolCodeOut])
def create_school_codes(
    body: SchoolCodeCreate,
    admin: AdminUser = Depends(require_permission("schools")),
    db: Session = Depends(get_db),
):
    created = []
    for _ in range(max(1, body.count)):
        code = body.code if (body.count == 1 and body.code) else gen_code(db)
        sc = SchoolCode(
            code=code, name=body.name, school=body.school,
            expires_at=body.expires_at, max_uses=body.max_uses, is_active=True,
        )
        db.add(sc); created.append(sc)
    db.commit()
    for sc in created:
        audit(db, admin, "schoolcode.create", target=f"code:{sc.code}")
    return [_sc_out(db, sc) for sc in created]


def _sc_out(db, sc):
    users_using = db.query(User).filter(User.school_code == sc.code).count()
    return SchoolCodeOut(
        id=sc.id, code=sc.code, name=sc.name, school=sc.school, created_at=sc.created_at,
        expires_at=sc.expires_at, is_active=sc.is_active, max_uses=sc.max_uses,
        used_count=sc.used_count or 0, users_using=users_using,
    )


@router.get("/school-codes", response_model=list[SchoolCodeOut])
def list_school_codes(
    admin: AdminUser = Depends(require_permission("schools")),
    db: Session = Depends(get_db),
):
    return [_sc_out(db, sc) for sc in db.query(SchoolCode).order_by(desc(SchoolCode.created_at)).all()]


@router.patch("/school-codes/{code_id}", response_model=SchoolCodeOut)
def update_school_code(
    code_id: int, body: SchoolCodeUpdate,
    admin: AdminUser = Depends(require_permission("schools")),
    db: Session = Depends(get_db),
):
    sc = db.query(SchoolCode).filter(SchoolCode.id == code_id).first()
    if not sc:
        raise HTTPException(404, "code not found")
    for k, v in body.dict(exclude_unset=True).items():
        if v is not None:
            setattr(sc, k, v)
    db.commit()
    audit(db, admin, "schoolcode.update", target=f"code:{sc.code}")
    return _sc_out(db, sc)


# ===================== LEADERBOARDS =====================
@router.get("/leaderboard")
def admin_leaderboard(
    scope: str = "global", class_level: Optional[str] = None,
    school_code: Optional[str] = None, limit: int = 50,
    admin: AdminUser = Depends(require_permission("leaderboard")),
    db: Session = Depends(get_db),
):
    if scope in ("weekly", "monthly"):
        from ..routes.quiz import build_leaderboard
        rows = build_leaderboard(db, scope, class_level=class_level, limit=limit)
        return [r.dict() for r in rows]
    q = db.query(User).filter(User.is_guest.is_(False), User.lifetime_score > 0)
    if class_level:
        q = q.filter(User.class_level == class_level)
    if school_code:
        q = q.filter(User.school_code == school_code)
    if scope == "daily":
        today = datetime.now(timezone.utc).date()
        # daily: users who played today, ranked by today's score (sum of session scores)
        sess = db.query(QuizSession.user_id, func.sum(QuizSession.score)).filter(
            func.date(QuizSession.created_at) == today.isoformat()).group_by(QuizSession.user_id).order_by(
            func.sum(QuizSession.score).desc()).limit(limit).all()
        out = []
        for i, (uid, pts) in enumerate(sess, 1):
            u = db.query(User).get(uid)
            tot = u.total_questions or 0; cor = u.total_correct or 0
            out.append({"rank": i, "nickname": u.nickname, "class_level": u.class_level,
                        "lifetime_score": pts,
                        "accuracy": round(cor / tot, 4) if tot else 0.0})
        return out
    rows = q.order_by(desc(User.lifetime_score)).limit(limit).all()
    out = []
    for i, u in enumerate(rows, 1):
        tot = u.total_questions or 0; cor = u.total_correct or 0
        out.append({"rank": i, "nickname": u.nickname, "class_level": u.class_level,
                    "lifetime_score": u.lifetime_score or 0,
                    "accuracy": round(cor / tot, 4) if tot else 0.0})
    return out


# ===================== MONITORING =====================
@router.get("/monitor", response_model=GameActivityOut)
def monitor(
    admin: AdminUser = Depends(require_permission("monitor")),
    db: Session = Depends(get_db),
):
    active = db.query(QuizSession).filter(QuizSession.status == "active").count()
    completed = db.query(QuizSession).filter(QuizSession.status == "completed").count()
    abandoned = db.query(QuizSession).filter(QuizSession.status == "abandoned").count()
    live = []
    for s in db.query(QuizSession).filter(QuizSession.status == "active").order_by(desc(QuizSession.started_at)).limit(20).all():
        u = db.query(User).get(s.user_id)
        school = db.query(SchoolCode).filter(SchoolCode.code == s.school_code).first()
        live.append({
            "nickname": u.nickname if u else "?",
            "school": school.school if school else (s.school_code or "-"),
            "score": s.score, "status": s.status,
            "started_at": s.started_at.isoformat() if s.started_at else None,
        })
    return GameActivityOut(
        active_games=active, completed_games=completed, abandoned_games=abandoned,
        players_currently_playing=active, live_players=live,
    )


# ===================== SETTINGS =====================
DEFAULT_SETTINGS = {
    "game_duration_seconds": "600",
    "questions_per_game": "12",
    "scoring_base_easy": "5",
    "scoring_base_medium": "10",
    "scoring_base_hard": "15",
    "maintenance_mode": "false",
    "registration_open": "true",
    "max_class_level": "B9",
}


@router.get("/settings")
def get_settings(
    admin: AdminUser = Depends(require_permission("settings")),
    db: Session = Depends(get_db),
):
    rows = {s.key: s.value for s in db.query(SystemSetting).all()}
    for k, v in DEFAULT_SETTINGS.items():
        rows.setdefault(k, v)
    return rows


@router.put("/settings/{key}")
def update_setting(
    key: str, body: SettingUpdate,
    admin: AdminUser = Depends(require_permission("settings")),
    db: Session = Depends(get_db),
):
    if key not in DEFAULT_SETTINGS:
        raise HTTPException(400, "unknown setting")
    s = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if not s:
        s = SystemSetting(key=key)
        db.add(s)
    s.value = body.value; s.updated_by = admin.id
    db.commit()
    audit(db, admin, "settings.update", target=f"setting:{key}", detail=body.value)
    return {"detail": "ok", "key": key, "value": body.value}


# ===================== AUDIT LOG =====================
@router.get("/audit", response_model=list[AuditLogOut])
def audit_log(
    admin: AdminUser = Depends(require_permission("audit")),
    db: Session = Depends(get_db),
    limit: int = 100,
):
    return [AuditLogOut(id=a.id, admin_username=a.admin_username, action=a.action,
                        target=a.target, detail=a.detail, created_at=a.created_at)
            for a in db.query(AuditLog).order_by(desc(AuditLog.created_at)).limit(limit).all()]


# ===================== EXPORTS =====================
def _csv(headers, rows):
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(headers)
    for r in rows:
        w.writerow(r)
    return buf.getvalue()


@router.get("/export/users")
def export_users(
    admin: AdminUser = Depends(require_permission("export")),
    db: Session = Depends(get_db),
):
    users = db.query(User).filter(User.is_guest.is_(False)).all()
    rows = [(u.id, u.nickname, u.class_level, u.school_code,
             u.created_at.date() if u.created_at else "", u.last_played.date() if u.last_played else "",
             u.lifetime_score or 0, u.total_questions or 0, u.total_correct or 0) for u in users]
    csvdata = _csv(["id", "nickname", "class", "school_code", "registered", "last_active", "score", "questions", "correct"], rows)
    audit(db, admin, "export.users")
    return Response(content=csvdata, media_type="text/csv",
                    headers={"Content-Disposition": "attachment; filename=users.csv"})


@router.get("/export/leaderboard")
def export_leaderboard(
    scope: str = "global",
    admin: AdminUser = Depends(require_permission("export")),
    db: Session = Depends(get_db),
):
    data = admin_leaderboard(scope=scope, admin=admin, db=db)
    rows = [(r.get("rank"), r.get("nickname"), r.get("class_level"), r.get("lifetime_score"), r.get("accuracy")) for r in data]
    csvdata = _csv(["rank", "nickname", "class", "score", "accuracy"], rows)
    audit(db, admin, "export.leaderboard", target=scope)
    return Response(content=csvdata, media_type="text/csv",
                    headers={"Content-Disposition": "attachment; filename=leaderboard.csv"})


@router.get("/export/game-history")
def export_game_history(
    admin: AdminUser = Depends(require_permission("export")),
    db: Session = Depends(get_db),
):
    sess = db.query(QuizSession).order_by(desc(QuizSession.created_at)).all()
    rows = [(s.id, s.user_id, (s.ended_at or s.created_at).date() if (s.ended_at or s.created_at) else "",
            s.subject, s.total, s.correct, s.score, s.status) for s in sess]
    csvdata = _csv(["session_id", "user_id", "date", "subject", "total", "correct", "score", "status"], rows)
    audit(db, admin, "export.game_history")
    return Response(content=csvdata, media_type="text/csv",
                    headers={"Content-Disposition": "attachment; filename=game_history.csv"})


@router.get("/export/questions")
def export_questions(
    admin: AdminUser = Depends(require_permission("export")),
    db: Session = Depends(get_db),
):
    qs = db.query(Question).all()
    rows = [(q.id, q.class_level, q.subject, q.topic, q.difficulty, q.times_answered or 0, q.times_correct or 0,
            round(q.times_correct / q.times_answered, 3) if q.times_answered else "") for q in qs]
    csvdata = _csv(["id", "class", "subject", "topic", "difficulty", "answered", "correct", "correct_rate"], rows)
    audit(db, admin, "export.questions")
    return Response(content=csvdata, media_type="text/csv",
                    headers={"Content-Disposition": "attachment; filename=questions.csv"})


# ===================== GUEST CLEANUP =====================
@router.delete("/cleanup/guests")
def cleanup_guests(
    admin: AdminUser = Depends(require_permission("users")),
    db: Session = Depends(get_db),
    days_old: int = Query(default=7, ge=1, le=365),
    dry_run: bool = Query(default=True),
):
    """Remove guest accounts older than N days. Default: dry_run=True (preview only)."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days_old)
    # Find guests older than cutoff with no sessions
    guests = db.query(User).filter(
        User.is_guest.is_(True),
        User.created_at <= cutoff,
    ).all()
    
    removable = []
    for g in guests:
        session_count = db.query(QuizSession).filter(QuizSession.user_id == g.id).count()
        if session_count == 0:
            removable.append(g.id)
    
    if not dry_run and removable:
        # Delete related data first, then the users
        for uid in removable:
            db.query(UserQuestionSeen).filter(UserQuestionSeen.user_id == uid).delete(synchronize_session=False)
            db.query(TopicProgress).filter(TopicProgress.user_id == uid).delete(synchronize_session=False)
            db.query(SubjectProgress).filter(SubjectProgress.user_id == uid).delete(synchronize_session=False)
            db.query(User).filter(User.id == uid).delete(synchronize_session=False)
        db.commit()
        audit(db, admin, "cleanup.guests", detail=f"Removed {len(removable)} stale guests (>{days_old}d old)")
    elif not dry_run:
        audit(db, admin, "cleanup.guests", detail="No stale guests to remove")
    
    return {
        "guest_count": len(removable),
        "threshold_days": days_old,
        "dry_run": dry_run,
        "ids": removable if dry_run else None,
    }

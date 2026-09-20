"""Challenge / head-to-head endpoints."""
import hashlib
import random
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session

from ..rate_limit import limiter

from ..database import get_db
from ..models import Challenge, Question, QuizSession, User
from ..auth import get_current_user, optional_user

router = APIRouter(prefix="/quiz", tags=["challenge"])

CHALLENGE_LIFETIME_HOURS = 24


def generate_code(db):
    chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    while True:
        code = "".join(random.choices(chars, k=6))
        if not db.query(Challenge).filter(Challenge.code == code).first():
            return code


def pick_questions(db, class_level, subject, count=12):
    pool = db.query(Question.id).filter(
        Question.class_level == class_level,
        Question.subject == subject,
        Question.is_active.is_(True),
    ).all()
    ids = [r[0] for r in pool]
    if len(ids) < count:
        raise HTTPException(400, f"Only {len(ids)} questions for {class_level} {subject} — need {count}")
    seed = int(hashlib.sha256(f"{class_level}:{subject}".encode()).hexdigest()[:8], 16)
    rng = random.Random(seed)
    rng.shuffle(ids)
    return db.query(Question).filter(Question.id.in_(ids[:count])).all()


def q_to_dict(q):
    return {
        "id": q.id,
        "class_level": q.class_level,
        "subject": q.subject,
        "topic": q.topic,
        "sub_topic": q.sub_topic,
        "strand": q.strand,
        "difficulty": q.difficulty,
        "question": q.question,
        "options": [q.option_a, q.option_b, q.option_c, q.option_d],
        "answer_index": q.answer_index,
        "question_type": q.question_type,
        "image_url": q.image_url,
    }


# ============ CREATE ============
class CreateChallengeReq(BaseModel):
    class_level: str
    subject: str


@router.post("/challenge/create")
def create_challenge(body: CreateChallengeReq, db: Session = Depends(get_db), user=Depends(get_current_user)):
    code = generate_code(db)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=CHALLENGE_LIFETIME_HOURS)
    questions = pick_questions(db, body.class_level, body.subject, 12)
    qids = [q.id for q in questions]

    challenge = Challenge(
        code=code,
        creator_id=user.id,
        class_level=body.class_level,
        subject=body.subject,
        question_ids=",".join(str(qid) for qid in qids),
        expires_at=expires_at,
        status="open",
    )
    db.add(challenge)
    db.commit()
    db.refresh(challenge)

    return {
        "code": challenge.code,
        "class_level": challenge.class_level,
        "subject": challenge.subject,
        "question_count": 12,
        "expires_at": challenge.expires_at.isoformat(),
        "message": f"Share code {challenge.code} with your friend! Same 12 {body.subject} questions for {body.class_level}.",
    }


# ============ JOIN (GET questions for a code) ============
@router.get("/challenge/{code}/questions")
def get_challenge_questions(code: str, db: Session = Depends(get_db), user=Depends(optional_user)):
    challenge = db.query(Challenge).filter(Challenge.code == code.upper()).first()
    if not challenge:
        raise HTTPException(404, "Challenge not found")
    if challenge.expires_at and challenge.expires_at.replace(tzinfo=None) < datetime.utcnow():
        raise HTTPException(410, "Challenge has expired")
    if challenge.status == "completed":
        raise HTTPException(410, "Challenge is already finished")

    qids = challenge.question_list
    by_id = {q.id: q for q in db.query(Question).filter(Question.id.in_(qids)).all()}
    questions = [q_to_dict(by_id[qid]) for qid in qids if qid in by_id]

    return {
        "code": challenge.code,
        "class_level": challenge.class_level,
        "subject": challenge.subject,
        "question_count": len(questions),
        "questions": questions,
        "creator_id": challenge.creator_id,
        "created_at": challenge.created_at.isoformat() if challenge.created_at else None,
        "expires_at": challenge.expires_at.isoformat() if challenge.expires_at else None,
    }


# ============ SUBMIT SCORE ============
class AnswerSubmission(BaseModel):
    question_id: int
    selected_index: int
    max_streak: Optional[int] = None  # best streak during this challenge (Upgrade 9)


@router.post("/challenge/{code}/submit")
def submit_challenge_score(
    code: str,
    answers: list[AnswerSubmission],
    duration_seconds: int = 0,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    challenge = db.query(Challenge).filter(Challenge.code == code.upper()).first()
    if not challenge:
        raise HTTPException(404, "Challenge not found")
    if challenge.expires_at and challenge.expires_at.replace(tzinfo=None) < datetime.utcnow():
        raise HTTPException(410, "Challenge has expired")

    correct_count = 0
    total_pts = 0
    for ans in answers:
        q = db.query(Question).filter(Question.id == ans.question_id).first()
        if q and ans.selected_index == q.answer_index:
            correct_count += 1
            base = 25 if q.difficulty == "Hard" else (15 if q.difficulty == "Medium" else 10)
            total_pts += base

    accuracy = correct_count / len(answers) if answers else 0

    sess = QuizSession(
        user_id=user.id,
        class_level=challenge.class_level,
        subject=challenge.subject,
        total=len(answers),
        correct=correct_count,
        score=total_pts,
        accuracy=accuracy,
        duration_seconds=duration_seconds,
        max_streak=max(ans.max_streak for ans in answers if ans.max_streak is not None) if answers else 0,
        status="completed",
        school_code=None,
        is_daily=False,
    )
    db.add(sess)
    db.commit()

    # Mark challenge completed if 2+ distinct users have completed sessions in this time window
    now = datetime.now(timezone.utc)
    recent = db.query(QuizSession.user_id).filter(
        QuizSession.class_level == challenge.class_level,
        QuizSession.subject == challenge.subject,
        QuizSession.status == "completed",
        QuizSession.created_at <= now + timedelta(minutes=10),
    ).distinct().count()

    if recent >= 2:
        challenge.status = "completed"
        db.commit()

    return {
        "score": total_pts,
        "correct": correct_count,
        "total": len(answers),
        "accuracy": round(accuracy, 4),
        "session_id": sess.id,
        "max_streak": sess.max_streak,
        "rank": "pending" if recent < 2 else "done",
    }


# ============ COMPARE ============
@router.get("/challenge/{code}/compare")
@limiter.limit("30/minute")
def compare_challenge_scores(request: Request, code: str, db: Session = Depends(get_db), user=Depends(optional_user)):
    challenge = db.query(Challenge).filter(Challenge.code == code.upper()).first()
    if not challenge:
        raise HTTPException(404, "Challenge not found")

    # Use naive datetime comparison to match SQLite stored values
    window_start = challenge.created_at.replace(tzinfo=None) if challenge.created_at else datetime.utcnow()
    window_end = datetime.utcnow() + timedelta(minutes=10)

    sessions = (
        db.query(QuizSession, User.nickname)
        .join(User, User.id == QuizSession.user_id)
        .filter(
            QuizSession.class_level == challenge.class_level,
            QuizSession.subject == challenge.subject,
            QuizSession.status == "completed",
            QuizSession.created_at <= window_end,
        )
        .order_by(QuizSession.score.desc())
        .all()
    )

    leaderboard = []
    for i, (sess, nickname) in enumerate(sessions, 1):
        leaderboard.append({
            "rank": i,
            "session_id": sess.id,
            "user_id": sess.user_id,
            "nickname": nickname,
            "class_level": sess.class_level,
            "score": sess.score,
            "correct": sess.correct,
            "total": sess.total,
            "accuracy": round(sess.accuracy * 100, 1) if sess.accuracy else 0,
            "max_streak": sess.max_streak,
            "is_creator": sess.user_id == challenge.creator_id,
        })

    creator = db.query(User).filter(User.id == challenge.creator_id).first()
    my_rank = next((e["rank"] for e in leaderboard if e["is_creator"]), None) if user else None

    return {
        "code": code.upper(),
        "class_level": challenge.class_level,
        "subject": challenge.subject,
        "creator": creator.nickname if creator else "?",
        "created_at": challenge.created_at.isoformat() if challenge.created_at else None,
        "expires_at": challenge.expires_at.isoformat() if challenge.expires_at else None,
        "status": challenge.status,
        "leaderboard": leaderboard,
        "player_count": len(leaderboard),
        "my_rank": my_rank,
    }

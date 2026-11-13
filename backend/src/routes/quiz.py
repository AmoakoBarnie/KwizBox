"""Question pack + quiz submission (scoring, feedback, progress update)."""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timezone

from ..database import get_db
from ..rate_limit import limiter
from ..models import User, Question, QuizSession, SubjectProgress, TopicProgress, LeaderboardPeriod, UserQuestionSeen, SchoolCode
from ..auth import get_current_user, optional_user
from ..schemas import (
    QuizPackRequest, QuestionOut, OfflineQuestionOut, QuizResultRequest,
    QuizResultResponse, AnswerFeedback, LeaderboardEntry, CheckAnswerRequest,
)
from ..scoring import question_points
from ..mastery import calculate_mastery, is_mastered
from ..periods import week_period, month_period
from ..progress import build_progress
from ..question_types import options_from_question

router = APIRouter(prefix="/quiz", tags=["quiz"])


def _to_question_out(q: Question) -> QuestionOut:
    return QuestionOut(
        id=q.id,
        class_level=q.class_level,
        subject=q.subject,
        topic=q.topic,
        sub_topic=getattr(q, "sub_topic", None),
        strand=q.strand,
        difficulty=q.difficulty,
        question=q.question,
        options=options_from_question(q),
        question_type=getattr(q, "question_type", None) or "mcq",
        image_url=getattr(q, "image_url", None) or None,
    )


def _pool_ids(db: Session, body: QuizPackRequest) -> list[int]:
    """Question ids matching a pack selection (shared by /pack and /offline-pack)."""
    base = db.query(Question).filter(Question.class_level == body.class_level, Question.is_active == True)
    if body.subject != "Mixed":
        base = base.filter(Question.subject == body.subject)
    if body.difficulty:
        base = base.filter(Question.difficulty == body.difficulty)
    if body.topic:
        base = base.filter(Question.topic == body.topic)
    if body.sub_topic:
        base = base.filter(Question.sub_topic == body.sub_topic)
    pool_ids = [r[0] for r in base.with_entities(Question.id).all()]
    # Exclude previously answered questions for this session
    if body.exclude_ids:
        excluded = set(body.exclude_ids)
        pool_ids = [pid for pid in pool_ids if pid not in excluded]

    # Only use questions whose answers are visible via admin endpoint
    # (filter out legacy bulk-imported duplicates: id >= 130570 and id < 100000)
    if pool_ids:
        pool_ids = [pid for pid in pool_ids if pid >= 100000 or pid < 130570]
    return pool_ids


@router.post("/check")
@limiter.limit("30/minute")
def check_answer(
    request: Request,
    body: CheckAnswerRequest,
    db: Session = Depends(get_db),
    user: User | None = Depends(optional_user),
):
    """Immediately check whether a single answer is correct (no scoring)."""
    q = db.query(Question).filter(Question.id == body.question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    is_correct = body.selected_index == q.answer_index
    return {
        "question_id": q.id,
        "selected_index": body.selected_index,
        "correct_index": q.answer_index,
        "is_correct": is_correct,
        "explanation": q.explanation or None,
    }


@router.post("/pack", response_model=list[QuestionOut])
@limiter.limit("120/minute")
def get_pack(
    request: Request,
    body: QuizPackRequest,
    db: Session = Depends(get_db),
    user: User | None = Depends(optional_user),
):
    """Build a question pack.

    For authenticated users we avoid repeating questions already answered:
    unseen questions are preferred, and only when the unseen pool is too small
    to fill the request do we recycle the *least-recently-seen* questions.
    Guests get a plain random pack (they don't accumulate history).
    """
    pool_ids = _pool_ids(db, body)

    if not pool_ids:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No questions found for this selection")

    chosen_ids = _select_pack_ids(db, user, pool_ids, body.count, daily=body.daily)

    rows = db.query(Question).filter(Question.id.in_(chosen_ids)).all()
    # Preserve the chosen order (already randomized)
    by_id = {q.id: q for q in rows}
    out = [_to_question_out(by_id[i]) for i in chosen_ids if i in by_id]
    # Return question_ids for the frontend to include in submit
    question_ids = [q.id for q in rows]

    # Monitoring: open an "active" session for logged-in users so the admin
    # live-players view can show who is currently playing. It is completed on
    # submit (or ages into "abandoned" if the player quits).
    if user is not None:
        sess = QuizSession(
            user_id=user.id, class_level=body.class_level, subject=body.subject,
            difficulty=body.difficulty, topic=body.topic, total=0, correct=0,
            score=0, accuracy=0.0, status="active", started_at=datetime.now(timezone.utc),
        )
        db.add(sess); db.commit()
        from fastapi.responses import JSONResponse as _JR
        return _JR(content=[q.model_dump() for q in out], headers={"X-Session-Id": str(sess.id), "X-Question-Ids": ", ".join(str(qid) for qid in question_ids)})

    return out


@router.post("/offline-pack", response_model=list[OfflineQuestionOut])
@limiter.limit("20/minute")
def get_offline_pack(
    request: Request,
    body: QuizPackRequest,
    db: Session = Depends(get_db),
    user: User | None = Depends(optional_user),
):
    """Return a practice pack with its answer key for device-local use.

    Deliberate exception to REQ-QUIZ-002: offline grading needs the key on the
    device. This endpoint creates no QuizSession, updates no progress and
    marks no questions seen. Daily challenge packs are refused so a live
    competition's answers cannot be downloaded ahead of time.
    """
    if body.daily:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Daily challenge packs cannot be downloaded for offline practice",
        )

    pool_ids = _pool_ids(db, body)
    if not pool_ids:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No questions found for this selection")

    chosen_ids = _select_pack_ids(db, user, pool_ids, body.count, daily=False)
    rows = db.query(Question).filter(Question.id.in_(chosen_ids)).all()
    by_id = {q.id: q for q in rows}
    return [
        OfflineQuestionOut(
            **_to_question_out(by_id[qid]).model_dump(),
            answer_index=by_id[qid].answer_index,
            explanation=by_id[qid].explanation or "",
        )
        for qid in chosen_ids
        if qid in by_id
    ]


def _select_pack_ids(db, user, pool_ids, count, daily=False):
    """Pick `count` ids from pool_ids.

    daily=True: deterministic pack seeded by UTC date — same questions for
    everyone on the same day (ignores user history for the daily challenge).
    """
    import random as _random

    if daily:
        # Deterministic daily seed: UTC date → stable random order for everyone.
        seed = int(datetime.now(timezone.utc).strftime("%Y%m%d"))
        rng = _random.Random(seed)
        pool = list(pool_ids)
        rng.shuffle(pool)
        return pool[:count]

    if user is None:
        return _random.sample(pool_ids, min(count, len(pool_ids)))

    seen_rows = (
        db.query(UserQuestionSeen.question_id, UserQuestionSeen.seen_at)
        .filter(UserQuestionSeen.user_id == user.id, UserQuestionSeen.question_id.in_(pool_ids))
        .all()
    )
    seen_ids = {qid for qid, _ in seen_rows}
    # Seen ordered oldest-first so we recycle the least-recently-seen first
    seen_oldest_first = [qid for qid, _ in sorted(seen_rows, key=lambda r: r[1])]

    unseen = [qid for qid in pool_ids if qid not in seen_ids]
    _random.shuffle(unseen)

    chosen = unseen[:count]
    if len(chosen) < count:
        # Not enough unseen: recycle oldest-seen first to top up
        need = count - len(chosen)
        recycle = [qid for qid in seen_oldest_first if qid not in set(chosen)]
        _random.shuffle(recycle)
        chosen += recycle[:need]
    # Final shuffle so recycled items aren't always at the end
    _random.shuffle(chosen)
    return chosen


def _mark_seen(db, user, question_ids):
    """Record that a user has now answered these questions (idempotent)."""
    if user is None:
        return
    existing = {r[0] for r in db.query(UserQuestionSeen.question_id).filter(
        UserQuestionSeen.user_id == user.id, UserQuestionSeen.question_id.in_(question_ids)).all()}
    for qid in question_ids:
        if qid not in existing:
            db.add(UserQuestionSeen(user_id=user.id, question_id=qid))


def _options(q: Question) -> list[str]:
    return options_from_question(q)


@router.post("/submit", response_model=QuizResultResponse)
@limiter.limit("120/minute")
def submit_result(
    request: Request,
    body: QuizResultRequest,
    db: Session = Depends(get_db),
    user: User | None = Depends(optional_user),
):
    """Grade a finished session, store it, update user progress, return feedback."""
    # Validate: question_ids must match answer question_ids
    qids = body.question_ids
    if set(qids) != {ans.question_id for ans in body.answers}:
        raise HTTPException(status_code=400, detail="question_ids must match answer question_ids")
    questions = {q.id: q for q in db.query(Question).filter(Question.id.in_(qids)).all()}

    total = len(body.answers)
    correct = 0
    score = 0
    feedback: list[AnswerFeedback] = []
    per_diff = {}
    per_question_points = []  # points per question index

    avg_time = None
    if body.duration_seconds and total:
        avg_time = body.duration_seconds / total

    # Grade each answer; also update per-question statistics
    running_streak = 0
    best_streak = 0  # best in-quiz streak this session (persisted on the session row)
    for ans in body.answers:
        q = questions.get(ans.question_id)
        if not q:
            continue
        is_correct = (ans.selected_index == q.answer_index)
        pts = 0
        if is_correct:
            correct += 1
            running_streak += 1
            best_streak = max(best_streak, running_streak)
            pts = question_points(q.difficulty, ans.seconds_taken, running_streak)
            score += pts
            per_diff[q.difficulty] = per_diff.get(q.difficulty, 0) + pts
        else:
            running_streak = 0
        per_question_points.append({"question_id": q.id, "points": pts})
        # Question usage stats (administration / reporting)
        q.times_answered = (q.times_answered or 0) + 1
        if is_correct:
            q.times_correct = (q.times_correct or 0) + 1
        feedback.append(AnswerFeedback(
            question_id=q.id,
            selected_index=ans.selected_index,
            correct_index=q.answer_index,
            is_correct=is_correct,
            explanation=q.explanation,
            question=q.question,
            options=_options(q),
            points=pts,
        ))

    accuracy = round(correct / total, 4) if total else 0.0

    session_id = None
    if user is not None:
        now = datetime.now(timezone.utc)
        # Complete the most recent still-active session opened at pack time for
        # this user (falls back to a brand-new session if none is open).
        sess = (
            db.query(QuizSession)
            .filter(QuizSession.user_id == user.id, QuizSession.status == "active")
            .order_by(QuizSession.started_at.desc()).first()
        )
        if sess is None:
            sess = QuizSession(user_id=user.id)
            db.add(sess)
        sess.class_level = body.class_level
        sess.subject = body.subject
        sess.difficulty = body.difficulty
        sess.topic = body.topic
        sess.total = total
        sess.correct = correct
        sess.score = score
        sess.accuracy = accuracy
        sess.duration_seconds = body.duration_seconds
        sess.status = "completed"
        sess.max_streak = best_streak
        sess.started_at = sess.started_at or now
        sess.ended_at = now
        sess.school_code = user.school_code
        sess.is_daily = bool(body.daily) if body.daily is not None else False
        db.flush()
        session_id = sess.id

        # ---- Event-based progress update ----
        _update_progress(db, user, body, questions, body.answers, score)
        # Record the answered questions so they won't repeat (unless pool exhausted)
        _mark_seen(db, user, qids)
        db.commit()

    return QuizResultResponse(
        session_id=session_id or 0,
        total=total,
        correct=correct,
        accuracy=accuracy,
        score=score,
        streak=(user.current_streak if user else 0),
        points_breakdown=per_diff,
        feedback=feedback,
        points_breakdown_list=per_question_points,
        best_streak=best_streak,
        daily_streak=(user.current_streak if user else 0),
        lifetime_score=(user.lifetime_score if user else 0),
    )


def _update_progress(db, user, body, questions, answers, score):
    """Implement the algorithm:
    overall -> subject -> topic(+mastery) -> award points -> weekly/monthly buckets.
    """
    cls = body.class_level

    # 1. Overall
    user.lifetime_score = (user.lifetime_score or 0) + score
    user.total_questions = (user.total_questions or 0) + len(answers)
    user.total_correct = (user.total_correct or 0) + sum(
        1 for a in answers if questions.get(a.question_id) and a.selected_index == questions[a.question_id].answer_index
    )
    # Streak (count a session once per new UTC day)
    today = datetime.now(timezone.utc).date()
    if user.last_played is None or user.last_played.date() < today:
        if user.last_played is not None and (today - user.last_played.date()).days == 1:
            user.current_streak = (user.current_streak or 0) + 1
        else:
            user.current_streak = 1
        user.longest_streak = max(user.longest_streak or 0, user.current_streak)
        user.last_played = datetime.now(timezone.utc)

    # 2 & 3. Subject + topic per answered question.
    # Accumulate counts first (one session can hit the same subject/topic many
    # times); then upsert each row ONCE to avoid duplicate-insert on the
    # unique (user, class, subject[, topic]) constraint.
    subj_counts = {}   # (subject) -> [answered, correct]
    topic_counts = {}  # (subject, topic) -> [answered, correct]
    for ans in answers:
        q = questions.get(ans.question_id)
        if not q:
            continue
        is_correct = (ans.selected_index == q.answer_index)
        sa = subj_counts.get(q.subject, [0, 0])
        sa[0] += 1
        sa[1] += 1 if is_correct else 0
        subj_counts[q.subject] = sa
        key = (q.subject, q.topic)
        ta = topic_counts.get(key, [0, 0])
        ta[0] += 1
        ta[1] += 1 if is_correct else 0
        topic_counts[key] = ta

    for subject, (answered, correct) in subj_counts.items():
        sp = db.query(SubjectProgress).filter_by(
            user_id=user.id, class_level=cls, subject=subject).first()
        if not sp:
            sp = SubjectProgress(user_id=user.id, class_level=cls, subject=subject,
                                 questions_answered=0, correct=0)
            db.add(sp)
            db.flush()
        sp.questions_answered += answered
        sp.correct += correct

    for (subject, topic), (answered, correct) in topic_counts.items():
        tp = db.query(TopicProgress).filter_by(
            user_id=user.id, class_level=cls, subject=subject, topic=topic).first()
        if not tp:
            tp = TopicProgress(user_id=user.id, class_level=cls, subject=subject, topic=topic,
                               questions_answered=0, correct=0, mastery_score=0.0, mastered=False)
            db.add(tp)
            db.flush()
        tp.questions_answered += answered
        tp.correct += correct
        acc = tp.correct / tp.questions_answered if tp.questions_answered else 0.0
        tp.mastery_score = round(calculate_mastery(acc, tp.questions_answered), 4)
        tp.mastered = is_mastered(acc, tp.questions_answered)

    # 4 & 5. Award points into current weekly + monthly buckets
    _add_period_points(db, user.id, "weekly", week_period(), score)
    _add_period_points(db, user.id, "monthly", month_period(), score)


def _add_period_points(db, user_id, kind, period, delta):
    row = db.query(LeaderboardPeriod).filter_by(user_id=user_id, kind=kind, period=period).first()
    if not row:
        row = LeaderboardPeriod(user_id=user_id, kind=kind, period=period, points=0)
        db.add(row)
    row.points = (row.points or 0) + delta


@router.get("/leaderboard", response_model=list[LeaderboardEntry])
@limiter.limit("20/minute")
def leaderboard(
    request: Request,
    scope: str = "global",          # global | class | school | weekly | monthly
    class_level: str | None = None,
    school_code: str | None = None,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    return build_leaderboard(db, scope, class_level, school_code, limit)


def build_leaderboard(db, scope="global", class_level=None, school_code=None, limit=50):
    # Time-bucketed boards: query the current period's points, no resets/deletes.
    if scope in ("weekly", "monthly"):
        kind = "weekly" if scope == "weekly" else "monthly"
        period = week_period() if scope == "weekly" else month_period()
        rows = (
            db.query(User, LeaderboardPeriod.points.label("pts"))
            .join(LeaderboardPeriod, LeaderboardPeriod.user_id == User.id)
            .filter(LeaderboardPeriod.kind == kind, LeaderboardPeriod.period == period)
            .filter(User.is_guest.is_(False))
        )
        if class_level:
            rows = rows.filter(User.class_level == class_level)
        rows = rows.order_by(LeaderboardPeriod.points.desc()).limit(limit).all()
        out = []
        for i, (u, pts) in enumerate(rows, start=1):
            acc = round((u.total_correct or 0) / (u.total_questions or 1), 4)
            out.append(LeaderboardEntry(
                rank=i, nickname=u.nickname, class_level=u.class_level,
                lifetime_score=pts, total_questions=u.total_questions or 0,
                accuracy=acc, is_guest=bool(u.is_guest),
            ))
        return out

    # Global / class / school: ranked by lifetime_score
    q = db.query(User).filter(User.is_guest.is_(False))
    if scope == "class" and class_level:
        q = q.filter(User.class_level == class_level)
    elif scope == "school" and school_code:
        q = q.filter(User.school_code == school_code)
    q = q.filter(User.lifetime_score > 0).order_by(User.lifetime_score.desc()).limit(limit)
    rows = q.all()
    out = []
    for i, u in enumerate(rows, start=1):
        acc = round((u.total_correct or 0) / (u.total_questions or 1), 4)
        out.append(LeaderboardEntry(
            rank=i, nickname=u.nickname, class_level=u.class_level,
            lifetime_score=u.lifetime_score or 0, total_questions=u.total_questions or 0,
            accuracy=acc, is_guest=bool(u.is_guest),
        ))
    return out


@router.get("/progress", response_model=dict)
@limiter.limit("20/minute")
def get_progress(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Detailed progress: overall + per-subject + per-topic with mastery."""
    return build_progress(db, user)


@router.get("/leaderboard/schools")
@limiter.limit("20/minute")
def schools_leaderboard(
    request: Request,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    """School-vs-school competition: this month's points aggregated per school code.

    Every signed-in player contributes their monthly LeaderboardPeriod points to
    their school (set at sign-up / profile via school_code). Guest scores never
    count. Ranked by school total; each row also names the school's top player.
    Public like /quiz/leaderboard (only nicknames that the player boards already
    expose) — no auth dependency.
    """
    period = month_period()
    rows = (
        db.query(
            User.school_code.label("code"),
            func.sum(LeaderboardPeriod.points).label("pts"),
            func.count(LeaderboardPeriod.user_id.distinct()).label("players"),
        )
        .join(LeaderboardPeriod, LeaderboardPeriod.user_id == User.id)
        .filter(
            LeaderboardPeriod.kind == "monthly",
            LeaderboardPeriod.period == period,
            LeaderboardPeriod.points > 0,
            User.is_guest.is_(False),
            User.is_active.is_(True),
            User.school_code.isnot(None),
            User.school_code != "",
        )
        .group_by(User.school_code)
        .order_by(func.sum(LeaderboardPeriod.points).desc())
        .limit(limit)
        .all()
    )
    out = []
    for i, (code, pts, players) in enumerate(rows, 1):
        school = db.query(SchoolCode).filter(SchoolCode.code == code).first()
        top = (
            db.query(User.nickname, LeaderboardPeriod.points)
            .join(LeaderboardPeriod, LeaderboardPeriod.user_id == User.id)
            .filter(
                LeaderboardPeriod.kind == "monthly",
                LeaderboardPeriod.period == period,
                LeaderboardPeriod.points > 0,
                User.school_code == code,
                User.is_guest.is_(False),
                User.is_active.is_(True),
            )
            .order_by(LeaderboardPeriod.points.desc())
            .first()
        )
        out.append({
            "rank": i,
            "school_code": code,
            "school_name": (school.name if school else None) or code,
            "points": int(pts or 0),
            "players": int(players or 0),
            "top_player": {"nickname": top[0], "points": int(top[1])} if top else None,
            "period": period,
        })
    return out

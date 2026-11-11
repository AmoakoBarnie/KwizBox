"""Build a user's detailed progress payload (overall + subject + topic + mastery).

Engagement upgrades (Group B): the payload also carries XP level, weekly league,
streak-calendar activity (daily aggregates for the last 8 weeks) and the
current weekly/monthly leaderboard points.
"""
from datetime import datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from .models import User, SubjectProgress, TopicProgress, QuizSession, LeaderboardPeriod
from .periods import week_period, month_period
from .xp import level_info, league_info

ACTIVITY_DAYS = 56  # 8 weeks of daily aggregates for the streak calendar


def build_progress(db: Session, user: User) -> dict:
    overall_acc = round((user.total_correct or 0) / (user.total_questions or 1), 4) if user.total_questions else 0.0
    subjects = []
    for sp in db.query(SubjectProgress).filter_by(user_id=user.id).all():
        sacc = round(sp.correct / sp.questions_answered, 4) if sp.questions_answered else 0.0
        topics = []
        for tp in db.query(TopicProgress).filter_by(user_id=user.id, class_level=sp.class_level, subject=sp.subject).all():
            tacc = round(tp.correct / tp.questions_answered, 4) if tp.questions_answered else 0.0
            topics.append({
                "topic": tp.topic,
                "questions_answered": tp.questions_answered,
                "correct": tp.correct,
                "accuracy": tacc,
                "mastery_score": tp.mastery_score,
                "mastered": bool(tp.mastered),
            })
        subjects.append({
            "class_level": sp.class_level,
            "subject": sp.subject,
            "questions_answered": sp.questions_answered,
            "correct": sp.correct,
            "accuracy": sacc,
            "topics": topics,
        })
    mastered_count = db.query(TopicProgress).filter_by(user_id=user.id, mastered=True).count()

    # ---- Engagement: XP level, weekly league, period points, daily activity ----
    weekly_points = _period_points(db, user.id, "weekly", week_period())
    monthly_points = _period_points(db, user.id, "monthly", month_period())

    return {
        "overall": {
            "questions_answered": user.total_questions or 0,
            "correct": user.total_correct or 0,
            "accuracy": overall_acc,
            "lifetime_score": user.lifetime_score or 0,
            "current_streak": user.current_streak or 0,
            "longest_streak": user.longest_streak or 0,
        },
        "subjects": subjects,
        "topics_mastered": mastered_count,
        # XP level from lifetime points (badges + Profile level bar)
        "xp": level_info(user.lifetime_score or 0),
        # Weekly league from this week's points
        "league": league_info(weekly_points),
        "weekly_points": weekly_points,
        "monthly_points": monthly_points,
        # Daily aggregates for the streak calendar (last 8 weeks)
        "activity": _daily_activity(db, user.id),
    }


def _period_points(db: Session, user_id: int, kind: str, period: str) -> int:
    row = (
        db.query(LeaderboardPeriod.points)
        .filter(
            LeaderboardPeriod.user_id == user_id,
            LeaderboardPeriod.kind == kind,
            LeaderboardPeriod.period == period,
        )
        .first()
    )
    return int(row[0] or 0) if row else 0


def _daily_activity(db: Session, user_id: int, days: int = ACTIVITY_DAYS) -> list[dict]:
    """One row per active day: [{day, sessions, correct, score}, ...].

    Days are UTC (matching the day-streak logic in the submit path). SQLite's
    date() on the stored naive-UTC datetimes gives clean YYYY-MM-DD keys.
    """
    since = datetime.utcnow() - timedelta(days=days)
    rows = (
        db.query(
            func.date(QuizSession.created_at).label("day"),
            func.count(QuizSession.id).label("sessions"),
            func.sum(QuizSession.correct).label("correct"),
            func.sum(QuizSession.score).label("score"),
        )
        .filter(
            QuizSession.user_id == user_id,
            QuizSession.status == "completed",
            QuizSession.created_at >= since,
        )
        .group_by("day")
        .order_by("day")
        .all()
    )
    return [
        {
            "day": str(r.day),
            "sessions": int(r.sessions or 0),
            "correct": int(r.correct or 0),
            "score": int(r.score or 0),
        }
        for r in rows
    ]

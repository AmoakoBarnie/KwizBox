"""Build a user's detailed progress payload (overall + subject + topic + mastery)."""
from sqlalchemy.orm import Session

from .models import User, SubjectProgress, TopicProgress


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
    }

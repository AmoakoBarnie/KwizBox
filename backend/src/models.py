"""SQLAlchemy models: users, questions, sessions, school codes, progress, leaderboard periods."""
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Float, Index, UniqueConstraint
)
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime, timezone

Base = declarative_base()


def utcnow():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    nickname = Column(String(40), nullable=False)
    full_name = Column(String(80), nullable=True)       # optional real name
    email = Column(String(120), nullable=True)
    phone = Column(String(30), nullable=True)
    class_level = Column(String(4), nullable=True)  # B4..B9 or None for guest
    school_code = Column(String(20), nullable=True)
    is_guest = Column(Boolean, default=False)
    # For registered users only:
    password_hash = Column(String(200), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)  # disable/activate
    created_at = Column(DateTime, default=utcnow)

    # Aggregated progress (kept current for fast leaderboards / dashboards)
    lifetime_score = Column(Integer, default=0)
    total_questions = Column(Integer, default=0)
    total_correct = Column(Integer, default=0)
    current_streak = Column(Integer, default=0)
    longest_streak = Column(Integer, default=0)
    last_played = Column(DateTime, nullable=True)

    sessions = relationship("QuizSession", back_populates="user")
    subject_progress = relationship("SubjectProgress", back_populates="user", cascade="all, delete-orphan")
    topic_progress = relationship("TopicProgress", back_populates="user", cascade="all, delete-orphan")


class Question(Base):
    __tablename__ = "questions"
    id = Column(Integer, primary_key=True, index=True)
    class_level = Column(String(4), nullable=False, index=True)
    subject = Column(String(20), nullable=False, index=True)
    topic = Column(String(60), nullable=False)
    strand = Column(String(60), nullable=False)
    difficulty = Column(String(10), nullable=False, index=True)
    question = Column(Text, nullable=False)
    option_a = Column(Text, nullable=False)
    option_b = Column(Text, nullable=False)
    option_c = Column(Text, nullable=False)
    option_d = Column(Text, nullable=False)
    answer_index = Column(Integer, nullable=False)  # 0..3
    explanation = Column(Text, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)  # deactivated questions excluded from packs
    times_answered = Column(Integer, default=0)
    times_correct = Column(Integer, default=0)

    __table_args__ = (
        Index("ix_q_class_subject_diff", "class_level", "subject", "difficulty"),
    )


class QuizSession(Base):
    __tablename__ = "quiz_sessions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    class_level = Column(String(4), nullable=False)
    subject = Column(String(20), nullable=False)
    difficulty = Column(String(10), nullable=True)  # per-session label; null = mixed
    topic = Column(String(60), nullable=True)  # None = random/mixed
    total = Column(Integer, nullable=False)
    correct = Column(Integer, nullable=False)
    score = Column(Integer, nullable=False)
    accuracy = Column(Float, nullable=False)
    duration_seconds = Column(Integer, nullable=True)
    status = Column(String(12), default="completed", nullable=False)  # active|completed|abandoned
    started_at = Column(DateTime, default=utcnow)
    ended_at = Column(DateTime, nullable=True)
    school_code = Column(String(20), nullable=True)
    created_at = Column(DateTime, default=utcnow)

    user = relationship("User", back_populates="sessions")


class SubjectProgress(Base):
    """Rolling accuracy + count per (user, class_level, subject)."""
    __tablename__ = "subject_progress"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    class_level = Column(String(4), nullable=False)
    subject = Column(String(20), nullable=False)
    questions_answered = Column(Integer, default=0)
    correct = Column(Integer, default=0)

    user = relationship("User", back_populates="subject_progress")
    __table_args__ = (
        UniqueConstraint("user_id", "class_level", "subject", name="uq_subject_progress"),
    )


class TopicProgress(Base):
    """Rolling accuracy + mastery per (user, class_level, subject, topic)."""
    __tablename__ = "topic_progress"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    class_level = Column(String(4), nullable=False)
    subject = Column(String(20), nullable=False)
    topic = Column(String(60), nullable=False)
    questions_answered = Column(Integer, default=0)
    correct = Column(Integer, default=0)
    mastery_score = Column(Float, default=0.0)   # 0..1
    mastered = Column(Boolean, default=False)

    user = relationship("User", back_populates="topic_progress")
    __table_args__ = (
        UniqueConstraint("user_id", "class_level", "subject", "topic", name="uq_topic_progress"),
    )


class LeaderboardPeriod(Base):
    """Points bucketed by period. Weekly and monthly boards roll automatically
    by querying the current period id — no deletions, history preserved."""
    __tablename__ = "leaderboard_periods"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    kind = Column(String(8), nullable=False)        # 'weekly' | 'monthly'
    period = Column(String(12), nullable=False)      # e.g. '2026-W34' or '2026-08'
    points = Column(Integer, default=0)

    user = relationship("User")
    __table_args__ = (
        UniqueConstraint("user_id", "kind", "period", name="uq_leaderboard_period"),
    )


class SchoolCode(Base):
    """A teacher-generated code that groups students onto one leaderboard."""
    __tablename__ = "school_codes"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(80), nullable=False)  # e.g. "Adisadel JHS 1 - Mr. Owusu"
    school = Column(String(80), nullable=True)  # school name
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=utcnow)
    expires_at = Column(DateTime, nullable=True)  # None = never
    is_active = Column(Boolean, default=True, nullable=False)
    max_uses = Column(Integer, nullable=True)  # None = unlimited
    used_count = Column(Integer, default=0)


class UserQuestionSeen(Base):
    """Tracks which questions a user has already answered, most-recent first.
    Used to avoid repeating questions across sessions; recycles oldest first
    when the unseen pool is too small to fill a pack."""
    __tablename__ = "user_question_seen"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False, index=True)
    seen_at = Column(DateTime, default=utcnow)

    user = relationship("User")
    __table_args__ = (
        UniqueConstraint("user_id", "question_id", name="uq_user_question_seen"),
    )


# ===================== ADMIN SYSTEM =====================

ADMIN_ROLES = ["super_admin", "question_manager", "school_manager", "moderator"]
# Permission map: which scopes each role can access
ROLE_PERMISSIONS = {
    "super_admin": {"users", "questions", "schools", "leaderboard", "monitor", "settings", "export", "audit"},
    "question_manager": {"questions", "leaderboard", "monitor"},
    "school_manager": {"schools", "users", "leaderboard", "monitor"},
    "moderator": {"users", "leaderboard", "monitor"},
}


class AdminUser(Base):
    __tablename__ = "admin_users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(40), unique=True, nullable=False, index=True)
    full_name = Column(String(80), nullable=True)
    password_hash = Column(String(200), nullable=False)
    role = Column(String(20), nullable=False, default="moderator")  # see ADMIN_ROLES
    is_active = Column(Boolean, default=True, nullable=False)
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utcnow)
    created_by = Column(Integer, ForeignKey("admin_users.id"), nullable=True)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    admin_id = Column(Integer, ForeignKey("admin_users.id"), nullable=True, index=True)
    admin_username = Column(String(40), nullable=True)
    action = Column(String(60), nullable=False)  # e.g. "user.disable", "question.create"
    target = Column(String(120), nullable=True)  # e.g. "user:42" or "question:88"
    detail = Column(Text, nullable=True)
    ip = Column(String(45), nullable=True)
    created_at = Column(DateTime, default=utcnow)


class SystemSetting(Base):
    __tablename__ = "system_settings"
    key = Column(String(40), primary_key=True)
    value = Column(Text, nullable=False)
    updated_at = Column(DateTime, default=utcnow)
    updated_by = Column(Integer, ForeignKey("admin_users.id"), nullable=True)

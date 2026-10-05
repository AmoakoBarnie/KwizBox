"""SQLAlchemy models: users, questions, sessions, school codes, progress, leaderboard periods, challenges."""
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
    full_name = Column(String(80), nullable=True)
    email = Column(String(120), nullable=True)
    phone = Column(String(30), nullable=True)
    class_level = Column(String(4), nullable=True)
    school_code = Column(String(20), nullable=True)
    is_guest = Column(Boolean, default=False)
    password_hash = Column(String(200), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utcnow)
    lifetime_score = Column(Integer, default=0)
    total_questions = Column(Integer, default=0)
    total_correct = Column(Integer, default=0)
    current_streak = Column(Integer, default=0)
    longest_streak = Column(Integer, default=0)
    last_played = Column(DateTime, nullable=True)
    # ---- Avatar customization (Upgrade 8) ----
    avatar_skin = Column(String(20), nullable=False, default="warm")
    avatar_hat = Column(String(20), nullable=False, default="none")
    avatar_accessory = Column(String(20), nullable=False, default="none")
    avatar_gender = Column(String(20), nullable=False, default="male")
    last_ip = Column(String(45), nullable=True)
    last_login = Column(DateTime, nullable=True)
    security_question = Column(String(160), nullable=True)
    security_answer_hash = Column(String(200), nullable=True)
    sessions = relationship("QuizSession", back_populates="user")
    subject_progress = relationship("SubjectProgress", back_populates="user", cascade="all, delete-orphan")
    topic_progress = relationship("TopicProgress", back_populates="user", cascade="all, delete-orphan")


class Question(Base):
    __tablename__ = "questions"
    id = Column(Integer, primary_key=True, index=True)
    class_level = Column(String(4), nullable=False, index=True)
    subject = Column(String(20), nullable=False, index=True)
    topic = Column(String(60), nullable=False)
    sub_topic = Column(String(60), nullable=True)
    strand = Column(String(60), nullable=False)
    difficulty = Column(String(10), nullable=False, index=True)
    question = Column(Text, nullable=False)
    option_a = Column(Text, nullable=False)
    option_b = Column(Text, nullable=False)
    option_c = Column(Text, nullable=False)
    option_d = Column(Text, nullable=False)
    answer_index = Column(Integer, nullable=False)
    explanation = Column(Text, nullable=False)
    question_type = Column(String(20), nullable=False, default="mcq", index=True)
    image_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    times_answered = Column(Integer, default=0)
    times_correct = Column(Integer, default=0)
    __table_args__ = (Index("ix_q_class_subject_diff", "class_level", "subject", "difficulty"),)


class QuizSession(Base):
    __tablename__ = "quiz_sessions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    class_level = Column(String(4), nullable=False)
    subject = Column(String(20), nullable=False)
    difficulty = Column(String(10), nullable=True)
    topic = Column(String(60), nullable=True)
    total = Column(Integer, nullable=False)
    correct = Column(Integer, nullable=False)
    score = Column(Integer, nullable=False)
    accuracy = Column(Float, nullable=False)
    duration_seconds = Column(Integer, nullable=True)
    max_streak = Column(Integer, nullable=False, default=0)
    status = Column(String(12), default="completed", nullable=False)
    started_at = Column(DateTime, default=utcnow)
    ended_at = Column(DateTime, nullable=True)
    school_code = Column(String(20), nullable=True)
    is_daily = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=utcnow)
    user = relationship("User", back_populates="sessions")


class SubjectProgress(Base):
    __tablename__ = "subject_progress"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    class_level = Column(String(4), nullable=False)
    subject = Column(String(20), nullable=False)
    questions_answered = Column(Integer, default=0)
    correct = Column(Integer, default=0)
    user = relationship("User", back_populates="subject_progress")
    __table_args__ = (UniqueConstraint("user_id", "class_level", "subject", name="uq_subject_progress"),)


class TopicProgress(Base):
    __tablename__ = "topic_progress"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    class_level = Column(String(4), nullable=False)
    subject = Column(String(20), nullable=False)
    topic = Column(String(60), nullable=False)
    questions_answered = Column(Integer, default=0)
    correct = Column(Integer, default=0)
    mastery_score = Column(Float, default=0.0)
    mastered = Column(Boolean, default=False)
    user = relationship("User", back_populates="topic_progress")
    __table_args__ = (UniqueConstraint("user_id", "class_level", "subject", "topic", name="uq_topic_progress"),)


class LeaderboardPeriod(Base):
    __tablename__ = "leaderboard_periods"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    kind = Column(String(8), nullable=False)
    period = Column(String(12), nullable=False)
    points = Column(Integer, default=0)
    user = relationship("User")
    __table_args__ = (UniqueConstraint("user_id", "kind", "period", name="uq_leaderboard_period"),)


class SchoolCode(Base):
    __tablename__ = "school_codes"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(80), nullable=False)
    school = Column(String(80), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=utcnow)
    expires_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    max_uses = Column(Integer, nullable=True)
    used_count = Column(Integer, default=0)


class UserQuestionSeen(Base):
    __tablename__ = "user_question_seen"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False, index=True)
    seen_at = Column(DateTime, default=utcnow)
    user = relationship("User")
    __table_args__ = (UniqueConstraint("user_id", "question_id", name="uq_user_question_seen"),)


# ===================== ADMIN SYSTEM =====================

ADMIN_ROLES = ["super_admin", "question_manager", "school_manager", "moderator"]
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
    role = Column(String(20), nullable=False, default="moderator")
    is_active = Column(Boolean, default=True, nullable=False)
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utcnow)
    created_by = Column(Integer, ForeignKey("admin_users.id"), nullable=True)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    admin_id = Column(Integer, ForeignKey("admin_users.id"), nullable=True, index=True)
    admin_username = Column(String(40), nullable=True)
    action = Column(String(60), nullable=False)
    target = Column(String(120), nullable=True)
    detail = Column(Text, nullable=True)
    ip = Column(String(45), nullable=True)
    created_at = Column(DateTime, default=utcnow)


class SystemSetting(Base):
    __tablename__ = "system_settings"
    key = Column(String(40), primary_key=True)
    value = Column(Text, nullable=False)
    updated_at = Column(DateTime, default=utcnow)
    updated_by = Column(Integer, ForeignKey("admin_users.id"), nullable=True)


# ===================== CHALLENGE / HEAD-TO-HEAD =====================

class Challenge(Base):
    __tablename__ = "challenges"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(6), unique=True, nullable=False, index=True)
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    class_level = Column(String(4), nullable=False)
    subject = Column(String(20), nullable=False)
    question_ids = Column(Text, nullable=False)
    created_at = Column(DateTime, default=utcnow)
    expires_at = Column(DateTime, nullable=True)
    status = Column(String(12), default="open", nullable=False)

    creator = relationship("User")

    @property
    def question_list(self):
        if not self.question_ids:
            return []
        return [int(x) for x in self.question_ids.split(",") if x.strip()]


class ChallengeSession(Base):
    __tablename__ = "challenge_sessions"

    id = Column(Integer, primary_key=True, index=True)
    challenge_code = Column(String(6), ForeignKey("challenges.code"), nullable=False, index=True)
    player_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    score = Column(Integer, nullable=False, default=0)
    correct = Column(Integer, nullable=False, default=0)
    wrong = Column(Integer, nullable=False, default=0)
    total = Column(Integer, nullable=False, default=0)
    accuracy = Column(Float, nullable=False, default=0.0)
    status = Column(String(12), nullable=False, default="pending")  # pending|completed
    started_at = Column(DateTime, default=utcnow)
    completed_at = Column(DateTime, nullable=True)

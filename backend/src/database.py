"""DB engine + session + dependency."""
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, Session
from .config import settings

connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _migrate_avatar_and_streak_columns():
    """Idempotent ALTER for the avatar + max_streak columns added in Upgrade 8/9."""
    if not str(settings.database_url).startswith("sqlite"):
        return
    insp = inspect(engine)
    if "users" not in insp.get_table_names():
        return
    cols = {c["name"] for c in insp.get_columns("users")}
    with engine.begin() as conn:
        for col, col_type in [
            ("avatar_skin", "VARCHAR(20)"),
            ("avatar_hat", "VARCHAR(20)"),
            ("avatar_accessory", "VARCHAR(20)"),
            ("avatar_gender", "VARCHAR(20)"),
            ("last_ip", "VARCHAR(45)"),
            ("last_login", "DATETIME"),
            ("security_question", "VARCHAR(160)"),
            ("security_answer_hash", "VARCHAR(200)"),
        ]:
            if col not in cols:
                conn.execute(text(f"ALTER TABLE users ADD COLUMN {col} {col_type}"))
        if "avatar_skin" in cols:
            conn.execute(text(
                "UPDATE users SET avatar_skin = 'warm', avatar_hat = 'none', "
                "avatar_accessory = 'none', avatar_gender = 'male' "
                "WHERE avatar_skin IS NULL OR avatar_skin = ''"
            ))
        if "quiz_sessions" not in insp.get_table_names():
            return
        qs_cols = {c["name"] for c in insp.get_columns("quiz_sessions")}
        if "max_streak" not in qs_cols:
            conn.execute(text("ALTER TABLE quiz_sessions ADD COLUMN max_streak INTEGER NOT NULL DEFAULT 0"))
    # give existing sessions a sensible max_streak so compare cards don't all show 0
    with engine.begin() as conn:
        conn.execute(text(
            "UPDATE quiz_sessions SET max_streak = 0 WHERE max_streak IS NULL"
        ))


def _migrate_question_columns():
    """Idempotent SQLite ALTER for columns create_all will not add to an existing DB.

    Keeps the live question bank (backend/trivia.db) intact. New installs just
    get the columns from create_all; this path only runs when the table already
    exists without question_type / image_url.
    """
    if not str(settings.database_url).startswith("sqlite"):
        return
    insp = inspect(engine)
    if "questions" not in insp.get_table_names():
        return
    cols = {c["name"] for c in insp.get_columns("questions")}
    with engine.begin() as conn:
        if "question_type" not in cols:
            conn.execute(text(
                "ALTER TABLE questions ADD COLUMN question_type VARCHAR(20) DEFAULT 'mcq'"
            ))
        if "image_url" not in cols:
            conn.execute(text(
                "ALTER TABLE questions ADD COLUMN image_url VARCHAR(500)"
            ))
        conn.execute(text(
            "UPDATE questions SET question_type = 'mcq' "
            "WHERE question_type IS NULL OR question_type = ''"
        ))
        conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_questions_question_type ON questions (question_type)"
        ))


def _ensure_demo_typed_questions():
    """Insert 1 T/F + 2 image_mcq placeholders if they are not already present."""
    from .models import Question
    from .question_types import demo_questions
    db = SessionLocal()
    try:
        for d in demo_questions():
            exists = db.query(Question).filter(Question.question == d["question"]).first()
            if exists:
                continue
            db.add(Question(**d, is_active=True))
        db.commit()
    finally:
        db.close()


def init_db():
    from .models import Base
    Base.metadata.create_all(bind=engine)
    _migrate_avatar_and_streak_columns()
    _migrate_question_columns()
    _ensure_demo_typed_questions()

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
    _migrate_question_columns()
    _ensure_demo_typed_questions()

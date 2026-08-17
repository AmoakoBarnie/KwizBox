"""DB engine + session + dependency."""
from sqlalchemy import create_engine
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


def init_db():
    from .models import Base
    import os
    # SQLite file lives next to the backend module by default
    Base.metadata.create_all(bind=engine)

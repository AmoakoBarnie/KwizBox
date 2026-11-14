"""Shared pytest setup: one throwaway SQLite DB for the whole test session.

This must execute before any test module imports `src.config` / `src.database`.
Pytest loads `conftest.py` before collecting test modules, so setting the env
var here is deterministic regardless of test-file import order. Without it, a
module that imports `src.routes.duel` first can initialise the live dev
`trivia.db` before another module sets `DATABASE_URL`.

`ADMIN_PASSWORD` is required because `seed_super_admin()` exits the app
lifespan when it is unset; the value is a throwaway for this temp DB only.
"""
import os
import tempfile
from pathlib import Path

_fd, _db_path = tempfile.mkstemp(prefix="kwizbox-test-", suffix=".db")
os.close(_fd)
os.environ["DATABASE_URL"] = "sqlite:///" + Path(_db_path).as_posix()
os.environ.setdefault("ADMIN_PASSWORD", "test-only")


def pytest_sessionfinish(session, exitstatus):
    try:
        os.unlink(_db_path)
    except OSError:
        pass

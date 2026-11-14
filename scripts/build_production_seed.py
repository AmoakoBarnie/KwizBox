#!/usr/bin/env python3
"""Build a sanitized questions-only SQLite database for deployment.

The development database (`backend/trivia.db`) contains real accounts, quiz
sessions, audit logs, challenge data and a handful of test/probe questions.
None of that belongs in a public deployment.

This script copies the schema and the curated question bank into a fresh
SQLite file, then removes every user-generated row and the probe questions
left behind by the old test-isolation bug (BUG-018). The result is safe to
bake into the Docker image; the container copies it onto the persistent
volume only when `/data/trivia.db` does not exist yet.

Usage:
    python3 scripts/build_production_seed.py \
        --source backend/trivia.db \
        --output deploy/trivia-seed.db
"""
from __future__ import annotations

import argparse
import os
import sqlite3
import sys

KEEP_TABLES = {"questions", "system_settings", "sqlite_sequence"}
SETTINGS = (("maintenance_mode", "false"), ("max_class_level", "B9"))


def build_seed(source: str, output: str) -> dict[str, int]:
    if not os.path.isfile(source):
        raise SystemExit(f"source database not found: {source}")

    tmp = output + ".tmp"
    if os.path.exists(tmp):
        os.unlink(tmp)
    os.makedirs(os.path.dirname(os.path.abspath(output)), exist_ok=True)

    src = sqlite3.connect(f"file:{source}?mode=ro", uri=True)
    dst = sqlite3.connect(tmp)
    try:
        src.backup(dst)
    finally:
        src.close()

    cur = dst.cursor()
    cur.execute("PRAGMA foreign_keys = OFF")

    tables = [
        row[0]
        for row in cur.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table'"
        ).fetchall()
    ]
    cleared = [t for t in tables if t not in KEEP_TABLES]
    for table in cleared:
        cur.execute(f'DELETE FROM "{table}"')
    if "sqlite_sequence" in tables:
        cur.execute("DELETE FROM sqlite_sequence WHERE name != 'questions'")

    # Question difficulty counters are dev aggregates, not content.
    cur.execute("UPDATE questions SET times_answered = 0, times_correct = 0")

    # Probe rows came from the BUG-018 test-isolation leak. They are all
    # identifiable by their topic name (DefaultTypeProbe, TFProbe, ...).
    cur.execute("DELETE FROM questions WHERE lower(topic) LIKE '%probe%'")

    cur.execute("DELETE FROM system_settings")
    cur.executemany(
        "INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))",
        SETTINGS,
    )

    dst.commit()
    cur.execute("VACUUM")
    integrity = cur.execute("PRAGMA integrity_check").fetchone()[0]
    if integrity != "ok":
        raise SystemExit(f"integrity check failed: {integrity}")

    questions = cur.execute("SELECT count(*) FROM questions").fetchone()[0]
    probes = cur.execute(
        "SELECT count(*) FROM questions WHERE lower(topic) LIKE '%probe%'"
    ).fetchone()[0]
    users = cur.execute("SELECT count(*) FROM users").fetchone()[0]
    admins = cur.execute("SELECT count(*) FROM admin_users").fetchone()[0]
    if probes or users or admins:
        raise SystemExit(
            "sanitization failed: "
            f"probes={probes} users={users} admins={admins}"
        )

    dst.commit()
    dst.close()
    os.replace(tmp, output)

    return {
        "questions": questions,
        "cleared_tables": len(cleared),
        "bytes": os.path.getsize(output),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", default="backend/trivia.db")
    parser.add_argument("--output", default="deploy/trivia-seed.db")
    args = parser.parse_args()

    stats = build_seed(args.source, args.output)
    print(
        f"Wrote {args.output}: {stats['questions']} questions, "
        f"{stats['cleared_tables']} tables cleared, "
        f"{stats['bytes'] / (1024 * 1024):.1f} MiB"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())

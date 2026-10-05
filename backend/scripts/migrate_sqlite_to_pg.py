#!/usr/bin/env python3
"""
Migrate KwizBox from SQLite (trivia.db) to PostgreSQL.

Idempotent: safe to re-run. Copies every table in FK-safe order, resets
sequences so new inserts don't collide, then verifies row counts match.

Usage:
    python scripts/migrate_sqlite_to_pg.py "postgresql://user:pass@host/dbname"

Run from the backend/ directory.
"""
import os
import sys

from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker

HERE = os.path.dirname(os.path.abspath(__file__))
BACKEND = os.path.dirname(HERE)
sys.path.insert(0, BACKEND)

from src.models import Base  # noqa: E402

SQLITE_PATH = os.path.join(BACKEND, "trivia.db")

# Parents before children — FK order.
TABLE_ORDER = [
    "users",
    "questions",
    "school_codes",
    "admin_users",
    "system_settings",
    "quiz_sessions",
    "subject_progress",
    "topic_progress",
    "user_question_seen",
    "leaderboard_periods",
    "audit_logs",
    "challenges",
    "challenge_sessions",
]


def coerce_rows(rows, dst_cols):
    """SQLite is loose with types; Postgres is strict.

    Booleans arrive as 0/1 integers and must become real bools, or Postgres
    rejects them with DatatypeMismatch. Datetime strings are passed through
    (psycopg2 parses ISO strings fine).
    """
    import sqlalchemy as sa

    out = []
    for r in rows:
        nr = {}
        for k, v in r.items():
            col = dst_cols.get(k)
            if v is not None and col is not None and isinstance(col["type"], sa.Boolean):
                nr[k] = bool(v)
            else:
                nr[k] = v
        out.append(nr)
    return out


def insert_batch(dst, tbl, rows, fks):
    """Insert rows, retrying so self-referential parents land before children.

    `admin_users.created_by` points back at `admin_users.id`, so a single
    pre-check against the destination drops legitimate rows as false orphans.
    Retry until a full pass makes no progress; only then are the leftovers
    genuinely dangling references (which SQLite allowed but Postgres won't).

    Returns (inserted_count, dangling_count).
    """
    remaining = list(rows)
    inserted = 0

    while remaining:
        with dst.connect() as dc:
            refs = {}
            for fk in fks:
                ttbl, tcol = fk["referred_table"], fk["referred_columns"][0]
                refs[(ttbl, tcol)] = {
                    r[0] for r in dc.execute(text(f'SELECT "{tcol}" FROM "{ttbl}"'))
                }

        ready, blocked = [], []
        for r in remaining:
            ok = True
            for fk in fks:
                tcol = fk["referred_columns"][0]
                have = refs.get((fk["referred_table"], tcol), set())
                for cc in fk["constrained_columns"]:
                    if r.get(cc) is not None and r[cc] not in have:
                        ok = False
            (ready if ok else blocked).append(r)

        if not ready:
            return inserted, len(blocked)

        cols = list(ready[0].keys())
        collist = ", ".join(f'"{c}"' for c in cols)
        params = ", ".join(f":{c}" for c in cols)
        with dst.begin() as dc:
            dc.execute(
                text(f'INSERT INTO "{tbl}" ({collist}) VALUES ({params}) ON CONFLICT DO NOTHING'),
                ready,
            )
        inserted += len(ready)
        remaining = blocked

    return inserted, 0


def main(pg_url: str) -> int:
    if not os.path.exists(SQLITE_PATH):
        print(f"ERROR: {SQLITE_PATH} not found")
        return 1

    src = create_engine(f"sqlite:///{SQLITE_PATH}", connect_args={"check_same_thread": False})
    dst = create_engine(pg_url)

    # 1. Create the schema on Postgres from the SQLAlchemy models.
    Base.metadata.create_all(bind=dst)
    print("schema created on Postgres")

    insp_src = inspect(src)
    insp_dst = inspect(dst)
    src_tables = set(insp_src.get_table_names())
    dst_tables = set(insp_dst.get_table_names())

    order = [t for t in TABLE_ORDER if t in src_tables and t in dst_tables]
    extra = sorted((src_tables & dst_tables) - set(TABLE_ORDER))
    order += extra

    total_copied = 0
    skipped = {}

    for tbl in order:
        dst_cols = {c["name"]: c for c in insp_dst.get_columns(tbl)}
        fks = insp_dst.get_foreign_keys(tbl)

        with src.connect() as sc:
            rows = [dict(r._mapping) for r in sc.execute(text(f'SELECT * FROM "{tbl}"'))]
        rows = coerce_rows(rows, dst_cols)

        if not rows:
            print(f"  {tbl:<24} {0:>6} rows")
            continue

        if fks:
            ins, dangling = insert_batch(dst, tbl, rows, fks)
        else:
            cols = list(rows[0].keys())
            collist = ", ".join(f'"{c}"' for c in cols)
            params = ", ".join(f":{c}" for c in cols)
            with dst.begin() as dc:
                dc.execute(
                    text(f'INSERT INTO "{tbl}" ({collist}) VALUES ({params}) ON CONFLICT DO NOTHING'),
                    rows,
                )
            ins, dangling = len(rows), 0

        if dangling:
            skipped[tbl] = dangling
        total_copied += ins
        note = f"   (skipped {dangling} dangling FK)" if dangling else ""
        print(f"  {tbl:<24} {ins:>6} rows{note}")

    # 2. Reset sequences for every serial PK so new rows don't collide.
    with dst.begin() as dc:
        for tbl in order:
            try:
                cols = {c["name"]: c for c in insp_dst.get_columns(tbl)}
                if "id" in cols:
                    dc.execute(text(
                        f"SELECT setval(pg_get_serial_sequence('{tbl}','id'), "
                        f"COALESCE((SELECT MAX(id) FROM \"{tbl}\"), 0) + 1, false)"
                    ))
            except Exception:
                pass
    print("\nsequences reset")

    # 3. Verify: every source row is either present, or was a dangling FK.
    print("\n=== verification ===")
    ok = True
    with src.connect() as sc, dst.connect() as dc:
        for tbl in order:
            s = sc.execute(text(f'SELECT COUNT(*) FROM "{tbl}"')).scalar()
            d = dc.execute(text(f'SELECT COUNT(*) FROM "{tbl}"')).scalar()
            exp = s - skipped.get(tbl, 0)
            good = (d == exp)
            if not good:
                ok = False
            mark = "OK " if good else "MISMATCH"
            extra = "" if good else f"   (expected {exp} = {s} src - {skipped.get(tbl,0)} dangling)"
            print(f"  {mark} {tbl:<24} sqlite={s:<6} postgres={d}{extra}")

    if skipped:
        print("\ndropped as dangling FK references (SQLite allowed, Postgres rejects):")
        for t, n in skipped.items():
            print(f"  {t}: {n}")

    print(f"\ntotal rows copied: {total_copied}")
    print("RESULT:", "SUCCESS — all row counts accounted for" if ok else "FAILED — counts differ")
    return 0 if ok else 2


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    sys.exit(main(sys.argv[1]))

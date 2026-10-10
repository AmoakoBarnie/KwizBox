#!/usr/bin/env python3
"""Migrate SQLite → Supabase Postgres (psycopg2 over IPv6, fast path)."""
import os
import sqlite3
import time
from pathlib import Path

TABLE_ORDER = [
    "users", "questions", "school_codes", "admin_users", "system_settings",
    "quiz_sessions", "subject_progress", "topic_progress", "user_question_seen",
    "leaderboard_periods", "audit_logs", "challenges", "challenge_sessions",
]

DSN = os.environ.get("SUPABASE_DATABASE_URL")
SQLITE = Path(os.environ.get("SQLITE_PATH", Path(__file__).resolve().parents[1] / "trivia.db"))

def main():
    t0 = time.time()
    if not DSN:
        raise SystemExit("SUPABASE_DATABASE_URL must be set; refusing to migrate without an explicit destination")
    import psycopg2
    dst = psycopg2.connect(DSN)
    dst.autocommit = False
    print(f"[{time.time()-t0:.1f}s] Connected to Supabase")

    src = sqlite3.connect(str(SQLITE))
    src.row_factory = sqlite3.Row
    cur = dst.cursor()

    total = 0
    for tbl in TABLE_ORDER:
        rows = src.execute(f"SELECT * FROM {tbl}").fetchall()
        if not rows:
            print(f"  {tbl}: 0 rows (empty)")
            continue
        cols = [d[0] for d in src.execute(f"PRAGMA table_info({tbl})").fetchall()]

        cur.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = %s
        """, (tbl,))
        pgt = {r[0]: r[1] for r in cur.fetchall()}

        insert_rows = []
        for r in rows:
            d = dict(r)
            for k, v in d.items():
                if v is not None and pgt.get(k) == "boolean":
                    d[k] = bool(v)
            insert_rows.append([d.get(c) for c in cols])

        col_str = ", ".join(f'"{c}"' for c in cols)
        val_str = ", ".join(["%s"] * len(cols))
        sql = f'INSERT INTO "{tbl}" ({col_str}) VALUES ({val_str}) ON CONFLICT DO NOTHING'

        # Single executemany — much faster than batch loop
        try:
            cur.executemany(sql, insert_rows)
            inserted = len(insert_rows)
        except Exception as e:
            print(f"    executemany failed: {e}, falling back to one-by-one")
            inserted = 0
            for row in insert_rows:
                try:
                    cur.execute(sql, row)
                    inserted += 1
                except Exception:
                    pass
        dst.commit()
        total += inserted
        print(f"  {tbl}: {inserted}/{len(rows)} [{time.time()-t0:.1f}s]")

    # Reset sequences
    for tbl in TABLE_ORDER:
        try:
            cur.execute(f"""
                SELECT setval(pg_get_serial_sequence('{tbl}','id'),
                COALESCE((SELECT MAX(id) FROM "{tbl}"),0)+1, false)
            """)
        except Exception:
            pass
    dst.commit()

    print(f"\n=== Verification [{time.time()-t0:.1f}s] ===")
    ok = True
    for tbl in TABLE_ORDER:
        sc = src.execute(f"SELECT COUNT(*) FROM {tbl}").fetchone()[0]
        cur.execute(f'SELECT COUNT(*) FROM "{tbl}"')
        pc = cur.fetchone()[0]
        m = "OK" if sc == pc else "MISMATCH"
        if sc != pc:
            ok = False
        print(f"  {m} {tbl}: sqlite={sc} pg={pc}")

    src.close()
    cur.close()
    dst.close()
    print(f"\n{'SUCCESS' if ok else 'FAILED'} — {time.time()-t0:.1f}s")

if __name__ == "__main__":
    main()

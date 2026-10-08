#!/usr/bin/env python3
"""Migrate SQLite → Supabase Postgres (psycopg2 over IPv6)."""
import sqlite3, sys, time

sys.path.insert(0, "/home/stephen/Desktop/KwizBoz Andriod/backend")

TABLE_ORDER = [
    "users", "questions", "school_codes", "admin_users", "system_settings",
    "quiz_sessions", "subject_progress", "topic_progress", "user_question_seen",
    "leaderboard_periods", "audit_logs", "challenges", "challenge_sessions",
]

DSN = "host=2a05:d018:65a:e200:f5b2:c419:51b9:9f88 port=5432 user=postgres password=Peswablack@1307 dbname=postgres sslmode=require connect_timeout=10"
SQLITE = "/home/stephen/Desktop/KwizBoz Andriod/backend/trivia.db"

def main():
    t0 = time.time()
    import psycopg2
    dst = psycopg2.connect(DSN)
    dst.autocommit = False
    print(f"[{time.time()-t0:.1f}s] Connected to Supabase")

    # Create schema
    from src.models import Base
    from sqlalchemy import create_engine
    engine = create_engine("postgresql+psycopg2://postgres:Peswablack%401307@db.gfjcoowxijvmmkdwciwq.supabase.co:5432/postgres")
    Base.metadata.create_all(bind=engine)
    engine.dispose()
    print(f"[{time.time()-t0:.1f}s] Schema created")

    src = sqlite3.connect(SQLITE)
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

        batch_size = 200
        inserted = 0
        for i in range(0, len(insert_rows), batch_size):
            batch = insert_rows[i:i+batch_size]
            try:
                cur.executemany(sql, batch)
                inserted += len(batch)
            except Exception:
                for row in batch:
                    try:
                        cur.execute(sql, row)
                        inserted += 1
                    except Exception:
                        pass
        dst.commit()
        total += inserted
        print(f"  {tbl}: {inserted}/{len(rows)} [{time.time()-t0:.1f}s]")

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
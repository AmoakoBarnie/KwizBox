"""
Maintenance: clear all STUDENT/guest accounts and their generated data,
keeping ONLY the admin accounts and the question bank.

What gets DELETED:
  - users (is_guest=True OR is_guest=False  -> all non-admin user rows)
  - quiz_sessions, subject_progress, topic_progress
  - leaderboard_periods, user_question_seen
What is PRESERVED:
  - admin_users (logins/passwords/roles untouched)
  - questions (the 666-question bank)
  - audit_logs, system_settings, school_codes

Run:  python scripts/clear_users.py
Safe: makes a timestamped backup of trivia.db before any deletion.
"""
import os
import shutil
import sqlite3
from datetime import datetime

DB = os.path.join(os.path.dirname(__file__), "..", "backend", "trivia.db")
DB = os.path.abspath(DB)

USER_TABLES = [
    "user_question_seen",
    "topic_progress",
    "subject_progress",
    "leaderboard_periods",
    "quiz_sessions",
    "users",
]


def main():
    if not os.path.exists(DB):
        print(f"No database at {DB} — nothing to do.")
        return

    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup = f"{DB}.bak_{stamp}"
    shutil.copy2(DB, backup)
    print(f"Backup written: {backup}")

    conn = sqlite3.connect(DB)
    cur = conn.cursor()

    # Count what we are about to remove (for the report)
    counts = {}
    for t in USER_TABLES:
        try:
            counts[t] = cur.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
        except sqlite3.OperationalError:
            counts[t] = 0
    admin_count = cur.execute("SELECT COUNT(*) FROM admin_users").fetchone()[0]
    q_count = cur.execute("SELECT COUNT(*) FROM questions").fetchone()[0]

    print("\n=== Before ===")
    for t, c in counts.items():
        print(f"  {t}: {c}")
    print(f"  admin_users (kept): {admin_count}")
    print(f"  questions (kept):   {q_count}")

    # Delete child tables first (FK-safe), then users.
    for t in USER_TABLES:
        try:
            cur.execute(f"DELETE FROM {t}")
        except sqlite3.OperationalError as e:
            print(f"  (skip {t}: {e})")

    conn.commit()

    after = {t: cur.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0] for t in USER_TABLES}
    conn.close()

    print("\n=== After ===")
    for t, c in after.items():
        print(f"  {t}: {c}")
    print(f"  admin_users (kept): {admin_count}")
    print(f"  questions (kept):   {q_count}")
    print("\nAll student/guest accounts and their data cleared. Admins + question bank intact.")


if __name__ == "__main__":
    confirm = input("This DELETES all student/guest accounts + their data (admins kept). Type 'YES' to proceed: ")
    if confirm.strip().upper() == "YES":
        main()
    else:
        print("Aborted — no changes made.")

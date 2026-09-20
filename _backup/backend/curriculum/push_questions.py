"""Push 580 vetted questions from quiz_bank_vetted.json into the backend DB.

Workflow:
  1. Log in as admin via POST /admin/token
  2. For each question in quiz_bank_vetted.json, POST /admin/questions
  3. Report progress every 50 questions + at the end

Requires admin credentials (ADMIN_USERNAME, ADMIN_PASSWORD env vars or args).
"""
import json, sys, os, time, requests
from urllib.parse import urljoin

BASE_URL = "http://localhost:8001"


def login(username: str, password: str) -> str:
    r = requests.post(f"{BASE_URL}/admin/token", json={"username": username, "password": password}, timeout=30)
    r.raise_for_status()
    data = r.json()
    print(f"✅ Logged in as {data['username']} (role: {data['role']})")
    return data["access_token"]


def create_question(token: str, q: dict) -> int | None:
    """Create one question. Returns the new question id, or None on failure."""
    body = {
        "class_level": q.get("class_level", q.get("class_level", "B4")),
        "subject": q["subject"],
        "topic": q.get("topic", q.get("strand", "")),
        "strand": q.get("strand", ""),
        "difficulty": q.get("difficulty", "Easy"),
        "question": q["question"],
        "options": q["options"],
        "answer_index": q["answer_index"],
        "explanation": q.get("explanation", ""),
        "question_type": "mcq",
    }
    r = requests.post(
        f"{BASE_URL}/admin/questions",
        json=body,
        headers={"Authorization": f"Bearer {token}"},
        timeout=30,
    )
    if r.status_code in (200, 201):
        return r.json()["id"]
    else:
        # Print first failure for debugging, then keep going
        if r.status_code != 400:
            print(f"  ⚠️ Q#{q.get('_id','?')} [{q['subject']}] HTTP {r.status_code}: {r.text[:200]}")
        return None


def main():
    # Read bank
    bank_path = os.path.join(os.path.dirname(__file__), "output", "quiz_bank_vetted.json")
    if not os.path.exists(bank_path):
        bank_path = "/media/stephen/FILES/MyShit/ghana-stem-trivia/backend/curriculum/output/quiz_bank_vetted.json"
    with open(bank_path) as f:
        bank = json.load(f)

    username = os.environ.get("ADMIN_USERNAME", "admin")
    password = os.environ.get("ADMIN_PASSWORD", "Admin@1234")
    if len(sys.argv) > 1:
        username = sys.argv[1]
    if len(sys.argv) > 2:
        password = sys.argv[2]

    print(f"📦 Loaded {len(bank)} questions from {bank_path}")
    print(f"🔐 Admin: {username}")

    token = login(username, password)

    created = 0
    failed = 0
    skipped = 0
    start = time.time()

    # Map subject -> difficulty based on class level roughly
    for i, q in enumerate(bank):
        qid = create_question(token, q)
        if qid:
            created += 1
        else:
            failed += 1

        if (i + 1) % 50 == 0 or i == len(bank) - 1:
            elapsed = time.time() - start
            rate = (i + 1) / elapsed if elapsed > 0 else 0
            print(f"📊 Progress: {i+1}/{len(bank)} ({100*(i+1)/len(bank):.0f}%) | "
                  f"Created: {created} | Failed: {failed} | "
                  f"Rate: {rate:.1f} q/s | Elapsed: {elapsed:.0f}s")

    elapsed = time.time() - start
    print(f"\n{'='*60}")
    print(f"✅ DONE: {created}/{len(bank)} questions pushed to DB")
    print(f"   Failed: {failed}")
    print(f"   Time: {elapsed:.0f}s ({len(bank)/elapsed:.1f} q/s)")
    print(f"{'='*60}")

    # Verify by checking question count
    try:
        r = requests.get(f"{BASE_URL}/admin/questions?limit=1", headers={"Authorization": f"Bearer {token}"}, timeout=10)
        if r.status_code == 200:
            total = r.json()
            print(f"   Backend question count: {total}")
    except Exception as e:
        print(f"   Could not verify count: {e}")


if __name__ == "__main__":
    main()

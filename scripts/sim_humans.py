"""Simulate 10 human-like players using the app for ~30 minutes.

Each account:
- registers once
- logs in at a staggered start (spread across the 30-min window)
- plays 3-7 quiz sessions
- each session: 8-15 questions, mixed subject, realistic accuracy (60-92%)
- paces itself with human-like delays between questions and sessions
- produces data for leaderboards, progress, monitoring, reports

Run in foreground; takes ~30 minutes of wall-clock time by design.
"""
import json, time, random, urllib.request, urllib.error, sqlite3, datetime

B = "http://localhost:8001"
CLASSES = ["B4", "B5", "B6", "B7", "B8", "B9"]
SUBJECTS = ["Mathematics", "Science", "Computing", "Mixed"]
NICKS = [
    "Kofi_G", "Ama_T", "Yaw_M", "Esi_K", "Kojo_B",
    "Akua_S", "Kwame_A", "Adwoa_N", "Yaa_P", "Osei_D",
]

def call(m, p, d=None, tok=None, tries=3):
    for i in range(tries):
        req = urllib.request.Request(B + p,
            data=json.dumps(d).encode() if d is not None else None,
            headers={"Content-Type": "application/json"}, method=m)
        if tok:
            req.add_header("Authorization", f"Bearer {tok}")
        try:
            r = urllib.request.urlopen(req, timeout=20)
            return r.status, json.loads(r.read().decode())
        except urllib.error.HTTPError as e:
            try:
                return e.code, json.loads(e.read().decode())
            except Exception:
                return e.code, {}
        except Exception as e:
            if i == tries - 1:
                raise
            time.sleep(1.5)

class Human:
    def __init__(self, idx, nick):
        self.idx = idx
        self.nick = nick
        self.cls = random.choice(CLASSES)
        self.pw = "Play@2026!"
        self.tok = None
        # per-human accuracy profile (some are stronger than others)
        self.skill = random.uniform(0.60, 0.92)
        self.sessions = random.randint(3, 7)
        self.start_delay = idx * random.randint(40, 110)  # staggered entry across window

    def register(self):
        st, body = call("POST", "/auth/register",
                        {"nickname": self.nick, "password": self.pw, "class_level": self.cls})
        if st == 200 and "access_token" in body:
            self.tok = body["access_token"]
            return True
        # maybe already exists -> login
        st, body = call("POST", "/auth/login", {"nickname": self.nick, "password": self.pw})
        if st == 200 and "access_token" in body:
            self.tok = body["access_token"]
            return True
        return False

    def play_session(self, n):
        subj = random.choice(SUBJECTS)
        cnt = random.randint(8, 15)
        st, pack = call("POST", "/quiz/pack",
                        {"class_level": self.cls, "subject": subj, "count": cnt}, tok=self.tok)
        if st != 200 or not isinstance(pack, list) or not pack:
            return None
        # fetch correct answers from DB to grade like a human (mix right/wrong by skill)
        con = sqlite3.connect("trivia.db"); cur = con.cursor()
        correct = {}
        for q in pack:
            cur.execute("SELECT answer_index FROM questions WHERE id=?", (q["id"],))
            row = cur.fetchone()
            correct[q["id"]] = row[0] if row else 0
        con.close()
        answers = []
        for q in pack:
            if random.random() < self.skill:
                picked = correct[q["id"]]
            else:
                # pick a wrong option
                opts = [i for i in range(len(q["options"])) if i != correct[q["id"]]]
                picked = random.choice(opts) if opts else correct[q["id"]]
            answers.append({"question_id": q["id"], "selected_index": picked,
                            "time_taken": round(random.uniform(2.5, 14.0), 1)})
            time.sleep(random.uniform(0.5, 2.2))  # human think time per question
        st, res = call("POST", "/quiz/submit",
                       {"class_level": self.cls, "subject": subj, "answers": answers}, tok=self.tok)
        if st == 200:
            return res
        return None

    def run(self):
        if not self.register():
            print(f"[{self.nick}] register/login FAILED")
            return
        time.sleep(self.start_delay)
        for s in range(self.sessions):
            r = self.play_session(s)
            if r:
                print(f"[{self.nick}|{self.cls}] session {s+1}/{self.sessions}: "
                      f"score={r['score']} acc={r['accuracy']:.2f} q={r['total']}")
            time.sleep(random.uniform(20, 55))  # gap between sessions (human)
        print(f"[{self.nick}] DONE after {self.sessions} sessions")


def main():
    print(f"=== Simulated humans start: {datetime.datetime.now():%H:%M:%S} ===")
    humans = [Human(i, n) for i, n in enumerate(NICKS)]
    # register all up front
    for h in humans:
        ok = h.register()
        print(f"  reg {h.nick} ({h.cls}): {'OK' if ok else 'FAIL'}")
        time.sleep(0.3)
    print("--- all registered; staggered play begins ---")
    import threading
    threads = [threading.Thread(target=h.run, daemon=True) for h in humans]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    print(f"=== Simulated humans end: {datetime.datetime.now():%H:%M:%S} ===")


if __name__ == "__main__":
    main()

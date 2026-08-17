"""Generate the post-simulation admin report from live data.

Pulls: dashboard stats, global/daily/weekly/monthly leaderboards,
per-player profiles (accuracy by subject, mastery, streaks),
and game-monitoring summary. Prints a clean report.
"""
import json, urllib.request, urllib.error, sqlite3
from datetime import datetime

B = "http://localhost:8001"

def call(m, p, tok=None):
    req = urllib.request.Request(B + p, headers={"Content-Type": "application/json"}, method=m)
    if tok:
        req.add_header("Authorization", f"Bearer {tok}")
    try:
        r = urllib.request.urlopen(req, timeout=20)
        return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode(errors="ignore"))

def main():
    st, body = call("POST", "/admin/token", None)  # needs creds; set below
    # login as admin
    st, a = call("POST", "/admin/token")
    # The token endpoint expects JSON body; do it inline:
    import urllib.request as u
    req = u.Request(B + "/admin/token", data=json.dumps({"username":"admin","password":"Admin@1234"}).encode(),
                    headers={"Content-Type":"application/json"}, method="POST")
    AT = json.loads(u.urlopen(req).read())["access_token"]

    def A(p): return call("GET", p, AT)[1]

    d = A("/admin/dashboard")
    print("=" * 64)
    print("ADMIN DASHBOARD SUMMARY")
    print("=" * 64)
    for k in ["registered_users","active_players","online_players","total_questions",
              "active_questions","schools","games_played"]:
        print(f"  {k:20}: {d.get(k)}")
    print(f"  avg_accuracy        : {d.get('avg_accuracy')}")

    print("\n" + "=" * 64)
    print("LEADERBOARDS (top 10)")
    print("=" * 64)
    for scope in ["global","daily","weekly","monthly"]:
        rows = A(f"/admin/leaderboard?scope={scope}&limit=10")
        print(f"\n--- {scope.upper()} ---")
        for r in rows[:10]:
            print(f"  {r['rank']:2}. {r['nickname']:<12} {r['class_level']:<3} "
                  f"{r['lifetime_score']:>5} pts  {r['accuracy']*100:5.1f}%")

    # per-player detail for the simulated humans
    print("\n" + "=" * 64)
    print("PLAYER PROFILES (simulated humans)")
    print("=" * 64)
    users = A("/admin/users?limit=100")
    sim = [u for u in users if u["nickname"] in
           {"Kofi_G","Ama_T","Yaw_M","Esi_K","Kojo_B","Akua_S","Kwame_A","Adwoa_N","Yaa_P","Osei_D"}]
    for u in sorted(sim, key=lambda x: -x["lifetime_score"]):
        det = A(f"/admin/users/{u['id']}")
        print(f"\n  {det['nickname']} ({det['class_level']})  school: {det.get('school') or '-'}")
        print(f"    games={det['games_played']}  Q={det['total_questions']}  "
              f"correct={det['total_correct']}  acc={det['accuracy']*100:.1f}%  "
              f"score={det['lifetime_score']}  streak={det['current_streak']}/{det['longest_streak']}")
        print(f"    subjects: " + ", ".join(f"{s['subject']} {s['accuracy']*100:.0f}%" for s in det.get('subject_accuracy',[])))
        print(f"    mastered topics: {det.get('mastered_count',0)} | history rows: {len(det.get('games',[]))}")

    # monitoring summary
    m = A("/admin/monitor")
    print("\n" + "=" * 64)
    print("GAME MONITORING")
    print("=" * 64)
    for k in ["active_games","completed_games","abandoned_games","players_currently_playing"]:
        print(f"  {k:28}: {m.get(k)}")

if __name__ == "__main__":
    main()

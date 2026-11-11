"""XP levels + weekly leagues (engagement upgrade Group B).

Pure functions over integer points — no DB access, shared by the progress
payload (Profile), the quiz submit response (Summary) and badge evaluation.

Level thresholds are cumulative lifetime points: level n starts at
100 * n * (n-1) / 2 points (1 → 0, 2 → 100, 3 → 300, … 10 → 4500).
Leagues bucket a player's CURRENT-WEEK points (LeaderboardPeriod weekly).
"""

# (level, threshold_points, name, icon)
LEVELS = [
    (1, 0, "Spark", "🌱"),
    (2, 100, "Star", "⭐"),
    (3, 300, "Achiever", "🎯"),
    (4, 600, "Scholar", "📚"),
    (5, 1000, "Whiz Kid", "🧠"),
    (6, 1500, "Mastermind", "🎓"),
    (7, 2100, "Champion", "🏆"),
    (8, 2800, "Legend", "🌟"),
    (9, 3600, "Titan", "🚀"),
    (10, 4500, "Kwiz Master", "👑"),
]

# (name, threshold_weekly_points, icon)
LEAGUES = [
    ("Bronze", 0, "🥉"),
    ("Silver", 100, "🥈"),
    ("Gold", 300, "🥇"),
    ("Platinum", 700, "💠"),
    ("Diamond", 1500, "💎"),
]


def level_info(points: int) -> dict:
    """Map a lifetime point total to its level, progress and next threshold."""
    pts = max(int(points or 0), 0)
    current = LEVELS[0]
    for entry in LEVELS:
        if pts >= entry[1]:
            current = entry
        else:
            break
    idx = current[0] - 1
    nxt = LEVELS[idx + 1] if idx + 1 < len(LEVELS) else None
    if nxt is None:
        progress = 1.0
        points_to_next = 0
        next_threshold = None
    else:
        span = nxt[1] - current[1]
        progress = (pts - current[1]) / span if span > 0 else 0.0
        points_to_next = nxt[1] - pts
        next_threshold = nxt[1]
    return {
        "level": current[0],
        "name": current[2],
        "icon": current[3],
        "points": pts,
        "threshold": current[1],
        "next_threshold": next_threshold,
        "points_to_next": points_to_next,
        "progress": round(progress, 4),  # 0..1 within the current level
        "max_level": len(LEVELS),
    }


def league_info(weekly_points: int) -> dict:
    """Map this week's points to a league, with the next promotion target."""
    pts = max(int(weekly_points or 0), 0)
    current = LEAGUES[0]
    for entry in LEAGUES:
        if pts >= entry[1]:
            current = entry
        else:
            break
    idx = LEAGUES.index(current)
    nxt = LEAGUES[idx + 1] if idx + 1 < len(LEAGUES) else None
    return {
        "name": current[0],
        "icon": current[2],
        "weekly_points": pts,
        "threshold": current[1],
        "next_name": nxt[0] if nxt else None,
        "next_threshold": nxt[1] if nxt else None,
        "points_to_next": (nxt[1] - pts) if nxt else 0,
    }

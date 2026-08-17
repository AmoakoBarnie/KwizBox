"""Period helpers for leaderboard rollover (no deletes — buckets roll by period id)."""
from datetime import date, datetime


def week_period(d: date | datetime | None = None) -> str:
    """ISO week id, e.g. '2026-W34'."""
    if d is None:
        d = date.today()
    if isinstance(d, datetime):
        d = d.date()
    iso = d.isocalendar()
    return f"{iso[0]}-W{iso[1]:02d}"


def month_period(d: date | datetime | None = None) -> str:
    """Month id, e.g. '2026-08'."""
    if d is None:
        d = date.today()
    if isinstance(d, datetime):
        d = d.date()
    return f"{d.year}-{d.month:02d}"

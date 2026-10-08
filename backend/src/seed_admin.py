"""Idempotent seed of the initial super-admin account.

Reads ADMIN_PASSWORD from environment. Crashes if missing — no defaults
are shipped so no credential can be guessed from the codebase.

Env overrides:
  ADMIN_USERNAME  (default: admin)
  ADMIN_PASSWORD  (required — no default)
  ADMIN_FULLNAME  (default: Super Admin)
"""
import os
import sys

from sqlalchemy import func
from .database import SessionLocal
from .models import AdminUser
from .auth import hash_password


def seed_super_admin():
    username = os.environ.get("ADMIN_USERNAME", "admin")
    password = os.environ.get("ADMIN_PASSWORD")
    if not password:
        print("[seed] ERROR: ADMIN_PASSWORD env var is required. Refusing to seed with a default.", file=sys.stderr)
        sys.exit(1)
    fullname = os.environ.get("ADMIN_FULLNAME", "Super Admin")
    db = SessionLocal()
    try:
        exists = db.query(func.count(AdminUser.id)).filter(AdminUser.username == username).scalar()
        if exists:
            return
        db.add(AdminUser(
            username=username,
            full_name=fullname,
            password_hash=hash_password(password),
            role="super_admin",
            is_active=True,
        ))
        db.commit()
        print(f"[seed] super-admin '{username}' created (change password before production!)")
    finally:
        db.close()
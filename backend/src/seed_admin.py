"""Idempotent seed of the initial super-admin account.

Creates a super-admin on first startup if none exists. Credentials are read
from env vars with safe dev defaults. CHANGE THESE before any public deploy.

Env overrides:
  ADMIN_USERNAME  (default: admin)
  ADMIN_PASSWORD  (default: Admin@1234)
  ADMIN_FULLNAME  (default: Super Admin)
"""
import os
from sqlalchemy import func
from .database import SessionLocal
from .models import AdminUser
from .auth import hash_password


def seed_super_admin():
    username = os.environ.get("ADMIN_USERNAME", "admin")
    password = os.environ.get("ADMIN_PASSWORD", "Admin@1234")
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

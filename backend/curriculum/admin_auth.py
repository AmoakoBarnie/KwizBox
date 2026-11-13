"""Admin token helper for the curriculum scripts.

Credentials are read from the environment — never hardcode them in scripts:

    KWIZBOX_ADMIN_USERNAME   default: admin
    KWIZBOX_ADMIN_PASSWORD   required

Run the scripts from this directory (or with it on sys.path), e.g.:

    KWIZBOX_ADMIN_PASSWORD='…' python check_topics.py
"""
import os

import requests

BASE = os.environ.get("KWIZBOX_API", "http://localhost:8001")


def admin_token(timeout=5):
    username = os.environ.get("KWIZBOX_ADMIN_USERNAME", "admin")
    password = os.environ.get("KWIZBOX_ADMIN_PASSWORD")
    if not password:
        raise SystemExit("Set KWIZBOX_ADMIN_PASSWORD before running this script.")
    response = requests.post(
        f"{BASE}/admin/token",
        json={"username": username, "password": password},
        timeout=timeout,
    )
    response.raise_for_status()
    return response.json()["access_token"]

"""Deployment middleware regression tests (Fly.io proxy handling)."""
import asyncio

from src.middleware import FlyClientIPMiddleware


def _run(scope, seen):
    async def app(new_scope, receive, send):
        seen.update(new_scope)

    asyncio.run(FlyClientIPMiddleware(app)(scope, None, None))


def test_fly_client_ip_and_scheme_override_proxy_address():
    seen = {}
    scope = {
        "type": "http",
        "scheme": "http",
        "client": ("172.16.0.2", 12345),
        "headers": [
            (b"fly-client-ip", b"203.0.113.9"),
            (b"x-forwarded-proto", b"https"),
        ],
    }
    _run(scope, seen)
    assert seen["client"] == ("203.0.113.9", 0)
    assert seen["scheme"] == "https"


def test_missing_fly_header_keeps_proxy_address():
    seen = {}
    scope = {
        "type": "http",
        "scheme": "http",
        "client": ("172.16.0.2", 12345),
        "headers": [],
    }
    _run(scope, seen)
    assert seen["client"] == ("172.16.0.2", 12345)
    assert seen["scheme"] == "http"


def test_invalid_fly_header_is_ignored():
    seen = {}
    scope = {
        "type": "http",
        "scheme": "http",
        "client": ("172.16.0.2", 12345),
        "headers": [(b"fly-client-ip", b"not-an-ip")],
    }
    _run(scope, seen)
    assert seen["client"] == ("172.16.0.2", 12345)

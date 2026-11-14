"""ASGI middleware for deployments behind the Fly.io edge proxy.

Fly's proxy overwrites `Fly-Client-IP` on every public request. Without this
middleware every visitor looks like the proxy's private-network address, which
would put all users in one shared rate-limit bucket and record a useless
`last_ip`. We only trust the header when it is present and parses as an IP.
"""
from __future__ import annotations

import ipaddress
from typing import Any


class FlyClientIPMiddleware:
    def __init__(self, app: Any) -> None:
        self.app = app

    async def __call__(self, scope: dict, receive: Any, send: Any) -> None:
        if scope.get("type") in ("http", "websocket"):
            headers = dict(scope.get("headers") or [])
            raw_ip = headers.get(b"fly-client-ip")
            if raw_ip:
                try:
                    client_ip = str(ipaddress.ip_address(raw_ip.decode("latin-1").strip()))
                except ValueError:
                    pass
                else:
                    scope["client"] = (client_ip, 0)
                    proto = headers.get(b"x-forwarded-proto")
                    if proto:
                        scheme = proto.decode("latin-1").strip().lower()
                        if scheme in ("http", "https"):
                            scope["scheme"] = (
                                scheme.replace("http", "ws")
                                if scope["type"] == "websocket"
                                else scheme
                            )
        await self.app(scope, receive, send)

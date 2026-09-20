"""Shared slowapi rate limiter — single instance imported by all route files,
so @limiter.limit() decorators and app.state.limiter refer to the SAME object."""
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

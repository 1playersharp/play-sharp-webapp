"""Shared backend infrastructure: env loading, MongoDB connection, rate limiter, logger."""

import os
import logging
from pathlib import Path

from dotenv import load_dotenv
from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")


def _client_key(request: Request) -> str:
    """Use the first IP from X-Forwarded-For (real client) so rate limiting
    works behind k8s/ingress proxies. Falls back to the direct peer address."""
    fwd = request.headers.get("x-forwarded-for", "")
    if fwd:
        return fwd.split(",")[0].strip()
    return get_remote_address(request)


limiter = Limiter(key_func=_client_key, default_limits=[])

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("playsharp")


GAME_TYPES = {"reaction", "decision", "scanning"}

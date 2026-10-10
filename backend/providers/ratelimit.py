"""Tiny in-process sliding-window rate limiter.

Connect / test / inventory each make outbound requests with user-supplied credentials and endpoints, so they are
capped per user. In-memory means the cap is per worker process, which is enough to blunt abuse of those calls.
"""
from __future__ import annotations

import time
from collections import deque
from typing import Callable, Deque, Dict


class RateLimiter:
    def __init__(self, limit: int, window_seconds: float = 60.0, clock: Callable[[], float] = time.monotonic):
        self.limit = limit
        self.window = window_seconds
        self._clock = clock
        self._events: Dict[str, Deque[float]] = {}

    def check(self, key: str) -> float:
        """Record one event for ``key``. Returns 0 when allowed, else the seconds to wait before retrying."""
        now = self._clock()
        events = self._events.setdefault(key, deque())
        while events and now - events[0] >= self.window:
            events.popleft()
        if len(events) >= self.limit:
            return max(self.window - (now - events[0]), 0.001)
        events.append(now)
        if len(self._events) > 10_000:  # opportunistic cleanup of idle keys
            for k in [k for k, v in self._events.items() if not v or now - v[-1] >= self.window]:
                self._events.pop(k, None)
        return 0.0

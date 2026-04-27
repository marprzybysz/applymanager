from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from threading import Lock
from time import monotonic


@dataclass(frozen=True)
class RateLimitDecision:
    allowed: bool
    retry_after_seconds: int


class FixedWindowRateLimiter:
    def __init__(self, max_requests: int, window_seconds: int, max_keys: int = 5000) -> None:
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.max_keys = max_keys
        self._events: dict[str, deque[float]] = {}
        self._lock = Lock()

    def check(self, key: str) -> RateLimitDecision:
        now = monotonic()
        boundary = now - self.window_seconds

        with self._lock:
            if len(self._events) > self.max_keys:
                self._evict_stale_keys(boundary)
            events = self._events.setdefault(key, deque())
            while events and events[0] <= boundary:
                events.popleft()

            if len(events) >= self.max_requests:
                retry_after = max(1, int(self.window_seconds - (now - events[0])))
                return RateLimitDecision(allowed=False, retry_after_seconds=retry_after)

            events.append(now)
            return RateLimitDecision(allowed=True, retry_after_seconds=0)

    def _evict_stale_keys(self, boundary: float) -> None:
        stale = [ip for ip, events in self._events.items() if not events or events[-1] <= boundary]
        for ip in stale:
            self._events.pop(ip, None)

        if len(self._events) <= self.max_keys:
            return

        overflow = len(self._events) - self.max_keys
        for ip in sorted(self._events, key=lambda item: self._events[item][-1] if self._events[item] else -1.0)[:overflow]:
            self._events.pop(ip, None)

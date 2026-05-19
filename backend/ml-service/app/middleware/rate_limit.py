from fastapi import Request, HTTPException, status
from collections import defaultdict
import time

# Simple in-memory rate limiter — replace with Redis in production
_request_counts: dict = defaultdict(list)
MAX_REQUESTS = 100
WINDOW_SECONDS = 60

async def rate_limit_middleware(request: Request, call_next):
    client_ip = request.client.host
    now = time.time()
    window_start = now - WINDOW_SECONDS

    # Clean old requests
    _request_counts[client_ip] = [
        t for t in _request_counts[client_ip] if t > window_start
    ]

    if len(_request_counts[client_ip]) >= MAX_REQUESTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded",
        )

    _request_counts[client_ip].append(now)
    return await call_next(request)

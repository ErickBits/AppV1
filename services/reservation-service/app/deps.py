import asyncio
import os
import ssl

import asyncpg
import jwt
import redis.asyncio as aioredis
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

DATABASE_URL = os.environ["DATABASE_URL"]
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
JWT_SECRET = os.environ["JWT_SECRET"]

CACHE_VERSION_KEY = "books:cache_version"

SCHEMA = """
CREATE TABLE IF NOT EXISTS reservations (
    id           SERIAL PRIMARY KEY,
    user_id      INTEGER NOT NULL,
    user_email   TEXT,
    book_id      INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    status       TEXT NOT NULL CHECK (status IN ('active', 'waiting', 'returned', 'cancelled')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    activated_at TIMESTAMPTZ,
    due_at       TIMESTAMPTZ,
    closed_at    TIMESTAMPTZ
);
-- A user can hold at most one open (active or waiting) reservation per book.
CREATE UNIQUE INDEX IF NOT EXISTS reservations_open_uniq
    ON reservations (user_id, book_id) WHERE status IN ('active', 'waiting');
CREATE INDEX IF NOT EXISTS reservations_user_idx ON reservations (user_id);
CREATE INDEX IF NOT EXISTS reservations_waiting_idx ON reservations (book_id, created_at) WHERE status = 'waiting';
"""


async def create_pool() -> asyncpg.Pool:
    ssl_ctx = None
    if os.getenv("DATABASE_SSL") == "true":
        ssl_ctx = ssl.create_default_context()
        ssl_ctx.check_hostname = False
        ssl_ctx.verify_mode = ssl.CERT_NONE
    for attempt in range(1, 11):
        try:
            return await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=5, ssl=ssl_ctx)
        except (OSError, asyncpg.PostgresError) as exc:
            if attempt == 10:
                raise
            print(f"DB not ready (attempt {attempt}): {exc}")
            await asyncio.sleep(3)


def create_redis() -> aioredis.Redis:
    return aioredis.from_url(REDIS_URL, decode_responses=True)


def get_db(request: Request) -> asyncpg.Pool:
    return request.app.state.db


def get_redis(request: Request) -> aioredis.Redis:
    return request.app.state.redis


_bearer = HTTPBearer(auto_error=False)


def current_user(creds: HTTPAuthorizationCredentials | None = Depends(_bearer)) -> dict:
    if creds is None:
        raise HTTPException(401, "Missing bearer token")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid or expired token")
    return {"id": int(payload["sub"]), "email": payload.get("email"), "role": payload.get("role", "user")}


def require_admin(user: dict = Depends(current_user)) -> dict:
    if user["role"] != "admin":
        raise HTTPException(403, "Admin role required")
    return user

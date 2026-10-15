import asyncio
from contextlib import asynccontextmanager
from datetime import timedelta

import asyncpg
from fastapi import Depends, FastAPI, HTTPException, Query
from pydantic import BaseModel

from .deps import (
    CACHE_VERSION_KEY,
    SCHEMA,
    create_pool,
    create_redis,
    current_user,
    get_db,
    get_redis,
    require_admin,
)

LOAN_PERIOD = timedelta(days=14)


def waitlist_key(book_id: int) -> str:
    return f"waitlist:{book_id}"


async def migrate(pool: asyncpg.Pool) -> None:
    # `books` is owned by catalog-service; wait until it has created the table.
    for attempt in range(1, 21):
        if await pool.fetchval("SELECT to_regclass('public.books')"):
            break
        print(f"Waiting for books table (attempt {attempt})")
        await asyncio.sleep(3)
    else:
        raise RuntimeError("books table not found; is catalog-service running?")
    await pool.execute(SCHEMA)


async def rebuild_waitlists(pool: asyncpg.Pool, redis) -> None:
    """PostgreSQL is the source of truth: rebuild every Redis queue from 'waiting' rows."""
    rows = await pool.fetch(
        "SELECT book_id, array_agg(id ORDER BY created_at, id) AS ids FROM reservations "
        "WHERE status = 'waiting' GROUP BY book_id"
    )
    async with redis.pipeline(transaction=True) as pipe:
        async for key in redis.scan_iter(match="waitlist:*"):
            pipe.delete(key)
        for row in rows:
            pipe.rpush(waitlist_key(row["book_id"]), *row["ids"])
        await pipe.execute()
    print(f"Rebuilt {len(rows)} waitlist(s) from PostgreSQL")


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.db = await create_pool()
    app.state.redis = create_redis()
    await migrate(app.state.db)
    await rebuild_waitlists(app.state.db, app.state.redis)
    yield
    await app.state.db.close()
    await app.state.redis.aclose()


app = FastAPI(
    title="reservation-service",
    lifespan=lifespan,
    docs_url="/api/reservations/docs",
    openapi_url="/api/reservations/openapi.json",
)


class ReservationIn(BaseModel):
    book_id: int


def serialize(row: asyncpg.Record) -> dict:
    out = dict(row)
    for key, value in out.items():
        if hasattr(value, "isoformat"):
            out[key] = value.isoformat()
    return out


async def queue_position(redis, book_id: int, reservation_id: int) -> int | None:
    idx = await redis.lpos(waitlist_key(book_id), str(reservation_id))
    return None if idx is None else idx + 1


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/api/reservations", status_code=201)
async def reserve(body: ReservationIn, user=Depends(current_user), db=Depends(get_db), redis=Depends(get_redis)):
    pushed_id = None
    try:
        async with db.acquire() as conn, conn.transaction():
            # Row lock serializes every reserve/return on this book.
            book = await conn.fetchrow(
                "SELECT id, title, available_copies FROM books WHERE id = $1 FOR UPDATE", body.book_id
            )
            if not book:
                raise HTTPException(404, "Libro no encontrado")

            if book["available_copies"] > 0:
                await conn.execute(
                    "UPDATE books SET available_copies = available_copies - 1, updated_at = now() WHERE id = $1",
                    book["id"],
                )
                row = await conn.fetchrow(
                    """INSERT INTO reservations (user_id, user_email, book_id, status, activated_at, due_at)
                       VALUES ($1, $2, $3, 'active', now(), now() + $4::interval) RETURNING *""",
                    user["id"], user["email"], book["id"], LOAN_PERIOD,
                )
            else:
                row = await conn.fetchrow(
                    """INSERT INTO reservations (user_id, user_email, book_id, status)
                       VALUES ($1, $2, $3, 'waiting') RETURNING *""",
                    user["id"], user["email"], book["id"],
                )
                # Enqueue while still holding the book lock so a concurrent return can't miss us.
                await redis.rpush(waitlist_key(book["id"]), row["id"])
                pushed_id = row["id"]
    except asyncpg.UniqueViolationError:
        raise HTTPException(409, "Ya tienes una reserva activa o en espera para este libro")
    except BaseException:
        if pushed_id is not None:
            await redis.lrem(waitlist_key(body.book_id), 0, str(pushed_id))
        raise

    result = serialize(row) | {"book_title": book["title"]}
    if row["status"] == "active":
        await redis.incr(CACHE_VERSION_KEY)
        result["position"] = None
    else:
        result["position"] = await queue_position(redis, row["book_id"], row["id"])
    return result


@app.get("/api/reservations/me")
async def my_reservations(user=Depends(current_user), db=Depends(get_db), redis=Depends(get_redis)):
    rows = await db.fetch(
        """SELECT r.*, b.title AS book_title, b.author AS book_author, b.cover_url AS book_cover_url
           FROM reservations r JOIN books b ON b.id = r.book_id
           WHERE r.user_id = $1
           ORDER BY (r.status IN ('active', 'waiting')) DESC, r.created_at DESC""",
        user["id"],
    )
    out = []
    for row in rows:
        item = serialize(row)
        item["position"] = (
            await queue_position(redis, row["book_id"], row["id"]) if row["status"] == "waiting" else None
        )
        out.append(item)
    return out


@app.get("/api/reservations", dependencies=[Depends(require_admin)])
async def all_reservations(
    status: str | None = Query(None, pattern="^(active|waiting|returned|cancelled)$"),
    limit: int = Query(100, ge=1, le=500),
    db=Depends(get_db),
):
    rows = await db.fetch(
        """SELECT r.*, b.title AS book_title FROM reservations r JOIN books b ON b.id = r.book_id
           WHERE ($1::text IS NULL OR r.status = $1) ORDER BY r.created_at DESC LIMIT $2""",
        status, limit,
    )
    return [serialize(r) for r in rows]


async def _load_owned(db, reservation_id: int, user: dict) -> asyncpg.Record:
    row = await db.fetchrow("SELECT * FROM reservations WHERE id = $1", reservation_id)
    if not row or (row["user_id"] != user["id"] and user["role"] != "admin"):
        raise HTTPException(404, "Reserva no encontrada")
    return row


@app.post("/api/reservations/{reservation_id}/return")
async def return_book(reservation_id: int, user=Depends(current_user), db=Depends(get_db), redis=Depends(get_redis)):
    res = await _load_owned(db, reservation_id, user)
    key = waitlist_key(res["book_id"])
    promoted = None
    try:
        async with db.acquire() as conn, conn.transaction():
            # Same lock order as reserve(): book first, then reservation rows.
            await conn.execute("SELECT 1 FROM books WHERE id = $1 FOR UPDATE", res["book_id"])
            returned = await conn.fetchrow(
                """UPDATE reservations SET status = 'returned', closed_at = now()
                   WHERE id = $1 AND status = 'active' RETURNING *""",
                reservation_id,
            )
            if not returned:
                raise HTTPException(409, "Solo se pueden devolver reservas activas")

            # Hand the copy straight to the next valid user in the queue (skip stale ids).
            while (next_id := await redis.lpop(key)) is not None:
                promoted = await conn.fetchrow(
                    """UPDATE reservations SET status = 'active', activated_at = now(), due_at = now() + $2::interval
                       WHERE id = $1 AND status = 'waiting' RETURNING *""",
                    int(next_id), LOAN_PERIOD,
                )
                if promoted:
                    break

            if not promoted:
                await conn.execute(
                    "UPDATE books SET available_copies = available_copies + 1, updated_at = now() WHERE id = $1",
                    res["book_id"],
                )
    except BaseException:
        if promoted is not None:
            await redis.lpush(key, promoted["id"])  # transaction rolled back: restore queue head
        raise

    if not promoted:
        await redis.incr(CACHE_VERSION_KEY)
    return {
        "returned": serialize(returned),
        "promoted_reservation_id": promoted["id"] if promoted else None,
    }


@app.delete("/api/reservations/{reservation_id}")
async def cancel_waiting(reservation_id: int, user=Depends(current_user), db=Depends(get_db), redis=Depends(get_redis)):
    res = await _load_owned(db, reservation_id, user)
    row = await db.fetchrow(
        """UPDATE reservations SET status = 'cancelled', closed_at = now()
           WHERE id = $1 AND status = 'waiting' RETURNING *""",
        reservation_id,
    )
    if not row:
        raise HTTPException(409, "Solo se pueden cancelar reservas en espera")
    await redis.lrem(waitlist_key(res["book_id"]), 0, str(reservation_id))
    return serialize(row)

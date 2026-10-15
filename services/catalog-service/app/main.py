import json
from contextlib import asynccontextmanager

import asyncpg
from fastapi import Depends, FastAPI, HTTPException, Query, Response
from pydantic import BaseModel, Field, HttpUrl

from .deps import (
    CACHE_VERSION_KEY,
    SCHEMA,
    create_pool,
    create_redis,
    get_db,
    get_redis,
    require_admin,
)

CACHE_TTL = 120


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.db = await create_pool()
    app.state.redis = create_redis()
    async with app.state.db.acquire() as conn:
        await conn.execute(SCHEMA)
    yield
    await app.state.db.close()
    await app.state.redis.aclose()


app = FastAPI(title="catalog-service", lifespan=lifespan, docs_url="/api/books/docs", openapi_url="/api/books/openapi.json")


class BookIn(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    author: str = Field(min_length=1, max_length=200)
    year: int | None = Field(default=None, ge=-3000, le=2100)
    genre: str | None = Field(default=None, max_length=80)
    description: str | None = Field(default=None, max_length=5000)
    cover_url: HttpUrl | None = None
    total_copies: int = Field(ge=1, le=5)


class BookPatch(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=300)
    author: str | None = Field(default=None, min_length=1, max_length=200)
    year: int | None = Field(default=None, ge=-3000, le=2100)
    genre: str | None = Field(default=None, max_length=80)
    description: str | None = Field(default=None, max_length=5000)
    cover_url: HttpUrl | None = None
    total_copies: int | None = Field(default=None, ge=1, le=5)


def row_to_book(row: asyncpg.Record) -> dict:
    book = dict(row)
    for key in ("created_at", "updated_at"):
        book[key] = book[key].isoformat()
    return book


async def invalidate_cache(redis) -> None:
    await redis.incr(CACHE_VERSION_KEY)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/api/books")
async def list_books(
    q: str = Query("", max_length=100),
    genre: str = Query("", max_length=80),
    page: int = Query(1, ge=1),
    limit: int = Query(24, ge=1, le=100),
    db=Depends(get_db),
    redis=Depends(get_redis),
):
    version = await redis.get(CACHE_VERSION_KEY) or "0"
    cache_key = f"books:v{version}:{q.lower()}:{genre.lower()}:{page}:{limit}"
    if cached := await redis.get(cache_key):
        return Response(cached, media_type="application/json", headers={"X-Cache": "HIT"})

    where, args = [], []
    if q:
        args.append(f"%{q.lower()}%")
        where.append(f"(lower(title) LIKE ${len(args)} OR lower(author) LIKE ${len(args)})")
    if genre:
        args.append(genre.lower())
        where.append(f"lower(genre) = ${len(args)}")
    where_sql = f"WHERE {' AND '.join(where)}" if where else ""

    total = await db.fetchval(f"SELECT count(*) FROM books {where_sql}", *args)
    args += [limit, (page - 1) * limit]
    rows = await db.fetch(
        f"SELECT * FROM books {where_sql} ORDER BY title LIMIT ${len(args) - 1} OFFSET ${len(args)}", *args
    )
    body = json.dumps({"items": [row_to_book(r) for r in rows], "total": total, "page": page, "limit": limit})
    await redis.setex(cache_key, CACHE_TTL, body)
    return Response(body, media_type="application/json", headers={"X-Cache": "MISS"})


@app.get("/api/books/genres")
async def list_genres(db=Depends(get_db)):
    rows = await db.fetch("SELECT DISTINCT genre FROM books WHERE genre IS NOT NULL ORDER BY genre")
    return [r["genre"] for r in rows]


@app.get("/api/books/{book_id}")
async def get_book(book_id: int, db=Depends(get_db)):
    row = await db.fetchrow("SELECT * FROM books WHERE id = $1", book_id)
    if not row:
        raise HTTPException(404, "Libro no encontrado")
    return row_to_book(row)


@app.post("/api/books", status_code=201, dependencies=[Depends(require_admin)])
async def create_book(book: BookIn, db=Depends(get_db), redis=Depends(get_redis)):
    try:
        row = await db.fetchrow(
            """INSERT INTO books (title, author, year, genre, description, cover_url, total_copies, available_copies)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $7) RETURNING *""",
            book.title, book.author, book.year, book.genre, book.description,
            str(book.cover_url) if book.cover_url else None, book.total_copies,
        )
    except asyncpg.UniqueViolationError:
        raise HTTPException(409, "Ya existe un libro con ese título y autor")
    await invalidate_cache(redis)
    return row_to_book(row)


@app.put("/api/books/{book_id}", dependencies=[Depends(require_admin)])
async def update_book(book_id: int, patch: BookPatch, db=Depends(get_db), redis=Depends(get_redis)):
    changes = patch.model_dump(exclude_unset=True)
    if "cover_url" in changes and changes["cover_url"] is not None:
        changes["cover_url"] = str(changes["cover_url"])

    async with db.acquire() as conn, conn.transaction():
        current = await conn.fetchrow("SELECT * FROM books WHERE id = $1 FOR UPDATE", book_id)
        if not current:
            raise HTTPException(404, "Libro no encontrado")

        if "total_copies" in changes:
            # Keep borrowed copies consistent: available shifts by the same delta as total.
            new_available = current["available_copies"] + changes["total_copies"] - current["total_copies"]
            if new_available < 0:
                borrowed = current["total_copies"] - current["available_copies"]
                raise HTTPException(409, f"Hay {borrowed} copias prestadas; no se puede bajar el total a {changes['total_copies']}")
            changes["available_copies"] = new_available

        if not changes:
            return row_to_book(current)

        cols = list(changes)
        set_sql = ", ".join(f"{col} = ${i}" for i, col in enumerate(cols, start=2))
        try:
            row = await conn.fetchrow(
                f"UPDATE books SET {set_sql}, updated_at = now() WHERE id = $1 RETURNING *",
                book_id, *changes.values(),
            )
        except asyncpg.UniqueViolationError:
            raise HTTPException(409, "Ya existe un libro con ese título y autor")
    await invalidate_cache(redis)
    return row_to_book(row)


@app.delete("/api/books/{book_id}", status_code=204, dependencies=[Depends(require_admin)])
async def delete_book(book_id: int, db=Depends(get_db), redis=Depends(get_redis)):
    async with db.acquire() as conn, conn.transaction():
        book = await conn.fetchrow("SELECT * FROM books WHERE id = $1 FOR UPDATE", book_id)
        if not book:
            raise HTTPException(404, "Libro no encontrado")
        # A waitlist only exists when every copy is out, so this check also covers queued users.
        if book["available_copies"] < book["total_copies"]:
            raise HTTPException(409, "El libro tiene copias prestadas; espera a que se devuelvan")
        await conn.execute("DELETE FROM books WHERE id = $1", book_id)
    await invalidate_cache(redis)
    return Response(status_code=204)

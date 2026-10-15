"""End-to-end API test. Usage: python3 tests/e2e.py [BASE_URL]
Creates its own users/books; admin credentials from ADMIN_EMAIL / ADMIN_PASSWORD env."""
import json, os, urllib.request, urllib.error, sys, uuid
B = (sys.argv[1] if len(sys.argv) > 1 and sys.argv[1] else "http://localhost:8080").rstrip("/")
def call(m, p, body=None, tok=None):
    req = urllib.request.Request(B+p, method=m, data=json.dumps(body).encode() if body is not None else None)
    req.add_header("Content-Type", "application/json")
    if tok: req.add_header("Authorization", f"Bearer {tok}")
    try:
        with urllib.request.urlopen(req) as r:
            raw = r.read(); return r.status, (json.loads(raw) if raw else None), r.headers.get("X-Cache")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b"null"), None
def ok(cond, msg): print(("PASS " if cond else "FAIL ") + msg); cond or sys.exit(1)

u = uuid.uuid4().hex[:6]
s, a, _ = call("POST", "/api/auth/register", {"email": f"a{u}@t.io", "password": "password1", "name": "Ana"}); ok(s == 201, f"register A {s}")
s, b, _ = call("POST", "/api/auth/register", {"email": f"b{u}@t.io", "password": "password1", "name": "Beto"}); ok(s == 201, "register B")
s, _, _ = call("POST", "/api/auth/register", {"email": f"a{u}@t.io", "password": "password1", "name": "Ana"}); ok(s == 409, "duplicate email 409")
s, _, _ = call("POST", "/api/auth/login", {"email": f"a{u}@t.io", "password": "wrong"}); ok(s == 401, "bad login 401")
s, adm, _ = call("POST", "/api/auth/login", {"email": os.getenv("ADMIN_EMAIL", "admin@biblioteca.dev"), "password": os.getenv("ADMIN_PASSWORD", "admin12345")}); ok(s == 200 and adm["user"]["role"] == "admin", "admin login")
A, Bt, ADM = a["token"], b["token"], adm["token"]
s, me, _ = call("PUT", "/api/auth/me", {"name": "Ana María"}, A); ok(s == 200 and me["user"]["name"] == "Ana María", "profile update")
s, _, _ = call("PUT", "/api/auth/me", {"password": "newpass123", "current_password": "nope"}, A); ok(s == 403, "pwd change needs current pwd")

s, _, _ = call("POST", "/api/books", {"title": "X", "author": "Y", "total_copies": 1}, A); ok(s == 403, "non-admin create 403")
s, book, _ = call("POST", "/api/books", {"title": f"Libro {u}", "author": "Test", "total_copies": 1, "genre": "Test"}, ADM); ok(s == 201, "admin create")
bid = book["id"]
_, _, c1 = call("GET", f"/api/books?q={u}"); _, l, c2 = call("GET", f"/api/books?q={u}"); ok(c1 == "MISS" and c2 == "HIT" and l["total"] == 1, f"cache miss→hit ({c1},{c2})")

s, ra, _ = call("POST", "/api/reservations", {"book_id": bid}, A); ok(s == 201 and ra["status"] == "active", "A reserves → active")
_, l, c3 = call("GET", f"/api/books?q={u}"); ok(c3 == "MISS" and l["items"][0]["available_copies"] == 0, "cache invalidated, available=0")
s, _, _ = call("POST", "/api/reservations", {"book_id": bid}, A); ok(s == 409, "A double reserve 409")
s, rb, _ = call("POST", "/api/reservations", {"book_id": bid}, Bt); ok(s == 201 and rb["status"] == "waiting" and rb["position"] == 1, f"B → waiting pos {rb.get('position')}")
s, _, _ = call("PUT", f"/api/books/{bid}", {"total_copies": 0}, ADM); ok(s == 422, "total_copies 0 rejected")
s, _, _ = call("DELETE", f"/api/books/{bid}", None, ADM); ok(s == 409, "delete with loans 409")
s, _, _ = call("POST", f"/api/reservations/{ra['id']}/return", None, Bt); ok(s == 404, "B cannot return A's loan")
s, ret, _ = call("POST", f"/api/reservations/{ra['id']}/return", None, A); ok(s == 200 and ret["promoted_reservation_id"] == rb["id"], "A returns → B promoted")
_, mine, _ = call("GET", "/api/reservations/me", None, Bt); ok(mine[0]["status"] == "active", "B now active")
_, bk, _ = call("GET", f"/api/books/{bid}"); ok(bk["available_copies"] == 0, "copy passed directly (available still 0)")
s, _, _ = call("POST", f"/api/reservations/{rb['id']}/return", None, Bt); ok(s == 200, "B returns")
_, bk, _ = call("GET", f"/api/books/{bid}"); ok(bk["available_copies"] == 1, "empty queue → available=1")
s, upd, _ = call("PUT", f"/api/books/{bid}", {"total_copies": 3}, ADM); ok(s == 200 and upd["available_copies"] == 3, "admin update copies")
# cancel waiting flow
call("PUT", f"/api/books/{bid}", {"total_copies": 1}, ADM)
_, r1, _ = call("POST", "/api/reservations", {"book_id": bid}, A)
_, r2, _ = call("POST", "/api/reservations", {"book_id": bid}, Bt)
s, _, _ = call("DELETE", f"/api/reservations/{r2['id']}", None, Bt); ok(s == 200, "B cancels waiting")
call("POST", f"/api/reservations/{r1['id']}/return", None, A)
_, bk, _ = call("GET", f"/api/books/{bid}"); ok(bk["available_copies"] == 1, "cancelled waiter skipped")
s, _, _ = call("DELETE", f"/api/books/{bid}", None, ADM); ok(s == 204, "admin delete")
print("ALL PASSED")

const TOKEN_KEY = "biblioteca.token";

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY)),
};

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function request(method, path, body) {
  const headers = { Accept: "application/json" };
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    // FastAPI validation errors return detail as an array.
    const detail = Array.isArray(data?.detail) ? data.detail.map((d) => d.msg).join(", ") : data?.detail;
    throw new ApiError(res.status, detail || `Error ${res.status}`);
  }
  return data;
}

export const api = {
  // auth-service
  register: (payload) => request("POST", "/api/auth/register", payload),
  login: (payload) => request("POST", "/api/auth/login", payload),
  me: () => request("GET", "/api/auth/me"),
  updateMe: (payload) => request("PUT", "/api/auth/me", payload),

  // catalog-service
  books: ({ q = "", genre = "", page = 1, limit = 24 } = {}) =>
    request("GET", `/api/books?${new URLSearchParams({ q, genre, page, limit })}`),
  genres: () => request("GET", "/api/books/genres"),
  book: (id) => request("GET", `/api/books/${id}`),
  createBook: (payload) => request("POST", "/api/books", payload),
  updateBook: (id, payload) => request("PUT", `/api/books/${id}`, payload),
  deleteBook: (id) => request("DELETE", `/api/books/${id}`),

  // reservation-service
  reserve: (bookId) => request("POST", "/api/reservations", { book_id: bookId }),
  myReservations: () => request("GET", "/api/reservations/me"),
  returnReservation: (id) => request("POST", `/api/reservations/${id}/return`),
  cancelReservation: (id) => request("DELETE", `/api/reservations/${id}`),
};

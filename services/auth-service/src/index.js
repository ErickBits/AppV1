import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool, migrate } from "./db.js";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_TTL = process.env.JWT_TTL || "8h";
const PORT = Number(process.env.PORT || 3000);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

if (!JWT_SECRET) {
  console.error("JWT_SECRET is required");
  process.exit(1);
}

const app = express();
app.use(express.json({ limit: "100kb" }));

const publicUser = (u) => ({ id: u.id, email: u.email, name: u.name, role: u.role, created_at: u.created_at });
const signToken = (u) => jwt.sign({ sub: String(u.id), email: u.email, role: u.role }, JWT_SECRET, { expiresIn: JWT_TTL });

function requireAuth(req, res, next) {
  const [scheme, token] = (req.headers.authorization || "").split(" ");
  if (scheme !== "Bearer" || !token) return res.status(401).json({ detail: "Missing bearer token" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ detail: "Invalid or expired token" });
  }
}

function validateCredentials({ email, password, name }, { requireName }) {
  if (typeof email !== "string" || !EMAIL_RE.test(email)) return "Email inválido";
  if (typeof password !== "string" || password.length < 8) return "La contraseña debe tener al menos 8 caracteres";
  if (requireName && (typeof name !== "string" || name.trim().length < 2)) return "Nombre inválido";
  return null;
}

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.post("/api/auth/register", async (req, res, next) => {
  try {
    const error = validateCredentials(req.body ?? {}, { requireName: true });
    if (error) return res.status(400).json({ detail: error });
    const { email, password, name } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3)
       ON CONFLICT (email) DO NOTHING RETURNING *`,
      [email.toLowerCase(), name.trim(), hash],
    );
    if (!rows.length) return res.status(409).json({ detail: "El email ya está registrado" });
    res.status(201).json({ token: signToken(rows[0]), user: publicUser(rows[0]) });
  } catch (err) {
    next(err);
  }
});

app.post("/api/auth/login", async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};
    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ detail: "Email y contraseña requeridos" });
    }
    const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ detail: "Credenciales inválidas" });
    }
    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

app.get("/api/auth/me", requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [req.user.sub]);
    if (!rows.length) return res.status(404).json({ detail: "Usuario no encontrado" });
    res.json(publicUser(rows[0]));
  } catch (err) {
    next(err);
  }
});

app.put("/api/auth/me", requireAuth, async (req, res, next) => {
  try {
    const { name, email, password, current_password } = req.body ?? {};
    const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [req.user.sub]);
    const user = rows[0];
    if (!user) return res.status(404).json({ detail: "Usuario no encontrado" });

    const updates = { name: user.name, email: user.email, password_hash: user.password_hash };
    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length < 2) return res.status(400).json({ detail: "Nombre inválido" });
      updates.name = name.trim();
    }
    if (email !== undefined) {
      if (typeof email !== "string" || !EMAIL_RE.test(email)) return res.status(400).json({ detail: "Email inválido" });
      updates.email = email.toLowerCase();
    }
    if (password !== undefined) {
      if (typeof password !== "string" || password.length < 8) {
        return res.status(400).json({ detail: "La contraseña debe tener al menos 8 caracteres" });
      }
      if (typeof current_password !== "string" || !(await bcrypt.compare(current_password, user.password_hash))) {
        return res.status(403).json({ detail: "Contraseña actual incorrecta" });
      }
      updates.password_hash = await bcrypt.hash(password, 10);
    }

    const result = await pool.query(
      `UPDATE users SET name = $1, email = $2, password_hash = $3, updated_at = now()
       WHERE id = $4 RETURNING *`,
      [updates.name, updates.email, updates.password_hash, user.id],
    );
    const updated = result.rows[0];
    res.json({ token: signToken(updated), user: publicUser(updated) });
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ detail: "El email ya está registrado" });
    next(err);
  }
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ detail: "Internal server error" });
});

async function start() {
  for (let attempt = 1; ; attempt++) {
    try {
      await migrate();
      break;
    } catch (err) {
      if (attempt >= 10) throw err;
      console.warn(`DB not ready (attempt ${attempt}): ${err.message}`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  const server = app.listen(PORT, () => console.log(`auth-service listening on :${PORT}`));
  process.on("SIGTERM", () => server.close(() => pool.end().then(() => process.exit(0))));
}

start();

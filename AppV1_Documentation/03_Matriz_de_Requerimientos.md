# 03 · Matriz de Requerimientos

**Prioridad** (MoSCoW): **Alta** = imprescindible para entregar · **Media** = importante · **Baja** = deseable.
**Tipo:** **F** = funcional · **NF** = no funcional (se indica la categoría).
**Estado:** ✅ implementado y verificado en local (ver la sección 4 para saber qué tiene prueba automática) · 🟡 implementado, falta comprobarlo en AWS · ⏳ planificado.

Los nombres de tabla coinciden exactamente con el modelo de datos ([01_Modelado_de_Datos.md](01_Modelado_de_Datos.md)): `users`, `books`, `reservations`. Las claves de Redis se escriben con su patrón (`waitlist:{book_id}`).

## 1. Requisitos funcionales

| ID | Requisito | Prioridad | Tipo | Tabla(s) | Servicio · Endpoint | Estado |
|---|---|---|---|---|---|---|
| RF-01 | El visitante puede registrarse con nombre, email y contraseña | Alta | F | `users` | auth · `POST /api/auth/register` | ✅ |
| RF-02 | El usuario puede iniciar sesión y recibir un JWT | Alta | F | `users` | auth · `POST /api/auth/login` | ✅ |
| RF-03 | El usuario puede consultar sus datos de perfil | Media | F | `users` | auth · `GET /api/auth/me` | ✅ |
| RF-04 | El usuario puede cambiar su nombre, email o contraseña | Media | F | `users` | auth · `PUT /api/auth/me` | ✅ |
| RF-05 | Cualquiera puede ver el catálogo paginado, buscar por título o autor y filtrar por género | Alta | F | `books` | catalog · `GET /api/books` | ✅ |
| RF-06 | El sistema muestra la lista de géneros (secciones) existentes | Media | F | `books` | catalog · `GET /api/books/genres` | ✅ |
| RF-07 | Cualquiera puede ver el detalle y la disponibilidad de un libro | Alta | F | `books` | catalog · `GET /api/books/{id}` | ✅ |
| RF-08 | El administrador puede dar de alta un libro (1 a 5 copias) | Alta | F | `books` | catalog · `POST /api/books` | ✅ |
| RF-09 | El administrador puede editar un libro sin dejar copias prestadas inconsistentes | Alta | F | `books` | catalog · `PUT /api/books/{id}` | ✅ |
| RF-10 | El administrador puede eliminar un libro si no tiene copias prestadas | Media | F | `books`, `reservations` | catalog · `DELETE /api/books/{id}` | ✅ |
| RF-11 | El usuario puede reservar un libro con copias libres y obtener un préstamo de 14 días | Alta | F | `books`, `reservations` | reservation · `POST /api/reservations` | ✅ |
| RF-12 | Si no quedan copias, el usuario entra a una lista de espera y ve su posición | Alta | F | `reservations`, `waitlist:{book_id}` | reservation · `POST /api/reservations` | ✅ |
| RF-13 | Un usuario solo puede tener una reserva abierta (activa o en espera) por libro | Alta | F | `reservations` | reservation · índice `reservations_open_uniq` | ✅ |
| RF-14 | Al devolver, la copia pasa automáticamente al primero de la fila. Si no hay fila, vuelve a estar disponible | Alta | F | `books`, `reservations`, `waitlist:{book_id}` | reservation · `POST /api/reservations/{id}/return` | ✅ |
| RF-15 | El usuario puede salir de la lista de espera | Media | F | `reservations`, `waitlist:{book_id}` | reservation · `DELETE /api/reservations/{id}` | ✅ |
| RF-16 | El usuario puede ver sus reservas con estado, posición en la fila y fecha de vencimiento | Alta | F | `reservations`, `books` | reservation · `GET /api/reservations/me` | ✅ |
| RF-17 | El administrador puede listar todas las reservas, con filtro por estado (solo API, sin pantalla) | Baja | F | `reservations`, `books` | reservation · `GET /api/reservations` | ✅ |
| RF-18 | El sistema crea la cuenta de administrador inicial al arrancar | Alta | F | `users` | auth · `migrate()` con `ADMIN_EMAIL` y `ADMIN_PASSWORD` | ✅ |
| RF-19 | Si un libro no tiene `cover_url`, se muestra una portada generada a partir del título | Baja | F | `books` | frontend · `BookCard` | ✅ |
| RF-20 | Se puede cargar un catálogo inicial de 100 libros | Media | F | `books` | catalog · `app/seed.py` (Job `seed` en k8s) | ✅ |

## 2. Requisitos no funcionales

| ID | Requisito | Prioridad | Tipo | Tabla(s) / Recurso | Implementación | Estado |
|---|---|---|---|---|---|---|
| RNF-01 | Las contraseñas se guardan con hash bcrypt (cost 10) | Alta | NF · Seguridad | `users.password_hash` | `bcryptjs` | ✅ |
| RNF-02 | La autenticación es stateless con JWT HS256 de 8 h y roles `user`/`admin` (401 sin token, 403 sin rol) | Alta | NF · Seguridad | `users.role` | `jsonwebtoken`, `PyJWT` | ✅ |
| RNF-03 | El tráfico público va cifrado con HTTPS (TLS de Let's Encrypt) | Alta | NF · Seguridad | Ingress | Certbot + NGINX Ingress (`docs/TLS.md`) | ⏳ |
| RNF-04 | Todas las entradas se validan: email, longitudes, rangos y cuerpos de máx. 100 kB | Alta | NF · Seguridad | `users`, `books` | Pydantic, `express.json({limit})` | ✅ |
| RNF-05 | No se venden más copias de las que hay, aunque haya peticiones simultáneas | Alta | NF · Integridad | `books`, `reservations` | `SELECT … FOR UPDATE`, `CHECK`, índice único parcial | ✅ |
| RNF-06 | PostgreSQL es la fuente de verdad. Si se pierde Redis, las colas se reconstruyen | Alta | NF · Confiabilidad | `reservations`, `waitlist:{book_id}` | `rebuild_waitlists()` al arrancar | ✅ |
| RNF-07 | El listado del catálogo se sirve desde caché (TTL de 120 s) y se invalida cuando hay cambios | Media | NF · Rendimiento | `books`, `books:cache_version` | Redis, cabecera `X-Cache` | ✅ |
| RNF-08 | El costo de la infraestructura es de unos $12 por semana (presupuesto de $150) | Alta | NF · Costo | AWS | EC2 + K3s, RDS `t3.micro`, AWS Budget | 🟡 |
| RNF-09 | Todo corre en contenedores y se despliega en Kubernetes | Alta | NF · Portabilidad | — | Docker multi-stage, K3s, `k8s/` | 🟡 |
| RNF-10 | Cada servicio expone `/health` para las sondas de Kubernetes | Media | NF · Disponibilidad | — | Liveness y readiness probes | ✅ |
| RNF-11 | Un solo nodo, sin alta disponibilidad (limitación aceptada por costo) | Baja | NF · Disponibilidad | — | `docs/ARCHITECTURE.md` | ✅ |
| RNF-12 | La interfaz es responsiva (móvil a escritorio) y accesible: foco visible, `aria-*`, `prefers-reduced-motion` | Media | NF · Usabilidad | — | Tailwind v4, `index.css` | ✅ |
| RNF-13 | La interfaz y los mensajes de error están en español | Media | NF · Usabilidad | — | Textos de los servicios y del frontend | ✅ |
| RNF-14 | CI corre lint, build y pruebas e2e en cada push | Media | NF · Mantenibilidad | — | GitHub Actions (`ci-cd.yml`) | ✅ |
| RNF-15 | Las APIs de catálogo y reservas están documentadas con OpenAPI/Swagger | Baja | NF · Mantenibilidad | — | `/api/books/docs`, `/api/reservations/docs` | ✅ |

## 3. Trazabilidad requisito ↔ tabla

| Tabla / Clave | Requisitos que la usan |
|---|---|
| `users` | RF-01, RF-02, RF-03, RF-04, RF-18, RNF-01, RNF-02, RNF-04 |
| `books` | RF-05, RF-06, RF-07, RF-08, RF-09, RF-10, RF-11, RF-14, RF-16, RF-17, RF-19, RF-20, RNF-05, RNF-07 |
| `reservations` | RF-10, RF-11, RF-12, RF-13, RF-14, RF-15, RF-16, RF-17, RNF-05, RNF-06 |
| `waitlist:{book_id}` (Redis) | RF-12, RF-14, RF-15, RNF-06 |
| `books:cache_version` (Redis) | RF-08, RF-09, RF-10, RF-11, RF-14, RNF-07 |

## 4. Trazabilidad requisito ↔ prueba

| Requisito | Prueba en `tests/e2e.py` |
|---|---|
| RF-01 | Registro → 201. Email duplicado → 409 |
| RF-02 | Contraseña incorrecta → 401. Login del admin → 200 con `role = admin` |
| RF-04 | Cambiar el nombre → 200. Cambiar la contraseña sin la actual correcta → 403 |
| RF-05, RNF-07 | Misma búsqueda dos veces: `X-Cache` MISS → HIT. Después de reservar, MISS (caché invalidada) |
| RF-07 | `GET /api/books/{id}` para comprobar `available_copies` |
| RF-08, RNF-02 | Usuario normal crea un libro → 403. Admin → 201 |
| RF-09 | `total_copies = 0` → 422. Subir a 3 → `available_copies = 3` |
| RF-10 | Borrar con copias prestadas → 409. Sin préstamos → 204 |
| RF-11 | A reserva → `active` |
| RF-12 | B reserva el mismo libro → `waiting`, posición 1 |
| RF-13 | A reserva dos veces → 409 |
| RF-14 | A devuelve → B promovido y `available_copies` sigue en 0. B devuelve con la cola vacía → `available_copies = 1`. Otro usuario no puede devolver una reserva ajena → 404 |
| RF-15 | B cancela su espera → 200. La siguiente devolución lo salta (id obsoleto) |
| RF-16 | `GET /api/reservations/me` muestra a B en `active` |
| RF-18 | Login con `ADMIN_EMAIL` y `ADMIN_PASSWORD` |
| RNF-14 | El job `test` de `.github/workflows/ci-cd.yml` corre todo lo anterior contra `docker compose` |

**Sin prueba automática:** RF-03 (`GET /api/auth/me`), RF-06 (géneros), RF-17 (listado del admin), RF-19 (portada generada) y la regla de RF-09 "no bajar `total_copies` por debajo de las prestadas" (409). Se comprueban a mano desde la interfaz.

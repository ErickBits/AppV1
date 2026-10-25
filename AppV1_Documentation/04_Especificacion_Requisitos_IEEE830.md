# 04 · Especificación de Requisitos de Software (SRS)

**Estándar:** IEEE 830-1998 (*Recommended Practice for Software Requirements Specifications*)
**Producto:** Biblioteca Virtual "BiblioPop" · **Versión del documento:** 1.0 · **Fecha:** 2026-10-24

---

## 1. Introducción

### 1.1 Propósito

Este documento describe los requisitos funcionales y no funcionales de BiblioPop, una biblioteca virtual hecha con microservicios. Está dirigido al docente evaluador, al equipo de desarrollo y a quien tenga que operar o extender el sistema.

### 1.2 Alcance

BiblioPop permite:

- Consultar un catálogo de libros y buscar por título, autor o género.
- Crear una cuenta e iniciar sesión.
- Reservar libros. Si hay copias, el préstamo es inmediato (14 días). Si no, el usuario entra a una **lista de espera** y la copia se le asigna sola cuando alguien devuelve.
- Que un administrador gestione el catálogo.

**Fuera del alcance:** pagos y multas, notificaciones por correo, préstamo de libros físicos con código de barras, lectura en línea, alta disponibilidad multinodo.

### 1.3 Definiciones, acrónimos y abreviaturas

| Término | Definición |
|---|---|
| **Reserva** | Registro en `reservations` que une a un usuario con un libro. Puede estar en `active`, `waiting`, `returned` o `cancelled`. |
| **Préstamo** | Reserva en `active`, con 14 días de plazo (`due_at`). |
| **Lista de espera / fila / cola** | Reservas en `waiting` de un libro, en orden de llegada. Se guarda en Redis (`waitlist:{book_id}`) y se puede reconstruir desde PostgreSQL. |
| **Promoción** | Cuando alguien devuelve, la primera reserva `waiting` pasa a `active`. |
| **Copia** | Unidad prestable de un título. Cada libro tiene de 1 a 5 (`total_copies`). |
| **Sección** | Nombre que la interfaz usa para el género (`books.genre`). |
| **JWT** | JSON Web Token. Credencial firmada con HS256 que se manda en `Authorization: Bearer`. |
| **Admin** | Usuario con `users.role = 'admin'`. |
| **K3s** | Distribución ligera de Kubernetes. |
| **RDS** | Amazon Relational Database Service (PostgreSQL administrado). |

### 1.4 Referencias

- IEEE Std 830-1998.
- `README.md`, `docs/ARCHITECTURE.md`, `docs/K8S.md`, `docs/TLS.md` del repositorio.
- [01_Modelado_de_Datos.md](01_Modelado_de_Datos.md), [02_Arquitectura_de_Procesos.md](02_Arquitectura_de_Procesos.md), [03_Matriz_de_Requerimientos.md](03_Matriz_de_Requerimientos.md).

### 1.5 Visión general

La sección 2 describe el producto en general. La sección 3 detalla cada requisito con un identificador que se puede rastrear en la matriz (documento 03).

---

## 2. Descripción general

### 2.1 Perspectiva del producto

Es un sistema independiente, no un módulo de otro sistema. Está formado por:

| Componente | Tecnología | Responsabilidad |
|---|---|---|
| frontend | React 19, Vite, Tailwind v4, servido por nginx | Interfaz web (SPA) |
| auth-service | Node 22, Express, `pg`, `bcryptjs`, `jsonwebtoken` | Usuarios y emisión de JWT (`users`) |
| catalog-service | Python, FastAPI, asyncpg, Redis | Catálogo y caché (`books`) |
| reservation-service | Python, FastAPI, asyncpg, Redis | Préstamos y lista de espera (`reservations`) |
| PostgreSQL 17 | RDS en AWS | Persistencia (fuente de verdad) |
| Redis 7 | StatefulSet en K3s | Caché y colas |
| Ingress NGINX | K3s en una EC2 | Enrutamiento `/api/*` y TLS |

La arquitectura completa está en [02_Arquitectura_de_Procesos.md §1](02_Arquitectura_de_Procesos.md).

### 2.2 Funciones del producto

1. Gestión de cuentas: registro, inicio de sesión y perfil.
2. Catálogo: listar, buscar, filtrar, paginar y ver el detalle.
3. Reservas: prestar, hacer fila, devolver, cancelar y consultar.
4. Administración: alta, edición y baja de libros.

### 2.3 Características de los usuarios

| Actor | Descripción | Conocimientos técnicos |
|---|---|---|
| **Visitante** | Persona sin sesión. Puede ver el catálogo. | Ninguno |
| **Lector** (`role = user`) | Usuario registrado. Reserva y devuelve. | Manejo básico de un navegador web |
| **Administrador** (`role = admin`) | Gestiona el catálogo. | Básico. Necesita conocer las reglas de copias. |

### 2.4 Restricciones

- **R-1 Costo:** el presupuesto total es de $150 en créditos de AWS. El objetivo es unos $12 por semana.
- **R-2 Plazo:** una semana de desarrollo (proyecto universitario).
- **R-3 Infraestructura:** un solo nodo EC2 con K3s y RDS `t3.micro`.
- **R-4 Base de datos:** PostgreSQL (requisito del proyecto). Las tres tablas viven en una sola base, `biblioteca`.
- **R-5 Idioma:** español.

### 2.5 Suposiciones y dependencias

- El usuario usa un navegador moderno con JavaScript y `localStorage` (ahí se guarda el JWT).
- El dominio público se resuelve con `nip.io` hacia la IP elástica de la EC2.
- Let's Encrypt está disponible para emitir el certificado.
- Las imágenes de los contenedores están publicadas en GHCR.

### 2.6 Requisitos pospuestos

- Notificación por correo cuando una reserva pasa de `waiting` a `active`.
- Asignar a la cola las copias nuevas cuando el admin **sube** `total_copies` de un libro que tiene fila.
- Marcar automáticamente como vencidos los préstamos que pasan de `due_at`.
- Pantalla de administración para el listado global de reservas (hoy solo existe en la API).

---

## 3. Requisitos específicos

### 3.1 Requisitos de interfaces externas

#### 3.1.1 Interfaz de usuario

- SPA con estas rutas: `/` (Inicio), `/catalogo`, `/libros/:id`, `/login`, `/registro`, `/perfil` (requiere sesión), `/admin` (requiere rol admin) y la página 404.
- Estilo visual Memphis definido en [06_Manual_de_Branding.md](06_Manual_de_Branding.md).
- En pantallas menores a 768 px la navegación se colapsa en un botón "Menú".

#### 3.1.2 Interfaz de software (API REST, JSON)

| Prefijo | Servicio | Documentación |
|---|---|---|
| `/api/auth` | auth-service | Este documento, RF-01 a RF-04 |
| `/api/books` | catalog-service | Swagger en `/api/books/docs` |
| `/api/reservations` | reservation-service | Swagger en `/api/reservations/docs` |

Los errores responden `{"detail": "<mensaje en español>"}` con el código HTTP correspondiente (400, 401, 403, 404, 409, 422 o 500).

#### 3.1.3 Interfaces de comunicación

HTTPS (TLS 1.2 o superior) entre el navegador y el Ingress. Dentro del clúster se usa HTTP entre servicios `ClusterIP`. La conexión a RDS va con SSL (`DATABASE_SSL=true`).

### 3.2 Requisitos funcionales

Cada requisito sigue la plantilla: **Descripción · Entradas · Proceso · Salidas · Errores**.

#### RF-01 Registro de usuario
- **Prioridad:** Alta · **Tabla:** `users`
- **Entradas:** `name` (mín. 2 caracteres), `email` (formato válido), `password` (mín. 8 caracteres).
- **Proceso:** se valida la entrada, el email se pasa a minúsculas, se calcula el hash bcrypt y se inserta con `role = 'user'`.
- **Salidas:** 201 con `{token, user}`. El usuario queda con la sesión iniciada.
- **Errores:** 400 "Email inválido", "La contraseña debe tener al menos 8 caracteres" o "Nombre inválido". 409 "El email ya está registrado".

#### RF-02 Inicio de sesión
- **Prioridad:** Alta · **Tabla:** `users`
- **Entradas:** `email`, `password`.
- **Proceso:** se busca el usuario por email en minúsculas y se compara el hash.
- **Salidas:** 200 con `{token, user}`. El JWT dura 8 h y lleva `sub`, `email` y `role`. El frontend redirige a la página de origen o a `/catalogo`.
- **Errores:** 400 "Email y contraseña requeridos". 401 "Credenciales inválidas" (el mismo mensaje si el email no existe, para no revelar qué cuentas hay).

#### RF-03 Consultar perfil
- **Prioridad:** Media · **Tabla:** `users`
- **Entradas:** JWT.
- **Salidas:** 200 con `{id, email, name, role, created_at}`. Nunca se devuelve `password_hash`.
- **Errores:** 401 sin token o con token inválido. 404 si el usuario ya no existe.

#### RF-04 Actualizar perfil
- **Prioridad:** Media · **Tabla:** `users`
- **Entradas:** JWT. Opcionales: `name`, `email`, y `password` junto con `current_password`.
- **Proceso:** se validan solo los campos que se envían. Para cambiar la contraseña hay que dar la actual. Se actualiza `updated_at`.
- **Salidas:** 200 con un **token nuevo** (porque el email del token puede haber cambiado) y el usuario.
- **Errores:** 400 por validación. 403 "Contraseña actual incorrecta". 409 si el email nuevo ya está en uso.

#### RF-05 Listar y buscar en el catálogo
- **Prioridad:** Alta · **Tabla:** `books`
- **Entradas:** `q` (máx. 100 caracteres, busca en título y autor sin distinguir mayúsculas), `genre` (coincidencia exacta sin distinguir mayúsculas), `page` (≥ 1), `limit` (1 a 100; la interfaz usa 24).
- **Proceso:** primero se consulta la caché de Redis. Si no está, se consulta PostgreSQL ordenando por `title` y se guarda en caché por 120 s.
- **Salidas:** `{items[], total, page, limit}` y la cabecera `X-Cache: HIT|MISS`.
- **Acceso:** público.

#### RF-06 Listar géneros
- **Prioridad:** Media · **Tabla:** `books`
- **Salidas:** lista ordenada de valores distintos de `genre` que no son nulos. La interfaz los muestra como "secciones".

#### RF-07 Detalle de un libro
- **Prioridad:** Alta · **Tabla:** `books`
- **Salidas:** el libro completo, con `available_copies` y `total_copies`.
- **Errores:** 404 "Libro no encontrado".

#### RF-08 Alta de libro (admin)
- **Prioridad:** Alta · **Tabla:** `books`
- **Entradas:** `title` (1–300), `author` (1–200), `total_copies` (1–5). Opcionales: `year` (−3000 a 2100), `genre` (≤ 80), `description` (≤ 5000), `cover_url` (URL http o https).
- **Proceso:** se inserta con `available_copies = total_copies` y se invalida la caché.
- **Salidas:** 201 con el libro.
- **Errores:** 401, 403 "Admin role required", 409 "Ya existe un libro con ese título y autor", 422 por validación.

#### RF-09 Edición de libro (admin)
- **Prioridad:** Alta · **Tabla:** `books`
- **Proceso:** se bloquea la fila. Si cambia `total_copies`, entonces `available_copies` se ajusta en la misma diferencia: `nuevo_available = available + (nuevo_total − total)`.
- **Errores:** 404. 409 "Hay *n* copias prestadas; no se puede bajar el total a *m*" si `nuevo_available < 0`. 409 si queda duplicado el par título y autor.

#### RF-10 Baja de libro (admin)
- **Prioridad:** Media · **Tablas:** `books`, `reservations`
- **Precondición:** `available_copies = total_copies`, es decir, no hay copias prestadas. Esto implica que tampoco hay fila, porque solo hay fila cuando todas las copias están prestadas.
- **Proceso:** `DELETE`. Las reservas históricas de ese libro se borran en cascada.
- **Salidas:** 204.
- **Errores:** 404. 409 "El libro tiene copias prestadas; espera a que se devuelvan".

#### RF-11 Reservar con préstamo inmediato
- **Prioridad:** Alta · **Tablas:** `books`, `reservations`
- **Entradas:** JWT y `book_id`.
- **Precondición:** `available_copies > 0`.
- **Proceso:** en una sola transacción se bloquea el libro, se resta 1 a `available_copies` y se inserta la reserva en `active` con `activated_at = now()` y `due_at = now() + 14 días`. Después se invalida la caché.
- **Salidas:** 201 con la reserva, `book_title` y `position = null`. La interfaz muestra "¡Es tuyo! Devuélvelo antes del *dd/mm/aaaa*".

#### RF-12 Entrar a la lista de espera
- **Prioridad:** Alta · **Tablas:** `reservations`, `waitlist:{book_id}`
- **Precondición:** `available_copies = 0`.
- **Proceso:** se inserta la reserva en `waiting` y su ID se agrega al final de la cola, sin soltar el bloqueo del libro.
- **Salidas:** 201 con `position` (empieza en 1). La interfaz muestra "estás en la posición #*n* de la lista de espera".

#### RF-13 Una reserva abierta por libro
- **Prioridad:** Alta · **Tabla:** `reservations`
- **Regla:** no pueden existir dos filas con el mismo `(user_id, book_id)` en `active` o `waiting`.
- **Errores:** 409 "Ya tienes una reserva activa o en espera para este libro". La transacción se revierte y, si el ID ya estaba en la cola, se saca.

#### RF-14 Devolver con promoción automática
- **Prioridad:** Alta · **Tablas:** `books`, `reservations`, `waitlist:{book_id}`
- **Precondición:** la reserva es del usuario (o el que devuelve es admin) y está en `active`.
- **Proceso:** se bloquea el libro y la reserva pasa a `returned` con `closed_at`. Luego se sacan IDs del frente de la cola hasta encontrar uno que siga en `waiting`. Ese pasa a `active` con un plazo nuevo de 14 días. Si la cola queda vacía, `available_copies + 1` y se invalida la caché.
- **Salidas:** 200 con `{returned, promoted_reservation_id}`.
- **Errores:** 404 "Reserva no encontrada" (también si es de otro usuario). 409 "Solo se pueden devolver reservas activas".

#### RF-15 Cancelar una reserva en espera
- **Prioridad:** Media · **Tablas:** `reservations`, `waitlist:{book_id}`
- **Proceso:** `waiting → cancelled`, se registra `closed_at` y el ID se quita de la cola.
- **Errores:** 404. 409 "Solo se pueden cancelar reservas en espera".

#### RF-16 Consultar mis reservas
- **Prioridad:** Alta · **Tablas:** `reservations`, `books`
- **Salidas:** las reservas del usuario con título, autor y portada. Primero salen las abiertas, ordenadas de la más reciente a la más antigua. Las que están en `waiting` incluyen su `position`.

#### RF-17 Listado global de reservas (admin)
- **Prioridad:** Baja · **Tablas:** `reservations`, `books`
- **Entradas:** `status` opcional (`active`, `waiting`, `returned` o `cancelled`) y `limit` (1–500, por defecto 100).
- **Acceso:** solo admin y solo por API.

#### RF-18 Administrador inicial
- **Prioridad:** Alta · **Tabla:** `users`
- **Proceso:** al arrancar auth-service, si existen `ADMIN_EMAIL` y `ADMIN_PASSWORD`, se inserta el usuario "Administrador" con `role = 'admin'`. Si ya existe, no se toca (`ON CONFLICT DO NOTHING`).

#### RF-19 Portada generada
- **Prioridad:** Baja · **Tabla:** `books.cover_url`
- **Proceso:** si `cover_url` está vacío o la imagen no carga, el frontend dibuja una portada cuyo color y formas salen de un hash del título. Así el mismo libro se ve igual en cualquier dispositivo.

#### RF-20 Carga inicial del catálogo
- **Prioridad:** Media · **Tabla:** `books`
- **Proceso:** `app/seed.py` inserta 100 libros. Se corre con `make seed-local` o con el Job `seed` en Kubernetes.

### 3.3 Requisitos de rendimiento

| ID | Requisito |
|---|---|
| RNF-07 | Mientras la caché esté vigente (120 s), las páginas del catálogo se sirven desde Redis sin consultar PostgreSQL. |
| RNF-07a | Cada servicio usa un pool de máximo 5 conexiones a PostgreSQL. Con 3 servicios son 15 o menos, dentro del límite de RDS `t3.micro`. |
| RNF-07b | Redis está limitado a 96 MB con política `volatile-lru`: solo se pueden expulsar las claves con TTL (la caché), nunca las colas. |

### 3.4 Requisitos de la base de datos lógica

- Tablas, tipos, claves e índices: [01_Modelado_de_Datos.md](01_Modelado_de_Datos.md).
- Integridad: `CHECK` sobre copias y estados, `UNIQUE (title, author)`, índice único parcial `reservations_open_uniq` y FK `reservations.book_id → books.id ON DELETE CASCADE`.
- Las migraciones son idempotentes (`IF NOT EXISTS`) y se corren al arrancar cada servicio.

### 3.5 Restricciones de diseño

- Cada microservicio es dueño de su tabla. reservation-service lee y bloquea filas de `books` porque necesita que el préstamo sea atómico. Es un acoplamiento aceptado y documentado.
- Los servicios no se llaman entre sí. La identidad viaja en el JWT.

### 3.6 Atributos del sistema de software

| ID | Atributo | Requisito |
|---|---|---|
| RNF-01 | Seguridad | Contraseñas con bcrypt (cost 10). Nunca se registran en logs ni se devuelven. |
| RNF-02 | Seguridad | JWT HS256 de 8 h. 401 sin token o con token inválido, 403 sin el rol necesario. Ningún usuario ve las reservas de otro (responde 404, no 403, para no revelar que existen). |
| RNF-03 | Seguridad | HTTPS con certificado de Let's Encrypt. La API de K3s (6443) no se expone. El despliegue va por SSH. |
| RNF-04 | Seguridad | Toda entrada se valida en el servidor. Los cuerpos JSON en auth tienen un máximo de 100 kB. Las consultas SQL siempre usan parámetros (`$1`, `$2`…). |
| RNF-05 | Integridad | Un préstamo nunca deja `available_copies` fuera de `[0, total_copies]`, aunque haya concurrencia (bloqueo de fila + `CHECK`). |
| RNF-06 | Confiabilidad | Si Redis pierde datos, las colas se reconstruyen desde las filas `waiting` (orden `created_at, id`). Si una transacción falla, la cola se corrige con `LREM` o `LPUSH`. |
| RNF-08 | Costo | Unos $12 por semana. AWS Budget avisa por correo. Al terminar se corre `make tf-destroy`. |
| RNF-09 | Portabilidad | Imágenes Docker multi-stage. Todo el sistema corre igual en local (`docker compose`) y en K3s. |
| RNF-10 | Disponibilidad | `/health` en cada servicio, con readiness y liveness probes. Un solo nodo y sin SLA formal (RNF-11). |
| RNF-12 | Usabilidad | Diseño responsivo, foco visible (contorno azul de 3 px), etiquetas `aria`, mensajes con `role="alert"` o `role="status"` y animaciones desactivadas si el sistema pide `prefers-reduced-motion`. |
| RNF-13 | Usabilidad | Todos los textos y errores están en español. |
| RNF-14 | Mantenibilidad | CI con ruff, build del frontend, e2e contra el stack real y `terraform validate`. |
| RNF-15 | Mantenibilidad | OpenAPI/Swagger de catalog y reservation. |

---

## Apéndice A · Verificación de coherencia

Se revisó que:

1. Cada RF que escribe datos nombra una tabla que existe en el modelo (`users`, `books` o `reservations`). No aparece ninguna tabla que no esté en el ERD.
2. Los estados de RF-11, RF-12, RF-14 y RF-15 (`active`, `waiting`, `returned`, `cancelled`) son exactamente los del `CHECK` de `reservations.status` y los del diagrama de estados del documento 02.
3. El diagrama de flujo del documento 02 pasa por RF-11 → RF-13 → RF-12 → RF-15 → RF-14 en el mismo orden y con los mismos códigos de error que esta especificación.
4. Los límites de copias (1–5) son iguales en el `CHECK` de la base, la validación Pydantic, el selector del panel admin y el documento de branding.

# 02 · Arquitectura de Procesos

El **proceso principal** de BiblioPop es el ciclo de préstamo: *reservar → (esperar en la fila) → devolver → la copia pasa al siguiente*. Todo lo demás (registro, catálogo, administración) existe para que este ciclo funcione.

Requisitos que cubre este documento: RF-11 a RF-16 (ver [03_Matriz_de_Requerimientos.md](03_Matriz_de_Requerimientos.md)).

## 1. Vista de componentes

```mermaid
flowchart LR
    U([Usuario / navegador]) --> FE[frontend<br/>React 19 + Vite<br/>nginx]
    U -- "/api/*" --> GW[Ingress NGINX<br/>local: gateway nginx]
    FE -.-> GW
    GW -- "/api/auth" --> AUTH[auth-service<br/>Node 22 + Express]
    GW -- "/api/books" --> CAT[catalog-service<br/>FastAPI]
    GW -- "/api/reservations" --> RES[reservation-service<br/>FastAPI]
    AUTH --> PG[(PostgreSQL<br/>users · books · reservations)]
    CAT --> PG
    RES --> PG
    CAT --> RD[(Redis<br/>caché + colas)]
    RES --> RD
```

Los tres servicios validan el mismo JWT (HS256, secreto compartido `JWT_SECRET`) sin llamarse entre sí. auth-service emite el token, y catalog y reservation solo lo verifican.

## 2. Diagrama de flujo del proceso principal

```mermaid
flowchart TD
    A([Inicio: el usuario abre el detalle de un libro]) --> B{¿Tiene sesión<br/>con JWT válido?}
    B -- No --> B1[Redirigir a /login<br/>guardando la página de origen]
    B1 --> B2[POST /api/auth/login<br/>o /api/auth/register]
    B2 --> B3{¿Credenciales<br/>válidas?}
    B3 -- No --> B4[Mostrar error<br/>401 Credenciales inválidas] --> B2
    B3 -- Sí --> C
    B -- Sí --> C[Clic en Reservar ahora /<br/>Unirme a la lista de espera]

    C --> D[POST /api/reservations<br/>BEGIN · SELECT books FOR UPDATE]
    D --> E{¿Existe el libro?}
    E -- No --> E1[404 Libro no encontrado] --> Z
    E -- Sí --> F{"available_copies > 0?"}

    F -- Sí --> G[available_copies − 1<br/>INSERT reservations status = active<br/>due_at = now + 14 días]
    F -- No --> H[INSERT reservations status = waiting<br/>RPUSH waitlist:book_id]

    G --> I{¿Ya tenía una reserva abierta<br/>de ese libro?<br/>índice reservations_open_uniq}
    H --> I
    I -- Sí --> I1[ROLLBACK · quitar de la cola<br/>409 Ya tienes una reserva] --> Z
    I -- No --> J[COMMIT]
    J --> K{status}
    K -- active --> K1[INCR books:cache_version<br/>Mensaje: ¡Es tuyo! Devuélvelo antes del …]
    K -- waiting --> K2["LPOS en la cola<br/>Mensaje: estás en la posición Nº n"]

    K1 --> L[El lector tiene el libro<br/>Perfil → En préstamo]
    K2 --> M{¿El lector sale de la fila?}
    M -- Sí --> M1[DELETE /api/reservations/id<br/>status = cancelled · LREM de la cola] --> Z
    M -- No --> M2[Espera. Su posición avanza<br/>cuando otros devuelven o cancelan]
    M2 --> N

    L --> R[Clic en Devolver<br/>POST /api/reservations/id/return]
    R --> S[BEGIN · SELECT books FOR UPDATE<br/>status active → returned]
    S --> T{LPOP waitlist:book_id<br/>¿hay un id?}
    T -- Sí --> U{¿Esa reserva sigue en waiting?}
    U -- No: id obsoleto --> T
    U -- Sí --> N[status waiting → active<br/>activated_at = now · due_at = now + 14 días<br/>la copia pasa directo, available no cambia]
    T -- No: cola vacía --> V[available_copies + 1<br/>INCR books:cache_version]
    N --> W[COMMIT]
    V --> W
    W --> Z([Fin])
    N -. el siguiente lector ve su préstamo<br/>en Mi cuenta .-> L
```

### Puntos importantes del flujo

| Paso | Qué protege | Cómo |
|---|---|---|
| `SELECT … FOR UPDATE` sobre `books` | Que dos personas no se lleven la última copia a la vez | Bloqueo de fila. Reservar y devolver usan el mismo orden de bloqueo (libro primero), así que no hay deadlocks. |
| `RPUSH` dentro de la transacción | Que una devolución que ocurre al mismo tiempo no se salte a quien acaba de entrar a la fila | Se encola mientras se tiene el bloqueo del libro. Si la transacción falla, se hace `LREM`. |
| Bucle `LPOP` | IDs obsoletos en la cola (por ejemplo, reservas canceladas) | Solo se promueve una reserva si sigue en `waiting`. Si no, se toma la siguiente. |
| `LPUSH` de compensación | Que no se pierda el primero de la fila si la devolución falla | Si hay `ROLLBACK`, el ID promovido vuelve a la cabeza de la cola. |
| `INCR books:cache_version` | Que el catálogo no muestre disponibilidad vieja | Solo se incrementa cuando cambia `available_copies`. Si la copia pasa directo a otro lector, la disponibilidad sigue igual. |

## 3. Ciclo de vida de una reserva (diagrama de estados)

```mermaid
stateDiagram-v2
    [*] --> active: Reservar con copias libres
    [*] --> waiting: Reservar sin copias libres
    waiting --> active: Otro lector devuelve y esta reserva es la primera de la fila
    waiting --> cancelled: Salir de la fila
    active --> returned: Devolver
    returned --> [*]
    cancelled --> [*]
```

| Estado (BD) | Etiqueta en la UI | Color |
|---|---|---|
| `active` | En préstamo | Teal `#2EC4B6` |
| `waiting` | En espera (+ chip "#n en la fila") | Amarillo `#FFD23F` |
| `returned` | Devuelto | Blanco |
| `cancelled` | Cancelado | Blanco |

Una reserva `active` **no se puede cancelar** (hay que devolverla), y una `waiting` **no se puede devolver** (hay que cancelarla). Si se intenta, la API responde 409.

## 4. Flujo de administración del catálogo

```mermaid
flowchart TD
    A([Admin en /admin]) --> B{Acción}
    B -- Nuevo libro --> C[POST /api/books<br/>available_copies = total_copies]
    C --> C1{¿Ya existe ese título y autor?}
    C1 -- Sí --> X1[409 Ya existe un libro con ese título y autor]
    C1 -- No --> OK
    B -- Editar --> D[PUT /api/books/id · FOR UPDATE]
    D --> D1{¿Cambia total_copies?}
    D1 -- No --> OK
    D1 -- Sí --> D2{nuevo_available =<br/>available + nuevo_total − total<br/>¿es menor que 0?}
    D2 -- Sí --> X2[409 Hay n copias prestadas]
    D2 -- No --> OK
    B -- Eliminar --> E[Confirmar en el navegador<br/>DELETE /api/books/id · FOR UPDATE]
    E --> E1{"available_copies < total_copies?"}
    E1 -- Sí --> X3[409 El libro tiene copias prestadas]
    E1 -- No --> OK[Guardar · INCR books:cache_version<br/>refrescar la tabla]
```

## 5. Verificación de coherencia (flujo ↔ requisitos)

| Requisito | Dónde aparece en el flujo | ¿Coincide? |
|---|---|---|
| RF-02 Iniciar sesión | Rama "¿Tiene sesión?" → login | ✓ |
| RF-11 Préstamo inmediato de 14 días | `available_copies > 0` → `active`, `due_at = now + 14 días` | ✓ |
| RF-12 Lista de espera con posición | `waiting` + `RPUSH` + `LPOS` | ✓ |
| RF-13 Una reserva abierta por libro | Índice `reservations_open_uniq` → 409 | ✓ |
| RF-14 Devolución con promoción automática | Bucle `LPOP` → `waiting → active`. Si la cola está vacía, `available + 1` | ✓ |
| RF-15 Cancelar reserva en espera | `DELETE` → `cancelled` + `LREM` | ✓ |
| RF-16 Consultar mis reservas | "Perfil → En préstamo" | ✓ |
| RF-09 / RF-10 Reglas de edición y borrado | Flujo de administración, nodos X2 y X3 | ✓ |

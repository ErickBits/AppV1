# La Biblioteca — Biblioteca Virtual en microservicios

Proyecto universitario: catálogo de libros, usuarios con JWT y reservas con lista de espera.
Corre en Kubernetes (K3s) sobre AWS por unos **$12 a la semana**.

| Documento | Contenido |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Estrategia de costos, mapa de microservicios, flujos de datos (Mermaid) |
| [docs/TLS.md](docs/TLS.md) | OpenSSL + Certbot + NGINX Ingress, paso a paso |

## Estructura

```
.
├── services/
│   ├── auth-service/          Node 22 + Express · registro, login JWT, perfil
│   ├── catalog-service/       FastAPI · CRUD libros, cache Redis, seed (app/seed.py)
│   └── reservation-service/   FastAPI · reservas + cola de espera (Redis + PostgreSQL)
├── frontend/                  React 19 + Vite + Tailwind v4 · estilo Memphis (BiblioPop)
├── gateway/nginx.conf         Reverse proxy local (espejo del Ingress)
├── k8s/                       Deployments, Services (ClusterIP), Ingress, Redis, Job de seed
├── infra/terraform/           VPC, EC2+K3s, RDS t3.micro, Budget
├── scripts/                   Deploy hook de Certbot
├── tests/e2e.py               Pruebas end-to-end de la API (incluye la cola de espera)
├── .github/workflows/ci-cd.yml
├── docker-compose.yml
└── Makefile                   `make help`
```

## Desarrollo local (5 minutos)

```bash
make up            # postgres, redis, 3 servicios, frontend, gateway → http://localhost:8080
make seed-local    # 100 libros
make test-e2e      # pruebas end-to-end de la API
make fe-dev        # opcional: Vite con hot reload en http://localhost:5173
```

Admin local: `admin@biblioteca.dev` / `admin12345`.
Documentación de las APIs: `/api/books/docs` y `/api/reservations/docs` (Swagger).

## Despliegue en AWS

Requisitos: AWS CLI configurado, Terraform ≥ 1.6, Docker, una llave SSH (`~/.ssh/id_ed25519.pub`) y un repositorio en GitHub.

```bash
cp infra/terraform/terraform.tfvars.example infra/terraform/terraform.tfvars   # pon tu correo
make tf-init tf-apply        # ~10 min (RDS es lo más lento)
make wait-k3s                # espera a K3s + NGINX Ingress
make k8s-secrets             # DATABASE_URL de RDS, JWT aleatorio, admin (imprime la contraseña)

# Imágenes: lo hace CI al hacer push a main; a mano sería:
echo $GH_TOKEN | docker login ghcr.io -u <usuario> --password-stdin
make push GH_OWNER=<usuario>
# Los paquetes de GHCR son privados por defecto: hazlos públicos en GitHub → Packages,
# o crea el pull secret: make ghcr-secret GHCR_USER=<usuario> GHCR_TOKEN=<token read:packages>

make deploy GH_OWNER=<usuario>
make tls-selfsigned          # requisito previo para Certbot (ver docs/TLS.md)
make tls-certbot EMAIL=tu@correo.com
make seed
```

Abre `https://<nip_io_domain>` (lo muestra `make tf-output`).

**Al terminar el proyecto: `make tf-destroy`.** Borra todo, incluida la base de datos (no deja snapshot).

### CI/CD (GitHub Actions)

`.github/workflows/ci-cd.yml`:

1. **test**: ruff, build del frontend, `docker compose up` y `tests/e2e.py` contra el stack real.
2. **terraform**: `fmt -check` y `validate`.
3. **images** (solo en push): build multi-stage de los 4 servicios con cache de GHA → GHCR, etiquetados con `sha` y `latest`.
4. **deploy** (solo `main`): renderiza `k8s/` con el SHA y aplica por SSH. La API de K3s (6443) nunca se expone.

Secrets del repositorio: `EC2_HOST` (la EIP), `EC2_SSH_KEY` (llave privada), `DOMAIN`.

## Reglas de negocio

- Cada libro tiene de 1 a 5 copias (`total_copies`), y `available_copies` lleva la cuenta de las libres.
- **Reservar:** si `available_copies > 0`, se presta por 14 días (`active`). Si es 0, entras a la **cola de espera** (`waiting`) y ves tu posición.
- **Devolver:** la copia pasa directo al primero de la cola. Si la cola está vacía, `available_copies` sube en 1.
- Un usuario puede tener solo una reserva abierta por libro. Las reservas en espera se pueden cancelar.
- El admin no puede borrar un libro con copias prestadas ni bajar `total_copies` por debajo de las prestadas.

### Limitaciones conocidas (aceptadas por alcance y costo)

- Un solo nodo, sin alta disponibilidad (decisión de costo, ver ARCHITECTURE.md).
- Si el admin **sube** `total_copies` de un libro que tiene cola, las copias nuevas quedan disponibles para quien reserve primero en lugar de asignarse a la cola.
- No hay notificaciones por correo cuando una reserva pasa de `waiting` a `active`; el usuario lo ve en su perfil.
# AppV1

# Manifiestos de Kubernetes (`k8s/`)

Qué hace cada archivo de `k8s/` y cómo encajan. Todo corre en K3s sobre una sola EC2, en el namespace `biblioteca`.

```
Internet ──443──▶ ingress.yaml ──┬─ /api/auth          ▶ auth-service
                                 ├─ /api/books         ▶ catalog-service ──┐
                                 ├─ /api/reservations  ▶ reservation-service ─┼─▶ redis
                                 ├─ /.well-known/...   ▶ acme-solver       │
                                 └─ /                  ▶ frontend          └─▶ RDS (fuera del clúster)
```

## 1. Base

**`namespace.yaml`**: crea el namespace `biblioteca`, una "carpeta" lógica que separa los recursos de la app de los del sistema (`kube-system`). `kubectl delete ns biblioteca` borra todo de una vez.

**`kustomization.yaml`**: es el índice de qué se despliega y le pone el namespace a todo. `make deploy` hace lo siguiente:
1. `kustomize build` junta los YAML.
2. `sed` sustituye `ghcr.io/OWNER`, `:latest` y `biblioteca.example.com` por el registry, el tag y el dominio reales.
3. `kubectl apply` aplica el resultado.

No incluye `secret.example.yaml` ni `seed-job.yaml` a propósito.

## 2. Configuración

**`configmap.yaml`** (`app-config`): configuración **no secreta**, compartida por los servicios.
- `REDIS_URL: redis://redis:6379/0`: `redis` es el nombre del Service y se resuelve por el DNS interno.
- `DATABASE_SSL: "true"`: RDS exige TLS en PostgreSQL 15 o superior.
- `JWT_TTL: 8h`: duración de un login.

**`secret.example.yaml`**: solo es una **plantilla** del Secret `app-secrets` (`DATABASE_URL`, `JWT_SECRET`, credenciales del admin). No se aplica, para no subir contraseñas a git. El Secret real lo crea `make k8s-secrets`, que lee el endpoint de RDS desde Terraform y genera un `JWT_SECRET` aleatorio.

Los servicios cargan ambos como variables de entorno con `envFrom`.

## 3. Microservicios

Cada servicio tiene un **Deployment** (cómo correr los pods) y un **Service ClusterIP** (dirección interna estable).

| Archivo | Puerto | Qué corre |
|---|---|---|
| `auth-service.yaml` | 3000 | Node/Express: registro, login, perfil |
| `catalog-service.yaml` | 8000 | FastAPI: CRUD de libros y caché Redis |
| `reservation-service.yaml` | 8000 | FastAPI: reservas y lista de espera |
| `frontend.yaml` | 8080 | Nginx sin privilegios que sirve el build de React (sin secretos) |

Qué hace cada parte del Deployment:
- **`replicas: 1`**: un pod por servicio, porque hay un solo nodo y hay que ahorrar.
- **`revisionHistoryLimit: 3`**: permite volver atrás con `kubectl rollout undo`.
- **`resources`**:
  - `requests` es lo que se reserva para el pod (50m = 5 % de un CPU).
  - `limits.memory` es el máximo de memoria; si lo supera, el pod se reinicia.
  - Con estos valores todo cabe en los 4 GB de la t3.medium.
- **`readinessProbe`** (`/health` cada 10 s): mientras falle, el pod no recibe tráfico. Así se evitan errores durante un deploy.
- **`livenessProbe`**: si `/health` deja de responder, reinicia el contenedor. Espera 30 s al arrancar.
- **Seguridad**:
  - `runAsNonRoot` impide correr como root (por eso los Dockerfiles usan `USER 1000` y `USER 10001`).
  - `allowPrivilegeEscalation: false` y `capabilities: drop [ALL]` quitan los privilegios extra.

Los **Service ClusterIP** solo son accesibles dentro del clúster. La única entrada desde internet es el Ingress.

## 4. Datos

**`redis.yaml`**: es un **StatefulSet**, no un Deployment, porque guarda datos y necesita un disco que lo acompañe siempre.
- `--appendonly yes` (AOF): escribe cada operación a disco, así las listas de espera sobreviven a un reinicio.
- `--maxmemory 96mb` con `volatile-lru`: si la memoria se llena, borra primero las claves con expiración (la caché del catálogo) y nunca las colas.
- `volumeClaimTemplates`: pide 1 Gi con `local-path`, el almacenamiento de K3s que usa el disco EBS de la EC2. No tiene costo extra.
- `readinessProbe` con `redis-cli ping`: comprueba que Redis responda.

PostgreSQL no aparece aquí porque es **RDS**, está fuera del clúster y lo crea Terraform.

## 5. Entrada y HTTPS

**`ingress.yaml`**: es el router público. El NGINX Ingress Controller escucha en los puertos 80/443 (los expone el ServiceLB de K3s) y reparte el tráfico por ruta.
- Rutas: con `pathType: Prefix` gana la más específica, así que `/api/books/5` va al catálogo y no al frontend.
- TLS: usa el certificado del Secret `biblioteca-tls`.
- Anotaciones:
  - `hsts: "true"` obliga al navegador a usar siempre HTTPS.
  - `client-max-body-size: 1m` limita el tamaño de las peticiones.

**`acme-solver.yaml`**: un Nginx diminuto que sirve la carpeta `/var/www/certbot` de la EC2 (montada con `hostPath`). Así se valida el dominio ante Let's Encrypt:
1. Certbot escribe un archivo en esa carpeta.
2. Let's Encrypt pide `/.well-known/acme-challenge/...`.
3. El Ingress manda esa petición a este pod, que devuelve el archivo.

De esta forma el certificado se emite y renueva **sin downtime**. Más detalle en `docs/TLS.md`.

## 6. Tarea puntual

**`seed-job.yaml`**: un **Job**, es decir, un pod que corre una vez y termina. Usa la imagen del catálogo para ejecutar `python -m app.seed` y cargar los 100 libros.
- `backoffLimit: 3`: reintenta hasta 3 veces si falla.
- `ttlSecondsAfterFinished: 600`: borra el Job 10 minutos después de terminar.

Se lanza a mano con `make seed` y es idempotente.

## Resumen

| Archivo | Tipo | En una frase |
|---|---|---|
| `namespace.yaml` | Namespace | Carpeta lógica `biblioteca` |
| `kustomization.yaml` | Kustomize | Índice de qué se despliega |
| `configmap.yaml` | ConfigMap | Configuración no secreta |
| `secret.example.yaml` | Secret (plantilla) | Ejemplo de contraseñas, no se aplica |
| `auth-service.yaml` | Deployment + Service | API de usuarios y JWT |
| `catalog-service.yaml` | Deployment + Service | API de libros |
| `reservation-service.yaml` | Deployment + Service | API de reservas y cola |
| `frontend.yaml` | Deployment + Service | Sitio React |
| `redis.yaml` | StatefulSet + Service | Caché y colas con disco persistente |
| `ingress.yaml` | Ingress | Puerta de entrada HTTPS y rutas |
| `acme-solver.yaml` | Deployment + Service | Valida el dominio para Let's Encrypt |
| `seed-job.yaml` | Job | Carga los 100 libros una vez |

# Biblioteca Virtual — comandos rápidos.  `make help` lista todo.
SHELL := /bin/bash
.DEFAULT_GOAL := help

# ---- Configuración (sobrescribible: make deploy GH_OWNER=mi-usuario) ----
GH_OWNER  ?= $(shell git config --get remote.origin.url 2>/dev/null | sed -E 's#.*github.com[:/]([^/]+)/.*#\1#' | tr A-Z a-z)
REGISTRY  ?= ghcr.io/$(GH_OWNER)
TAG       ?= $(shell git rev-parse --short HEAD 2>/dev/null || echo latest)
SERVICES  := auth catalog reservation frontend
TF_DIR    := infra/terraform
TF        ?= terraform
EC2_IP    ?= $(shell $(TF) -chdir=$(TF_DIR) output -raw public_ip 2>/dev/null)
DOMAIN    ?= $(shell $(TF) -chdir=$(TF_DIR) output -raw nip_io_domain 2>/dev/null)
SSH       := ssh -o StrictHostKeyChecking=accept-new ubuntu@$(EC2_IP)
KUBECTL   := $(SSH) kubectl -n biblioteca
# Render manifests with local kubectl if present, otherwise with the official image.
KUSTOMIZE := $(if $(shell command -v kubectl),kubectl kustomize,docker run --rm -v $(CURDIR)/k8s:/k8s registry.k8s.io/kubectl:v1.34.0 kustomize) $(if $(shell command -v kubectl),k8s,/k8s)
RENDER    := sed -E -e 's\#ghcr.io/OWNER/(biblioteca-[a-z]+):latest\#$(REGISTRY)/\1:$(TAG)\#g' -e 's\#biblioteca.example.com\#$(DOMAIN)\#g'

dir_auth        := services/auth-service
dir_catalog     := services/catalog-service
dir_reservation := services/reservation-service
dir_frontend    := frontend

.PHONY: help
help: ## Muestra esta ayuda
	@grep -hE '^[a-zA-Z0-9_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*?## "}{printf "  \033[1m%-16s\033[0m %s\n", $$1, $$2}'

# =============================== Local ===============================
.PHONY: up down logs seed-local test-e2e fe-dev
up: ## Levanta todo el stack local (http://localhost:8080)
	docker compose up -d --build
down: ## Detiene el stack local (conserva datos; usa `docker compose down -v` para borrarlos)
	docker compose down
logs: ## Logs del stack local (s=servicio para filtrar)
	docker compose logs -f $(s)
seed-local: ## Carga los 100 libros en la base local
	docker compose exec catalog-service python -m app.seed
test-e2e: ## Pruebas end-to-end contra BASE_URL (default: stack local)
	python3 -I tests/e2e.py $(BASE_URL)
fe-dev: ## Vite con hot reload (requiere `make up` para la API)
	cd frontend && npm install && npm run dev

# ============================ Imágenes ===============================
.PHONY: build push
build: ## Construye las 4 imágenes con TAG=$(TAG)
	@test -n "$(GH_OWNER)" || (echo "Define GH_OWNER=<usuario-github>"; exit 1)
	$(foreach s,$(SERVICES),docker build -t $(REGISTRY)/biblioteca-$(s):$(TAG) -t $(REGISTRY)/biblioteca-$(s):latest $(dir_$(s)) &&) true
push: build ## Sube las imágenes a GHCR (antes: echo $$TOKEN | docker login ghcr.io -u USER --password-stdin)
	$(foreach s,$(SERVICES),docker push $(REGISTRY)/biblioteca-$(s):$(TAG) && docker push $(REGISTRY)/biblioteca-$(s):latest &&) true

# ============================ Terraform ==============================
.PHONY: tf-init tf-plan tf-apply tf-destroy tf-output
tf-init: ## terraform init
	$(TF) -chdir=$(TF_DIR) init
tf-plan: ## terraform plan
	$(TF) -chdir=$(TF_DIR) plan
tf-apply: ## Crea la infraestructura (~10 min, RDS es lo más lento)
	$(TF) -chdir=$(TF_DIR) apply
tf-destroy: ## ⚠ Destruye TODO (EC2, RDS sin snapshot, VPC). Hazlo al terminar el proyecto.
	$(TF) -chdir=$(TF_DIR) destroy
tf-output: ## Muestra IP, dominio y endpoint de RDS
	$(TF) -chdir=$(TF_DIR) output

# ============================ Kubernetes =============================
.PHONY: wait-k3s k8s-secrets ghcr-secret deploy seed status k-logs ssh
wait-k3s: ## Espera a que K3s y el Ingress estén listos en la EC2
	until $(SSH) 'kubectl get ingressclass nginx' >/dev/null 2>&1; do echo "esperando K3s + NGINX..."; sleep 10; done

k8s-secrets: ## Crea el Secret app-secrets (DATABASE_URL desde Terraform, JWT aleatorio)
	@$(SSH) 'kubectl create namespace biblioteca --dry-run=client -o yaml | kubectl apply -f -' >/dev/null
	@ADMIN_PASSWORD=$${ADMIN_PASSWORD:-$$(openssl rand -base64 12)}; \
	$(SSH) kubectl -n biblioteca create secret generic app-secrets \
	  --from-literal=DATABASE_URL='$(shell $(TF) -chdir=$(TF_DIR) output -raw database_url 2>/dev/null)' \
	  --from-literal=JWT_SECRET=$$(openssl rand -hex 32) \
	  --from-literal=ADMIN_EMAIL=$${ADMIN_EMAIL:-admin@biblioteca.dev} \
	  --from-literal=ADMIN_PASSWORD=$$ADMIN_PASSWORD \
	  --dry-run=client -o yaml \| kubectl apply -f -; \
	echo "Admin: $${ADMIN_EMAIL:-admin@biblioteca.dev} / $$ADMIN_PASSWORD  (guárdalo)"

ghcr-secret: ## Pull secret para imágenes privadas de GHCR (GHCR_USER, GHCR_TOKEN con read:packages)
	$(SSH) "kubectl -n biblioteca create secret docker-registry ghcr --docker-server=ghcr.io \
	  --docker-username=$(GHCR_USER) --docker-password=$(GHCR_TOKEN) --dry-run=client -o yaml | kubectl apply -f - && \
	  kubectl -n biblioteca patch serviceaccount default -p '{\"imagePullSecrets\":[{\"name\":\"ghcr\"}]}'"

deploy: ## Renderiza k8s/ con REGISTRY/TAG/DOMAIN y lo aplica en el clúster
	@test -n "$(EC2_IP)" || (echo "No hay EC2_IP (¿corriste make tf-apply?)"; exit 1)
	$(KUSTOMIZE) | $(RENDER) | $(SSH) kubectl apply -f -
	$(KUBECTL) rollout status deploy --timeout=180s

seed: ## Ejecuta el Job de seeding (100 libros) en el clúster
	$(KUBECTL) delete job seed-books --ignore-not-found
	$(RENDER) k8s/seed-job.yaml | $(KUBECTL) apply -f -
	$(KUBECTL) wait --for=condition=complete job/seed-books --timeout=120s
	$(KUBECTL) logs job/seed-books

status: ## Pods, servicios e ingress
	$(KUBECTL) get pods,svc,ingress -o wide
k-logs: ## Logs de un deployment (d=catalog-service)
	$(KUBECTL) logs -f deploy/$(d)
ssh: ## SSH a la EC2
	$(SSH)

# =============================== TLS =================================
.PHONY: tls-selfsigned tls-certbot
tls-selfsigned: ## Certificado autofirmado (OpenSSL) → Secret biblioteca-tls. Ver docs/TLS.md
	mkdir -p certs
	openssl req -x509 -nodes -newkey rsa:2048 -days 30 \
	  -keyout certs/tls.key -out certs/tls.crt \
	  -subj "/CN=$(DOMAIN)" -addext "subjectAltName=DNS:$(DOMAIN)"
	scp certs/tls.crt certs/tls.key ubuntu@$(EC2_IP):/tmp/
	$(SSH) 'kubectl -n biblioteca create secret tls biblioteca-tls --cert=/tmp/tls.crt --key=/tmp/tls.key \
	  --dry-run=client -o yaml | kubectl apply -f - && rm /tmp/tls.crt /tmp/tls.key'

tls-certbot: ## Let's Encrypt (Certbot webroot, sin downtime) + renovación automática. EMAIL=...
	@test -n "$(EMAIL)" || (echo "Uso: make tls-certbot EMAIL=tu@correo"; exit 1)
	scp scripts/certbot-k8s-deploy-hook.sh ubuntu@$(EC2_IP):/tmp/
	$(SSH) 'sudo install -D -m 755 /tmp/certbot-k8s-deploy-hook.sh /etc/letsencrypt/renewal-hooks/deploy/k8s-secret.sh && \
	  sudo certbot certonly --webroot -w /var/www/certbot -d $(DOMAIN) \
	    --email $(EMAIL) --agree-tos --non-interactive --deploy-hook /etc/letsencrypt/renewal-hooks/deploy/k8s-secret.sh'

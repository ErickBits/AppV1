# Guía TLS — OpenSSL + Certbot + NGINX Ingress

Objetivo: servir `https://<tu-dominio>` con un certificado válido de Let's Encrypt, renovado
automáticamente y **sin cortar el servicio**. Costo: $0 (sin ACM, sin ALB, sin Route 53).

```
                      ┌──────────────── EC2 (K3s) ───────────────────────────┐
Internet :80/:443 ──► │ NGINX Ingress ──► /.well-known/acme-challenge ──► acme-solver (pod)
                      │      │                                     ▲ hostPath /var/www/certbot
                      │      │ TLS: Secret biblioteca-tls          │
                      │      └──► /, /api/*  → servicios           certbot (host, snap)
                      │                ▲                           │ deploy-hook
                      │                └──── kubectl apply ◄───────┘
                      └──────────────────────────────────────────────────────┘
```

## 0. Requisitos

- `make tf-apply` terminado y `make wait-k3s` respondiendo.
- Un dominio que apunte a la Elastic IP. Si no tienes uno, usa **nip.io** (gratis, sin registro):
  `make tf-output` → `nip_io_domain = "3-91-10-20.nip.io"`. Cualquier subdominio `A-B-C-D.nip.io` resuelve a `A.B.C.D`.
  - Si Let's Encrypt responde con *rate limit* para nip.io, usa la variante equivalente `3-91-10-20.sslip.io`.
  - Con dominio propio: crea un registro `A` → EIP en tu proveedor DNS y pasa `DOMAIN=biblioteca.midominio.com` a cada `make`.
- La app ya desplegada: `make deploy` (el Ingress incluye la ruta del solver ACME).

## 1. Certificado autofirmado con OpenSSL (arranque y desarrollo)

El Ingress referencia el Secret `biblioteca-tls`. **Si el Secret no existe, NGINX rechaza el handshake TLS**,
así que primero creamos uno autofirmado. Además sirve para el entorno local.

```bash
make tls-selfsigned
```

Esto ejecuta, paso a paso:

```bash
# 1. Llave privada RSA 2048 + certificado X.509 autofirmado válido 30 días.
#    -nodes: llave sin passphrase (NGINX debe leerla sin intervención).
#    subjectAltName es obligatorio: los navegadores modernos ignoran el CN.
openssl req -x509 -nodes -newkey rsa:2048 -days 30 \
  -keyout certs/tls.key -out certs/tls.crt \
  -subj "/CN=$DOMAIN" -addext "subjectAltName=DNS:$DOMAIN"

# 2. Inspeccionar lo que se generó
openssl x509 -in certs/tls.crt -noout -subject -issuer -dates -ext subjectAltName

# 3. Guardarlo como Secret de tipo kubernetes.io/tls (claves tls.crt / tls.key)
kubectl -n biblioteca create secret tls biblioteca-tls \
  --cert=tls.crt --key=tls.key --dry-run=client -o yaml | kubectl apply -f -
```

Prueba: `curl -vk https://$DOMAIN/health` debe responder (con `-k`, porque el certificado no es de confianza).
El patrón `--dry-run=client -o yaml | kubectl apply` hace que el comando sea idempotente: crea o actualiza.

## 2. Certificado real con Certbot (Let's Encrypt, HTTP-01 webroot)

```bash
make tls-certbot EMAIL=tu@correo.com
```

Qué hace y por qué funciona sin downtime:

1. Instala `scripts/certbot-k8s-deploy-hook.sh` como *deploy hook* en
   `/etc/letsencrypt/renewal-hooks/deploy/` (Certbot lo ejecuta después de cada emisión o renovación exitosa).
2. Ejecuta en la EC2:
   ```bash
   sudo certbot certonly --webroot -w /var/www/certbot -d $DOMAIN \
     --email $EMAIL --agree-tos --non-interactive \
     --deploy-hook /etc/letsencrypt/renewal-hooks/deploy/k8s-secret.sh
   ```
3. Certbot escribe el token en `/var/www/certbot/.well-known/acme-challenge/<token>`.
4. Let's Encrypt pide `http://$DOMAIN/.well-known/acme-challenge/<token>` → NGINX Ingress → Service
   `acme-solver` → pod NGINX que monta `/var/www/certbot` (hostPath, solo lectura) → responde el token.
   - Si el Ingress redirige HTTP→HTTPS, Let's Encrypt sigue la redirección y **no valida el certificado
     durante el desafío**, así que el autofirmado del paso 1 basta.
5. El deploy hook reemplaza el Secret `biblioteca-tls` con `fullchain.pem` y `privkey.pem`. NGINX Ingress
   detecta el cambio del Secret y recarga en caliente.

> ¿Por qué no `certbot --standalone`? Necesita escuchar en el puerto 80, que ya ocupa el Ingress. Habría que
> detener el Ingress en cada renovación. Con `--webroot` el Ingress sigue sirviendo tráfico.

> ¿Por qué no `certbot --nginx`? Ese plugin edita un NGINX instalado en el host. Aquí NGINX corre dentro de
> Kubernetes y su configuración se genera a partir de recursos Ingress, así que el puente es el Secret.

## 3. Verificación

```bash
# Cadena y fechas emitidas por Let's Encrypt
echo | openssl s_client -connect $DOMAIN:443 -servername $DOMAIN 2>/dev/null \
  | openssl x509 -noout -issuer -subject -dates

# HTTP debe redirigir a HTTPS y HTTPS debe incluir HSTS
curl -sI http://$DOMAIN  | grep -iE '^(HTTP|location)'
curl -sI https://$DOMAIN | grep -i strict-transport-security
```

Opcional: analiza el resultado en https://www.ssllabs.com/ssltest/.

## 4. Renovación automática

El snap de Certbot instala un timer de systemd que corre dos veces al día y renueva cuando faltan menos de 30 días.

```bash
make ssh
systemctl list-timers | grep certbot        # timer activo
sudo certbot renew --dry-run                 # simula la renovación completa (incluye el desafío)
sudo journalctl -t certbot                   # logs del deploy hook ("biblioteca-tls updated ...")
```

`--dry-run` no ejecuta los deploy hooks. Para probar el hook a mano:
`sudo RENEWED_LINEAGE=/etc/letsencrypt/live/$DOMAIN /etc/letsencrypt/renewal-hooks/deploy/k8s-secret.sh`.

## 5. Problemas comunes

| Síntoma | Causa / solución |
|---|---|
| `Timeout during connect` en Certbot | El puerto 80 no está abierto en el Security Group o el DNS no apunta a la EIP (`dig +short $DOMAIN`). |
| `404` en el desafío | No se aplicó `acme-solver` (`make deploy`) o el pod no está Ready (`make status`). |
| `too many certificates already issued` | Rate limit de Let's Encrypt para el dominio compartido: usa `sslip.io` o un dominio propio. Para pruebas, agrega `--test-cert` (staging). |
| El navegador sigue mostrando el autofirmado | Revisa `kubectl -n biblioteca get secret biblioteca-tls -o yaml` y que `spec.tls.hosts` del Ingress coincida con el dominio. |

## Alternativa más "cloud-native": cert-manager

En producción real se usaría **cert-manager** con un `ClusterIssuer` ACME: emite y renueva certificados como
recursos de Kubernetes, sin Certbot en el host. Aquí elegimos Certbot + OpenSSL porque es el requerimiento del
curso y porque hace visible cada pieza del proceso (llave, CSR, desafío, cadena, Secret).

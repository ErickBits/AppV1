#!/bin/sh
# Certbot deploy hook: runs after every successful issue/renewal and pushes the
# new certificate into the Kubernetes TLS Secret used by the Ingress.
# NGINX Ingress watches the Secret and reloads it without downtime.
set -eu
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
kubectl -n biblioteca create secret tls biblioteca-tls \
  --cert="$RENEWED_LINEAGE/fullchain.pem" \
  --key="$RENEWED_LINEAGE/privkey.pem" \
  --dry-run=client -o yaml | kubectl apply -f -
logger -t certbot "biblioteca-tls updated from $RENEWED_LINEAGE"

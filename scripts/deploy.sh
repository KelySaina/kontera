#!/usr/bin/env bash
# Déploiement sur le VPS, appelé par le CI via SSH (ou manuellement).
# Tire l'image GHCR taguée et (re)lance le conteneur. Idempotent.
set -euo pipefail

cd "$(dirname "$0")/.."

IMAGE_TAG="${IMAGE_TAG:-latest}"
export IMAGE_TAG

# Connexion GHCR seulement si un token est fourni (image privée). Si le package
# GHCR est public, le pull fonctionne sans login.
if [[ -n "${GHCR_TOKEN:-}" && -n "${GHCR_USER:-}" ]]; then
  echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin
fi

echo "==> Pull de l'image kontera:${IMAGE_TAG}"
docker compose -f docker-compose.deploy.yml pull

echo "==> (Re)démarrage du conteneur"
docker compose -f docker-compose.deploy.yml up -d --remove-orphans

# Attente du health-check.
echo "==> Vérification de santé"
for i in $(seq 1 15); do
  if curl -fsS http://127.0.0.1:4330/ >/dev/null 2>&1; then
    echo "OK — kontera répond sur 127.0.0.1:4330"
    docker image prune -f >/dev/null 2>&1 || true
    exit 0
  fi
  sleep 2
done

echo "ÉCHEC — le conteneur ne répond pas sur 127.0.0.1:4330" >&2
docker compose -f docker-compose.deploy.yml logs --tail=50 web >&2 || true
exit 1

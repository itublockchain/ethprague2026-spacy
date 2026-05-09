#!/usr/bin/env bash
# Spacy production deploy on the EC2 host.
#
# Usage (on the EC2 instance, as ec2-user):
#   bash /opt/spacy/ethprague2026-spacy/scripts/deploy.sh
#
# Idempotent. Pulls latest main, rebuilds frontend bundle (Caddy serves it
# bind-mount style — no Caddy restart needed), rebuilds + recreates the API
# container, runs smoke tests against the public HTTPS endpoint.
#
# What it does NOT do (run manually if needed):
#   - prisma migrate deploy        (only when the schema changes)
#   - caddy reload                 (only when Caddyfile changes)
#   - compose up for postgres/caddy  (they keep running across deploys)

set -euo pipefail

REPO=/opt/spacy/ethprague2026-spacy
COMPOSE="docker compose -f $REPO/deploy/docker-compose.prod.yml"
BUN=/home/ec2-user/.bun/bin/bun

log() { printf '\033[1;36m▸ %s\033[0m\n' "$*"; }

# --------------------------------------------------------------------------
log "Pulling latest from git"
cd "$REPO"
git pull --ff-only

# --------------------------------------------------------------------------
log "Refreshing workspace dependencies"
"$BUN" install

# --------------------------------------------------------------------------
log "Rebuilding frontend bundle (sdk + web)"
"$BUN" run --filter @spacy-computer/sdk --filter @spacy/web build

if grep -q "localhost:8080" apps/web/dist/assets/*.js 2>/dev/null; then
  echo "WARNING: localhost:8080 leaked into bundle — check apps/web/.env.production" >&2
fi

# --------------------------------------------------------------------------
log "Rebuilding + recreating API container"
cd "$REPO/deploy"
export DOCKER_BUILDKIT=0 COMPOSE_DOCKER_CLI_BUILD=0
$COMPOSE build api
$COMPOSE up -d --force-recreate api

# --------------------------------------------------------------------------
log "Waiting for API to come up (~10s)"
for i in $(seq 1 20); do
  if curl -sf --max-time 3 https://api.spacy.computer/health >/dev/null; then
    break
  fi
  sleep 1
done

# --------------------------------------------------------------------------
log "Smoke tests"
echo -n "  /health                     "
curl -sf --max-time 5 https://api.spacy.computer/health \
  || { echo "FAIL"; exit 1; }
echo

echo "  /health/attestation:"
curl -s --max-time 8 https://api.spacy.computer/health/attestation \
  | jq -r '"    mock: \(.mock)\n    measurement: \(.measuredBootHash[:32])...\n    ec2InstanceId: \(.ec2InstanceId)"'

echo "  frontend index.html:"
curl -sI --max-time 5 https://spacy.computer/ | head -1

# --------------------------------------------------------------------------
log "Container status"
$COMPOSE ps

log "Done. Tail logs with:"
echo "  docker compose -f $REPO/deploy/docker-compose.prod.yml logs -f api"

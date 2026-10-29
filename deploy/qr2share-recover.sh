#!/bin/bash
set -euo pipefail
# Skip intentional maintenance performed with systemctl stop qr2share.
systemctl is-active --quiet qr2share.service || exit 0
cd /var/www/html/qr2share.com
compose=(docker compose -p qr2share-live -f docker-compose.yml -f deploy/compose.live.yml)
for service in mongo redis app; do
  container="qr2share-live-${service}-1"
  health=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{end}}' "$container" 2>/dev/null || true)
  if [[ "$health" == unhealthy ]]; then
    "${compose[@]}" restart "$service"
  fi
done
"${compose[@]}" up -d --no-build --wait --wait-timeout 180

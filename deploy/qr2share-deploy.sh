#!/bin/bash
set -euo pipefail
umask 077
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
export GIT_TERMINAL_PROMPT=0
unset GIT_DIR GIT_WORK_TREE GIT_CONFIG GIT_CONFIG_GLOBAL GIT_CONFIG_SYSTEM
[[ $EUID -eq 0 && $# -eq 1 && $1 =~ ^[0-9a-f]{40}$ ]] || exit 64
revision=$1
app_dir=/var/www/html/qr2share.com
state_dir=/var/lib/qr2share-deploy
backup_dir=/var/backups/qr2share/releases
image="qr2share:sha-$revision"
install -d -m 700 "$state_dir" "$backup_dir"
exec 9> "$state_dir/deploy.lock"
flock -w 900 9 || { echo 'Another deployment is running.' >&2; exit 75; }
cd "$app_dir"
compose=(docker compose -p qr2share-live -f docker-compose.yml -f deploy/compose.live.yml)
[[ $(git branch --show-current) == main ]] || { echo 'Unexpected production branch.' >&2; exit 1; }
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo 'Tracked production files have local changes; refusing overwrite.' >&2
  exit 1
fi
git fetch --no-tags https://github.com/gocejov/print-app.git refs/heads/main
[[ $(git rev-parse FETCH_HEAD) == "$revision" ]] || { echo 'Stale or non-production revision; refusing deployment.' >&2; exit 1; }
git merge-base --is-ancestor HEAD "$revision" || { echo 'Deployment must fast-forward production.' >&2; exit 1; }
free_kib=$(df --output=avail -k /var/lib/docker | tail -1 | tr -d ' ')
(( free_kib >= 3 * 1024 * 1024 )) || { echo 'At least 3 GiB free disk space is required.' >&2; exit 1; }
# Receive the compressed image directly; no secret or image archive is left in the checkout.
timeout 900 docker load
[[ $(docker image inspect "$image" --format '{{ index .Config.Labels "org.opencontainers.image.revision" }}') == "$revision" ]] || { echo 'Image revision does not match requested commit.' >&2; exit 1; }
[[ $(docker image inspect "$image" --format '{{ index .Config.Labels "org.opencontainers.image.source" }}') == https://github.com/gocejov/print-app ]] || { echo 'Unexpected image source.' >&2; exit 1; }
# A new push may have arrived during upload. Never install a superseded revision.
latest=$(git ls-remote https://github.com/gocejov/print-app.git refs/heads/main | cut -f1)
[[ $latest == "$revision" ]] || { echo 'Revision superseded during image upload; refusing release.' >&2; exit 1; }
previous_revision=$(git rev-parse HEAD)
release_backup="$backup_dir/$(date -u +%Y%m%dT%H%M%SZ)-${revision:0:12}"
install -d -m 700 "$release_backup"
cp -p .env "$release_backup/production.env"
printf '%s\n' "$previous_revision" > "$release_backup/previous-revision"
docker image inspect "$(docker inspect qr2share-live-app-1 --format '{{.Image}}')" --format '{{.Id}}' > "$release_backup/previous-image-id"
# Take a logical application backup before any new application code runs.
docker exec qr2share-live-mongo-1 sh -c 'exec mongodump --quiet --username "$MONGO_INITDB_ROOT_USERNAME" --password "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --db "$MONGO_INITDB_DATABASE" --gzip --archive' > "$release_backup/database.archive.gz"
gzip -t "$release_backup/database.archive.gz"
previous_timer=$(systemctl is-active qr2share-recover.timer || true)
changed=false
restore_timer() {
  if [[ $previous_timer == active ]]; then systemctl start qr2share-recover.timer; fi
}
rollback() {
  rc=${1:-$?}
  trap - ERR HUP INT TERM
  set +e
  if [[ $changed == true ]]; then
    echo 'Release failed; restoring previous application/configuration.' >&2
    git reset --hard "$previous_revision"
    cp -p "$release_backup/production.env" .env
    systemctl reset-failed qr2share.service
    systemctl restart qr2share.service
    curl --fail --silent --show-error http://127.0.0.1:3001/health || echo 'ROLLBACK HEALTH CHECK FAILED; operator intervention required.' >&2
  fi
  restore_timer
  exit "$rc"
}
trap rollback ERR
trap 'rollback 129' HUP
trap 'rollback 130' INT
trap 'rollback 143' TERM
systemctl stop qr2share-recover.timer
# Source updates happen only after the image and database backup are ready.
changed=true
git merge --ff-only "$revision"
python3 - "$image" <<'PY'
from pathlib import Path
import os, sys
p = Path('.env')
lines = [line for line in p.read_text().splitlines() if not line.startswith('QR2SHARE_IMAGE=')]
tmp = p.with_name('.env.deploy.tmp')
tmp.write_text('\n'.join([*lines, 'QR2SHARE_IMAGE=' + sys.argv[1]]) + '\n')
tmp.chmod(0o600)
os.replace(tmp, p)
PY
"${compose[@]}" config --quiet
systemctl reset-failed qr2share.service
systemctl restart qr2share.service
curl --fail --silent --show-error --retry 5 --retry-delay 3 http://127.0.0.1:3001/health
curl --fail --silent --show-error --retry 5 --retry-delay 3 https://qr2share.com/health
curl --fail --silent --show-error --output /dev/null https://qr2share.com/admin/
restore_timer
printf '%s\n' "$revision" > "$state_dir/current-revision"
printf 'Successfully deployed %s; pre-release backup: %s\n' "$revision" "$release_backup"
trap - ERR HUP INT TERM
# Retain the previous image/backup for rollback. Cleanup is an explicit operator task.

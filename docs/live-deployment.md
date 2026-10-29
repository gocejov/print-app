# QR2Share live deployment

Deployment target: `root@realno.live`, application directory `/var/www/html/qr2share.com`, Git branch `dev-qr2share`. The initial deployed checkout is `cc68725` (merge of the tested application changes). The initial prebuilt image was `qr2share:release-3a7efd7`; the source trees of that image commit and the merge commit matched at initial deployment. Automated releases now use `qr2share:sha-COMMIT_SHA`. Inspect the current container image or `/var/lib/qr2share-deploy/current-revision` for the active release.

## Runtime

- Public admin: **https://qr2share.com/admin/**. The site root redirects to `/admin/`.
- Nginx proxies to `127.0.0.1:3001`, forwarding Host and protocol. Port 3000 belongs to the separate Realno Node service and is left unchanged.
- TLS covers `qr2share.com` and `www.qr2share.com`. Certbot's timer renews the certificate automatically. Nginx allows uploads up to 60 MiB.
- The isolated Compose project is **`qr2share-live`**, combining `docker-compose.yml` with [deploy/compose.live.yml](../deploy/compose.live.yml). It runs Node 22 app, MongoDB 7 and Redis 7. Mongo/Redis have no published host ports.
- The server `.env` is root-readable (0600), contains generated session/database secrets, sets `APP_PORT=3001`, `PUBLIC_URL=https://qr2share.com`, allowed HTTPS origins and the prebuilt image tag. Secrets are not tracked in Git or copied into this document.
- The app uses an init process for signal forwarding. Container logs rotate at 10 MiB with three files each; MongoDB's WiredTiger cache is limited to 0.5 GiB on the small host.

The image was built locally and streamed to the server using `docker save | gzip | ssh ... docker load`, avoiding a resource-heavy build on the live host. GitHub Actions now automates releases from `dev-qr2share`; see [CI/CD](ci-cd.md). For a manual recovery release, build an image from the desired checkout, transfer/load it, update `QR2SHARE_IMAGE` in the protected server `.env`, then restart the service. Do not run an unqualified Compose command in this directory: the old project's labels still reference the original pathname. Always use the explicit `qr2share-live` project and both configuration files.

## Startup and recovery

[qr2share.service](../deploy/qr2share.service) is installed in `/etc/systemd/system/`, enabled at boot and ordered after Docker/network readiness. It starts the stack with `up -d --no-build --wait`; initialization failures retry after 15 seconds. Docker and Nginx are enabled at boot. Every new container has `restart: always`, recovering process exits and daemon restarts.

[qr2share-recover.timer](../deploy/qr2share-recover.timer) runs [the recovery service](../deploy/qr2share-recover.service) every minute. Its [script](../deploy/qr2share-recover.sh) restarts unhealthy containers and brings stopped containers back up, waiting for health checks. It skips recovery when the main systemd unit is intentionally stopped. This handles a stopped container as well as a crashed process; health probes do not constitute external uptime monitoring.

```bash
# Status and logs
systemctl status qr2share.service qr2share-recover.timer
journalctl -u qr2share.service -u qr2share-recover.service --since today
cd /var/www/html/qr2share.com
docker compose -p qr2share-live -f docker-compose.yml -f deploy/compose.live.yml ps
docker compose -p qr2share-live -f docker-compose.yml -f deploy/compose.live.yml logs --tail=100

# Apply a loaded image/environment update
systemctl restart qr2share.service

# Intentional maintenance (the watchdog skips a stopped main unit)
systemctl stop qr2share.service
systemctl start qr2share.service
```

The unit uses `RemainAfterExit=yes`; **active (exited)** is expected once the detached containers are healthy. Host reboot was not used as a test because this machine hosts other services; boot enablement and dependencies are checked separately.

## Old system and backups

The old checkout remains `/var/www/html/qr2share.com.old`. The old containers `qr2sharecom-app-1`, `qr2sharecom-mongo-1` and `qr2sharecom-redis-1` are preserved, stopped, and have restart disabled to prevent competing startup. Their original inspect metadata records the earlier policies. Their volumes, including `qr2sharecom_mongo_data`, `qr2sharecom_uploads_data` and `qr2sharecom_redis_data`, were not deleted or used directly by the new stack.

Before touching the old database, its stopped MongoDB volume was archived into `/var/backups/qr2share/pre-migration/mongo-data.tar.gz`. Uploads, original container metadata, old environment and Nginx configuration were also backed up. The directory is mode 0700 and backup files are 0600 because metadata/environment include credentials. Archives were downloaded to `/home/goce-jovanchevski/Documents/realno-server-backups/qr2share-pre-migration/` on the development machine and their SHA-256 checks passed. Keep both locations private.

The physical archive was restored into **`qr2share-live_mongo_data`**, and uploads into **`qr2share-live_uploads_data`**, before starting new services. These restored volumes are marked external in the live override to protect them from Compose removal. New Redis/image-upload volumes belong to the isolated project. A logical application archive is also stored at `/var/backups/qr2share/pre-migration/application.archive.gz`. The new database root password was rotated independently; the original database and its credentials remain unchanged.

The restored database contained only the `qr2share` application database (besides MongoDB's system databases). Its users/files/products/qrcodes/statistics collections were all empty. No customer records or media files were found to migrate. The new admin starts with registration; no default account or shared password was created.

To recover the original system, stop the new systemd service before starting old containers and verify the original configuration/port mapping from the protected backup. Do not run `docker compose down -v`, prune volumes/images indiscriminately, or delete old folders as a rollback step.

## Capacity and checks

The host originally had a full 38 GiB root filesystem, predominantly timelapse files. The separately authorized timelapse download/removal continues independently; deployments must keep free-space headroom for MongoDB, Docker image loading and uploads. Image loading briefly exhausted disk headroom and MongoDB restarted; it recovered once temporary load storage was released. Keep an eye on `df -h /` before updates. Log rotation limits the new stack's container logs but does not enforce retention for the separate Realno timelapse service.

Production verification covers HTTPS/admin routing, secure-session registration, file/product/category/weighted-campaign QR creation, public redirects and scan details. A full stack restart checks database/session persistence; a killed app process checks Docker crash recovery; a stopped app checks the watchdog recovery command. Verification uses temporary records that are removed afterward. See [runtime review](runtime-review.md) for the final check results.

## Automatic release path

A successful production-branch push builds `qr2share:sha-COMMIT_SHA` in GitHub Actions. The restricted deployment helper validates the latest revision, saves a private database/configuration backup, updates the clean checkout and image tag, and restarts this existing systemd stack. Failed releases restore the previous application configuration. Root-owned deployment helpers and the dedicated SSH account are separate from the application container; credentials remain in protected server/GitHub storage. See [pipeline operations](ci-cd.md).

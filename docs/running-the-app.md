# Running the app

## Local development with nvm

Use Node 22, recorded in `.nvmrc`:

```bash
source "$HOME/.nvm/nvm.sh"
nvm use 22
npm ci
npm ci --prefix client
npm run build:client
npm run dev
```

If Node 22 is not installed, run `nvm install 22` first. Run commands from the repository root. `npm ci` installs the lockfile dependencies; it is only needed when setting up or updating dependencies. `npm run dev` uses nodemon and ts-node, watching only `src/`. For React hot reload, run `npm run dev:all` and open http://127.0.0.1:5173/admin/. The built panel is served at http://127.0.0.1:3000/admin/.

MongoDB and Redis must be reachable before using the application. The current production Compose file does not publish their ports for a host-running Node process. Existing local containers are a separate setup; confirm their port mappings rather than assuming that `docker compose up mongo redis` makes them available on localhost.

Configure local `.env` using actual credentials and an existing database:

```dotenv
HOSTNAME=127.0.0.1
PORT=3000
NODE_ENV=development
MONGO_URI=mongodb://USERNAME:PASSWORD@127.0.0.1:27017/DATABASE?authSource=admin
REDIS_URL=redis://127.0.0.1:6379
SESSION_SECRET=replace-with-a-long-random-local-secret
CORS_ORIGIN=http://localhost:3001
PUBLIC_URL=http://127.0.0.1:3000
```

These are placeholders, not working credentials. URL-encode special characters in MongoDB credentials. Keep `.env` private. [.env.example](../.env.example) contains the production Compose inputs, which differ from direct Node configuration.

| Variable | Direct Node behavior | Compose behavior |
| --- | --- | --- |
| `HOSTNAME` | Listener address, default `127.0.0.1` | Set to `0.0.0.0` inside container |
| `PORT` | Listener port, default 3000 | Set to 3000 inside container |
| `APP_PORT` | Not read by application | Host loopback port, default 3000 |
| `MONGO_URI` | Database connection string | Constructed from `MONGO_ROOT_USERNAME`, `MONGO_ROOT_PASSWORD` and `MONGO_DATABASE` |
| `REDIS_URL` | Redis URL, default localhost:6379 | Set to `redis://redis:6379` |
| `SESSION_SECRET` | Session signing secret; development fallback exists | Required |
| `NODE_ENV` | Controls session cookie policy | Set to production |
| `CORS_ORIGIN` | Comma-separated browser origins; default localhost:3001 | Required |
| `PUBLIC_URL` | Swagger server URL and all newly generated QR scan-link origins | Required; controls new QR links, including creation from existing products |

`HOSTNAME` can already exist in the shell environment. Dotenv does not override existing variables by default; set it explicitly if the listener binds an unexpected address.

## Verify operation

```bash
curl http://127.0.0.1:3000/health
curl http://127.0.0.1:3000/api/products
docker ps --format '{{.Names}} {{.Status}} {{.Ports}}'
```

Health returns `{"status":"ok"}`. A successful authenticated collection read additionally exercises a MongoDB query. Health itself does not probe MongoDB or Redis. Open `/crud/` for the JSON CRUD interface and `/api-docs/` for Swagger; the current routes have no Swagger annotations, so the UI may have no operations.

For compiled execution:

```bash
npm run build
npm start
```

Build compiles `src/` to `dist/` and bundles/type-checks `client/` into `public/admin/`. Install client dependencies before building. Restart compiled execution after rebuilding. `npm test` runs password/validation tests and skips the integration suite unless `TEST_MONGO_URI` is set. To run integration checks against local test dependencies:

```bash
TEST_MONGO_URI='mongodb://USERNAME:PASSWORD@127.0.0.1:27017/admin?authSource=admin' \
TEST_REDIS_URL='redis://127.0.0.1:6379' npm test
```

The integration suite creates a uniquely named `qr2share_auth_test_...` database, a unique Redis namespace and an uploaded fixture, then removes those artifacts. The MongoDB account must be able to create/drop that test database. Use local test services; the test database name replaces any database in `TEST_MONGO_URI`.

Management collection reads now require a session cookie. Use the [authentication examples](authentication.md); an unauthenticated 401 is expected. `SESSION_KEY_PREFIX` optionally changes the Redis session/rate-limit/campaign-selection namespace (default `sess:`). Changing it signs out existing sessions and invalidates outstanding campaign selections.

## Production Compose

Follow the [root deployment instructions](../README.md). Configure `.env.example` values in `.env`, then:

```bash
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 app
```

Compose waits for healthy MongoDB and Redis before starting the API. The app port binds only to `127.0.0.1`; use an HTTPS reverse proxy. Production secure cookies require HTTPS. Forward the intended Host and protocol because QR and playback URLs are constructed from incoming requests.

Named volumes contain persistent data. `docker compose down` stops the stack without deleting them. `docker compose down -v` deletes the volumes and their data.

The legacy `npm run mongodb` script relies on a separate `custom-mongo` image and hard-coded configuration. It is not equivalent to the current Compose deployment.

## Troubleshooting

| Symptom | Checks |
| --- | --- |
| `EADDRINUSE` on port 3000 | Use `ss -ltnp '( sport = :3000 )'` to identify the owner. Stop the intended process, or choose another `PORT`. Do not terminate unidentified processes. |
| MongoDB server-selection timeout | Check container state, published port, host reachability, VPN/firewall and URI. An internal container ping alone does not prove host access. |
| MongoDB authentication error | Check credentials, URL escaping and `authSource` against the actual database setup. |
| Redis errors or hanging requests | Check `REDIS_URL` and connectivity. Session middleware uses Redis on requests. |
| Empty arrays | The selected database may have no records. Confirm the database name; startup does not import seed data. |
| QR generation fails | Check the logo asset, product/file/owner references and filesystem access. A QR document may already have been inserted before rendering fails. |
| A scan works locally but not from a phone | Check the stored URL: localhost points to the phone itself. Use a reachable hostname and listener/proxy configuration. |
| Video not found | Check the product path and actual video bytes; database metadata does not include the video contents. |

Earlier investigation observed host-to-container MongoDB and Redis timeouts while MongoDB responded internally. VPN routing was present, but a VPN cause was not confirmed. The later running server passed read checks; a previous app on port 3000 was also reported by the user. Port ownership and database connectivity are separate checks.

## React browser tests

See [admin verification](admin-panel.md#verification) for `npm run test:ui`, its isolated database/Redis fixture and Chrome requirements. Docker builds the admin panel automatically.

## User image/video storage

Images upload to `uploads/media-images/` (10 MiB; JPEG/PNG/WebP/GIF) and videos to the existing `uploads/videos/` (50 MiB). These directories must be writable. Compose mounts `image_uploads_data` for uploaded images alongside the existing video volume; user uploads are excluded from Docker build context and Git. Branding stays under `uploads/images/`. Back up both upload volumes with MongoDB. See [content lifecycle](content-workflow.md#deletion-and-persistence).

## Campaign runtime

Categories and campaigns use existing MongoDB/Redis services, with no new environment variables, dependencies or upload volumes. Existing product QR documents need no migration. Rebuild/restart compiled execution to load the new backend routes. Redis holds 30-minute campaign media tickets; a Redis reset invalidates open campaign media pages, which require a fresh scan. Back up the new collections alongside existing MongoDB data. See [campaigns](campaigns.md).

Campaign weights and detailed scan analytics also use existing services and need no migration/configuration. Rebuild frontend assets and restart compiled execution after updating. Existing campaigns default to equal weights; older scans remain visible with their originally recorded fields. See [weights](campaign-weights.md) and [analytics](analytics.md).

## Existing live host

For `realno.live`, use the explicit `qr2share-live` Compose project and systemd units described in [live deployment](live-deployment.md). It uses host port 3001, a prebuilt image, restored external volumes, HTTPS and a recovery timer. Avoid unqualified Compose commands because the preserved old containers reference the same original checkout path.

## Automated releases

Every branch push runs lint, build and isolated integration/browser checks. Successful `main` pushes deploy through GitHub Actions using restricted SSH, immutable images, backups, health checks and rollback. See [CI/CD](ci-cd.md).

Browser recognition uses a signed first-party cookie and owner-scoped hashes. Optional `VISITOR_SECRET` is forwarded by Compose and defaults to `SESSION_SECRET`; keep it stable across deployments to preserve recognition. See [visitor recognition](visitor-recognition.md).

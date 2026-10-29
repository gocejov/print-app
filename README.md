# QR code 2 share

## System documentation

See [docs/README.md](docs/README.md) for the architecture, API workflows,
Node 22 setup, and a review of the current running system.

## Admin panel

Open **http://127.0.0.1:3000/admin/** for the React workspace. Sign in with your
existing account to upload image/video files or save URLs, attach files to products,
and assign products to dynamic QR codes. Organize products into categories and
build campaigns containing individual products or whole categories. A campaign QR
randomly displays one distinct product per scan, with adjustable product weights
(default 1). See [campaigns](docs/campaigns.md). Replace product files or reassign codes,
download PNGs, pause/resume codes and inspect every recorded scan with metadata,
URL parameters, search, filtering and pagination.

For frontend development:

```bash
nvm use 22
npm ci
npm ci --prefix client
npm run dev:all
```

Open http://127.0.0.1:5173/admin/ for hot reload. `npm run build` builds both
backend and frontend; `npm start` serves the result on port 3000. See
[admin panel documentation](docs/admin-panel.md) for architecture and tests.

## Production deployment (Docker Compose)

The server needs Docker Engine with the Compose plugin, a DNS record pointing to
the server, and an HTTPS reverse proxy such as Caddy or Nginx.

```bash
git clone <repository-url> qr2share
cd qr2share
cp .env.example .env
nano .env
docker compose up -d --build
docker compose ps
docker compose logs -f app
```

Use strong, unique values for `MONGO_ROOT_PASSWORD` and `SESSION_SECRET`. Set
`PUBLIC_URL` to the API's public HTTPS URL and `CORS_ORIGIN` to the browser
frontend's origin. Multiple CORS origins can be comma-separated.

Configure the reverse proxy to forward the public hostname to `127.0.0.1:3000`.
The database, Redis, and API port are not directly exposed to the internet.

Uploaded videos, uploaded images and MongoDB/Redis data are stored in named Docker volumes.
See [Files → Products → QR codes](docs/content-workflow.md) for the full content flow.

```bash
# Deploy an update
git pull --ff-only
docker compose up -d --build

# Inspect health and logs
curl http://127.0.0.1:3000/health
docker compose logs --tail=200 app

# Stop without deleting persistent data
docker compose down
```

Do not run `docker compose down -v` unless you intend to delete the database,
Redis data, and uploaded videos.

# Runtime review

Review date: 2026-10-29, Europe/Skopje. This combines initial read-only checks with source inspection and isolated authentication integration tests. It is a point-in-time report, not ongoing monitoring.

## Observed runtime

| Check | Observed result |
| --- | --- |
| HTTP listener | Node v22.22.0 executable, bound to `127.0.0.1:3000` |
| `GET /health` | HTTP 200, `{"status":"ok"}` |
| `GET /crud/` | HTTP 200 HTML |
| `GET /api-docs/` | HTTP 200 HTML |
| `GET /api/users` | HTTP 200, empty array |
| `GET /api/files` | HTTP 200, empty array |
| `GET /api/products` | HTTP 200, empty array |
| `GET /api/qrcodes` | HTTP 200, empty array |
| `GET /api/statistics` | HTTP 200, empty array |
| Redis container `PING` | `PONG` from `dev-redis` |

Successful collection reads demonstrate that the running HTTP process can query its configured MongoDB database. Empty arrays mean these reads returned no records; they do not prove that other databases are empty. The Redis ping verifies the container internally, rather than an independently tested app-to-Redis session lifecycle.

The user reported stopping a previous application on port 3000 before this review. Earlier MongoDB timeouts were not reproduced by these collection reads. Earlier VPN suspicion remains unconfirmed.

## Authentication update and verification

The table above is the **pre-authentication baseline**. Collection endpoints now return 401 without a valid login cookie. Node 22 type checking and unit tests pass. The isolated integration suite passed with real MongoDB and Redis and covered:

- Registration, duplicate email handling, password hashing and password-free responses.
- Login, session rotation, logout and rejection of incorrect or operator-injected credentials.
- Scoped account/resource reads, updates and deletes across two independent accounts.
- Cross-account file/product/QR references and rejected ownership/field/operator tampering.
- Permitted URL validation, cross-origin write rejection and upload ownership checks.
- Actual upload metadata/bytes, QR generation, public web redirects and scan statistics.
- Populated account responses without passwords, password changes, and invalidation of other sessions.
- Rejection of a deleted account’s sessions and authentication rate limiting.

Tests used a unique temporary database, Redis prefix and upload fixture, then removed those artifacts. Existing application data was not modified. Video encoding/playability, browser interactions, HTTPS/proxy deployment, load behavior and production cookie behavior were not exercised.

## Changes completed

| Area | Current behavior |
| --- | --- |
| Authentication | Session-based registration/login/logout/me, with authenticated management routes |
| Ownership | Account-scoped reads/writes, owned reference checks, immutable ownership and restricted writable fields |
| Passwords | Salted scrypt hashing, bcrypt compatibility, hidden query/JSON password fields, current-password checks for sensitive updates |
| Session lifecycle | Session rotation, one-day cookies, no anonymous session allocation, version-based revocation after password changes |
| Write protection | Origin checks, JSON/multipart content types and Redis-backed auth attempt limits |
| Generic updates | Scoped atomic query, `$set`, schema validation and updated timestamps |
| Playback helpers | Parameters aligned with controllers; hard-coded alternative QR alias removed |
| QR options | Current account’s populated QR list instead of hard-coded filters |
| Fingerprint/root | Identification runs after JSON parsing; root uses `res.locals.fingerprintData` |
| Async errors | Route wrappers forward rejected promises to a central handler; common request errors use 4xx responses |
| CRUD interface | Login controls, corrected create examples and text-based record rendering |
| Tests | Password/validation unit tests and opt-in isolated HTTP integration coverage |

## Remaining implementation findings

| Area | Current behavior and implication | Source |
| --- | --- | --- |
| Proxy trust | All proxies remain trusted and fingerprint code directly consumes `X-Forwarded-For`. Restrict proxy trust before public deployment. Auth throttling intentionally uses socket IP, so callers behind one proxy share the limit. | `app.ts`, `middlewares/auth.middleware.ts`, `utils/device.fingerprint.utils.ts` |
| Public links | Both QR creation paths use `PUBLIC_URL` when configured, falling back to request Host/protocol. Deployment must control forwarded host/protocol. | `controllers/qrcode.controller.ts` |
| Workflow structure | New dynamic website creation/editing uses a dedicated service. Legacy product/QR controllers still orchestrate older workflows. | `controllers/` |
| Upload consistency | Upload validation/save failures remove the new bytes. Image metadata is checked; videos remain MIME-filtered without transcoding or full content inspection. | `services/upload.service.ts`, `controllers/upload.controller.ts` |
| QR consistency | Product-based creation renders before inserting its QR. The URL shortcut also renders first and uses compensating cleanup; multi-document/physical writes are not transactional. | `controllers/qrcode.controller.ts` |
| Formats | Video markup now uses the stored MIME type. Accepted video formats/codecs are not all supported by every browser; no transcoding is implemented. | `controllers/qrcode.controller.ts` |
| Deletion | Referenced files/products are protected from deletion; unused uploaded file deletion removes bytes. QR deletion still preserves its product/file and statistics. Concurrent reference checks are not atomic. | `services/base.service.ts` |
| URL copies | File URL edits synchronize product URL copies and clear QR overrides. Product file changes synchronize QR file snapshots. These are multiple nontransactional writes. | `controllers/product.controller.ts` |
| Alias resolution | Public playback does not validate the owner alias segment; non-ID QR aliases are not unique. | `controllers/qrcode.controller.ts`, `models/qrcode.model.ts` |
| Analytics | Scan counts are not deduplicated; visitor data includes IP and user-agent data. | `controllers/qrcode.controller.ts` |
| Swagger | UI has no route annotations to discover; production image omits the configured source scan directory. | `config/swagger.config.ts`, `Dockerfile` |
| Health | Fixed success response without current database/Redis readiness probes. | `app.ts` |
| Account lifecycle | No verification, password-reset or administrative recovery flow. The existing active flag is not an authentication gate. | `controllers/user.controller.ts` |

Paths are relative to `src/` except `Dockerfile`. See [authentication](authentication.md) for compatibility and migration details.

## React and dynamic QR update

The React admin panel is served at `/admin/`, while `/crud/` remains available. Dynamic website QR creation/editing, pause/resume and immutable scan-link/image behavior were added with account-scoped API checks. Timestamp defaults now use Date.now so new records get their actual creation time rather than module-load time. See [admin panel](admin-panel.md) for frontend architecture, browser scenarios and remaining scale limitations.


React verification passed: server/client production compilation, Docker image build, four backend/unit cases (including real dynamic QR API integration), three Chromium browser scenarios, QR PNG decoding against the saved scan URL, and Markdown links/format checks. Browser coverage includes desktop creation/editing/pause/deletion and mobile navigation/profile/deep links.

During the Docker build, the unchanged backend dependency lockfile reported 50 production audit vulnerabilities (2 low, 5 moderate, 40 high, 3 critical). The new client install reported no audit vulnerabilities. Backend dependency remediation is separate work; no automatic or forced upgrades were applied.

## Restored files/products workflow

The current React panel supports image/video uploads and URL files as distinct records, named products with attached files, and QR assignment to existing products. Product file replacement and QR reassignment preserve printed codes and scan links. Images have private management previews plus public QR image pages. An additional `image_uploads_data` Docker volume persists user images.

Five backend/unit test cases and four Chromium scenarios passed, including reference/ownership checks, image upload/validation/display, real MP4 playback, reusable files/products, URL updates, stable QR assignment and guarded physical file deletion. Test artifacts were isolated and cleaned up. Earlier website-only descriptions above refer to the initial UI iteration; the current model is documented in [content-workflow.md](content-workflow.md).

## Categories and campaigns update

The initial campaign update passed eight backend/unit cases and six Chromium desktop/mobile scenarios, with successful server/client compilation and a Docker image build (`qr2share:admin-check`). Local health and the Categories/Campaigns admin deep links returned HTTP 200. The earlier counts above are historical snapshots. Categories preserve reusable product order; campaigns combine categories/direct products and uniformly select one distinct eligible product per scan. Live expansion, ownership, reference guards, empty/paused pools, QR target switching, selected product/campaign statistics and 30-minute pinned media tickets are covered. See [campaign architecture and limitations](campaigns.md). That initial version did not implement weights; the update below adds per-product weights. Scheduling, visitor rotation and a campaign-specific reporting dashboard remain unimplemented. Existing multi-operation race/transaction and pagination limits still apply.

## Product weights and detailed scan analytics

Campaign weights now default to 1 for each distinct product, support positive integer overrides up to 1000, and expose distribution previews. The editor supports probability feedback and an equal reset. The Analytics page adds an all-scans table with all stored fields in a details dialog, QR/search filters, client-side pagination and refresh. New scan events record bounded query parameters and referrer when supplied. Older scans keep their existing metadata. See [weights](campaign-weights.md) and [scan details](analytics.md).

The combined Node 22 build and nine backend/unit cases passed. All eight Chromium scenarios passed: the existing six plus weighted editors and a 27-scan analytics scenario, including mobile layouts. Local health and the analytics admin route returned HTTP 200. Test records use isolated databases/Redis namespaces and are cleaned up. These features add no external dependencies or environment variables; existing audit findings remain unchanged.

## Analytics navigation update

Overview and Scan details now use separate navigation tabs. The scan toolbar has a wider search field, clear-search/reset controls and an independent QR selector. QR action menus, previews and list scan counts link to a URL-backed QR filter, preserving that scope on reload. Backend recording and access policy are unchanged. The production build passed; the existing analytics browser scenario now also exercises tab separation, filter reloads and each QR entry point. See [analytics](analytics.md).

Verification completed: all eight browser scenarios passed across the full run and corrected analytics rerun. The analytics scenario covers tab navigation, QR links, reload persistence, clearing filters and desktop/mobile scan details; server/client production compilation and Markdown link/format checks also passed.

## Live host deployment

`realno.live` now uses the isolated `qr2share-live` project behind HTTPS Nginx on port 3001, with preserved old containers/volumes and checksum-verified pre-migration backups. The copied MongoDB was recovered successfully; all five old application collections were empty. Dedicated systemd startup and recovery units, Docker restart policies, log rotation and automatic TLS renewal are configured. See [live operations](live-deployment.md).

Live verification passed for HTTPS/admin routing, secure registration, category/product weights, campaign redirects, scan details, actual image/video uploads/previews and upload cleanup. A controlled full-stack restart preserved MongoDB records and Redis authentication; forced app termination recovered under Docker, and a stopped app recovered under the watchdog service. Temporary verification fixtures were removed. Boot startup and Certbot/recovery timers are enabled; no host reboot was performed.

## CI/CD setup

Added ESLint/React hooks checks, actionlint/ShellCheck validation, Node 22 pinning and GitHub Actions jobs for all-branch lint/build/integration/browser checks. Production is restricted to successful `dev-qr2share` releases through a protected environment and forced-command SSH key. Deployment uses image SHA/source verification, a server lock, free-space checks, pre-release database/configuration backups and application rollback. Local lint/build, nine backend and eight browser cases passed. See [CI/CD](ci-cd.md) and actual GitHub run status for hosted execution.

# React admin panel

The main interface is **http://127.0.0.1:3000/admin/**. It uses the existing Redis session login, with a registration form for new accounts. The legacy JSON CRUD page remains at `/crud/`.

## Features

- Overview with real totals for QR codes, recorded scans and active codes.
- QR library with search, image/video/website/campaign filters, status filters, name/date/scan sorting and list/grid layouts.
- Separate Files and Products sections: upload images/videos or save URLs, attach them to named products, then assign products to QR codes.
- Product-page mode with an ordered image/video gallery and optional primary action button; direct file delivery remains the default. See [product pages](product-pages.md).
- Creation of named dynamic QR codes from existing products or campaigns.
- Ordered category lists, product category filters and campaigns mixing products with categories, with random playback.
- Product file replacement and QR product reassignment without changing the saved QR image or scan link.
- Pause/resume, PNG download, scan-link copy, detail preview and confirmed deletion.
- CSV export of the currently filtered library, with spreadsheet formula-prefix protection.
- Daily scan charts for 7, 14 or 30 local-calendar days; all-time top codes and country counts.
- Separate analytics Overview, Visitors and Scan details tabs, with metadata/parameter search, QR filters, 25-row pages, manual refresh and full field/value details.
- Browser-enriched scan details, including timezone/viewport/network hints and location only with previously granted browser permission.
- View scans links in each QR action menu, preview and list scan count, opening the prefiltered details tab.
- Per-product campaign weights (default 1), probability previews and equal-weight reset.
- Profile/alias editing and password changes.
- Responsive mobile navigation, labeled form controls, native modal focus management, keyboard dismissal, visible focus, reduced-motion support, loading states, retry states and notifications.

The panel supports image, video and URL files end to end. Files can be reused across products, and products across QR codes. The main creation dialog selects an existing product or campaign; it does not silently create a file/product from a website link. See [Files → Products → QR codes](content-workflow.md). There is no organization-wide administrator role: the panel manages the signed-in account's records.

## React architecture

```text
client/
  src/
    app/                  # Router, authenticated shell, query provider and notifications
    components/           # Brand, modal, QR preview and error boundary
    features/
      auth/               # Login/registration and session query
      assets/             # File library, uploads, previews, products, attachments and queries
      collections/        # Categories, mixed campaigns, ordered editors and queries
      codes/              # Library, product assignment, creation/editing dialog and workspace queries
      analytics/          # Daily charts and summaries
      settings/           # Profile/password forms
    lib/                  # Typed API client, domain types and formatting
    styles.css            # Design tokens, layout, components and responsive rules
  tests/                  # Playwright browser integration scenarios
  vite.config.ts
```

React 19 and TypeScript render the interface. React Router scopes navigation to `/admin`, and TanStack Query owns server data. Component state owns forms, filters and transient dialogs; derived totals/search results are calculated rather than maintained as duplicate state. Account changes remove other account-specific cached queries while preserving the active session query. An unauthenticated session is represented as `null`, not a retried query failure.

Analytics and settings are lazy-loaded. The API module centralizes credentialed requests, cancellation signals and error responses. Expired sessions return the interface to sign-in and remove account-specific query caches. Sessions stay in HTTP-only cookies, rather than local storage. React renders stored names as text. QR PNG downloads use the image saved by the backend; the creation dialog's destination preview is not the permanent printable QR.

The build includes locally served DM Sans and Manrope variable fonts and Lucide icons. No third-party font request, image service, analytics script or separate hosting is needed.

The component/state organization follows [Thinking in React](https://react.dev/learn/thinking-in-react). Vite's [nested public base configuration](https://vite.dev/guide/build#public-base-path) keeps assets under `/admin/`.

## Development and deployment

Install the two lockfile-based dependency sets:

```bash
nvm use 22
npm ci
npm ci --prefix client
npm run dev:all
```

The backend runs on its configured host/port (normally 127.0.0.1:3000). Vite serves **http://127.0.0.1:5173/admin/** with hot module replacement. API requests are proxied to 3000. The development proxy changes the Host and rebases Origin to the backend origin, so existing session/write-origin checks work. Set `API_PROXY_TARGET` when using a different backend origin. This is a development-only proxy; production serves browser assets and APIs from the same Express origin.

Other commands:

| Command at repository root | Action |
| --- | --- |
| `npm run dev` | Backend only; nodemon watches `src/` |
| `npm run dev:client` | Vite frontend only |
| `npm run build` | Compile backend, type-check React and build its assets |
| `npm run build:server` | Backend compilation only |
| `npm run build:client` | Frontend type check and production build only |
| `npm start` | Run compiled Express server with built admin assets |
| `npm run test:ui` | Browser integration tests; requires isolated test services |

Vite outputs to `public/admin/`. This generated directory is ignored by Git and must be built before serving the panel through Express. Express falls back to its index HTML for extensionless `/admin/*` deep links. The API, public scan paths and legacy CRUD page retain their own routes. `admin` and `crud` are reserved aliases.

Docker installs both dependency sets, builds both applications and copies the built admin assets into the final image. It runs a single Express process, without a production Vite server. Existing Compose volumes and database/Redis services continue to apply.

## Files, products and dynamic QR API

The primary direct-product API flow is:

1. `POST /api/upload/image/:uid`, `POST /api/upload/video/:uid`, or `POST /api/files` with a web URL.
2. `POST /api/products/create/` with `{name,description,fileId}`.
3. `POST /api/qrcodes` with `{name,productId}`.

`PUT /api/products/:id` can replace its owned fileId, and `PATCH /api/qrcodes/:id` can reassign an owned productId. Both preserve the QR image and scan link. The old direct-URL shortcut and override API remain compatible; see [full API inventory](api-and-workflows.md) and [content behavior/persistence](content-workflow.md).

Files/products/categories/campaigns with incoming references cannot be deleted (409). Deleting an unused uploaded file removes its bytes. The UI disables conflicting deletes and asks for confirmation before allowed deletion.

## Verification

On 2026-10-29, all nine backend/unit test cases and all eight Chromium desktop/mobile browser scenarios passed. The production build and Docker image build passed. The downloaded PNG was decoded with jsQR and matched the saved permanent scan URL.

Backend integration tests cover file/product/QR creation and reuse, image validation/delivery, video delivery, URL redirects, scoped previews, cross-account rejection, product file changes, QR reassignment, immutable scan URLs/images, pause/resume and deletion guards. Browser tests additionally verify image rendering and an actual MP4 becoming playable after product replacement. They use an isolated database and Redis namespace.

Browser tests use a separate Express fixture at port 3011, a unique `qr2share_ui_test_...` database and a unique Redis namespace, with cleanup on shutdown. They exercise the actual APIs instead of mocked dashboard data. Set test-service credentials in the environment:

```bash
TEST_MONGO_URI='mongodb://USERNAME:PASSWORD@127.0.0.1:27017/admin?authSource=admin' \
TEST_REDIS_URL='redis://127.0.0.1:6379' npm run test:ui
```

Build first. The test fixture replaces the MongoDB database name; the account must be able to create/drop a temporary database. `CHROME_PATH` defaults to `/usr/bin/google-chrome` and can point to another installed Chromium-compatible executable.

## Current limits

The API currently returns full owned file/product/category/campaign/code/statistic collections. Search, summaries and filtering happen in the browser; server-side pagination and aggregated metrics should precede large deployments. Deleting a QR preserves its product/file and historical statistics. Deleting an unreferenced file removes its uploaded bytes; attached files/products are protected by reference checks. Multi-document synchronization and concurrent reference changes are not transactional. Analytics counts requests, not unique people; chart days use the browser's local timezone. Settings do not implement email changes, password recovery or account verification.

## Campaign management

Categories and Campaigns have dedicated sidebar pages. Editors preserve list order with move controls and accept reusable owned products. Campaigns accept direct products and categories, display the deduplicated eligible count, and can be paused independently of a QR. The QR dialog switches between Single product and Campaign; **Edit QR target** preserves the saved PNG/link. See [campaigns](campaigns.md) for random selection with equal default weights, live category changes, media selection tickets, API bodies and deletion rules. Additional weighted-campaign and analytics desktop/mobile coverage brings the browser suite to eight scenarios.

## Detailed analytics

The lazy analytics feature now includes `scan-table.tsx`, using the shared workspace query and local filter/page/dialog state. The separate Scan details tab shows recorded scans for current owned codes, independently of the Overview chart time window. The active view and QR filter use URL search parameters; direct QR links preselect that code and survive reloads. Details render all actual stored fields, including visitor metadata and new bounded request parameters/referrer. Search/pagination are client-side. See [analytics behavior and limitations](analytics.md); see [campaign weights](campaign-weights.md) for the editor controls and API.

Visitor analytics includes recognized browser/repeat/unrecognized counts, new/returning audience filters and browser scan history. Estimated fingerprints stay separate from cookie IDs; see [visitor recognition](visitor-recognition.md).

Combined evidence and activity counters are available in the [visitor profile views and API](visitor-profiles.md), including expanded browser capability/network hints. These are observed signals for future game/targeting rules, not verified personal interests or an implemented restriction engine.

HTML scans of direct URL products now attempt [automatic iframe delivery](embedded-content.md) after browser collection, with automatic redirect fallback. Explicit product-page mode retains its existing gallery and link/action behavior.

The **Analytics → Visitors** workspace groups scans by recognized browser, with account-wide audience metrics, search, returning/single-scan filters, sorting, pagination and mobile cards. Visitor profiles emphasize readable activity and browser information; advanced evidence remains available. Scan-history links preserve the visitor filter in the URL. See [visitor analytics](analytics.md#visitors-workspace).

See [Visitor-specific QR products](visitor-targets.md) for assigning a different product to a recognized browser while keeping default content for other visitors.

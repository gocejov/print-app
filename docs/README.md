# QR2Share documentation

This documentation describes the current TypeScript source, a local runtime check and authentication integration verification on 2026-10-29. It records implemented behavior; planned features are identified explicitly.

| Document | Contents |
| --- | --- |
| [Automatic URL embedding](embedded-content.md) | Iframe delivery, automatic redirect fallback, readiness messages and browser limits |
| [Files → Products → QR codes](content-workflow.md) | Core content model, uploads, product attachments, QR assignment and persistence |
| [Product pages](product-pages.md) | Multiple media attachments, public product pages and primary action buttons |
| [Loyalty rewards proposal](loyalty-rewards.md) | Proposed qualifying visits, progress, one-time claims and staff redemption |
| [Combined visitor profiles](visitor-profiles.md) | Browser evidence, cross-QR activity counters and future targeting/game rules |
| [Visitor recognition](visitor-recognition.md) | Returning browsers, unique/repeat scan counts, estimated fingerprints and audience filters |
| [Browser metrics](browser-metrics.md) | Automatic pre-redirect browser signals, permitted location and targeting opportunities |
| [Scan analytics](analytics.md) | Visitor workspace, readable profiles, searchable scan table and pagination |
| [Campaign product weights](campaign-weights.md) | Equal defaults, per-product weight controls and probability preview |
| [Categories and campaigns](campaigns.md) | Ordered reusable product lists, mixed campaign entries and random QR playback |
| [React admin panel](admin-panel.md) | Features, React structure, dynamic QR API, build and browser tests |
| [Design notes](design-notes.md) | Visual direction, design guidance and verification limits |
| [Architecture](architecture.md) | Components, startup, middleware, data model and storage |
| [Authentication](authentication.md) | Registration, sessions, ownership, validation and compatibility |
| [API and workflows](api-and-workflows.md) | Routes, request bodies and the upload-to-scan flow |
| [GitHub Actions CI/CD](ci-cd.md) | All-branch lint/tests, protected deployment secrets, release safeguards and rollback |
| [Live deployment](live-deployment.md) | Production paths, independent stack, backups, HTTPS and automatic recovery |
| [Running the app](running-the-app.md) | Node 22, environment, Docker and troubleshooting |
| [Runtime review](runtime-review.md) | Verified behavior, verification limits and implementation gaps |

The existing [root README](../README.md) contains production deployment instructions.

Useful local URLs:

- React admin: <http://127.0.0.1:3000/admin/>
- API health: <http://127.0.0.1:3000/health>
- CRUD interface: <http://127.0.0.1:3000/crud/>
- Swagger UI: <http://127.0.0.1:3000/api-docs/>

The repository still uses `print-prank` in package metadata and Swagger. The implemented application manages files, products, categories, campaigns, QR links and scan statistics.

When behavior, routes, configuration or architecture changes, update the relevant documents in the same change. Keep historical observations distinct from current behavior.

See [Visitor-specific QR products](visitor-targets.md) for assigning a different product to a recognized browser while keeping default content for other visitors.

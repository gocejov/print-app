# QR2Share documentation

This documentation describes the current TypeScript source, a local runtime check and authentication integration verification on 2026-10-29. It records implemented behavior; planned features are identified explicitly.

| Document | Contents |
| --- | --- |
| [Files → Products → QR codes](content-workflow.md) | Core content model, uploads, product attachments, QR assignment and persistence |
| [Scan analytics](analytics.md) | Searchable scan table, all saved details, request parameters and pagination |
| [Campaign product weights](campaign-weights.md) | Equal defaults, per-product weight controls and probability preview |
| [Categories and campaigns](campaigns.md) | Ordered reusable product lists, mixed campaign entries and random QR playback |
| [React admin panel](admin-panel.md) | Features, React structure, dynamic QR API, build and browser tests |
| [Design notes](design-notes.md) | Visual direction, design guidance and verification limits |
| [Architecture](architecture.md) | Components, startup, middleware, data model and storage |
| [Authentication](authentication.md) | Registration, sessions, ownership, validation and compatibility |
| [API and workflows](api-and-workflows.md) | Routes, request bodies and the upload-to-scan flow |
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

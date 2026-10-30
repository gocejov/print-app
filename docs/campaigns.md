# Categories and campaigns

A QR can target one product or one campaign. A campaign contains individual products, reusable categories, or both. Each public scan displays **one randomly selected product**: its image, video or URL. The saved QR image and scan link stay unchanged when you edit the campaign, category membership, or product file.

## Admin workflow

1. Create image/video/URL files and attach them to products as described in [the content workflow](content-workflow.md).
2. Open **Categories** (`/admin/categories`) to create an optional named product list. Select products and use the arrows to arrange their order. Products can belong to several categories. Products can also be filtered by category in the Products section.
3. Open **Campaigns** (`/admin/campaigns`). Add individual products and/or entire categories. Set its name, optional description and active/paused status. The editor shows the number of distinct eligible products.
4. Choose **Create QR code** on the campaign, or choose **Campaign** in the QR creation dialog. Select the campaign and save/download the QR.
5. Use **Edit QR target** to switch an existing code between a product and a campaign without reprinting it.

Categories contain products only; nested categories and campaigns are not supported. Category and campaign entry order is saved for organization. It does not determine the random playback order.

## Random rule and live membership

The only implemented rule is `random`. At each scan the server expands the campaign's current categories, combines them with its direct products and removes duplicate product IDs. Each eligible distinct product defaults to weight 1 (equal chances). Optional campaign product weights change its relative chance using Node's cryptographic `randomInt`; see [weight controls and API](campaign-weights.md).

For example, a campaign containing product A and category `[A, B, C]` has three choices, each with probability 1/3 at default weights. A is counted once. Selection is independent on every scan, so consecutive scans can show the same product. There is no visitor history, rotation guarantee, category weighting, schedule or sequential rule.

Category edits apply to every campaign that references that category. Product edits resolve the current file. Missing/foreign products and missing/foreign/unsupported attached file records are excluded. Physical image/video existence is checked when serving bytes; a missing disk file can still produce a 404 after selection.

Empty categories and campaigns can be saved as drafts. A campaign needs at least one eligible product to create or assign a QR; otherwise the API returns 409. An existing campaign QR also returns 409 if its pool becomes empty. Pausing either the QR or its campaign blocks playback with 410. A paused campaign with a nonempty pool can still be assigned to a QR; scans remain blocked until resumed.

## Data and API

All management routes require the existing account session and write-origin policy. Every product, category and campaign reference must belong to the signed-in account. Ownership is assigned by the server and cannot be edited.

| Method | Route | Behavior |
| --- | --- | --- |
| GET/POST | `/api/categories` | List owned categories / create (201) |
| GET/PUT/DELETE | `/api/categories/:id` | Read / replace editable fields / guarded deletion |
| GET/POST | `/api/campaigns` | List owned campaigns / create (201) |
| GET/PUT/DELETE | `/api/campaigns/:id` | Read / replace editable fields / guarded deletion |
| GET | `/api/campaigns/:id/products` | Current expanded pool as `{count,products,distribution}`, with attached files populated and weight/probability preview |

Category POST/PUT body:

```json
{
  "name": "Summer collection",
  "description": "Optional description",
  "products": ["OWNED_PRODUCT_ID_A", "OWNED_PRODUCT_ID_B"]
}
```

Campaign POST/PUT body:

```json
{
  "name": "Summer campaign",
  "description": "Optional description",
  "rule": "random",
  "status": "active",
  "entries": [
    {"kind": "product", "target": "OWNED_PRODUCT_ID"},
    {"kind": "category", "target": "OWNED_CATEGORY_ID"}
  ]
}
```

Names are required (1–120 characters), descriptions optional (up to 1000). Categories accept up to 200 product references; campaigns accept up to 100 entries. Duplicate references are removed. PUT replaces these fields; send the full editable document, including the entries/products array and desired campaign status. Omitted description becomes empty; omitted campaign rule/status becomes random/active.

`POST /api/qrcodes` accepts `{name,campaignId}` instead of `{name,productId}`. Exactly one target is required. `PATCH /api/qrcodes/:id` accepts `campaignId` or `productId`, optionally with name/status. Assignment clears incompatible target fields and legacy destination overrides. A campaign cannot accept a direct destinationUrl override. Existing product QR documents continue to work without migration.

## One selection per scan

Public scan responses use `Cache-Control: no-store`. URL products redirect immediately. For image/video products the scan page contains a random Redis-backed selection ticket in its media URL:

```text
/l/q/i/QR_ID?selection=OPAQUE_TOKEN
/l/q/v/QR_ID?selection=OPAQUE_TOKEN
```

The ticket lasts 1800 seconds (30 minutes), is bound to that QR, campaign, product and attached file, and uses the `SESSION_KEY_PREFIX` namespace. Repeated media requests, including video requests, serve the selected product rather than drawing again. Each media request rechecks QR/campaign status, current membership and the selected file. Pausing, reassignment, removal or file replacement can invalidate an existing page's media request. Expired/changed selections return 410; rescan to select again. A campaign media URL without a valid selection token is rejected. Redis loss/namespace changes invalidate outstanding tickets; direct-product media URLs remain compatible.

Scan statistics record the selected `product` ID and optional `campaign` ID alongside `qrCode` and visitor data. Media requests add no scan events. Existing analytics still summarize QR scans; there is no new campaign conversion/reporting dashboard.

## Lifecycle and limits

Product deletion is blocked while referenced by a QR, any category or a direct campaign entry. Category deletion is blocked while referenced by a campaign. Campaign deletion is blocked while referenced by a QR. Remove/reassign these references first; the API returns 409 and the UI disables conflicting deletes. Deleting a category/campaign does not delete its products or files.

MongoDB stores the new categories/campaigns collections; Redis stores temporary selection tickets. No additional service, environment variable or upload volume is required. Reference checks and related updates span multiple operations and are not transactional, so concurrent changes can require reconciliation. Lists are currently fetched in full; pagination remains future work.

## Verification

On 2026-10-29, nine backend/unit cases and eight Chromium desktop/mobile scenarios passed across the application. Campaign coverage includes ordering, deduplication, live category edits, ownership, invalid rules, paused/empty pools, pinned image delivery, expired/invalid tickets, reference guards, selected statistics and switching QR targets while preserving the PNG/link. Browser coverage includes desktop category/campaign creation, campaign QR creation and pause/resume, live membership, product filtering, target switching and mobile collection forms. See [test setup](admin-panel.md#verification).

The current suite also covers weighted probabilities and the complete [scan details table](analytics.md). Product weights default to 1 and range from 1 to 1000; category-wide weighting is not implemented.

See [Visitor-specific QR products](visitor-targets.md) for assigning a different product to a recognized browser while keeping default content for other visitors.

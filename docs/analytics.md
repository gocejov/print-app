# Scan analytics and details

Open **Analytics** at `/admin/analytics`. The **Overview** tab contains the daily chart, top QR codes and country summaries. **Visitors** groups recognized browsers into a readable audience table. The separate **Scan details** tab contains the scan table for the signed-in account's existing QR codes. Overview opens by default; `/admin/analytics?tab=scans` opens the scan list directly.

## Scan table

The table defaults to all recorded scans, newest first, with 25 rows per page. The Overview chart's 7/14/30-day selector applies to the chart and its period metric; the Scan details table remains all-time. Use **Search scans** to search stored values (including IDs, IP, browser, fingerprints and query parameters), filter by a QR code, clear the search or all filters, and use previous/next controls to reach every matching record. **Refresh scans** reloads the same account-scoped data; automatic refresh remains once a minute.

Columns show:

- Scan date/time in the browser's local timezone and scan ID.
- QR name and recorded selected product/campaign IDs. Names reflect the current QR record; selected IDs are retained on the scan rather than inferred from today's QR target.
- Recorded IP address and approximate city/region/country, when available.
- Browser/version, operating system/version, device information and browser language (falling back to request language).
- Browser timezone, viewport size and available network/data-saver hints; permission-granted browser coordinates and accuracy shown separately from approximate IP location.
- URL query parameters, preserving repeated parameter names.
- **View details**, which opens a field/value table containing every stored scan field, including nested parameters, hashes, fingerprint, full user-agent string, engine, CPU, screen dimensions, timezone and geographic metadata if present.

Empty, loading and no-match states are explicit. Missing fields are shown as unavailable or not recorded; historical values are not reconstructed. A device type missing from the user-agent parser is not assumed to mean desktop. React renders stored values as text. Wide tables scroll within the panel on mobile; the details table wraps long values.

## Recorded request context

New successful public scans additionally store the following in `data.request`:

```json
{
  "method": "GET",
  "path": "/q/QR_ID",
  "query": [["utm_source", "newsletter"], ["tag", "one"], ["tag", "two"]],
  "referrer": "https://example.com/launch"
}
```

The raw query portion is limited to 8192 characters before decoding; path and referrer are limited to 2048 characters each. Query pairs preserve repeated names and empty values. Referrer is stored only when the request supplies a Referer header; browsers and privacy settings can omit it. No cookies, authentication headers, request body or arbitrary headers are added to this context. Existing fingerprint metadata remains separately stored. HTML browser scans now enrich `data.browser` before playback; screen/timezone fields in the older fingerprint block can still be unknown. See [browser metrics](browser-metrics.md). Old scans have no request snapshot and show **Not recorded** for query parameters.

The existing `GET /api/statistics` response includes this context, so no new endpoint or migration is required. Authentication and ownership checks remain in place; another account cannot list these scans. The initial scan is saved after target resolution; browser enrichment follows before continuation when available. Requests to serve the selected image/video bytes do not create extra scan events.

## Scope and limits

The table lists recorded requests, including repeat visits and test scans, rather than unique people. IP geolocation is approximate and may be missing on local/private addresses. Browser location requires previously granted permission and includes an accuracy estimate. The IP/fingerprint values already retained by the app are visible to the owning account. Query/referrer values are recorded as supplied, so use campaign links appropriate for analytics collection.

Filtering and pagination currently happen in the browser after fetching the full account scan collection. They provide access to all returned records but do not reduce API response size; server pagination and aggregation remain future scale work. Historical statistics for deleted QR codes are retained in MongoDB but are outside the existing account endpoint's current-code scope. There is no new analytics export or campaign reporting dashboard.

## Implementation and verification

`client/src/features/analytics/scan-table.tsx` owns the scan log's local filter/page/dialog state. The existing workspace query supplies codes and scans. `Scan` types describe the known metadata and permit unknown saved fields; the details table recursively renders the actual record rather than a fixed subset. The scan controller stores the bounded request context alongside the existing fingerprint metadata.

A real MongoDB/Redis Playwright scenario records 27 scans and verifies duplicate query parameters, escaped text, browser metadata, referrer/fingerprint detail fields, QR/search filters, page navigation, manual refresh and mobile fit. Its database, sessions and records are isolated and cleaned up by the test fixture. See [test setup](admin-panel.md#verification).

## Open scans from a QR code

In the QR library or overview, choose **View scans** from any QR action menu. The QR preview also includes **View scans**, and the list view's scan count links to that QR's scan details. All entry points open `/admin/analytics?tab=scans&qrCode=QR_ID`, select that owned QR and show its details list immediately, including a clear empty state for codes with no scans. The URL preserves the QR filter across reloads and supports browser navigation/bookmarking. Choose another QR or clear filters to return to all scans. The free-text search stays local to the mounted scan view.

Search uses a full-width, responsive field with a search icon, a clear-search button and a separate QR filter. Results and clear-all controls sit below the toolbar. Browser tests cover tab separation, reload persistence, clear controls, menu/preview/count entry points, empty filtered results and mobile detail access.

## Unique visitors and repeat scans

Analytics now counts recognized browsers using owner-scoped first-party visitor IDs, with repeat and unrecognized scan counts. Audience filters separate new, returning and unrecognized scans; each recognized scan can open that browser history. Estimated fingerprints are shown separately and never silently merge visitors. See [visitor recognition](visitor-recognition.md) for count definitions, cookie lifetime, privacy preferences and limits.

Combined evidence and activity counters are available in the [visitor profile views and API](visitor-profiles.md), including expanded browser capability/network hints. These are observed signals for future game/targeting rules, not verified personal interests or an implemented restriction engine.

## Visitors workspace

Open **Analytics → Visitors** (`/admin/analytics?tab=visitors`) for one row per confirmed first-party browser ID across the account's current QR codes. It separates recognized browsers, returning browsers (more than one recorded scan in that scope) and unrecognized scans. Unrecognized scans remain in Scan details and are not merged into a fabricated visitor. Fingerprint-only matches are not counted as recognized browsers.

Rows show a short pseudonymous visitor label, single-scan/returning status, scan and distinct-QR counts, the latest available IP location, browser/OS/language, last-seen time, and profile/history actions. Search includes stored observations, IDs and current QR names. Audience filters distinguish all, returning and single-scan browsers. Sorting supports last seen, most scans and newest first-seen browsers; 25 rows appear per page. On mobile, the same rows become labeled cards without horizontal page overflow.

**View profile** opens activity summaries and readable browser facts. Current QR/product/campaign names replace raw IDs when those records are still available. Raw signals and identity evidence remain in a collapsed Advanced disclosure. **Scan history** opens `/admin/analytics?tab=scans&visitor=VISITOR_ID`; its visitor filter survives reloads, can be combined with the QR filter, and is removed by Clear filters. Summary counts in Visitors are account-wide; search/audience filters change the table's result count. Profiles remain account-wide rather than restricted to a scan table filter.

Counts are derived from the same fetched account scan collection. This adds no new tracking, fingerprint matching or game/reward decisions. Pagination/grouping is client-side and retains the existing large-history scaling limits.

In Scan details, click the short visitor label to open its profile. The compact Visitor cell provides **Scan history** and **Similar browsers** links; full hashes stay in the scan details and Advanced profile evidence. Similar-browser groups remain estimates.

See [Visitor-specific QR products](visitor-targets.md) for assigning a different product to a recognized browser while keeping default content for other visitors.

See [QR games: Message circle](games.md) for a game with one QR, named participants, targeted text messages, and a durable inbox. Game targets are separate from product and campaign targets.

## Visitors by QR, campaign, and selected product

In **Analytics → Visitors**, filter by QR code, campaign, and/or product. Counts, repeat activity, first/last activity, and product breakdowns use only the matching scans. Unrecognized scans remain separate; they are not invented visitor identities. QR action menus and campaign cards include **View visitors** shortcuts.

Each recognized visitor row has **View product hits**. It groups recorded selections by QR + campaign + product, showing selection count and last selection time. The matching-scans link retains the visitor and exact selection scope. A full visitor profile still shows the browser's all-time activity across the owner's QR codes.

Campaign membership and product selection come from each stored scan, not the QR's current target or the campaign's current product list. A later target change does not rewrite history. Direct and visitor-specific product selections without a campaign are labeled separately and are excluded when a campaign is selected. Game entries and legacy scans without a product are retained in scan/visitor counts but excluded from product selection breakdowns. Deleted products/campaigns fall back to shortened IDs.

The QR, campaign, and product scope is stored in URL parameters (`qrCode`, `campaign`, `product`), preserved between Visitors and Scan details, and survives reload. **Clear scope** removes these filters. Scan details show readable product and campaign names where available; raw IDs remain in scan details. Overview continues to show all-time/all-QR statistics.

Product hits mean a recorded QR product selection/delivery, not proof that a visitor viewed the content or clicked a link. Existing owner-scoped statistics are reused; this change does not introduce new tracking.

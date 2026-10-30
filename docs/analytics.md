# Scan analytics and details

Open **Analytics** at `/admin/analytics`. The **Overview** tab contains the daily chart, top QR codes and country summaries. The separate **Scan details** tab contains the scan table for the signed-in account's existing QR codes. Overview opens by default; `/admin/analytics?tab=scans` opens the scan list directly.

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

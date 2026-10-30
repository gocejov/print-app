# Combined visitor evidence profiles

The collection layer is intended to supply dynamic activity counters and later game, targeting and restriction rules. It is not limited to loyalty rewards. A profile combines recognition evidence, observed browser/request data and recorded activity across the owner's QR codes.

## Expanded signal collection

In addition to the existing language, timezone, screen, touch, browser/OS, IP location and permission-granted location data, the collector records available logical-processor hints, approximate device memory, available screen size, color depth, pointer/hover support, online state, PDF viewer support, low-entropy browser brands/mobile hints, and network downlink/round-trip-time/type hints. All fields are optional, allowlisted and bounded; unsupported values are omitted. Collection never requests extra permissions or bypasses browser privacy protections.

These signals are browser-reported and can be reduced, spoofed, shared by many devices or change over time. Hardware details are hints, not verified machine specifications. References: [logical processors](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/hardwareConcurrency), [approximate memory](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/deviceMemory), [network information](https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation).

Existing fingerprint version 1 remains unchanged so adding optional observations does not silently invalidate existing fingerprint groups. Profile observations include additional evidence beyond that hash; future fingerprint changes should use a new version. Known cookie identities and similar fingerprints remain distinct evidence types.

## Profile views

In **Analytics → Scan details**, use **View visitor profile** for a recognized browser, or **View fingerprint group** for similar fingerprints. The latter can include multiple recognized browser IDs and is explicitly marked estimated; it does not merge them.

The owner-authenticated endpoint is:

```
GET /api/statistics/visitor-profile/:id?basis=visitor
GET /api/statistics/visitor-profile/:id?basis=fingerprint
```

IDs are 64-character lowercase hex hashes. Basis defaults to `visitor`. Invalid values return 400; missing or another owner's evidence returns 404. Visitors cannot read these profiles without an owner account. Scope is enforced using the current owned QR codes, exactly like the existing statistics endpoint. Responses are not cached.

Profiles are calculated from scan history on request, avoiding a second mutable counter store that could drift from analytics. They contain:

- First and last seen, total scans and additional scans after the first.
- Distinct active UTC dates, scans today UTC, and scans in the trailing seven days.
- Scan counts and last-seen timestamps by QR, selected product and selected campaign.
- UTM-source scan counts.
- Recognized browser IDs and fingerprint variants observed in the selected evidence group.
- Latest browser signals, server-derived request/device metadata and original request context.

Lists are capped at 50 entries; full counts remain where explicitly provided. Product/campaign counters retain selected IDs recorded at scan time. They do not infer historical categories from current category membership. All counters count raw scans, including refreshes; they are not qualifying game/reward events. Profile data is fetched fresh when opened and can be reopened after more scans.

## Foundation for future rules

Activity counters can later support rules such as a maximum number of game attempts per day, offers after repeated product interactions, language/timezone variants, or campaign frequency caps. The rule engine and game events are not implemented here. Restriction/reward decisions need atomic server-side state and explicit business rules rather than trusting browser values or an analytics snapshot.

A product scan is observed activity. It does not prove interest, a purchase, a physical visit or personal identity. Interest scores would need explicitly defined event types, weights, time windows and decay, ideally with voluntary category choices. Future game events can supply starts, completions, scores and claims instead of treating every QR scan as all of those events.

Information such as private browsing history, other sites' cookies, contact details, reliable demographics or exact real-world identity is not exposed by ordinary browser APIs. Location remains permission-controlled. Global Privacy Control disables the new recognition/fingerprint layer; unavailable observations remain missing rather than guessed. See [visitor recognition](visitor-recognition.md) and [browser collection](browser-metrics.md).

## Verification and scale

Tests cover summary windows, activity/source counters, explicitly estimated fingerprint groups, authenticated ownership boundaries and profile dialogs. The implementation currently summarizes the matching scan history in server memory; large histories will need MongoDB aggregation/materialized views and retention controls before high-volume deployments. Deleted QR codes remain outside the existing current-code scope.

## Admin presentation

The Visitors tab provides one row per confirmed browser, readable summary metrics, search/audience/sort controls and responsive mobile cards. Profile dialogs present activity with current resource names and readable browser facts; raw evidence is collapsed under **Technical data & identity evidence**. Activity references fall back to abbreviated IDs when the resource is unavailable. Profiles still use the same owner-scoped endpoint and do not alter recognition or counter semantics. See [Visitors workspace](analytics.md#visitors-workspace).

See [Visitor-specific QR products](visitor-targets.md) for assigning a different product to a recognized browser while keeping default content for other visitors.

## Visitor names

Confirmed visitor profiles have an optional **Visitor name** field. Enter a name and save it to replace the anonymous label in the visitor table, scan table, profile heading, and visitor assignment selector. Names are searchable in the visitor table. Clear the field and save to restore the generated visitor label.

Names are private metadata scoped to the signed-in owner, limited to 120 characters. They do not verify a person's identity, merge browsers, change recognition, or alter scan history and QR assignments. Estimated fingerprint groups cannot be named.

`PATCH /api/statistics/visitor-profile/:visitorId` accepts `{"name":"Alex"}` or `{"name":""}` to clear. A confirmed visitor must exist within your owned QR scan history. The profile and statistics list return the current name; metadata is stored separately in `visitor-labels`, uniquely keyed by owner and visitor ID.

The Visitors table supports QR/campaign/product scopes and a per-visitor **View product hits** breakdown. These counts describe the selected scope; opening the full profile continues to show all-time activity. See [scoped visitor analytics](analytics.md#visitors-by-qr-campaign-and-selected-product).

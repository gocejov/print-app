# Browser metrics before QR playback

Every public QR navigation requesting HTML first receives a visually blank collection document with no branding, message or controls. It records browser signals without visitor login and then opens the current URL, image, video or product page. All existing printed QR links work. API/non-HTML requests keep direct playback and server-only analytics.

## Automatic signals

| Signal | Practical use | Limit |
| --- | --- | --- |
| Browser language and preferred languages | Localized product content | Preference, not nationality |
| Timezone, UTC offset and local hour | Local-time offers and campaign scheduling | User-configurable; not proof of location |
| Screen/viewport dimensions, pixel ratio, touch points, orientation | Mobile layout and media sizing | Browser-reported and potentially reduced/spoofed |
| Browser platform, existing server UA/browser/OS | Playback compatibility and audience device mix | Not a unique person |
| Color scheme and reduced motion | Accessible display preferences | Browser-specific |
| Effective connection type and data saver, if supported | Suggest lighter media | Hints may be absent; not a speed test |
| Referrer origin and existing request UTM parameters | Placement/source attribution | Often absent for camera scans; no new referrer query collection |
| Cookies enabled, automation flag, Global Privacy Control when exposed | Compatibility, traffic quality and privacy preferences | Automation flag is only a hint, not bot detection |
| Collection duration | Monitor collection overhead | Not total page engagement or external-site load time |

These are stored under `data.browser`, separately from server-derived `data.fingerprintData`. The server marks them `source: browser-self-reported` and adds receipt time. Browser fields are untrusted hints and must not authorize access, prove location, identify a person, or enforce eligibility.

## Location

IP-derived country/region/city remains available where the existing geo database has coverage. It is approximate and can reflect a VPN or network exit point.

The visitor chose an automatic flow: **no new location permission prompt**. On secure origins, the collector queries permission state and calls geolocation only when it is already `granted`. It stores latitude, longitude, accuracy in metres, and `permissionGranted: true` when available. Other states include `prompt`, `denied`, `timeout` and `unavailable`. Permission checks that do not finish within the collection window may leave the status unavailable; granted status alone does not guarantee coordinates were obtained. No coordinates are fabricated from timezone or IP.

A first-time visitor will usually have `prompt` status and no precise location. Browser geolocation may use GPS, Wi-Fi or other sources, with accuracy supplied by the browser. It does not guarantee GPS precision. HTTPS and browser permission are required. See [MDN geolocation](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/getCurrentPosition) and [Permissions API](https://developer.mozilla.org/en-US/docs/Web/API/Permissions_API/Using_the_Permissions_API).

## Delivery and safeguards

1. Resolve the target once and save one server scan, retaining original query parameters and request context.
2. Mint a random 48-hex capability in Redis, valid for 10 minutes, scoped to that scan, QR, product and primary file. Campaigns retain their selected product through the existing selection ticket.
3. Serve `/scan/collect.js` in the blank HTML collection document. Browser data collection normally completes promptly, with a 650 ms location budget and 550 ms upload wait. An overall 1400 ms timer bounds the wait once the script starts. The document has an empty body and title, so no interstitial content is displayed. Disabled JavaScript uses an immediate noscript redirect. A three-second HTML refresh also continues if the external script is blocked or never loads.
4. `POST /scan/:token/metrics` enriches only that scan. It requires JSON, rejects cross-origin submissions, allowlists bounded values, rejects invalid coordinates and caps JSON at 8192 characters after parsing. Unknown fields are discarded. Only the first accepted submission writes browser data; retries cannot overwrite it. The capability expires after 10 minutes and is never put in an outbound destination URL.
5. `GET /scan/:token/continue` revalidates QR status and the same current target, then delivers content without recording another scan. Reloading this continuation within its lifetime does not create another scan. Changed or unavailable targets require a fresh scan. A fresh visit to the original QR URL is a new scan.

The script sends metrics with same-origin credentials so the server can confirm its signed first-party visitor cookie. It uses no local storage or canvas/audio probing. A separate, estimated fingerprint is derived from bounded browser signals; see [visitor recognition](visitor-recognition.md). Existing server fingerprint/IP behavior remains unchanged. The collector does not request camera, microphone, contacts, browsing history or location permission. Analytics failure continues to content; Redis capability creation failure falls back to direct playback. If Redis or content dependencies fail at continuation time, the normal error response still applies.

## Analytics and product opportunities

The scan table shows browser language, timezone, viewport and available connection hints. Location shows IP-derived place names separately from browser coordinates and accuracy. Full details and text search include all new values. Older or blocked/JavaScript-disabled scans show missing browser data.

Useful next features, not implemented targeting rules:

- Language-specific product variants with a default fallback.
- Local-time campaign schedules.
- Location-aware offers using permission-granted coordinates, with country/region fallback.
- Lighter image/video variants when data saver or slow-network hints are present.
- Placement comparisons using distinct QR codes or UTM tags on posters, packaging and events.
- Product-page action click events to calculate scan-to-action conversion, and video milestones to measure engagement on our own pages. External-site conversion requires destination-side integration.
- Explicit, optional preferences such as a category selector; these are more trustworthy for interests than guesses from device data.

Age, gender, income, email, phone number, interests, exact identity and browsing history are not available from these browser signals. Repeat scans are not unique people. Returning-browser counts now use a signed first-party identifier with a 180-day cookie lifetime; see [visitor recognition](visitor-recognition.md). Current scan retention/deletion and server-side pagination remain separate future work.

## Verification

Backend integration checks cover bounded payloads, rejected cross-origin writes, invalid coordinates, ignored fields, replay protection, paused QR continuation and one-scan counting. Browser tests cover visitors without an account/session, normal redirects, already-granted geolocation, blocked metric uploads, blocked collection scripts, JavaScript-disabled fallback, and campaign continuation without a redraw. Existing public image/video/product-page flows remain covered by the full browser suite.

Combined evidence and activity counters are available in the [visitor profile views and API](visitor-profiles.md), including expanded browser capability/network hints. These are observed signals for future game/targeting rules, not verified personal interests or an implemented restriction engine.

The collection document still requires a browser navigation and may briefly appear blank while the destination loads; collecting browser-side data before an external redirect cannot guarantee zero transition time. No permission prompts are introduced.

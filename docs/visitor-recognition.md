# Visitor recognition and unique scan counts

QR2Share recognizes a returning **browser**, without requiring an account. It cannot determine whether two devices belong to the same person, or whether multiple people share one browser.

## Identity and fingerprint

A successful HTML scan sets a random, signed `qr2share_visitor` first-party cookie. It is host-only, HttpOnly, SameSite=Lax, Secure on HTTPS/production, and expires after 180 days. The admin login/session remains separate. The cookie is never sent to an external QR destination or put in a URL.

Stored visitor IDs are HMACs scoped to the QR owner's account. The same browser scanning two owners' QR codes produces different stored IDs. Signatures and hashes use `VISITOR_SECRET`, falling back to `SESSION_SECRET`. Set a stable secret in production; changing it invalidates existing cookies and changes derived IDs. The development fallback is not suitable for production.

Each scan's `data.visitor` records an ID, `method: first-party-cookie`, confirmation status, and a `new` or `returning` audience. A new cookie is confirmed only when the browser sends it back on collection or continuation; an existing valid cookie is confirmed on entry. Returning means a previously confirmed scan for that browser exists among this owner's current QR codes. Concurrent first visits may both be labeled new; audience is a snapshot, not a transactional visit counter.

The browser collector also derives a versioned, owner-scoped HMAC fingerprint from available language, timezone, platform, physical screen dimensions, pixel ratio, touch points, browser family and OS family. At least six of the seven browser-provided signals must be available. It is stored as `data.browserFingerprint` with `confidence: estimated`. It excludes IP, location, viewport, display theme and network hints. No canvas/audio probing is used.

Fingerprints are similarity evidence: two identical phones can match, and updates/settings can change a fingerprint. QR2Share therefore does **not** merge different cookie IDs based on a fingerprint, restore a cleared cookie, or count a fingerprint as a verified unique browser. The hash is visible/searchable in scan details to investigate possible matches. The existing legacy request fingerprint remains separate and is not used for unique counts.

## Counts and audience filters

**Analytics → Overview** shows all-time recognized browsers, repeat scans and unrecognized scans across the owner's current QR codes. **Scan details** shows the same counts within the current QR/search/audience/visitor filters.

- **Total scans:** every recorded successful scan, including repeated visits.
- **Recognized browsers:** distinct confirmed cookie visitor IDs among those scans.
- **Repeat scans:** confirmed scans minus distinct confirmed visitor IDs in that result set.
- **Unrecognized scans:** scans without a confirmed ID, including historical/API scans and visits where recognition was unavailable or disabled.

The first scan from a browser counts once toward recognized browsers. Additional scans by it increase total and repeat scans. For example, one browser scanning five times produces five total scans, one recognized browser and four repeat scans. Scanning different QR codes still recognizes the browser within the same owner's account.

Choose **New browsers**, **Returning browsers**, or **Unrecognized scans** in the audience filter. **View browser scans** filters to that browser's recorded history and can be combined with the QR filter. Clear the audience filter if you want its full history. Exact IDs and estimated fingerprints are searchable and available in full details.

These segments support audience analysis and are a foundation for new/returning campaign rules; automatic product routing by audience is not implemented in this change. Recognition is not authentication and must never unlock private content or authorize purchases.

## Limits and privacy preferences

Clearing cookies, cookie expiry, a new browser/device, switching hostnames, private sessions or secret rotation may create a new identity. Shared browsers count as one browser. Unrecognized historical scans are not retroactively assigned an identity. Statistics for deleted QR codes remain outside the existing current-code analytics scope.

A Global Privacy Control signal in `Sec-GPC: 1` or the browser collector disables this new recognition/fingerprint layer for that scan and clears the visitor cookie when observed. Existing basic request/IP analytics remains unchanged. A cleared identifier is not reconstructed from its fingerprint. Browser permission is still required for location; visitor recognition adds no location prompt.

Browser tests cover repeated scans, separate browsers with matching fingerprints, cleared cookies, privacy preference, counts and filters. Existing redirect, campaign, media and no-JavaScript tests verify recognition does not add scans or block content.

The intended next use is [loyalty rewards](loyalty-rewards.md): qualifying repeat visits unlock a prize or voucher. That proposal separates raw scan counts from reward credits and requires one-time redemption. Rewards are not implemented yet.

Combined evidence and activity counters are available in the [visitor profile views and API](visitor-profiles.md), including expanded browser capability/network hints. These are observed signals for future game/targeting rules, not verified personal interests or an implemented restriction engine.

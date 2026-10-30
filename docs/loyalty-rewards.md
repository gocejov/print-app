# Repeat-visit loyalty rewards — proposed next feature

The intended use of visitor recognition is to reward returning visitors: for example, earn a voucher after five qualifying visits. This document is a proposal, not an implemented reward or redemption API. Current functionality recognizes browsers, records scans and exposes audience/history filters; it does not issue prizes.

## Recommended initial rule

An owner creates a loyalty program for selected QR codes or a campaign, sets a threshold and reward description, and chooses a qualifying interval. For example: **five visits on five distinct days unlock one reward**. Use an explicit program timezone for day boundaries. All raw scans remain in analytics, but repeated refreshes do not add qualifying visits within the interval. The exact threshold, interval, reward and participating QR codes are owner configuration, not hard-coded defaults.

A qualifying scan updates progress server-side for the program and confirmed visitor identity. Qualification needs a unique database key for `(program, visitor, interval)` so concurrent requests cannot earn duplicate credit. Use atomic operations or a transactional design for credit allocation and threshold crossing; never trust a client-supplied count. Campaign eligibility is checked against the program's configured scope, not whatever products happen to be assigned later.

When the threshold is reached, issue a single claim with a unique `(program, visitor, reward-cycle)` key, random redemption token, expiry and `issued/redeemed/expired` state. Repeated scans display the existing claim rather than issuing more copies. Staff redemption must be authenticated, owner-scoped and atomically change an unredeemed claim exactly once. Store a hash of the claim token; do not put visitor identifiers in a public coupon URL.

## Visitor experience

After a qualifying scan, show progress such as **3 of 5 visits** and continue to the selected content. At the threshold, show the reward and a claim action. Keep progress/reward interactions separate from analytics collection failures so a failed metrics upload does not change a reward balance. A server-confirmed cookie can support no-login progress, including when browser enrichment is unavailable.

A browser ID is a convenience, not proof of a person or a physical visit. Clearing cookies/new devices can reset progress; shared browsers share progress. Fingerprints are similarity hints and must not award rewards, restore balances or merge claims. For rewards with material value, offer optional email/phone verification or a recovery pass at claim time, and consider merchant-validated visits/purchases. A printable public QR can be scanned remotely or automated; rate limits alone do not prove a purchase or an in-person visit.

## Admin controls

A later implementation should expose program configuration, qualifying visits versus total scans, progress, issued claims, staff redemption and an audit trail. It should support pausing a program and defining whether rewards are one-off or repeatable cycles. Automatic audience routing can later show new-visitor offers, returning-visitor content and earned rewards, without changing the printed QR.

See [visitor recognition](visitor-recognition.md) for the implemented identity layer and its limitations.

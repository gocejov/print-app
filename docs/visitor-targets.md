# Visitor-specific QR products

A QR can have a default product or campaign and one optional product for one recognized visitor. The QR image and scan URL stay the same. The assigned browser receives its chosen product; other browsers receive the default content automatically.

## Configure

Open Analytics → Visitors, open a confirmed visitor profile, and use **Personalized QR codes** to select a QR and product. Alternatively, open a QR editor and enable **Show a different product to one visitor**. Disable that option to remove the assignment. Saving another visitor replaces the previous assignment.

Only confirmed browsers seen on your own QR codes and products you own can be selected. Estimated fingerprint groups cannot be assigned. Recognition uses the signed browser cookie, scoped to the QR owner's account. Clearing cookies, changing browsers, or opting out through Global Privacy Control results in the default experience.

The default product must differ from the visitor product. For campaigns, the visitor product is excluded from the default random pool, even if a category includes it. Remaining products retain their configured relative weights. A campaign must contain another eligible product when the assignment is saved. If later campaign edits leave no fallback, other visitors receive an unavailable response; the assigned browser can still receive its product.

## API

Create a QR with `POST /api/qrcodes` or update it with `PATCH /api/qrcodes/:id`:

```json
{
  "visitorTarget": {
    "visitorId": "<confirmed 64-character visitor ID>",
    "productId": "<owned product ID>"
  }
}
```

Creation also requires the normal default `productId` or `campaignId`. Send `{"visitorTarget": null}` to remove an assignment. Unknown visitors and foreign products are rejected. Referenced visitor products cannot be deleted until their QR assignments are removed.

## Delivery and analytics

Personalized selection uses the validated cookie, never a supplied visitor ID or fingerprint similarity. Continuation and media selection tickets are checked against the current assignment and browser cookie. Copying a personalized continuation or media URL to another browser does not grant that browser access through that ticket. Pausing a QR also stops its media delivery. Responses are private in practice through `Cache-Control: no-store` and vary by cookie.

Scans record the delivered product and `data.targeting.kind` (`visitor` or `default`). A visitor override is independent of the default campaign and does not count as a selection from that campaign.

This identifies a browser rather than a verified person. It provides personalized routing, not protection for an external public website or copies of downloaded media. The same product may remain accessible through another public QR. Use authenticated access if content requires verified-person authorization.

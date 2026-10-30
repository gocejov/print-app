# Product pages

Products can open their attached file directly (the default), or show a mobile-friendly page containing a title, description, media gallery and optional primary action. Existing products and printed QR codes keep working without migration.

## Configure a page

1. Upload images/videos or save URLs in **Files**.
2. Create or edit a product in **Products**. Select its primary **Attached file**.
3. Set **Scan experience** to **Product page with media and action**.
4. Select up to 12 additional images/videos. Selection order determines gallery order; uncheck/recheck to move an item to the end. The primary media appears first and duplicate primary media is rendered once.
5. Optionally enter both an action button label (up to 60 characters) and an HTTP/HTTPS URL (up to 2048 characters). Clear both to remove the action.
6. Save and assign the product to a QR code or campaign. Scan the existing QR to see the page.

Image/video primary files appear in the gallery. A primary URL appears as a separate **View linked content** link. Product name and description are public in page mode. Direct mode continues to show the original image/video viewer or URL redirect. Settings are retained when switching modes; action fields must always be a complete pair.

## API

`POST /api/products/create/` and `PUT /api/products/:id` accept these additional fields:

```json
{
  "displayMode": "page",
  "mediaIds": ["OWNED_IMAGE_ID", "OWNED_VIDEO_ID"],
  "actionLabel": "Book a visit",
  "actionUrl": "https://example.com/book"
}
```

Creation still requires `fileId`. `displayMode` is `direct` or `page`, defaulting to `direct`. Additional media references are ordered, unique, owned image/video IDs, capped at 12. Media IDs remain unpopulated in API responses; the admin resolves labels from the file library. URL credentials and non-HTTP protocols are rejected. Partial edits validate the resulting action label/URL pair.

## Playback and access

Pages are server-rendered HTML with escaped content, responsive layout, native video controls, no third-party dependencies and no JavaScript requirement. Browser codec support still determines which videos play.

Media uses the existing `/l/q/:type/:qid` route. Additional attachments use `?media=FILE_ID`; campaign requests also carry `selection=TOKEN`. Playback checks QR status, current product ownership, page mode, attachment membership and media ownership. Campaign selection tickets expire after 30 minutes and pin the same selected product for every attachment; asset requests never redraw the campaign or record extra scans. Invalid or removed attachments are rejected. Deleted/missing additional files are omitted from the page.

File deletion guards include additional attachments. Remove an attachment from all products before deleting its file. Mode, gallery and action edits take effect on the next scan without changing the QR image or permanent URL. Page mode takes precedence over a legacy QR destination override; the override remains available if the product switches back to direct mode.

The existing scan analytics records page scans and the selected campaign product. Action-button clicks are not yet tracked as conversion events.

## Verification

Backend integration checks cover direct/page switching, unchanged QR links, escaped names/labels, unsafe action URLs, duplicate or unsupported attachments, deletion guards, media bytes and pinned campaign attachments. The browser scenario configures a page through the admin editor and verifies the public action, loaded image, mobile layout and desktop/mobile screenshots. These run alongside the existing authentication, content, campaigns and analytics scenarios.

HTML QR navigations collect [browser metrics](browser-metrics.md) before this page is shown. JavaScript-disabled visitors continue to the server-rendered page through the fallback.

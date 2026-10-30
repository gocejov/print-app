# Automatic URL embedding after browser collection

For HTML browser scans targeting a direct URL product, QR2Share first completes the existing invisible browser collection step. It then automatically attempts to present the website full-screen inside QR2Share. No login, button press or retry action is required. Images/videos and explicit product-page mode keep their native rendering; a URL inside a product page remains its configured link/action.

## Automatic flow

1. Record one scan and select the product/campaign once.
2. Collect available browser metrics and confirm visitor recognition through the blank collection document.
3. Check the URL's embedding policy with a server-side HEAD request. Follow at most three redirects, with a 1500 ms budget for the complete check. Send no visitor cookies, credentials, scan tokens or client IP headers. Results are cached for 60 seconds in a bounded 500-entry process cache.
4. Embed only successful HTML/XHTML responses whose enforced CSP `frame-ancestors` and X-Frame-Options permit it. Unsupported ancestor expressions, failed checks, non-HTML responses, HTTPS-to-HTTP mixed content and other uncertain cases automatically use top-level navigation instead. Explicit CSP ancestors take precedence over X-Frame-Options.
5. Use a full-screen sandboxed iframe, with no QR2Share branding, toolbar or required controls. If it has not reported load/readiness within five seconds, automatically redirect to the original destination. A 1500 ms inline watchdog redirects if the frame script never sets a source; JavaScript-disabled clients use an immediate noscript redirect.

The browser remains on the QR2Share continuation URL when embedding succeeds. Redirect fallbacks use `location.replace` or a server redirect to the original saved URL, including legacy per-QR overrides. Non-HTML/API callers retain direct URL redirects. The destination can still navigate or redirect within its frame. Third-party cookies, login flows, popups and sandbox restrictions may affect site functionality; ordinary user interactions within the destination are still governed by that website.

## Header-probe safeguards

Only HTTP/HTTPS destinations on their default ports are probed. DNS results must all be public unicast addresses. Loopback, private, link-local, metadata, multicast, reserved and IPv4-mapped private addresses are rejected. The connection is pinned to the validated DNS result, retaining normal TLS hostname verification. Every redirect target is validated again. Private/custom-port destinations are never fetched by this probe and instead open through ordinary browser navigation. A destination on the same hostname (including www variants) as the parent is not probed/embedded, avoiding recursive requests into this app's own scan routes. Paths shaped like a QR scan (alias plus a 24-hex ID) are also not probed. These checks apply at every redirect hop. Header size is bounded; response bodies are not downloaded or proxied.

## Cooperative ready/error messages

For content we control, the child can send an explicit startup or failure message:

```js
// Run in the embedded app. Configure the actual parent origin explicitly.
window.parent.postMessage({ type: 'qr2share:ready' }, 'https://qr2share.com')
// On an app-level startup failure:
window.parent.postMessage({ type: 'qr2share:embed-error' }, 'https://qr2share.com')
```

QR2Share accepts these messages only from the iframe window and the saved destination's origin. `ready` clears the load deadline; `embed-error` immediately triggers top-level navigation. No authentication tokens or visitor profile data are sent into third-party frames. Redirected child origins need their own explicit integration before their messages can be trusted. Unrelated windows/messages are ignored.

## Browser limitations

An iframe `load` event is not proof that its content rendered successfully, and many iframe failures deliberately do not emit `error`. Cross-origin parents cannot inspect a blocked frame's document. See [MDN iframe event behavior](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe#error_and_load_event_behavior), [CSP ancestors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors) and [X-Frame-Options](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Frame-Options).

This is a best-effort automatic fallback, not a guarantee for arbitrary websites. HEAD and GET responses can differ, sites can vary by cookies/browser/location or change after a cached check, and frame load can fire for an error page. A site that passes preflight and emits load while displaying an error may remain in the frame. For dependable app-level readiness/error detection, integrate the messages above. QR2Share cannot override a site's embedding policy or read its internal clicks/forms. The new wrapper adds no scan events or game/reward credits.

## Verification

Tests cover public-address restrictions, CSP/XFO decisions and escaping. Browser fixtures cover successful iframe display with metrics already collected, blocked-policy redirects, slow-frame redirects, missing frame scripts, cooperative error messages and unrelated messages. The browser fixture's probe override exists only in `tests/ui-server.cjs`; production always uses the guarded header check.

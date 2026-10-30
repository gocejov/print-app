/* No controls or interstitial. Redirect automatically if the frame never finishes. */
;(function () {
  const frame = document.getElementById('qr-content')
  if (!frame) return
  const destination = frame.dataset.destination
  if (!destination) return
  const redirect = () => window.location.replace(destination)
  const timer = setTimeout(redirect, 5000)
  frame.addEventListener('load', () => {
    // Cross-origin documents cannot be inspected. load is only a best-effort hint.
    try {
      if (frame.contentWindow.location.href === 'about:blank') return
    } catch {
      /* cross-origin content */
    }
    if (frame.getAttribute('src') === destination) clearTimeout(timer)
  })
  const expectedOrigin = new URL(destination, window.location.href).origin
  window.addEventListener('message', (event) => {
    if (event.origin !== expectedOrigin || event.source !== frame.contentWindow) return
    if (event.data?.type === 'qr2share:ready') clearTimeout(timer)
    if (event.data?.type === 'qr2share:embed-error') redirect()
  })
  frame.addEventListener('error', redirect)
  window.addEventListener('securitypolicyviolation', (event) => {
    if (event.effectiveDirective === 'frame-src') redirect()
  })
  frame.src = destination
})()

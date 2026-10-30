/* Anonymous scan enrichment. Uses a first-party visitor cookie; no canvas probing or permission prompts. */
;(async function () {
  const script = document.querySelector('script[data-token]')
  const token = script && script.dataset.token
  if (!token) return
  const destination = '/scan/' + token + '/continue'
  const started = performance.now()
  let finished = false
  const proceed = () => {
    if (!finished) {
      finished = true
      window.location.replace(destination)
    }
  }
  const deadline = setTimeout(proceed, 1400)
  const metrics = { locationStatus: 'unavailable' }
  try {
    const now = new Date()
    Object.assign(metrics, {
      language: navigator.language,
      languages: Array.from(navigator.languages || []).slice(0, 10),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timezoneOffsetMinutes: now.getTimezoneOffset(),
      localHour: now.getHours(),
      screenWidth: screen.width,
      screenHeight: screen.height,
      viewportWidth: innerWidth,
      viewportHeight: innerHeight,
      pixelRatio: devicePixelRatio,
      hardwareConcurrency: navigator.hardwareConcurrency,
      availableScreenWidth: screen.availWidth,
      availableScreenHeight: screen.availHeight,
      colorDepth: screen.colorDepth,
      online: navigator.onLine,
      pointer: matchMedia('(pointer: coarse)').matches
        ? 'coarse'
        : matchMedia('(pointer: fine)').matches
          ? 'fine'
          : 'none',
      hover: matchMedia('(hover: hover)').matches,
      maxTouchPoints: navigator.maxTouchPoints || 0,
      platform: navigator.userAgentData?.platform || navigator.platform || '',
      colorScheme: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
      orientation: screen.orientation?.type || '',
      cookiesEnabled: navigator.cookieEnabled,
      webdriver: navigator.webdriver === true,
    })
    if (typeof navigator.deviceMemory === 'number') metrics.deviceMemoryGB = navigator.deviceMemory
    if (typeof navigator.pdfViewerEnabled === 'boolean')
      metrics.pdfViewerEnabled = navigator.pdfViewerEnabled
    if (navigator.userAgentData) {
      if (typeof navigator.userAgentData.mobile === 'boolean')
        metrics.mobileHint = navigator.userAgentData.mobile
      if (Array.isArray(navigator.userAgentData.brands))
        metrics.browserBrands = navigator.userAgentData.brands
          .slice(0, 8)
          .map((brand) => ({ brand: brand.brand, version: brand.version }))
    }
    if (typeof navigator.globalPrivacyControl === 'boolean')
      metrics.globalPrivacyControl = navigator.globalPrivacyControl
    if (document.referrer) {
      try {
        metrics.referrerOrigin = new URL(document.referrer).origin
      } catch {
        /* unavailable */
      }
    }
    if (navigator.connection) {
      if (Number.isFinite(navigator.connection.downlink))
        metrics.downlinkMbps = navigator.connection.downlink
      if (Number.isFinite(navigator.connection.rtt)) metrics.networkRttMs = navigator.connection.rtt
      if (typeof navigator.connection.type === 'string')
        metrics.connectionType = navigator.connection.type
      if (navigator.connection.effectiveType)
        metrics.effectiveType = navigator.connection.effectiveType
      if (typeof navigator.connection.saveData === 'boolean')
        metrics.saveData = navigator.connection.saveData
    }
    if (navigator.permissions && navigator.geolocation && isSecureContext) {
      await Promise.race([
        (async () => {
          const permission = await navigator.permissions.query({ name: 'geolocation' })
          metrics.locationStatus = permission.state
          if (permission.state !== 'granted') return
          await new Promise((resolve) =>
            navigator.geolocation.getCurrentPosition(
              (position) => {
                metrics.location = {
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                  accuracyMeters: position.coords.accuracy,
                  permissionGranted: true,
                }
                resolve()
              },
              (error) => {
                metrics.locationStatus =
                  error.code === 1 ? 'denied' : error.code === 3 ? 'timeout' : 'unavailable'
                resolve()
              },
              { timeout: 500, maximumAge: 60000, enableHighAccuracy: false },
            ),
          )
        })().catch(() => {
          metrics.locationStatus = 'unavailable'
        }),
        new Promise((resolve) => setTimeout(resolve, 650)),
      ])
    }
    metrics.collectionMs = Math.round(performance.now() - started)
    await Promise.race([
      fetch('/scan/' + token + '/metrics', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metrics),
        keepalive: true,
      }),
      new Promise((resolve) => setTimeout(resolve, 550)),
    ])
  } catch {
    /* Analytics must never prevent opening content. */
  } finally {
    clearTimeout(deadline)
    proceed()
  }
})()

import { test, expect } from '@playwright/test'

for (const mode of [
  'automatic',
  'permitted location',
  'blocked metrics',
  'blocked script',
  'no JavaScript',
  'campaign',
] as const) {
  test(`anonymous browser scan continues with ${mode}`, async ({ browser, request }) => {
    const account = await request.post('/api/users', {
      data: {
        name: 'Browser',
        lastName: 'Metrics',
        email: `browser-${mode.replaceAll(' ', '-')}-${Date.now()}@example.test`,
        password: 'browser metrics test password',
      },
    })
    expect(account.status()).toBe(201)
    const file = await (
      await request.post('/api/files', {
        data: {
          type: 'web-url',
          url: new URL('/health', test.info().project.use.baseURL as string).href,
        },
      })
    ).json()
    const { product } = await (
      await request.post('/api/products/create/', {
        data: { name: 'Browser product', fileId: file._id },
      })
    ).json()
    let target = { productId: product._id } as { productId?: string; campaignId?: string }
    if (mode === 'campaign') {
      const campaign = await (
        await request.post('/api/campaigns', {
          data: { name: 'Browser campaign', entries: [{ kind: 'product', target: product._id }] },
        })
      ).json()
      target = { campaignId: campaign._id }
    }
    const code = await (
      await request.post('/api/qrcodes', { data: { name: 'Browser QR', ...target } })
    ).json()
    const visitor = await browser.newContext({
      javaScriptEnabled: mode !== 'no JavaScript',
      locale: 'fr-FR',
      timezoneId: 'Europe/Paris',
      viewport: { width: 390, height: 844 },
      ...(mode === 'permitted location'
        ? {
            permissions: ['geolocation'],
            geolocation: { latitude: 41.9981, longitude: 21.4254, accuracy: 20 },
          }
        : {}),
    })
    try {
      const page = await visitor.newPage()
      if (mode === 'blocked script')
        await page.route('**/scan/collect.js', (route) => route.abort())
      if (mode === 'blocked metrics')
        await page.route('**/scan/*/metrics', (route) => route.abort())
      await page.goto(new URL(code.url).pathname + '?utm_source=poster')
      if (mode === 'blocked script') {
        await expect(page.locator('body')).toBeEmpty()
        await expect(page).toHaveTitle('')
      }
      await expect(page).toHaveURL(/\/health$/)
      await expect(page.locator('body')).toContainText('ok')
      if (!['no JavaScript', 'blocked metrics', 'blocked script'].includes(mode))
        await expect
          .poll(
            async () =>
              (await (await request.get('/api/statistics')).json())[0]?.data?.browser?.source,
          )
          .toBe('browser-self-reported')
      const scans = await (await request.get('/api/statistics')).json()
      expect(scans).toHaveLength(1)
      expect(scans[0].product).toBe(product._id)
      if (mode === 'campaign') expect(scans[0].campaign).toBe(target.campaignId)
      if (mode === 'no JavaScript' || mode === 'blocked metrics' || mode === 'blocked script')
        expect(scans[0].data.browser).toBeUndefined()
      else {
        const metrics = scans[0].data.browser
        expect(metrics.language).toBe('fr-FR')
        expect(metrics.timezone).toBe('Europe/Paris')
        expect(metrics.viewportWidth).toBe(390)
        expect(metrics.hardwareConcurrency).toBeGreaterThan(0)
        expect(metrics.colorDepth).toBeGreaterThan(0)
        expect(typeof metrics.hover).toBe('boolean')
        expect(metrics.source).toBe('browser-self-reported')
        if (mode === 'permitted location') {
          expect(metrics.location.latitude).toBeCloseTo(41.9981)
          expect(metrics.location.permissionGranted).toBe(true)
        } else {
          expect(metrics.locationStatus).toBe('prompt')
          expect(metrics.location).toBeUndefined()
        }
      }
      const cookies = await visitor.cookies()
      expect(cookies).toHaveLength(1)
      expect(cookies[0].name).toBe('qr2share_visitor')
      expect(cookies[0].httpOnly).toBe(true)
    } finally {
      await visitor.close()
    }
  })
}

test('returning browser counts, fingerprint separation, audience filters and privacy preference', async ({
  browser,
  request,
  page,
}) => {
  await page.goto('/admin/')
  const account = await request.post('/api/users', {
    data: {
      name: 'Visitors',
      lastName: 'Test',
      email: `visitors-${Date.now()}@example.test`,
      password: 'visitor test password',
    },
  })
  expect(account.status()).toBe(201)
  const file = await (
    await request.post('/api/files', {
      data: { type: 'web-url', url: 'http://127.0.0.1:3011/health' },
    })
  ).json()
  const { product } = await (
    await request.post('/api/products/create/', {
      data: { name: 'Visitor product', fileId: file._id },
    })
  ).json()
  const code = await (
    await request.post('/api/qrcodes', { data: { productId: product._id } })
  ).json()
  const contexts = [await browser.newContext(), await browser.newContext()]
  try {
    const first = await contexts[0].newPage()
    const second = await contexts[1].newPage()
    for (const visitor of [first, first, second]) {
      await visitor.goto(code.url)
      await expect(visitor).toHaveURL(/\/health$/)
    }
    let scans = await (await request.get('/api/statistics')).json()
    expect(scans).toHaveLength(3)
    const ids = scans.map((scan: { data: { visitor: { id: string } } }) => scan.data.visitor.id)
    expect(new Set(ids).size).toBe(2)
    expect(
      scans.filter(
        (scan: { data: { visitor: { audience: string } } }) =>
          scan.data.visitor.audience === 'returning',
      ),
    ).toHaveLength(1)
    expect(
      new Set(
        scans.map(
          (scan: { data: { browserFingerprint: { hash: string } } }) =>
            scan.data.browserFingerprint.hash,
        ),
      ).size,
    ).toBe(1)
    const repeatedId = ids.find((id: string) => ids.filter((value: string) => value === id).length === 2)!
    const recognizedProfile = await request.get(`/api/statistics/visitor-profile/${repeatedId}`)
    expect(recognizedProfile.status()).toBe(200)
    const combined = await recognizedProfile.json()
    expect(combined.counters.totalScans).toBe(2)
    expect(combined.activity.products[0].id).toBe(product._id)
    const hash = scans[0].data.browserFingerprint.hash
    const group = await (
      await request.get(`/api/statistics/visitor-profile/${hash}?basis=fingerprint`)
    ).json()
    expect(group.confidence).toBe('estimated-similarity')
    expect(group.identityEvidence.matchedVisitorCount).toBe(2)
    expect((await request.get('/api/statistics/visitor-profile/invalid')).status()).toBe(400)
    expect(
      (await contexts[0].request.get(`/api/statistics/visitor-profile/${repeatedId}`)).status(),
    ).toBe(401)
    await contexts[0].clearCookies()
    await first.goto(code.url)
    await expect(first).toHaveURL(/\/health$/)
    scans = await (await request.get('/api/statistics')).json()
    expect(
      new Set(scans.map((scan: { data: { visitor: { id: string } } }) => scan.data.visitor.id))
        .size,
    ).toBe(3)
    // GPC prevents new identification and clears the first-party visitor cookie.
    await contexts[0].setExtraHTTPHeaders({ 'Sec-GPC': '1' })
    await first.goto(code.url)
    await expect(first).toHaveURL(/\/health$/)
    scans = await (await request.get('/api/statistics')).json()
    expect(
      scans.filter(
        (scan: { data: { visitor: { reason?: string } } }) =>
          scan.data.visitor.reason === 'privacy-preference',
      ),
    ).toHaveLength(1)
    expect(await contexts[0].cookies()).toHaveLength(0)
    // Sign the browser admin session in as the fixture owner.
    await page.context().addCookies((await request.storageState()).cookies)
    await page.goto('/admin/analytics')
    await expect(page.getByRole('region', { name: 'Visitor metrics' })).toContainText(
      '3 recognized browsers',
    )
    await expect(page.getByRole('region', { name: 'Visitor metrics' })).toContainText(
      '1 repeat scans',
    )
    await page.goto('/admin/analytics?tab=scans')
    await page.getByLabel('Filter visitor audience').selectOption('returning')
    await expect(
      page.getByRole('table', { name: /All recorded scans/ }).locator('tbody tr'),
    ).toHaveCount(1)
    await page.getByLabel('Filter visitor audience').selectOption('all')
    await page.getByRole('button', { name: 'View browser scans' }).first().click()
    await expect(page.getByRole('button', { name: 'Clear visitor filter' })).toBeVisible()
    await page.getByRole('button', { name: 'View visitor profile', exact: true }).first().click()
    await expect(page.getByRole('dialog', { name: 'Visitor profile' })).toContainText(
      'Product activity',
    )
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'View fingerprint group', exact: true }).first().click()
    await expect(page.getByRole('dialog', { name: 'Estimated fingerprint group' })).toContainText(
      'Similar browser signals',
    )
    await page.keyboard.press('Escape')
    const other = await request.post('/api/users', {
      data: {
        name: 'Other',
        lastName: 'Owner',
        email: `other-profile-${Date.now()}@example.test`,
        password: 'visitor test password',
      },
    })
    expect(other.status()).toBe(201)
    expect((await request.get(`/api/statistics/visitor-profile/${repeatedId}`)).status()).toBe(404)
    expect(
      (await request.get(`/api/statistics/visitor-profile/${hash}?basis=fingerprint`)).status(),
    ).toBe(404)
  } finally {
    await Promise.all(contexts.map((context) => context.close()))
  }
})

import { test, expect } from '@playwright/test'

test('one QR shows a visitor product to its assigned browser and default content to everyone else', async ({
  page,
  browser,
}) => {
  const owner = await page.request.post('/api/users', {
    data: {
      name: 'Personalization',
      lastName: 'Owner',
      email: `personalized-${Date.now()}@example.test`,
      password: 'personalized test password',
    },
  })
  expect(owner.status()).toBe(201)
  const file = await (
    await page.request.post('/api/files', {
      data: { type: 'web-url', name: 'Default URL', url: 'http://127.0.0.1:3011/health' },
    })
  ).json()
  const { product: defaultProduct } = await (
    await page.request.post('/api/products/create/', {
      data: { name: 'Default product', fileId: file._id },
    })
  ).json()
  const { product: visitorProduct } = await (
    await page.request.post('/api/products/create/', {
      data: {
        name: 'Visitor offer',
        fileId: file._id,
        displayMode: 'page',
        description: 'A product selected for this browser.',
      },
    })
  ).json()
  const qr = await (
    await page.request.post('/api/qrcodes', {
      data: { name: 'Visitor QR', productId: defaultProduct._id },
    })
  ).json()
  const first = await browser.newContext(),
    second = await browser.newContext()
  try {
    const a = await first.newPage(),
      b = await second.newPage()
    await a.goto(qr.url)
    await expect(a).toHaveURL(/\/health$/)
    const stats = await (await page.request.get('/api/statistics')).json()
    const visitorId = stats.find(
      (scan: { data: { visitor?: { confirmed?: boolean } } }) => scan.data.visitor?.confirmed,
    ).data.visitor.id
    await page.goto('/admin/analytics?tab=visitors')
    await page.getByRole('button', { name: /^View profile for visitor/ }).click()
    const profile = page.getByRole('dialog', { name: 'Visitor profile' })
    await profile.getByLabel('Visitor name', { exact: true }).fill('Alex — VIP guest')
    await profile.getByRole('button', { name: 'Save visitor name' }).click()
    await expect(profile.getByRole('heading', { name: 'Alex — VIP guest' })).toBeVisible()
    await expect(profile.getByText('Visitor name saved.', { exact: true })).toBeVisible()
    await profile.getByLabel('QR code to personalize').selectOption(qr._id)
    await profile.getByLabel('Personalized product').selectOption(visitorProduct._id)
    await profile.getByRole('button', { name: 'Assign visitor product' }).click()
    await expect(profile.getByText('QR code personalized for this visitor.', { exact: true })).toBeVisible()
    await page.screenshot({ path: '/tmp/qr2share-personalized-visitor.png' })
    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: 'Alex — VIP guest', exact: true })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('button', { name: 'Alex — VIP guest', exact: true })).toBeVisible()
    const saved = await (await page.request.get(`/api/qrcodes/${qr._id}`)).json()
    expect(saved.visitorTarget).toEqual({ visitorId, productId: visitorProduct._id })
    expect(saved.url).toBe(qr.url)
    expect(saved.qrCode).toBe(qr.qrCode)
    await a.goto(qr.url)
    await expect(a.getByRole('heading', { name: 'Visitor offer' })).toBeVisible()
    const privateContinuation = a.url()
    await b.goto(qr.url)
    await expect(b).toHaveURL(/\/health$/)
    expect((await second.request.get(privateContinuation)).status()).toBe(403)
    // Similar browser fingerprints never select another browser's product.
    const allScans = await (await page.request.get('/api/statistics')).json()
    const fingerprints = allScans
      .filter((scan: { data: { browserFingerprint?: unknown } }) => scan.data.browserFingerprint)
      .map(
        (scan: { data: { browserFingerprint: { hash: string } } }) =>
          scan.data.browserFingerprint.hash,
      )
    expect(new Set(fingerprints).size).toBe(1)
    await page.goto('/admin/qr-codes')
    await page.getByLabel('Actions for Visitor QR').click()
    await page.getByRole('button', { name: 'Edit QR target', exact: true }).click()
    const editor = page.getByRole('dialog', { name: 'Edit QR code' })
    await expect(
      editor.getByRole('checkbox', { name: 'Show a different product to one visitor' }),
    ).toBeChecked()
    await expect(editor.getByLabel('Assigned visitor', { exact: true })).toHaveValue(visitorId)
    await expect(editor.getByLabel('Product for assigned visitor')).toHaveValue(visitorProduct._id)
    await editor
      .getByRole('checkbox', { name: 'Show a different product to one visitor' })
      .uncheck()
    await editor.getByRole('button', { name: 'Save changes' }).click()
    await expect(editor).toHaveCount(0)
    await a.goto(qr.url)
    await expect(a).toHaveURL(/\/health$/)
    // The QR editor can also create a personalized code atomically.
    await page.getByRole('button', { name: 'Create QR code', exact: true }).first().click()
    const create = page.getByRole('dialog', { name: 'Create a QR code' })
    await create.getByLabel('QR code name', { exact: true }).fill('New visitor QR')
    await create.getByLabel('Assigned product', { exact: true }).selectOption(defaultProduct._id)
    await create.getByRole('checkbox', { name: 'Show a different product to one visitor' }).check()
    await expect(create.getByLabel('Assigned visitor', { exact: true })).toContainText('Alex — VIP guest')
    await create.getByLabel('Assigned visitor', { exact: true }).selectOption(visitorId)
    await create.getByLabel('Product for assigned visitor').selectOption(visitorProduct._id)
    await create.getByRole('button', { name: 'Create QR code', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Your QR code is ready' })).toBeVisible()
    const codes = await (await page.request.get('/api/qrcodes')).json()
    expect(
      codes.find((code: { name: string }) => code.name === 'New visitor QR').visitorTarget,
    ).toEqual({ visitorId, productId: visitorProduct._id })
    await first.clearCookies()
    await a.goto(qr.url)
    await expect(a).toHaveURL(/\/health$/)
  } finally {
    await first.close()
    await second.close()
  }
})

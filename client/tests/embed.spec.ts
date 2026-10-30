import { test, expect } from '@playwright/test'

for (const mode of ['allowed', 'blocked', 'slow', 'blocked-script', 'message-error'] as const) {
  test(`URL content is automatic with ${mode} embedding`, async ({ page, request }) => {
    await request.post('/api/users', {
      data: {
        name: 'Embed',
        lastName: 'Test',
        email: `embed-${mode}-${Date.now()}@example.test`,
        password: 'embed test password',
      },
    })
    const url = new URL(
      `/embed-fixture-content?mode=${mode}`,
      test.info().project.use.baseURL as string,
    ).href
    const file = await (await request.post('/api/files', { data: { type: 'web-url', url } })).json()
    const { product } = await (
      await request.post('/api/products/create/', {
        data: { name: 'Embedded product', fileId: file._id },
      })
    ).json()
    const code = await (
      await request.post('/api/qrcodes', { data: { productId: product._id } })
    ).json()
    if (mode === 'blocked-script') await page.route('**/scan/embed.js', (route) => route.abort())
    await page.goto(code.url)
    if (mode === 'allowed') {
      await expect(
        page.frameLocator('#qr-content').getByRole('heading', { name: 'Website content' }),
      ).toBeVisible()
      await expect(page).toHaveURL(/\/scan\/[a-f0-9]+\/continue$/)
      await expect(page.getByRole('button')).toHaveCount(0)
      await page.evaluate(() =>
        window.postMessage({ type: 'qr2share:embed-error' }, window.location.origin),
      )
      await expect(
        page.frameLocator('#qr-content').getByRole('heading', { name: 'Website content' }),
      ).toBeVisible()
    } else {
      await expect(page).toHaveURL(url, { timeout: 10000 })
      await expect(page.getByRole('heading', { name: 'Website content' })).toBeVisible()
    }
    const scans = await (await request.get('/api/statistics')).json()
    expect(scans).toHaveLength(1)
    expect(scans[0].data.browser).toBeDefined()
    expect(scans[0].product).toBe(product._id)
  })
}

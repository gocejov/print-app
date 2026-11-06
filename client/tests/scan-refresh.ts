import { test, expect, type Browser, type APIRequestContext } from '@playwright/test'

export async function verifyScanRefresh(browser: Browser, request: APIRequestContext) {
  for (const mode of [
    'direct',
    'campaign',
    'blocked collector',
    'no JavaScript',
    'early refresh',
  ] as const) {
    await test.step(`refresh preserves one QR visit and its result: ${mode}`, async () => {
      const products = []
      for (const name of ['Alpha', 'Beta']) {
        const file = await (
          await request.post('/api/files', {
            data: {
              name,
              type: 'text',
              textPage: { text: `${name} result`, font: 'modern', background: 'cream', logo: '' },
            },
          })
        ).json()
        products.push(
          (
            await (
              await request.post('/api/products/create/', { data: { name, fileId: file._id } })
            ).json()
          ).product,
        )
      }
      const campaign = await (
        await request.post('/api/campaigns', {
          data: {
            name: 'Refresh campaign',
            entries: products.map((product) => ({ kind: 'product', target: product._id })),
          },
        })
      ).json()
      const code = await (
        await request.post('/api/qrcodes', {
          data: mode === 'direct' ? { productId: products[0]._id } : { campaignId: campaign._id },
        })
      ).json()
      const context = await browser.newContext({ javaScriptEnabled: mode !== 'no JavaScript' })
      try {
        const page = await context.newPage()
        if (mode === 'blocked collector')
          await page.route('**/scan/collect.js', (route) => route.abort())
        if (mode === 'early refresh')
          await page.route('**/scan/collect.js', (route) => route.abort())
        await page.goto(code.url)
        await expect(page).toHaveURL(/\/scan\/[a-f0-9]{48}\/continue$/)
        const visitUrl = page.url()
        if (mode === 'early refresh') {
          // Reload the blank collection document before its three-second fallback.
          await expect(page.locator('body')).toBeEmpty()
          await page.reload()
        }
        await expect(page.locator('.text-poster')).toContainText('result')
        const result = await page.locator('.text-poster').innerText()
        const scans = () =>
          request
            .get('/api/statistics')
            .then((response) => response.json())
            .then((rows) => rows.filter((scan: { qrCode: string }) => scan.qrCode === code._id))
        const original = await scans()
        expect(original).toHaveLength(1)
        for (const width of [1440, 390]) {
          await page.setViewportSize({ width, height: 844 })
          await page.reload()
          await expect(page).toHaveURL(visitUrl)
          await expect(page.locator('.text-poster')).toHaveText(result)
          expect(await scans()).toEqual(original)
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          ).toBe(true)
          if (mode === 'campaign')
            await page.screenshot({ path: `/tmp/qr-refresh-${width}.png`, fullPage: true })
        }
        // A new visit to the printed entry is a new scan, even in the same browser.
        await page.goto(code.url)
        await expect(page).toHaveURL(/\/scan\/[a-f0-9]{48}\/continue$/)
        await expect(page.locator('.text-poster')).toContainText('result')
        expect(page.url()).not.toBe(visitUrl)
        expect(await scans()).toHaveLength(2)
        expect((await scans())[0]._id).not.toBe((await scans())[1]._id)
      } finally {
        await context.close()
      }
    })
  }
}

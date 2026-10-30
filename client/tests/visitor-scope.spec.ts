import { test, expect } from '@playwright/test'

test('QR and campaign visitor filters report historical products and preserve scope in scan links', async ({
  page,
}) => {
  await page.request.post('/api/users', {
    data: {
      name: 'Scope',
      lastName: 'Owner',
      email: `scope-${Date.now()}@example.test`,
      password: 'visitor scope test password',
    },
  })
  const qrA = 'a'.repeat(24),
    qrB = 'b'.repeat(24),
    campaignA = 'c'.repeat(24),
    campaignB = 'd'.repeat(24),
    productA = 'e'.repeat(24),
    productB = 'f'.repeat(24)
  const visitorA = '1'.repeat(64),
    visitorB = '2'.repeat(64),
    visitorC = '3'.repeat(64)
  const codes = [
    { _id: qrA, name: 'Entrance QR', campaign: campaignB },
    { _id: qrB, name: 'Table QR', campaign: campaignA },
  ]
  const products = [
    { _id: productA, name: 'Summer offer' },
    { _id: productB, name: 'Winter offer' },
  ]
  const campaigns = [
    { _id: campaignA, name: 'Summer campaign' },
    { _id: campaignB, name: 'Winter campaign' },
  ]
  const scan = (
    n: number,
    visitor: string | null,
    qrCode: string,
    campaign: string | null,
    product: string,
  ) => ({
    _id: n.toString(16).padStart(24, '0'),
    qrCode,
    ...(campaign ? { campaign } : {}),
    product,
    created_at: new Date(Date.now() - n * 1000).toISOString(),
    data: {
      visitor: visitor
        ? {
            id: visitor,
            name: visitor === visitorA ? 'Alex' : visitor === visitorB ? 'Blair' : 'Casey',
            method: 'first-party-cookie',
            confirmed: true,
          }
        : { method: 'unrecognized' },
    },
  })
  const scans = [
    scan(1, visitorA, qrA, campaignA, productA),
    scan(2, visitorA, qrA, campaignA, productA),
    scan(3, visitorA, qrB, campaignA, productB),
    scan(4, visitorB, qrA, campaignA, productB),
    scan(5, visitorC, qrA, null, productA),
    scan(6, null, qrA, campaignA, productB),
  ]
  for (const [path, data] of [
    ['qrcodes/with-options', codes],
    ['statistics', scans],
    ['products/with-options', products],
    ['campaigns', campaigns],
  ] as const)
    await page.route(`**/api/${path}`, (route) => route.fulfill({ json: data }))
  await page.goto(`/admin/analytics?tab=visitors&qrCode=${qrA}&campaign=${campaignA}`)
  const table = page.getByRole('table', { name: 'Recognized visitors and their scan activity' })
  await expect(table.locator('tbody tr')).toHaveCount(2)
  await expect(page.getByRole('button', { name: 'Casey', exact: true })).toHaveCount(0)
  const alex = table
    .locator('tbody tr')
    .filter({ has: page.getByRole('button', { name: 'Alex', exact: true }) })
  await expect(alex).toContainText('2 scans')
  await alex.getByRole('button', { name: 'View products for visitor' }).click()
  const detail = page.getByRole('dialog', { name: 'Products received' })
  await expect(detail).toContainText('Summer offer')
  await expect(detail).toContainText('Summer campaign')
  await expect(detail).not.toContainText('Winter offer')
  await expect(detail.getByRole('cell', { name: '2', exact: true })).toBeVisible()
  await detail.getByRole('link', { name: 'View matching scans' }).click()
  await expect(page).toHaveURL(new RegExp(`product=${productA}`))
  await expect(page.getByRole('status')).toHaveText('2 matching scans')
  await expect(page.getByRole('table', { name: /All recorded scans/ })).toContainText(
    'Summer offer',
  )
  await page.reload()
  await expect(page.getByRole('status')).toHaveText('2 matching scans')
  await page.getByRole('link', { name: /^Visitors/ }).click()
  await expect(table.locator('tbody tr')).toHaveCount(1)
  await page.getByRole('button', { name: 'Clear scope', exact: true }).click()
  await expect(table.locator('tbody tr')).toHaveCount(3)
  await page.getByLabel('Filter analytics by campaign').selectOption(campaignA)
  await expect(table.locator('tbody tr')).toHaveCount(2)
  // Campaign history includes both QRs, even though Entrance QR now points at Winter.
  await table
    .locator('tbody tr')
    .filter({ has: page.getByRole('button', { name: 'Alex', exact: true }) })
    .getByRole('button', { name: 'View products for visitor' })
    .click()
  await expect(detail).toContainText('Summer offer')
  await expect(detail).toContainText('Winter offer')
  await expect(detail).toContainText('Entrance QR')
  await expect(detail).toContainText('Table QR')
  await page.keyboard.press('Escape')
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByLabel('Filter analytics by campaign')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await table.locator('tbody tr').first().getByRole('button', { name: 'View products for visitor' }).click()
  await expect(detail).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: '/tmp/qr2share-visitor-product-hits-mobile.png', animations: 'disabled' })
  await page.keyboard.press('Escape')
  await page.screenshot({ path: '/tmp/qr2share-visitor-scope-mobile.png', fullPage: false })
})

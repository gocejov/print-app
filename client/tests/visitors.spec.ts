import { test, expect } from '@playwright/test'

test('visitor table groups browsers, sorts, filters and paginates on desktop and mobile', async ({
  page,
}) => {
  await page.request.post('/api/users', {
    data: {
      name: 'Visitor',
      lastName: 'Design',
      email: `visitor-design-${Date.now()}@example.test`,
      password: 'visitor design test password',
    },
  })
  const scan = (index: number, repeat = false) => ({
    _id: `${repeat ? 'b' : 'a'}${index.toString(16).padStart(23, '0')}`,
    qrCode: 'a'.repeat(24),
    product: 'b'.repeat(24),
    created_at: new Date(Date.now() - index * 3600000 - (repeat ? 60000 : 0)).toISOString(),
    data: {
      visitor: {
        id: ((index * 0x9e3779) >>> 0).toString(16).padStart(8, '0').repeat(8),
        confirmed: true,
        method: 'first-party-cookie',
        audience: repeat ? 'returning' : 'new',
      },
      browserFingerprint: {
        hash: 'same-fingerprint-estimate',
        version: 1,
        confidence: 'estimated',
      },
      browser: {
        language: index % 2 ? 'en-GB' : 'fr-FR',
        timezone: index % 2 ? 'Europe/London' : 'Europe/Paris',
      },
      fingerprintData: {
        geo: { country: index % 2 ? 'GB' : 'FR', city: index % 2 ? 'London' : 'Paris' },
        ua: {
          browser: { name: index % 2 ? 'Safari' : 'Chrome' },
          os: { name: index % 2 ? 'iOS' : 'Android' },
          device: { type: 'mobile' },
        },
      },
    },
  })
  const scans = Array.from({ length: 26 }, (_, i) => scan(i + 1)).concat([
    scan(1, true),
    scan(1, true),
    scan(2, true),
  ])
  await page.route('**/api/statistics', (route) => route.fulfill({ json: scans }))
  await page.goto('/admin/analytics?tab=visitors')
  await expect(page.getByRole('heading', { name: 'Meet your returning visitors' })).toBeVisible()
  const table = page.getByRole('table', { name: 'Recognized visitors and their scan activity' })
  await expect(table.locator('tbody tr')).toHaveCount(25)
  await expect(page.getByRole('status')).toHaveText('26 visitors')
  await expect(table.locator('tbody tr').first()).toContainText('3 scans')
  await page.getByRole('button', { name: 'Next visitor page' }).click()
  await expect(table.locator('tbody tr')).toHaveCount(1)
  await page.getByRole('button', { name: 'Previous visitor page' }).click()
  await page.getByLabel('Sort visitors').selectOption('scans')
  await expect(table.locator('tbody tr').first()).toContainText('3 scans')
  await page.getByLabel('Visitor audience', { exact: true }).selectOption('returning')
  await expect(table.locator('tbody tr')).toHaveCount(2)
  await page.getByLabel('Search visitors').fill('Paris')
  await expect(table.locator('tbody tr')).toHaveCount(1)
  await page.getByLabel('Search visitors').fill('no-matching-browser')
  await expect(page.getByRole('heading', { name: 'No matching visitors' })).toBeVisible()
  await page.getByRole('button', { name: 'Reset filters', exact: true }).click()
  await expect(table.locator('tbody tr')).toHaveCount(25)
  await page.screenshot({ path: '/tmp/qr2share-visitors-desktop.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(table.locator('tbody tr')).toHaveCount(25)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await expect(page.getByLabel('Search visitors')).toBeVisible()
  await page.screenshot({
    path: '/tmp/qr2share-visitors-mobile.png',
    fullPage: false,
    animations: 'disabled',
  })
  await page.reload()
  await expect(page).toHaveURL(/tab=visitors/)
  await expect(table.locator('tbody tr')).toHaveCount(25)
})

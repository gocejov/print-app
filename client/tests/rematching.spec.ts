import { test, expect } from '@playwright/test'

test('possible browser history is clearly estimated and cannot enable visitor assignment', async ({ page }) => {
  await page.request.post('/api/users', { data: { name: 'Match', lastName: 'Owner', email: `match-${Date.now()}@example.test`, password: 'match browser test password' } })
  const id = '1'.repeat(64), old = '2'.repeat(64), hash = 'a'.repeat(64)
  const scan = { _id: 'a'.repeat(24), qrCode: 'b'.repeat(24), created_at: new Date().toISOString(), data: { visitor: { id, method: 'first-party-cookie', confirmed: true } } }
  const profile = { id, basis: 'visitor', name: '', firstSeen: scan.created_at, lastSeen: scan.created_at, counters: { totalScans: 1, repeatScans: 0, activeDaysUTC: 1, scansTodayUTC: 1, scansLast7Days: 1 }, activity: { qrCodes: [], products: [], campaigns: [], sources: [] }, latestSignals: {}, identityEvidence: { visitorIds: [id], fingerprints: [hash] }, rematching: { status: 'ambiguous', windowDays: 7, fingerprint: hash, truncated: false, candidates: [{ visitorId: old, matchingScans: 3, lastSeen: scan.created_at, matchingSignals: ['CPU threads'], conflictingSignals: [], overlappingActivity: true }] } }
  await page.route('**/api/statistics', route => route.fulfill({ json: [scan] }))
  await page.route(`**/api/statistics/visitor-profile/${id}?basis=visitor`, route => route.fulfill({ json: profile }))
  await page.route(`**/api/statistics/visitor-profile/${hash}?basis=fingerprint`, route => route.fulfill({ json: { ...profile, id: hash, basis: 'fingerprint', name: '', rematching: undefined, counters: { ...profile.counters, totalScans: 4 }, identityEvidence: { visitorIds: [id, old], fingerprints: [hash], matchedVisitorCount: 2, fingerprintCount: 1 } } }))
  await page.goto('/admin/analytics?tab=visitors')
  await page.getByRole('button', { name: /^View profile for visitor/ }).click()
  await expect(page.getByRole('region', { name: 'Estimated browser connections' })).toContainText('Ambiguous')
  await expect(page.getByText('Both browser IDs have activity after this browser first appeared.')).toBeVisible()
  await page.getByRole('button', { name: 'Explore estimated history' }).click()
  const group = page.getByRole('dialog', { name: 'Estimated fingerprint group' })
  await expect(group).toBeVisible()
  await expect(group.getByRole('region', { name: 'Personalized QR codes' })).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Visitor profile' })).toBeVisible()
})

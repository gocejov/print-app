const { test } = require('node:test')
const assert = require('node:assert/strict')
const { createHmac } = require('node:crypto')
const { readVisitor, visitorId, browserFingerprint } = require('../src/services/visitor.service')

test('signed visitor cookies reject tampering and stored identities are owner-scoped', () => {
  const raw = 'a'.repeat(48)
  const secret = process.env.VISITOR_SECRET || process.env.SESSION_SECRET || 'local-development-only-secret'
  const signature = createHmac('sha256', secret).update(`cookie:v1:${raw}`).digest('hex')
  assert.equal(readVisitor({ headers: { cookie: `other=x; qr2share_visitor=${raw}.${signature}` } }), raw)
  assert.equal(readVisitor({ headers: { cookie: `qr2share_visitor=${'b'.repeat(48)}.${signature}` } }), undefined)
  assert.equal(readVisitor({ headers: { cookie: 'qr2share_visitor=malformed' } }), undefined)
  assert.equal(visitorId('owner-a', raw), visitorId('owner-a', raw))
  assert.notEqual(visitorId('owner-a', raw), visitorId('owner-b', raw))
})

test('estimated fingerprints require sufficient signals and ignore volatile/location values', () => {
  const browser = { language: 'en', timezone: 'Europe/Skopje', platform: 'Linux', screenWidth: 1920, screenHeight: 1080, pixelRatio: 1, maxTouchPoints: 0 }
  const ua = { browser: { name: 'Chrome' }, os: { name: 'Linux' } }
  assert.equal(browserFingerprint('owner', {}, ua), undefined)
  const fingerprint = browserFingerprint('owner', browser, ua)
  assert.equal(fingerprint, browserFingerprint('owner', { ...browser, viewportWidth: 400, effectiveType: '4g', location: { latitude: 1 } }, ua))
  assert.notEqual(fingerprint, browserFingerprint('other-owner', browser, ua))
  assert.notEqual(fingerprint, browserFingerprint('owner', { ...browser, timezone: 'UTC' }, ua))
})

test('combined profiles count observed activity and keep fingerprint groups explicitly estimated', () => {
  const { summarizeVisitorProfile } = require('../src/services/visitor-profile.service')
  const scan = (date, visitor, product) => ({ qrCode: 'qr', product, campaign: 'campaign', created_at: date, data: { visitor: { id: visitor, confirmed: true }, browserFingerprint: { hash: 'fingerprint' }, browser: { language: 'en' }, request: { query: [['utm_source', 'poster']] } } })
  const scans = [scan('2026-10-29T12:00:00Z', 'a', 'p1'), scan('2026-10-30T12:00:00Z', 'a', 'p1'), scan('2026-10-30T13:00:00Z', 'b', 'p2')]
  const profile = summarizeVisitorProfile(scans, 'fingerprint', 'fingerprint', new Date('2026-10-30T14:00:00Z'))
  assert.equal(profile.confidence, 'estimated-similarity')
  assert.equal(profile.counters.totalScans, 3)
  assert.equal(profile.counters.activeDaysUTC, 2)
  assert.equal(profile.counters.scansTodayUTC, 2)
  assert.equal(profile.identityEvidence.matchedVisitorCount, 2)
  assert.equal(profile.activity.products[0].id, 'p1')
  assert.equal(profile.activity.products[0].scans, 2)
  assert.deepEqual(profile.activity.sources, [{ source: 'poster', scans: 3 }])
  assert.equal(summarizeVisitorProfile([], 'visitor', 'none').counters.totalScans, 0)
})

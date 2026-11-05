const { test } = require('node:test')
const assert = require('node:assert/strict')
const { rematchingEvidence } = require('../src/services/visitor-rematching.service')
const now = Date.parse('2026-10-30T10:00:00Z')
const scan = (id, offset, extra = {}) => ({ created_at: new Date(now + offset).toISOString(), data: { visitor: { id, confirmed: true }, browserFingerprint: { version: 1, hash: 'a'.repeat(64) }, browser: { hardwareConcurrency: 8, deviceMemory: 8 }, ...extra } })
test('analytics rematching proposes exact recent evidence without merging browser identities', () => {
  const current = [scan('new', 0)]
  const related = [scan('old', -1000), scan('old', -2000), scan('too-old', -8 * 86400000), scan('new', -1000), scan('different', -1000, { browserFingerprint: { version: 1, hash: 'b'.repeat(64) } }), scan('unconfirmed', -1000, { visitor: { id: 'unconfirmed', confirmed: false } }), scan('only-after', 1000)]
  const original = JSON.stringify(current)
  const result = rematchingEvidence(current, related)
  assert.equal(result.status, 'single-candidate')
  assert.equal(result.candidates.length, 1)
  assert.equal(result.candidates[0].visitorId, 'old')
  assert.equal(result.candidates[0].matchingScans, 2)
  assert.deepEqual(result.candidates[0].matchingSignals, ['CPU threads', 'Device memory'])
  assert.equal(JSON.stringify(current), original)
})
test('identical configurations remain ambiguous when shared, conflicting, overlapping or truncated', () => {
  const current = [scan('new', 0)]
  for (const related of [[scan('old', -1000), scan('other', -1000)], [scan('old', -1000), scan('old', 1000)], [scan('old', -1000, { browser: { hardwareConcurrency: 4, deviceMemory: 8 } })]]) assert.equal(rematchingEvidence(current, related).status, 'ambiguous')
  assert.equal(rematchingEvidence(current, [scan('old', -1000)], true).status, 'ambiguous')
  assert.equal(rematchingEvidence(current, []).status, 'none')
})
test('missing, invalid, outdated or late fingerprints cannot initiate rematching', () => {
  for (const extra of [{ browserFingerprint: undefined }, { browserFingerprint: { version: 1, hash: 'invalid' } }, { browserFingerprint: { version: 2, hash: 'a'.repeat(64) } }]) assert.equal(rematchingEvidence([scan('new', 0, extra)], []).status, 'insufficient-evidence')
  assert.equal(rematchingEvidence([scan('new', 0, { browserFingerprint: undefined }), scan('new', 2 * 86400000)], []).status, 'insufficient-evidence')
})

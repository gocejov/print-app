const { test } = require('node:test')
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const fs = require('node:fs/promises')
const sharp = require('sharp')

test('visitor-specific products use signed browser identity and protect selected media while others see defaults', { skip: !process.env.TEST_MONGO_URI, timeout: 90000 }, async () => {
  const database = `qr2share_target_test_${randomUUID().replaceAll('-', '')}`
  const uri = new URL(process.env.TEST_MONGO_URI); uri.pathname = `/${database}`
  process.env.MONGO_URI = uri.toString()
  process.env.REDIS_URL = process.env.TEST_REDIS_URL || 'redis://127.0.0.1:6379'
  process.env.SESSION_KEY_PREFIX = `test:${database}:`
  process.env.SESSION_SECRET = randomUUID(); process.env.NODE_ENV = 'test'
  const mongoose = require('mongoose')
  const { initApp } = require('../src/app')
  const { redisClient } = require('../src/config/redis.config')
  const uploaded = []
  let server
  try {
    const app = await initApp()
    server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); })
    const base = `http://127.0.0.1:${server.address().port}`; process.env.PUBLIC_URL = base
    async function request(method, path, body, cookie, extra = {}) {
      const headers = { ...(cookie ? { cookie } : {}), ...extra }
      const options = { method, headers, redirect: 'manual' }
      if (body instanceof FormData) options.body = body
      else if (method !== 'GET') { headers['content-type'] = 'application/json'; options.body = JSON.stringify(body || {}) }
      const response = await fetch(base + path, options)
      const type = response.headers.get('content-type') || ''
      const data = type.includes('application/json') ? await response.json() : type.startsWith('image/') ? Buffer.from(await response.arrayBuffer()) : await response.text()
      return { status: response.status, data, location: response.headers.get('location'), cookie: response.headers.get('set-cookie')?.split(';')[0] }
    }
    const check = (response, status) => { assert.equal(response.status, status, JSON.stringify(response.data)); return response }
    const register = name => request('POST', '/api/users', { name, lastName: 'Target', email: `${name}@example.test`, password: 'visitor target test password' })
    const a = check(await register('owner-a'), 201), b = check(await register('owner-b'), 201)
    async function urlProduct(owner, suffix) {
      const file = check(await request('POST', '/api/files', { type: 'web-url', url: `https://example.test/${suffix}` }, owner.cookie), 201).data
      return check(await request('POST', '/api/products/create/', { name: suffix, fileId: file._id }, owner.cookie), 200).data.product
    }
    const defaultProduct = await urlProduct(a, 'default'), personal = await urlProduct(a, 'personal'), foreignProduct = await urlProduct(b, 'foreign')
    const qr = check(await request('POST', '/api/qrcodes', { name: 'Personalized QR', productId: defaultProduct._id }, a.cookie), 201).data
    const path = new URL(qr.url).pathname
    async function recognize() {
      const landing = check(await request('GET', path, null, null, { accept: 'text/html' }), 200)
      const token = landing.data.match(/data-token="([a-f0-9]{48})"/)[1]
      check(await request('POST', `/scan/${token}/metrics`, { language: 'en', timezone: 'UTC', platform: 'Linux', screenWidth: 1000, screenHeight: 800, pixelRatio: 1, maxTouchPoints: 0 }, landing.cookie), 204)
      check(await request('GET', `/scan/${token}/continue`, null, landing.cookie), 302)
      const stats = check(await request('GET', '/api/statistics', null, a.cookie), 200).data
      return { cookie: landing.cookie, id: stats[stats.length - 1].data.visitor.id }
    }
    const first = await recognize(), second = await recognize()
    // Labels are owner metadata; they do not rewrite identities or scan counts.
    const labelPath = `/api/statistics/visitor-profile/${first.id}`
    check(await request('PATCH', labelPath, { name: 'Alex — VIP guest' }, a.cookie), 200)
    assert.equal(check(await request('GET', labelPath, null, a.cookie), 200).data.name, 'Alex — VIP guest')
    const labeled = check(await request('GET', '/api/statistics', null, a.cookie), 200).data
    assert.equal(labeled.find(scan => scan.data.visitor.id === first.id).data.visitor.name, 'Alex — VIP guest')
    check(await request('PATCH', labelPath, { name: 'Foreign edit' }, b.cookie), 404)
    check(await request('GET', labelPath, null, b.cookie), 404)
    check(await request('PATCH', labelPath, { name: 'x'.repeat(121) }, a.cookie), 400)
    check(await request('PATCH', labelPath, { name: { $set: 'invalid' } }, a.cookie), 400)
    check(await request('PATCH', labelPath, { name: 'Valid', owner: b.data._id }, a.cookie), 400)
    check(await request('PATCH', labelPath, { name: '' }, a.cookie), 200)
    assert.equal(check(await request('GET', labelPath, null, a.cookie), 200).data.name, '')
    const assignment = { visitorId: first.id, productId: personal._id }
    check(await request('PATCH', `/api/qrcodes/${qr._id}`, { visitorTarget: { visitorId: 'f'.repeat(64), productId: personal._id } }, a.cookie), 404)
    check(await request('PATCH', `/api/qrcodes/${qr._id}`, { visitorTarget: { visitorId: 'bad', productId: personal._id } }, a.cookie), 400)
    check(await request('PATCH', `/api/qrcodes/${qr._id}`, { visitorTarget: { visitorId: first.id, productId: foreignProduct._id } }, a.cookie), 404)
    check(await request('PATCH', `/api/qrcodes/${qr._id}`, { visitorTarget: assignment }, b.cookie), 404)
    check(await request('PATCH', `/api/qrcodes/${qr._id}`, { visitorTarget: { visitorId: first.id, productId: defaultProduct._id } }, a.cookie), 400)
    check(await request('POST', '/api/qrcodes', { productId: personal._id, visitorTarget: assignment }, a.cookie), 400)
    const saved = check(await request('PATCH', `/api/qrcodes/${qr._id}`, { visitorTarget: assignment }, a.cookie), 200).data
    assert.equal(saved.url, qr.url); assert.equal(saved.qrCode, qr.qrCode)
    assert.equal(check(await request('GET', path, null, first.cookie), 302).location, 'https://example.test/personal')
    for (const cookie of [second.cookie, undefined, 'qr2share_visitor=fake.invalid']) assert.equal(check(await request('GET', path, null, cookie), 302).location, 'https://example.test/default')
    assert.equal(check(await request('GET', path, null, first.cookie, { 'sec-gpc': '1' }), 302).location, 'https://example.test/default')
    check(await request('PATCH', `/api/qrcodes/${qr._id}`, { destinationUrl: 'https://example.test/override' }, a.cookie), 200)
    assert.equal(check(await request('GET', path, null, first.cookie), 302).location, 'https://example.test/personal')
    assert.equal(check(await request('GET', path, null, second.cookie), 302).location, 'https://example.test/override')
    assert.equal(check(await request('GET', `/l/q/u/${qr._id}`, null, first.cookie), 302).location, 'https://example.test/personal')
    const created = check(await request('POST', '/api/qrcodes', { productId: defaultProduct._id, visitorTarget: assignment }, a.cookie), 201).data
    assert.equal(created.visitorTarget.visitorId, first.id)
    // A personal gallery is outside the default campaign, but every asset stays bound to its browser.
    const photos = []
    for (const color of ['#176b4d', '#b08248']) {
      const bytes = await sharp({ create: { width: 16, height: 16, channels: 4, background: color } }).png().toBuffer()
      const form = new FormData(); form.append('image', new Blob([bytes], { type: 'image/png' }), 'photo.png')
      const file = check(await request('POST', `/api/upload/image/${a.data._id}`, form, a.cookie), 200).data.file
      uploaded.push(file.path); photos.push({ file, bytes })
    }
    const pageProduct = check(await request('POST', '/api/products/create/', { name: 'Assigned gallery', fileId: photos[0].file._id, displayMode: 'page', mediaIds: [photos[1].file._id] }, a.cookie), 200).data.product
    check(await request('PATCH', `/api/qrcodes/${qr._id}`, { visitorTarget: { visitorId: first.id, productId: pageProduct._id } }, a.cookie), 200)
    const campaign = check(await request('POST', '/api/campaigns', { name: 'Default campaign', entries: [{ kind: 'product', target: defaultProduct._id }] }, a.cookie), 201).data
    const campaignQr = check(await request('POST', '/api/qrcodes', { campaignId: campaign._id, visitorTarget: { visitorId: first.id, productId: pageProduct._id } }, a.cookie), 201).data
    // Campaign overlap never exposes the personalized product to other browsers.
    check(await request('PUT', `/api/campaigns/${campaign._id}`, { name: 'Default campaign', entries: [{ kind: 'product', target: defaultProduct._id }, { kind: 'product', target: pageProduct._id }] }, a.cookie), 200)
    for (let i = 0; i < 8; i++) assert.equal(check(await request('GET', new URL(campaignQr.url).pathname, null, second.cookie), 302).location, 'https://example.test/default')
    const personalOnly = check(await request('POST', '/api/campaigns', { name: 'No fallback', entries: [{ kind: 'product', target: pageProduct._id }] }, a.cookie), 201).data
    check(await request('POST', '/api/qrcodes', { campaignId: personalOnly._id, visitorTarget: { visitorId: first.id, productId: pageProduct._id } }, a.cookie), 409)
    for (const code of [qr, campaignQr]) {
      const scanPath = new URL(code.url).pathname
      const landing = check(await request('GET', scanPath, null, first.cookie, { accept: 'text/html' }), 200)
      const token = landing.data.match(/data-token="([a-f0-9]{48})"/)[1]
      const continuation = `/scan/${token}/continue`
      const page = check(await request('GET', continuation, null, first.cookie), 200).data
      assert.match(page, /Assigned gallery/)
      const sources = [...page.matchAll(/src="([^"]+)"/g)].map(match => match[1].replaceAll('&amp;', '&'))
      assert.equal(sources.length, 2)
      for (let i = 0; i < 2; i++) {
        assert.ok(check(await request('GET', sources[i], null, first.cookie), 200).data.equals(photos[i].bytes))
        check(await request('GET', sources[i], null, second.cookie), 403)
        check(await request('GET', sources[i]), 403)
      }
      check(await request('GET', continuation, null, second.cookie), 403)
      assert.equal(check(await request('GET', scanPath, null, second.cookie), 302).location, code === qr ? 'https://example.test/override' : 'https://example.test/default')
      check(await request('PATCH', `/api/qrcodes/${code._id}`, { status: 'paused' }, a.cookie), 200)
      check(await request('GET', sources[0], null, first.cookie), 410)
      check(await request('PATCH', `/api/qrcodes/${code._id}`, { status: 'active' }, a.cookie), 200)
      check(await request('PATCH', `/api/qrcodes/${code._id}`, { visitorTarget: null }, a.cookie), 200)
      check(await request('GET', sources[0], null, first.cookie), 403)
    }
    // A product referenced by another personalized QR cannot be deleted.
    check(await request('DELETE', `/api/products/${personal._id}`, {}, a.cookie), 409)
    const foreignQr = check(await request('POST', '/api/qrcodes', { productId: foreignProduct._id }, b.cookie), 201).data
    check(await request('PATCH', `/api/qrcodes/${foreignQr._id}`, { visitorTarget: { visitorId: first.id, productId: foreignProduct._id } }, b.cookie), 404)
    const stats = check(await request('GET', '/api/statistics', null, a.cookie), 200).data
    assert.ok(stats.some(scan => scan.product === pageProduct._id && scan.data.targeting.kind === 'visitor' && !scan.campaign))
    assert.ok(stats.some(scan => scan.product === defaultProduct._id && scan.data.targeting.kind === 'default'))
  } finally {
    if (server) await new Promise(resolve => server.close(resolve))
    for (const file of uploaded) await fs.unlink(file).catch(() => {})
    if (mongoose.connection.name === database) await mongoose.connection.dropDatabase()
    await mongoose.disconnect()
    const keys = await redisClient.keys(`${process.env.SESSION_KEY_PREFIX}*`)
    if (keys.length) await redisClient.del(...keys)
    await redisClient.quit()
  }
})

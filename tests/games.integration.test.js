const { test } = require('node:test')
const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')

test('QR games isolate players and durable inboxes, authorize recipients and keep sends idempotent', { skip: !process.env.TEST_MONGO_URI, timeout: 90000 }, async () => {
  const database = `qr2share_games_test_${randomUUID().replaceAll('-', '')}`
  const uri = new URL(process.env.TEST_MONGO_URI); uri.pathname = `/${database}`
  process.env.MONGO_URI = uri.toString(); process.env.REDIS_URL = process.env.TEST_REDIS_URL || 'redis://127.0.0.1:6379'
  process.env.SESSION_KEY_PREFIX = `test:${database}:`; process.env.SESSION_SECRET = randomUUID(); process.env.NODE_ENV = 'test'
  const mongoose = require('mongoose')
  const { initApp } = require('../src/app')
  const { redisClient } = require('../src/config/redis.config')
  let server
  try {
    const app = await initApp()
    server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)) })
    const base = `http://127.0.0.1:${server.address().port}`; process.env.PUBLIC_URL = base
    async function request(method, path, body, cookie, extra = {}) {
      const response = await fetch(base + path, { method, redirect: 'manual', headers: { ...(cookie ? { cookie } : {}), ...(method !== 'GET' ? { 'content-type': 'application/json' } : {}), ...extra }, ...(method !== 'GET' ? { body: JSON.stringify(body || {}) } : {}) })
      const data = (response.headers.get('content-type') || '').includes('application/json') ? await response.json() : await response.text()
      return { status: response.status, data, location: response.headers.get('location'), cookie: response.headers.get('set-cookie')?.split(';')[0] }
    }
    const check = (r, status) => { assert.equal(r.status, status, JSON.stringify(r.data)); return r }
    const owner = check(await request('POST', '/api/users', { name: 'Game', lastName: 'Owner', email: 'game-owner@example.test', password: 'game owner test password' }), 201)
    const otherOwner = check(await request('POST', '/api/users', { name: 'Other', lastName: 'Owner', email: 'game-other@example.test', password: 'game owner test password' }), 201)
    const create = async (cookie, name) => check(await request('POST', '/api/games', { name, welcome: 'Welcome <script>test</script> to our circle!' }, cookie), 201).data
    const game = await create(owner.cookie, 'Message circle'), other = await create(otherOwner.cookie, 'Other circle')
    assert.ok(game.code.game); assert.ok(game.code.qrCode.startsWith('data:image/png;base64,'))
    const root = `/games/${game._id}`, otherRoot = `/games/${other._id}`
    assert.equal(check(await request('GET', '/api/games', null, otherOwner.cookie), 200).data.length, 1)
    check(await request('POST', '/api/games', { name: 'Bad', welcome: 'x', createdBy: owner.data._id }, otherOwner.cookie), 400)
    const models = require('../src/features/games/game.models')
    await Promise.all([models.ParticipantModel.init(), models.GameMessageModel.init()])
    const landing = check(await request('GET', new URL(game.code.url).pathname, null, null, { accept: 'text/html' }), 200)
    const token = landing.data.match(/data-token="([a-f0-9]{48})"/)[1]
    check(await request('POST', `/scan/${token}/metrics`, { language: 'en' }, landing.cookie), 204)
    assert.equal(check(await request('GET', `/scan/${token}/continue`, null, landing.cookie), 302).location, root)
    async function join(path, name, browserCookie) {
      const page = check(await request('GET', path, null, browserCookie), 200)
      assert.ok(page.data.includes('&lt;script&gt;test&lt;/script&gt;'))
      const cookie = [page.cookie, browserCookie].filter(Boolean).join('; ')
      const result = check(await request('POST', `${path}/join`, { name }, cookie), 201)
      assert.deepEqual(Object.keys(result.data).sort(), ['_id', 'name'])
      return { cookie, id: result.data._id }
    }
    const a = await join(root, 'Alex', landing.cookie), b = await join(root, 'Blair'), c = await join(root, 'Casey')
    const foreign = await join(otherRoot, 'Foreign')
    check(await request('GET', `${root}/messages`), 401)
    check(await request('POST', `${root}/join`, { name: 'No cookie' }), 401)
    check(await request('GET', `${root}/participants`, null, foreign.cookie), 401)
    const duplicatePage = check(await request('GET', root), 200)
    check(await request('POST', `${root}/join`, { name: 'aLeX' }, duplicatePage.cookie), 409)
    assert.equal(check(await request('POST', `${root}/join`, { name: 'Ignored second join' }, a.cookie), 200).data._id, a.id)
    const players = check(await request('GET', `${root}/participants`, null, a.cookie), 200).data.participants
    assert.deepEqual(players.map(p => p.name).sort(), ['Blair', 'Casey'])
    assert.deepEqual(Object.keys(players[0]).sort(), ['_id', 'name'])
    assert.equal(check(await request('GET', `${root}/participants?search=Bla`, null, a.cookie), 200).data.participants[0].name, 'Blair')
    const send = (sender, recipientId, text, requestId = randomUUID(), extra) => request('POST', `${root}/messages`, { recipientId, text, requestId }, sender.cookie, extra)
    check(await send(a, foreign.id, 'Cross game'), 404)
    check(await send(a, a.id, 'Self'), 400)
    check(await send(a, b.id, 'Forged', randomUUID(), { origin: 'https://evil.example' }), 403)
    check(await send(a, b.id, 'x'.repeat(2001)), 400)
    const requestId = randomUUID()
    const first = check(await send(a, b.id, 'First <b>note</b>', requestId), 201).data.id
    assert.equal(check(await send(a, b.id, 'First <b>note</b>', requestId), 200).data.id, first)
    check(await send(a, b.id, 'Changed request', requestId), 409)
    const second = check(await send(c, b.id, 'Second note'), 201).data.id
    const inbox = () => request('GET', `${root}/messages`, null, b.cookie)
    assert.equal(check(await inbox(), 200).data.unreadCount, 2)
    assert.equal(check(await inbox(), 200).data.message.id, first)
    assert.equal(check(await inbox(), 200).data.message.text, 'First <b>note</b>')
    assert.equal(check(await request('GET', `${root}/messages`, null, a.cookie), 200).data.message, null)
    check(await request('POST', `${root}/messages/${first}/read`, {}, a.cookie), 404)
    check(await request('POST', `${root}/messages/${first}/read`, {}, foreign.cookie), 401)
    check(await request('POST', `${root}/messages/${first}/read`, {}, b.cookie), 204)
    check(await request('POST', `${root}/messages/${first}/read`, {}, b.cookie), 204)
    assert.equal(check(await inbox(), 200).data.message.id, second)
    assert.equal(check(await inbox(), 200).data.unreadCount, 1)
    assert.equal(check(await request('GET', `${root}/messages?status=read`, null, b.cookie), 200).data.message.id, first)
    check(await request('PATCH', `/api/qrcodes/${game.code._id}`, { visitorTarget: null }, owner.cookie), 400)
    check(await request('PATCH', `/api/qrcodes/${game.code._id}`, { status: 'paused' }, otherOwner.cookie), 404)
    check(await request('PATCH', `/api/qrcodes/${game.code._id}`, { status: 'paused' }, owner.cookie), 200)
    check(await inbox(), 410); check(await send(a, b.id, 'Paused'), 410)
    check(await request('GET', new URL(game.code.url).pathname, null, a.cookie), 410)
    check(await request('PATCH', `/api/qrcodes/${game.code._id}`, { status: 'active' }, owner.cookie), 200)
    assert.equal(check(await inbox(), 200).data.message.id, second)
    const concurrentId = randomUUID()
    const concurrent = await Promise.all([send(c, b.id, 'One concurrent note', concurrentId), send(c, b.id, 'One concurrent note', concurrentId)])
    for (const result of concurrent) assert.ok([200, 201].includes(result.status), JSON.stringify(result))
    assert.equal(concurrent[0].data.id, concurrent[1].data.id)
    assert.equal(check(await inbox(), 200).data.unreadCount, 2)
    const scans = check(await request('GET', '/api/statistics', null, owner.cookie), 200).data
    assert.equal(scans.length, 1); assert.equal(scans[0].data.visitor.confirmed, true)
    assert.equal(check(await request('GET', '/api/games', null, owner.cookie), 200).data[0].participants, 3)
  } finally {
    if (server) await new Promise(resolve => server.close(resolve))
    if (mongoose.connection.name === database) await mongoose.connection.dropDatabase()
    await mongoose.disconnect()
    const keys = await redisClient.keys(`${process.env.SESSION_KEY_PREFIX}*`)
    if (keys.length) await redisClient.del(...keys)
    await redisClient.quit()
  }
})

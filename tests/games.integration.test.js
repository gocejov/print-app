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
    // Plugin definitions are shared, while each space owns configuration, membership and one QR.
    check(await request('GET', '/api/plugins'), 401)
    const catalog = check(await request('GET', '/api/plugins', null, owner.cookie), 200).data
    assert.equal(catalog[0].id, 'message-circle')
    assert.equal(catalog[0].version, 1)
    assert.ok(catalog[0].configurationFields.some(field => field.key === 'welcome'))
    assert.ok(!('entryPath' in catalog[0])); assert.ok(!('validateConfiguration' in catalog[0]))
    const spaceBody = name => ({ pluginId: 'message-circle', name, configuration: { welcome: `Welcome <script>test</script> to ${name}!` } })
    check(await request('POST', '/api/spaces', { ...spaceBody('Bad'), pluginId: 'missing-plugin' }, owner.cookie), 400)
    check(await request('POST', '/api/spaces', { ...spaceBody('Bad'), configuration: { welcome: 'ok', extra: true } }, owner.cookie), 400)
    check(await request('POST', '/api/spaces', { ...spaceBody('Bad'), createdBy: otherOwner.data._id }, owner.cookie), 400)
    const spaceA = check(await request('POST', '/api/spaces', spaceBody('Space A'), owner.cookie), 201).data
    const spaceB = check(await request('POST', '/api/spaces', spaceBody('Space B'), owner.cookie), 201).data
    assert.equal(spaceA.pluginId, spaceB.pluginId); assert.equal(spaceA.pluginVersion, 1)
    assert.equal(spaceA.code.space, spaceA._id); assert.ok(!spaceA.code.game)
    assert.notEqual(spaceA.code._id, spaceB.code._id)
    assert.notEqual(spaceA.configuration.welcome, spaceB.configuration.welcome)
    assert.equal(check(await request('GET', new URL(spaceA.code.url).pathname), 302).location, `/games/${spaceA._id}`)
    assert.equal(check(await request('GET', `/spaces/${spaceA._id}/open`), 302).location, `/games/${spaceA._id}`)
    const playerA = await join(`/games/${spaceA._id}`, 'Same name'), playerB = await join(`/games/${spaceB._id}`, 'Same name')
    assert.notEqual(playerA.id, playerB.id)
    check(await request('GET', `/games/${spaceB._id}/messages`, null, playerA.cookie), 401)
    check(await request('PATCH', `/api/spaces/${spaceA._id}`, { name: 'Foreign edit' }, otherOwner.cookie), 404)
    check(await request('PATCH', `/api/spaces/${spaceA._id}`, { pluginId: 'other' }, owner.cookie), 400)
    check(await request('PATCH', `/api/spaces/${spaceA._id}`, { configuration: { welcome: '' } }, owner.cookie), 400)
    const edited = check(await request('PATCH', `/api/spaces/${spaceA._id}`, { name: 'Renamed space A', configuration: { welcome: 'A different welcome.' } }, owner.cookie), 200).data
    assert.equal(edited.pluginId, 'message-circle')
    const allSpaces = check(await request('GET', '/api/spaces?pluginId=message-circle', null, owner.cookie), 200).data
    assert.equal(allSpaces.length, 3)
    const updatedA = allSpaces.find(space => space._id === spaceA._id)
    assert.equal(updatedA.code.url, spaceA.code.url); assert.equal(updatedA.code.qrCode, spaceA.code.qrCode)
    assert.equal(updatedA.participants, 1)
    assert.equal(allSpaces.find(space => space._id === spaceB._id).configuration.welcome, spaceB.configuration.welcome)
    check(await request('GET', '/api/spaces?pluginId=unknown', null, owner.cookie), 400)
    // A pre-plugin game record needs no bulk migration and retains its participant cookie and QR.
    await models.GameModel.collection.updateOne({ _id: new mongoose.Types.ObjectId(game._id) }, { $unset: { pluginId: '', pluginVersion: '', configuration: '' } })
    const oldContinuation = await new (require('../src/services/browser-scan.service').BrowserScanService)().create({ ownerId: owner.data._id, qrId: game.code._id, gameId: game._id, productId: '', fileId: '', statisticId: scans[0]._id })
    assert.equal(check(await request('GET', `/scan/${oldContinuation}/continue`, null, b.cookie), 302).location, root)
    const legacy = check(await request('GET', '/api/spaces', null, owner.cookie), 200).data.find(space => space._id === game._id)
    assert.equal(legacy.pluginId, 'message-circle'); assert.equal(legacy.pluginVersion, 1)
    assert.equal(legacy.code.url, game.code.url); assert.equal(legacy.code.qrCode, game.code.qrCode)
    assert.equal(check(await inbox(), 200).data.message.id, second)
    check(await request('PATCH', `/api/spaces/${game._id}`, { name: 'Legacy space renamed', configuration: { welcome: 'Updated legacy welcome.' } }, owner.cookie), 200)
    assert.equal(check(await inbox(), 200).data.message.id, second)

    await require('../src/models/user.model').UserModel.updateOne({ _id: owner.data._id }, { $set: { useAlias: true, alias: 'spaces' } })
    const aliased = check(await request('POST', '/api/spaces', spaceBody('Alias compatibility'), owner.cookie), 201).data
    assert.ok(new URL(aliased.code.url).pathname.startsWith('/spaces/'))
    assert.equal(check(await request('GET', new URL(aliased.code.url).pathname), 302).location, `/games/${aliased._id}`)
  } finally {
    if (server) await new Promise(resolve => server.close(resolve))
    if (mongoose.connection.name === database) await mongoose.connection.dropDatabase()
    await mongoose.disconnect()
    const keys = await redisClient.keys(`${process.env.SESSION_KEY_PREFIX}*`)
    if (keys.length) await redisClient.del(...keys)
    await redisClient.quit()
  }
})

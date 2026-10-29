const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');

test('sessions, scoped management, uploads and public QR redirects', { skip: !process.env.TEST_MONGO_URI, timeout: 90000 }, async () => {
  const runId = randomUUID().replaceAll('-', '');
  const database = `qr2share_auth_test_${runId}`;
  const uri = new URL(process.env.TEST_MONGO_URI);
  uri.pathname = `/${database}`;
  process.env.MONGO_URI = uri.toString();
  process.env.REDIS_URL = process.env.TEST_REDIS_URL || 'redis://127.0.0.1:6379';
  process.env.SESSION_KEY_PREFIX = `test:${runId}:`;
  process.env.SESSION_SECRET = randomUUID();
  process.env.NODE_ENV = 'test';
  const mongoose = require('mongoose');
  const { initApp } = require('../src/app');
  const { redisClient } = require('../src/config/redis.config');
  const { UserModel } = require('../src/models/user.model');
  let server;
  const uploaded = [];
  try {
    const app = await initApp();
    await UserModel.init();
    server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
    const base = `http://127.0.0.1:${server.address().port}`;
    async function request(method, route, body, cookie, extraHeaders = {}) {
      const headers = { ...extraHeaders };
      if (cookie) headers.cookie = cookie;
      const options = { method, headers, redirect: 'manual' };
      if (body instanceof FormData) options.body = body;
      else if (method !== 'GET') { headers['content-type'] = 'application/json'; options.body = JSON.stringify(body || {}); }
      const response = await fetch(base + route, options);
      const text = await response.text();
      let data; try { data = JSON.parse(text); } catch { data = text; }
      return { status: response.status, data, cookie: response.headers.get('set-cookie')?.split(';')[0], location: response.headers.get('location') };
    }
    const check = (response, status) => { assert.equal(response.status, status, JSON.stringify(response.data)); return response; };
    for (const route of ['users', 'files', 'products', 'qrcodes', 'statistics']) check(await request('GET', `/api/${route}`), 401);
    const password = 'initial test password';
    const signup = email => request('POST', '/api/users', { name: 'Test', lastName: 'Account', email, password });
    const a = check(await signup('a@example.test'), 201);
    const b = check(await signup('b@example.test'), 201);
    assert.ok(a.cookie);
    assert.equal('password' in a.data, false);
    const stored = await UserModel.findById(a.data._id).select('+password');
    assert.match(stored.password, /^scrypt\$/);
    check(await signup('a@example.test'), 409);
    check(await request('POST', '/api/users', { name: 'Missing' }), 400);
    check(await request('POST', '/api/users/login', { email: { $ne: '' }, password }), 400);
    check(await request('POST', '/api/users/login', { email: a.data.email, password: 'incorrect' }), 401);
    const login = check(await request('POST', '/api/users/login', { email: a.data.email, password }, a.cookie), 200);
    assert.notEqual(login.cookie, a.cookie);
    check(await request('GET', '/api/users/me', null, a.cookie), 401);
    a.cookie = login.cookie;
    assert.equal((await fetch(base + '/api/users/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{broken' })).status, 400);
    assert.equal((await fetch(base + '/api/users/login', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: '{}' })).status, 415);
    check(await request('GET', '/api/files/not-an-id', null, a.cookie), 400);
    const profile = check(await request('PUT', `/api/users/${a.data._id}`, { name: 'Updated', alias: 'my-account', useAlias: true }, a.cookie), 200);
    assert.equal(profile.data.name, 'Updated');
    assert.equal((await UserModel.findById(a.data._id).select('+password')).password, stored.password);
    check(await request('PUT', `/api/users/${a.data._id}`, { alias: 'api' }, a.cookie), 400);
    const secondSession = check(await request('POST', '/api/users/login', { email: a.data.email, password }), 200);
    assert.deepEqual(check(await request('GET', '/api/users', null, a.cookie), 200).data.map(u => u._id), [a.data._id]);
    for (const method of ['GET', 'PUT', 'DELETE']) check(await request(method, `/api/users/${b.data._id}`, {}, a.cookie), 404);
    check(await request('PUT', `/api/users/${a.data._id}`, { active: true }, a.cookie), 400);
    check(await request('POST', '/api/files', { type: 'web-url', url: 'javascript:alert(1)' }, a.cookie), 400);
    check(await request('POST', '/api/files', { type: 'web-url', url: 'https://example.com', createdBy: b.data._id }, a.cookie), 403);
    check(await request('POST', '/api/files', { type: 'web-url', url: 'https://example.com' }, a.cookie, { origin: 'https://untrusted.example' }), 403);
    const file = check(await request('POST', '/api/files', { type: 'web-url', url: 'https://example.com' }, a.cookie), 201).data;
    check(await request('POST', '/api/products/create/', { fileId: file._id }, b.cookie), 404);
    const product = check(await request('POST', '/api/products/create/', { fileId: file._id }, a.cookie), 200).data.product;
    check(await request('POST', '/api/qrcodes', { productId: product._id }, b.cookie), 404);
    const code = check(await request('POST', '/api/qrcodes', { productId: product._id }, a.cookie), 201).data;
    for (const [resource, record] of [['files', file], ['products', product], ['qrcodes', code]]) {
      assert.deepEqual(check(await request('GET', `/api/${resource}`, null, b.cookie), 200).data, []);
      for (const method of ['GET', 'PUT', 'DELETE']) check(await request(method, `/api/${resource}/${record._id}`, { alias: 'changed' }, b.cookie), 404);
      check(await request('PUT', `/api/${resource}/${record._id}`, { $set: { createdBy: b.data._id } }, a.cookie), 400);
    }
    assert.equal(check(await request('PUT', `/api/files/${file._id}`, { url: 'https://example.org' }, a.cookie), 200).data.url, 'https://example.org/');
    for (const [resource, record] of [['products', product], ['qrcodes', code]]) {
      assert.equal(check(await request('PUT', `/api/${resource}/${record._id}`, { alias: 'my-record' }, a.cookie), 200).data.alias, 'my-record');
    }
    const populated = check(await request('GET', '/api/products/with-options', null, a.cookie), 200).data;
    assert.equal('password' in populated[0].owner, false);
    check(await request('GET', `/api/qrcodes/qr-code/${code._id}`, null, b.cookie), 404);
    const scan = check(await request('GET', `/q/${code._id}`), 302);
    assert.equal(scan.location, 'https://example.org/');
    check(await request('GET', `/l/q/u/${code._id}`), 302);
    check(await request('GET', `/api/qrcodes/videos/u/${code._id}`, null, a.cookie), 302);
    check(await request('GET', `/api/qrcodes/play-video/${code._id}`, null, a.cookie), 302);
    // Wait briefly for the intentionally asynchronous scan writes.
    let statistics;
    for (let i = 0; i < 20; i++) {
      statistics = check(await request('GET', `/api/statistics/by-codes/${code._id}`, null, a.cookie), 200).data;
      if (statistics.count >= 2) break;
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    assert.ok(statistics.count >= 2);
    for (const route of ['/api/statistics', '/api/qrcodes/with-options']) assert.deepEqual(check(await request('GET', route, null, b.cookie), 200).data, []);
    for (const route of [`/api/statistics/by-codes/${code._id}`, `/api/statistics/total-by-codes/${code._id}`, `/api/statistics/${statistics.statistics[0]._id}`]) check(await request('GET', route, null, b.cookie), 404);
    check(await request('POST', `/api/upload/video/${b.data._id}`, {}, a.cookie), 403);
    check(await request('POST', `/api/upload/video/${a.data._id}`, {}, a.cookie), 400);
    const form = new FormData();
    form.append('video', new Blob(['test upload bytes'], { type: 'video/mp4' }), `integration-${runId}.mp4`);
    const video = check(await request('POST', `/api/upload/video/${a.data._id}`, form, a.cookie), 200).data.file;
    uploaded.push(video.path);
    assert.equal(video.createdBy, a.data._id);
    const videoProduct = check(await request('POST', '/api/products/create/', { fileId: video._id }, a.cookie), 200).data.product;
    const videoCode = check(await request('POST', '/api/qrcodes', { productId: videoProduct._id }, a.cookie), 201).data;
    check(await request('PATCH', `/api/qrcodes/${videoCode._id}`, { destinationUrl: 'https://example.com' }, a.cookie), 400);
    assert.equal(check(await request('GET', `/l/q/v/${videoCode._id}`), 200).data, 'test upload bytes');
    check(await request('PUT', `/api/files/${video._id}`, { url: '/etc/passwd' }, a.cookie), 400);
    // A dynamic destination belongs to one QR, independent of product URL copies.
    check(await request('POST', '/api/qrcodes/dynamic', { name: 'Bad target', url: 'javascript:alert(1)' }, a.cookie), 400);
    check(await request('POST', '/api/qrcodes/dynamic', { name: 'Unexpected owner', url: 'https://example.com', userId: b.data._id }, a.cookie), 400);
    const dynamic = check(await request('POST', '/api/qrcodes/dynamic', { name: 'Summer menu', url: 'https://example.com/menu' }, a.cookie), 201).data;
    const publicPath = new URL(dynamic.url).pathname;
    assert.equal(check(await request('GET', publicPath), 302).location, 'https://example.com/menu');
    check(await request('PATCH', `/api/qrcodes/${dynamic._id}`, { destinationUrl: 'https://example.org' }, b.cookie), 404);
    check(await request('PATCH', `/api/qrcodes/${dynamic._id}`, { destinationUrl: 'file:///etc/passwd' }, a.cookie), 400);
    check(await request('PATCH', `/api/qrcodes/${dynamic._id}`, { product: product._id }, a.cookie), 400);
    const edited = check(await request('PATCH', `/api/qrcodes/${dynamic._id}`, { name: 'Autumn menu', destinationUrl: 'https://example.org/autumn' }, a.cookie), 200).data;
    assert.equal(edited.url, dynamic.url);
    assert.equal(edited.qrCode, dynamic.qrCode);
    assert.equal(edited.name, 'Autumn menu');
    assert.equal(check(await request('GET', publicPath), 302).location, 'https://example.org/autumn');
    assert.equal(check(await request('GET', `/q/${code._id}`), 302).location, 'https://example.org/');
    check(await request('PATCH', `/api/qrcodes/${dynamic._id}`, { status: 'paused' }, a.cookie), 200);
    check(await request('GET', publicPath), 410);
    check(await request('GET', `/l/q/u/${dynamic._id}`), 410);
    check(await request('PATCH', `/api/qrcodes/${dynamic._id}`, { status: 'active' }, a.cookie), 200);
    check(await request('GET', publicPath), 302);
    check(await request('PATCH', `/api/qrcodes/${code._id}`, { destinationUrl: 'https://example.com/video' }, a.cookie), 200);
    check(await request('PATCH', `/api/qrcodes/${dynamic._id}`, { status: 'deleted' }, a.cookie), 400);
    check(await request('PATCH', `/api/qrcodes/${dynamic._id}`, {}, a.cookie), 400);
    const newPassword = 'updated test password';
    check(await request('PUT', `/api/users/${a.data._id}`, { password: newPassword }, a.cookie), 403);
    const changed = check(await request('PUT', `/api/users/${a.data._id}`, { password: newPassword, currentPassword: password }, a.cookie), 200);
    assert.equal('password' in changed.data, false);
    check(await request('GET', '/api/users/me', null, secondSession.cookie), 401);
    check(await request('POST', '/api/users/login', { email: a.data.email, password }), 401);
    const fresh = check(await request('POST', '/api/users/login', { email: a.data.email, password: newPassword }), 200);
    check(await request('POST', '/api/users/logout', {}, fresh.cookie), 204);
    check(await request('GET', '/api/users/me', null, fresh.cookie), 401);
    check(await request('DELETE', `/api/users/${b.data._id}`, null, b.cookie), 200);
    check(await request('GET', '/api/users/me', null, b.cookie), 401);
    // Rate limiting is stored under the isolated test prefix.
    let limited;
    for (let i = 0; i < 35; i++) {
      limited = await request('POST', '/api/users/login', { email: 'none@example.test', password });
      if (limited.status === 429) break;
    }
    check(limited, 429);
    check(await request('GET', '/health'), 200);
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    for (const file of uploaded) {
      const target = path.resolve(file);
      assert.ok(target.startsWith(path.resolve('uploads/videos') + path.sep));
      await fs.unlink(target);
    }
    if (mongoose.connection.name === database) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
    const keys = await redisClient.keys(`${process.env.SESSION_KEY_PREFIX}*`);
    if (keys.length) await redisClient.del(...keys);
    await redisClient.quit();
  }
});

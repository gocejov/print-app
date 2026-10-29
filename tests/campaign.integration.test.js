const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const sharp = require('sharp');

test('campaign/category ownership, live expansion, random scans and pinned media selection', { skip: !process.env.TEST_MONGO_URI, timeout: 90000 }, async () => {
  const database = `qr2share_campaign_test_${randomUUID().replaceAll('-', '')}`;
  const uri = new URL(process.env.TEST_MONGO_URI); uri.pathname = `/${database}`;
  Object.assign(process.env, { MONGO_URI: uri.toString(), REDIS_URL: process.env.TEST_REDIS_URL || 'redis://127.0.0.1:6379', SESSION_KEY_PREFIX: `test:${database}:`, SESSION_SECRET: randomUUID(), NODE_ENV: 'test' });
  const mongoose = require('mongoose');
  const { initApp } = require('../src/app');
  const { redisClient } = require('../src/config/redis.config');
  const { selectionKey } = require('../src/services/qr-playback.service');
  const { StatisticModel } = require('../src/models/statistic.model');
  const { FileModel } = require('../src/models/file.model');
  const uploaded = [];
  let server;
  try {
    const app = await initApp();
    server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
    const base = `http://127.0.0.1:${server.address().port}`; process.env.PUBLIC_URL = base;
    async function request(method, path, body, cookie) {
      const headers = cookie ? { cookie } : {};
      const options = { method, headers, redirect: 'manual' };
      if (body instanceof FormData) options.body = body;
      else if (method !== 'GET') { headers['content-type'] = 'application/json'; options.body = JSON.stringify(body || {}); }
      const response = await fetch(base + path, options);
      const type = response.headers.get('content-type') || '';
      const data = type.includes('application/json') ? await response.json() : /^(image|video)\//.test(type) ? Buffer.from(await response.arrayBuffer()) : await response.text();
      return { status: response.status, data, location: response.headers.get('location'), cookie: response.headers.get('set-cookie')?.split(';')[0], cache: response.headers.get('cache-control') };
    }
    const check = (res, status) => { assert.equal(res.status, status, JSON.stringify(res.data)); return res; };
    for (const route of ['categories','campaigns']) check(await request('GET', `/api/${route}`), 401);
    const register = name => request('POST', '/api/users', { name, lastName: 'Test', email: `${name}@example.test`, password: 'campaign test password' });
    const a = check(await register('alice'), 201), b = check(await register('bob'), 201);
    async function urlProduct(name, owner = a) {
      const file = check(await request('POST', '/api/files', { name, type: 'web-url', url: `https://example.com/${name}` }, owner.cookie), 201).data;
      return check(await request('POST', '/api/products/create/', { name, fileId: file._id }, owner.cookie), 200).data.product;
    }
    const alpha = await urlProduct('alpha'), beta = await urlProduct('beta'), foreign = await urlProduct('foreign', b);
    const category = check(await request('POST', '/api/categories', { name: 'Menu', products: [beta._id, alpha._id, beta._id] }, a.cookie), 201).data;
    assert.deepEqual(category.products, [beta._id, alpha._id]);
    check(await request('POST', '/api/categories', { name: 'Foreign', products: [foreign._id] }, a.cookie), 404);
    check(await request('POST', '/api/categories', { name: 'Injection', products: [{ $ne: '' }] }, a.cookie), 400);
    const entry = (kind, target) => ({ kind, target });
    const body = { name: 'Campaign', entries: [entry('product', alpha._id), entry('category', category._id), entry('category', category._id)], rule: 'random', status: 'active' };
    const campaign = check(await request('POST', '/api/campaigns', body, a.cookie), 201).data;
    assert.equal(campaign.entries.length, 2);
    const pool = check(await request('GET', `/api/campaigns/${campaign._id}/products`, null, a.cookie), 200).data;
    assert.equal(pool.count, 2);
    assert.deepEqual(pool.products.map(p => p._id), [alpha._id, beta._id]);
    assert.deepEqual(pool.distribution.map(item => item.weight), [1, 1]);
    const weighted = check(await request('PUT', `/api/campaigns/${campaign._id}`, { ...body, productWeights: [{ product: beta._id, weight: 3 }] }, a.cookie), 200).data;
    assert.deepEqual(weighted.productWeights, [{ product: beta._id, weight: 3 }]);
    const weightedPool = check(await request('GET', `/api/campaigns/${campaign._id}/products`, null, a.cookie), 200).data;
    assert.deepEqual(weightedPool.distribution, [{ product: alpha._id, weight: 1, probability: 0.25 }, { product: beta._id, weight: 3, probability: 0.75 }]);
    for (const weight of [0, -1, 1.2, 1001, '3', null])
      check(await request('PUT', `/api/campaigns/${campaign._id}`, { ...body, productWeights: [{ product: alpha._id, weight }] }, a.cookie), 400);
    check(await request('PUT', `/api/campaigns/${campaign._id}`, { ...body, productWeights: [{ product: alpha._id, weight: 2 }, { product: alpha._id, weight: 3 }] }, a.cookie), 400);
    check(await request('PUT', `/api/campaigns/${campaign._id}`, { ...body, productWeights: [{ product: foreign._id, weight: 2 }] }, a.cookie), 400);
    check(await request('PUT', `/api/campaigns/${campaign._id}`, { ...body, productWeights: { invalid: true } }, a.cookie), 400);
    check(await request('POST', '/api/campaigns', { name: 'Bad rule', entries: [], rule: 'weighted' }, a.cookie), 400);
    check(await request('POST', '/api/campaigns', { name: 'Foreign ref', entries: [entry('product', foreign._id)] }, a.cookie), 404);
    const foreignCategory = check(await request('POST', '/api/categories', { name: 'Private', products: [foreign._id] }, b.cookie), 201).data;
    check(await request('POST', '/api/campaigns', { name: 'Foreign category', entries: [entry('category', foreignCategory._id)] }, a.cookie), 404);
    for (const [route, id] of [['categories', category._id], ['campaigns', campaign._id]]) {
      assert.deepEqual(check(await request('GET', `/api/${route}`, null, b.cookie), 200).data, [] .concat(route === 'categories' ? [foreignCategory] : []));
      for (const method of ['GET','PUT','DELETE']) check(await request(method, `/api/${route}/${id}`, body, b.cookie), 404);
    }
    check(await request('GET', `/api/campaigns/${campaign._id}/products`, null, b.cookie), 404);
    check(await request('POST', '/api/qrcodes', { productId: alpha._id, campaignId: campaign._id }, a.cookie), 400);
    check(await request('POST', '/api/qrcodes', { campaignId: campaign._id }, b.cookie), 404);
    const qr = check(await request('POST', '/api/qrcodes', { name: 'Whole menu', campaignId: campaign._id }, a.cookie), 201).data;
    assert.equal(qr.product, undefined); assert.equal(qr.file, undefined);
    const path = new URL(qr.url).pathname;
    for (let i = 0; i < 10; i++) {
      const scan = check(await request('GET', path), 302);
      assert.ok(['https://example.com/alpha', 'https://example.com/beta'].includes(scan.location));
      assert.equal(scan.cache, 'no-store');
    }
    check(await request('DELETE', `/api/categories/${category._id}`, {}, a.cookie), 409);
    check(await request('DELETE', `/api/products/${alpha._id}`, {}, a.cookie), 409);
    check(await request('DELETE', `/api/products/${beta._id}`, {}, a.cookie), 409);
    check(await request('DELETE', `/api/campaigns/${campaign._id}`, {}, a.cookie), 409);
    // Live category edits immediately alter the campaign without rewriting its QR.
    check(await request('PUT', `/api/categories/${category._id}`, { name: 'Menu', products: [alpha._id] }, a.cookie), 200);
    assert.equal(check(await request('GET', `/api/campaigns/${campaign._id}/products`, null, a.cookie), 200).data.count, 1);
    assert.equal(check(await request('GET', path), 302).location, 'https://example.com/alpha');
    check(await request('PUT', `/api/campaigns/${campaign._id}`, { ...body, status: 'paused' }, a.cookie), 200);
    check(await request('GET', path), 410);
    check(await request('PUT', `/api/campaigns/${campaign._id}`, { name: 'Empty', entries: [] }, a.cookie), 200);
    check(await request('GET', path), 409);
    check(await request('POST', '/api/qrcodes', { campaignId: campaign._id }, a.cookie), 409);
    // Two supported images: a draw must remain pinned for all media requests.
    const imageProducts = [], imageBytes = new Map();
    for (const color of ['#287c60', '#c58049']) {
      const bytes = await sharp({ create: { width: 24, height: 24, channels: 4, background: color } }).png().toBuffer();
      const form = new FormData(); form.append('image', new Blob([bytes], { type: 'image/png' }), 'image.png');
      const file = check(await request('POST', `/api/upload/image/${a.data._id}`, form, a.cookie), 200).data.file;
      uploaded.push(file.path);
      const product = check(await request('POST', '/api/products/create/', { name: color, fileId: file._id }, a.cookie), 200).data.product;
      imageProducts.push(product); imageBytes.set(product._id, bytes);
    }
    const imageBody = { name: 'Images', entries: imageProducts.map(p => entry('product', p._id)) };
    check(await request('PUT', `/api/campaigns/${campaign._id}`, imageBody, a.cookie), 200);
    const imagePage = check(await request('GET', path), 200);
    const source = imagePage.data.match(/src="([^"]+)"/)[1].replaceAll('&amp;', '&');
    const token = new URL(source, base).searchParams.get('selection');
    const selection = JSON.parse(await redisClient.get(selectionKey(token)));
    assert.equal(selection.qrId, qr._id);
    assert.ok((await redisClient.ttl(selectionKey(token))) > 0);
    for (let i = 0; i < 3; i++) assert.ok(check(await request('GET', source), 200).data.equals(imageBytes.get(selection.productId)));
    check(await request('GET', `/l/q/i/${qr._id}`), 400);
    const otherQr = check(await request('POST', '/api/qrcodes', { campaignId: campaign._id }, a.cookie), 201).data;
    check(await request('GET', `/l/q/i/${otherQr._id}?selection=${token}`), 404);
    const replacement = imageProducts.find(p => p._id !== selection.productId);
    check(await request('PUT', `/api/campaigns/${campaign._id}`, { name: 'Changed', entries: [entry('product', replacement._id)] }, a.cookie), 200);
    check(await request('GET', source), 410);
    await redisClient.del(selectionKey(token));
    check(await request('GET', source), 410);
    // Missing file records are excluded, not selected and then failed.
    await FileModel.deleteOne({ _id: replacement.file });
    assert.equal(check(await request('GET', `/api/campaigns/${campaign._id}/products`, null, a.cookie), 200).data.count, 0);
    check(await request('GET', path), 409);
    const direct = check(await request('PATCH', `/api/qrcodes/${qr._id}`, { productId: alpha._id }, a.cookie), 200).data;
    assert.equal(direct.campaign, undefined); assert.equal(direct.product, alpha._id);
    assert.equal(direct.url, qr.url); assert.equal(direct.qrCode, qr.qrCode);
    assert.equal(check(await request('GET', path), 302).location, 'https://example.com/alpha');
    check(await request('PATCH', `/api/qrcodes/${qr._id}`, { campaignId: campaign._id }, a.cookie), 409);
    check(await request('PUT', `/api/campaigns/${campaign._id}`, { ...body, entries: [entry('product', beta._id)] }, a.cookie), 200);
    const restored = check(await request('PATCH', `/api/qrcodes/${qr._id}`, { campaignId: campaign._id }, a.cookie), 200).data;
    assert.equal(restored.product, undefined); assert.equal(restored.file, undefined);
    assert.equal(restored.url, qr.url); assert.equal(restored.qrCode, qr.qrCode);
    check(await request('PATCH', `/api/qrcodes/${qr._id}`, { destinationUrl: 'https://example.org' }, a.cookie), 400);
    check(await request('PATCH', `/api/qrcodes/${qr._id}`, { campaignId: campaign._id, productId: alpha._id }, a.cookie), 400);
    const stats = await StatisticModel.find({ qrCode: qr._id, campaign: campaign._id });
    assert.ok(stats.length >= 10);
    assert.ok(stats.every(stat => stat.product));
    check(await request('DELETE', `/api/qrcodes/${qr._id}`, {}, a.cookie), 200);
    check(await request('DELETE', `/api/qrcodes/${otherQr._id}`, {}, a.cookie), 200);
    check(await request('DELETE', `/api/campaigns/${campaign._id}`, {}, a.cookie), 200);
    check(await request('DELETE', `/api/categories/${category._id}`, {}, a.cookie), 200);
    check(await request('DELETE', `/api/products/${beta._id}`, {}, a.cookie), 200);
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    for (const path of uploaded) await fs.unlink(path).catch(() => {});
    if (mongoose.connection.name === database) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
    const keys = await redisClient.keys(`${process.env.SESSION_KEY_PREFIX}*`); if (keys.length) await redisClient.del(...keys);
    await redisClient.quit();
  }
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const sharp = require('sharp');

test('owned files → products → QR codes for images, videos and URLs', { skip: !process.env.TEST_MONGO_URI, timeout: 90000 }, async () => {
  const database = `qr2share_content_test_${randomUUID().replaceAll('-', '')}`;
  const uri = new URL(process.env.TEST_MONGO_URI); uri.pathname = `/${database}`;
  process.env.MONGO_URI = uri.toString();
  process.env.REDIS_URL = process.env.TEST_REDIS_URL || 'redis://127.0.0.1:6379';
  process.env.SESSION_KEY_PREFIX = `test:${database}:`;
  process.env.SESSION_SECRET = randomUUID(); process.env.NODE_ENV = 'test';
  const mongoose = require('mongoose');
  const { initApp } = require('../src/app');
  const { redisClient } = require('../src/config/redis.config');
  const uploaded = [];
  let server;
  try {
    const app = await initApp();
    server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
    const base = `http://127.0.0.1:${server.address().port}`;
    process.env.PUBLIC_URL = base;
    async function request(method, path, body, cookie) {
      const headers = cookie ? { cookie } : {};
      const options = { method, headers, redirect: 'manual' };
      if (body instanceof FormData) options.body = body;
      else if (!['GET','HEAD'].includes(method)) { headers['content-type'] = 'application/json'; options.body = JSON.stringify(body || {}); }
      const response = await fetch(base + path, options);
      const type = response.headers.get('content-type') || '';
      const data = type.includes('application/json') ? await response.json() : /^(image|video)\//.test(type) ? Buffer.from(await response.arrayBuffer()) : await response.text();
      return { status: response.status, data, type, location: response.headers.get('location'), cookie: response.headers.get('set-cookie')?.split(';')[0] };
    }
    const check = (res, status) => { assert.equal(res.status, status, JSON.stringify(res.data)); return res; };
    const register = name => request('POST', '/api/users', { name, lastName: 'Test', email: `${name}@example.test`, password: 'content test password' });
    const a = check(await register('alice'), 201), b = check(await register('bob'), 201);
    const png = await sharp({ create: { width: 32, height: 20, channels: 4, background: '#29806a' } }).png().toBuffer();
    async function upload(type, bytes, mimetype, name, owner = a) {
      const form = new FormData(); form.append('name', name); form.append(type, new Blob([bytes], { type: mimetype }), type === 'image' ? 'example.png' : 'example.mov');
      return request('POST', `/api/upload/${type}/${owner.data._id}`, form, owner.cookie);
    }
    const image = check(await upload('image', png, 'image/png', 'Product <photo> & detail'), 200).data.file;
    uploaded.push(image.path);
    assert.equal(image.type, 'image');
    assert.match(image.filename, /^[a-f\d-]+\.png$/);
    const videoBytes = Buffer.from('video bytes for media transport test');
    const video = check(await upload('video', videoBytes, 'video/quicktime', 'Product demo'), 200).data.file;
    uploaded.push(video.path);
    check(await upload('image', Buffer.from('not an image'), 'image/png', 'Invalid image'), 400);
    check(await upload('image', Buffer.from('<svg/>'), 'image/svg+xml', 'Unsupported SVG'), 415);
    check(await request('GET', `/api/files/${image._id}/content`), 401);
    check(await request('GET', `/api/files/${image._id}/content`, null, b.cookie), 404);
    assert.ok(check(await request('GET', `/api/files/${image._id}/content`, null, a.cookie), 200).data.equals(png));
    check(await request('PUT', `/api/files/${image._id}`, { name: 'Renamed photo' }, a.cookie), 200);
    const makeProduct = (name, fileId, owner = a) => request('POST', '/api/products/create/', { name, description: 'Reusable content', fileId }, owner.cookie);
    check(await makeProduct('Not mine', image._id, b), 404);
    const product = check(await makeProduct('Product brochure', image._id), 200).data.product;
    const second = check(await makeProduct('Reusable photo', image._id), 200).data.product;
    const videoProduct = check(await makeProduct('Demo product', video._id), 200).data.product;
    check(await request('DELETE', `/api/files/${image._id}`, {}, a.cookie), 409);
    const qr = check(await request('POST', '/api/qrcodes', { name: 'Brochure QR', productId: product._id }, a.cookie), 201).data;
    const scanPath = new URL(qr.url).pathname;
    check(await request('DELETE', `/api/products/${product._id}`, {}, a.cookie), 409);
    const page = check(await request('GET', scanPath), 200);
    assert.match(page.data, /<img /);
    assert.match(check(await request('GET', `/l/q/i/${qr._id}`), 200).type, /^image\/png/);
    assert.ok(check(await request('GET', `/l/q/i/${qr._id}`), 200).data.equals(png));
    check(await request('PUT', `/api/products/${product._id}`, { fileId: video._id }, b.cookie), 404);
    check(await request('PUT', `/api/products/${product._id}`, { name: 'Demo brochure', fileId: video._id }, a.cookie), 200);
    const saved = check(await request('GET', `/api/qrcodes/${qr._id}`, null, a.cookie), 200).data;
    assert.equal(saved.url, qr.url); assert.equal(saved.qrCode, qr.qrCode);
    const videoPage = check(await request('GET', scanPath), 200);
    assert.match(videoPage.data, /<video /); assert.match(videoPage.data, /video\/quicktime/);
    assert.ok(check(await request('GET', `/l/q/v/${qr._id}`), 200).data.equals(videoBytes));
    check(await request('PATCH', `/api/qrcodes/${qr._id}`, { productId: second._id }, b.cookie), 404);
    const reassigned = check(await request('PATCH', `/api/qrcodes/${qr._id}`, { productId: second._id }, a.cookie), 200).data;
    assert.equal(reassigned.url, qr.url); assert.equal(reassigned.qrCode, qr.qrCode);
    assert.match(check(await request('GET', scanPath), 200).data, /<img /);
    const urlFile = check(await request('POST', '/api/files', { name: 'Landing page', type: 'web-url', url: 'https://example.com/first' }, a.cookie), 201).data;
    const urlProduct = check(await makeProduct('Website product', urlFile._id), 200).data.product;
    check(await request('PATCH', `/api/qrcodes/${qr._id}`, { productId: urlProduct._id }, a.cookie), 200);
    assert.equal(check(await request('GET', scanPath), 302).location, 'https://example.com/first');
    check(await request('PUT', `/api/files/${urlFile._id}`, { url: 'https://example.com/updated' }, a.cookie), 200);
    assert.equal(check(await request('GET', scanPath), 302).location, 'https://example.com/updated');
    const foreignProduct = check(await makeProduct('Bob website', check(await request('POST', '/api/files', { type: 'web-url', url: 'https://example.org' }, b.cookie), 201).data._id, b), 200).data.product;
    check(await request('PATCH', `/api/qrcodes/${qr._id}`, { productId: foreignProduct._id }, a.cookie), 404);
    check(await request('PATCH', `/api/qrcodes/${qr._id}`, { status: 'paused' }, a.cookie), 200);
    check(await request('GET', scanPath), 410);
    check(await request('PATCH', `/api/qrcodes/${qr._id}`, { status: 'active' }, a.cookie), 200);
    check(await request('DELETE', `/api/qrcodes/${qr._id}`, {}, a.cookie), 200);
    for (const p of [product, second, videoProduct, urlProduct]) check(await request('DELETE', `/api/products/${p._id}`, {}, a.cookie), 200);
    check(await request('DELETE', `/api/files/${image._id}`, {}, a.cookie), 200);
    await assert.rejects(fs.access(image.path));
    check(await request('DELETE', `/api/files/${video._id}`, {}, a.cookie), 200);
    await assert.rejects(fs.access(video.path));
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    for (const file of uploaded) await fs.unlink(file).catch(() => {});
    if (mongoose.connection.name === database) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
    const keys = await redisClient.keys(`${process.env.SESSION_KEY_PREFIX}*`);
    if (keys.length) await redisClient.del(...keys);
    await redisClient.quit();
  }
});

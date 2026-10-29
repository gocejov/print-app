// Isolated backend for Playwright: never uses the application's actual database.
process.chdir(require('node:path').resolve(__dirname, '..'));
require('dotenv').config();
const { randomUUID } = require('node:crypto');
if (!process.env.TEST_MONGO_URI) throw new Error('Set TEST_MONGO_URI to run browser integration tests');
const database = `qr2share_ui_test_${randomUUID().replaceAll('-', '')}`;
const uri = new URL(process.env.TEST_MONGO_URI);
uri.pathname = `/${database}`;
process.env.MONGO_URI = uri.toString();
process.env.REDIS_URL = process.env.TEST_REDIS_URL || 'redis://127.0.0.1:6379';
process.env.SESSION_KEY_PREFIX = `ui-test:${database}:`;
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = randomUUID();
process.env.PUBLIC_URL = `http://127.0.0.1:${process.env.UI_TEST_PORT || 3011}`;
const mongoose = require('mongoose');
const { initApp } = require('../src/app');
const { redisClient } = require('../src/config/redis.config');
let server;
(async () => {
  const app = await initApp();
  server = app.listen(Number(process.env.UI_TEST_PORT || 3011), '127.0.0.1');
})();
let stopping = false;
async function cleanup() {
  if (stopping) return; stopping = true;
  if (server) await new Promise(resolve => server.close(resolve));
  if (mongoose.connection.name === database) {
    const { FileModel } = require('../src/models/file.model');
    const { mediaPath } = require('../src/services/media.service');
    const files = await FileModel.find({ type: { $in: ['image', 'video'] } });
    for (const file of files) if (file.path) await require('node:fs/promises').unlink(mediaPath(file.path)).catch(() => {});
    await mongoose.connection.dropDatabase();
  }
  await mongoose.disconnect();
  const keys = await redisClient.keys(`${process.env.SESSION_KEY_PREFIX}*`);
  if (keys.length) await redisClient.del(...keys);
  await redisClient.quit();
  process.exit(0);
}
process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);

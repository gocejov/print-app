const { test } = require('node:test');
const assert = require('node:assert/strict');
const { hashPassword, verifyPassword } = require('../src/utils/password.utils');
const { emailInput, passwordInput, objectBody } = require('../src/utils/http.utils');
const { UserModel } = require('../src/models/user.model');

test('passwords are salted, verified, and legacy plaintext is rejected', async () => {
  const password = 'long enough password';
  const a = await hashPassword(password);
  const b = await hashPassword(password);
  assert.notEqual(a, b);
  assert.equal(await verifyPassword(password, a), true);
  assert.equal(await verifyPassword('incorrect', a), false);
  assert.equal(await verifyPassword(password, password), false);
  assert.equal(await verifyPassword(password, 'scrypt$bad$hash'), false);
  const bcrypt = require('bcrypt-nodejs');
  const legacy = bcrypt.hashSync('legacy-password', bcrypt.genSaltSync(4));
  assert.equal(await verifyPassword('legacy-password', legacy), true);
  assert.equal(await verifyPassword('wrong', legacy), false);
});

test('request validation rejects operator injection and invalid credentials', () => {
  assert.equal(emailInput(' User@Example.COM '), 'user@example.com');
  for (const value of [{ $ne: '' }, 'bad-email', null]) assert.throws(() => emailInput(value));
  for (const value of ['short', 'a'.repeat(129), null]) assert.throws(() => passwordInput(value));
  for (const body of [[], null, { $set: { active: true } }, { authVersion: 0 }]) {
    assert.throws(() => objectBody(body, ['name']));
  }
});

test('password is excluded from serialization even when explicitly loaded', () => {
  const user = new UserModel({ name: 'Test', lastName: 'User', email: 'test@example.com', password: 'secret' });
  assert.equal('password' in user.toJSON(), false);
  assert.equal(UserModel.schema.path('password').options.select, false);
});

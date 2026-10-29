const { test } = require('node:test');
const assert = require('node:assert/strict');
const { distinctProductIds, randomProduct, weightedProduct } = require('../src/services/campaign.service');

test('campaign pool deduplicates direct/category overlaps, preserving first-seen order', () => {
  assert.deepEqual(distinctProductIds(['a', 'b', 'a'], [['b', 'c'], ['a', 'd'], []]), ['a', 'b', 'c', 'd']);
  assert.deepEqual(distinctProductIds([], [[], []]), []);
});
test('random rule uses the entire pool and handles empty and one-product campaigns', () => {
  const pool = ['first', 'middle', 'last'];
  assert.equal(randomProduct(pool, max => { assert.equal(max, 3); return 0; }), 'first');
  assert.equal(randomProduct(pool, max => max - 1), 'last');
  assert.equal(randomProduct(['only']), 'only');
  assert.throws(() => randomProduct([]), error => error.status === 409);
});

test('weighted draws assign exact integer ranges, default missing products to one and ignore absent members', () => {
  const products = [{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }];
  const weights = [{ product: 'a', weight: 3 }, { product: 'b', weight: 2 }, { product: 'removed', weight: 1000 }];
  const results = Array.from({ length: 6 }, (_, draw) => weightedProduct(products, weights, max => { assert.equal(max, 6); return draw; })._id);
  assert.deepEqual(results, ['a', 'a', 'a', 'b', 'b', 'c']);
  assert.deepEqual(products.map((_, draw) => weightedProduct(products, [], max => { assert.equal(max, 3); return draw; })._id), ['a', 'b', 'c']);
  assert.equal(weightedProduct([{ _id: 'only' }], [{ product: 'only', weight: 1000 }])._id, 'only');
  assert.throws(() => weightedProduct([]), error => error.status === 409);
  for (const weight of [0, -1, 1.5, 1001, NaN, Infinity])
    assert.throws(() => weightedProduct(products, [{ product: 'a', weight }]), error => error.status === 400);
});

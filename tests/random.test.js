// Unit tests for the seeded RNG (game/src/random.js).
// Written FIRST from PLAN.md §4.1/§4.2 — they must FAIL until random.js exists.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRng, hashSeed, shuffleSeeded } from '../game/src/random.js';

test('same seed gives the same sequence', () => {
  const a = createRng(1);
  const b = createRng(1);
  for (let i = 0; i < 50; i++) assert.equal(a(), b());
});

test('different seeds give different sequences', () => {
  const a = createRng(1);
  const b = createRng(2);
  let same = 0;
  for (let i = 0; i < 50; i++) if (a() === b()) same++;
  assert.ok(same < 50);
});

test('rng output stays inside [0, 1)', () => {
  const rng = createRng(42);
  for (let i = 0; i < 1000; i++) {
    const v = rng();
    assert.ok(v >= 0 && v < 1, `out of range: ${v}`);
  }
});

test('hashSeed is deterministic and differs across strings', () => {
  assert.equal(hashSeed('arang'), hashSeed('arang'));
  assert.notEqual(hashSeed('arang'), hashSeed('camar'));
  assert.ok(Number.isInteger(hashSeed('arang')));
});

test('hashSeed handles empty string without throwing', () => {
  assert.ok(Number.isInteger(hashSeed('')));
});

test('shuffleSeeded is deterministic per seed and preserves elements', () => {
  const input = [1, 2, 3, 4, 5, 6, 7, 8];
  const a = shuffleSeeded(input, 7);
  const b = shuffleSeeded(input, 7);
  assert.deepEqual(a, b);
  assert.deepEqual([...a].sort((x, y) => x - y), input);
  assert.deepEqual(input, [1, 2, 3, 4, 5, 6, 7, 8], 'input is not mutated');
});

test('shuffleSeeded of an empty list is an empty list', () => {
  assert.deepEqual(shuffleSeeded([], 3), []);
});

test('createRng rejects non-finite seeds with a defined value', () => {
  const rng = createRng(Number.NaN);
  const v = rng();
  assert.ok(Number.isFinite(v) && v >= 0 && v < 1);
});

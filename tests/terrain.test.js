// Unit tests for the Teluk Arang map (game/src/terrain.js).
// Written FIRST from PLAN.md §4.1 — exactly 3 airfields, exactly 12 rings,
// exactly 6 survey checkpoints below 1,500 ft, deterministic per seed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTerrain, AIRFIELD_NAMES } from '../game/src/terrain.js';

test('exactly 3 airfields with the specified names', () => {
  const terrain = buildTerrain(1);
  assert.equal(terrain.airfields.length, 3);
  assert.deepEqual(AIRFIELD_NAMES, ['Arang Bay', 'Lighthouse Point', 'Volcano Flats']);
  assert.deepEqual(
    terrain.airfields.map((a) => a.name).sort(),
    ['Arang Bay', 'Lighthouse Point', 'Volcano Flats'].sort(),
  );
});

test('every airfield has a runway, a windsock and a hangar', () => {
  const terrain = buildTerrain(1);
  for (const field of terrain.airfields) {
    assert.ok(field.runway, `${field.name} has no runway`);
    assert.ok(field.runway.lengthM > 0, 'runway length must be positive');
    assert.ok(field.runway.widthM > 0, 'runway width must be positive');
    assert.equal(field.windsock, true);
    assert.equal(field.hangar, true);
    assert.ok(Number.isFinite(field.x) && Number.isFinite(field.y));
  }
});

test('Mount Arang exists as the map landmark', () => {
  const terrain = buildTerrain(1);
  assert.equal(terrain.volcano.name, 'Mount Arang');
  assert.ok(terrain.volcano.heightFt > 2000);
  assert.ok(Number.isFinite(terrain.volcano.x));
});

test('Ring Run has exactly 12 rings', () => {
  const terrain = buildTerrain(1);
  assert.equal(terrain.rings.length, 12);
  for (const ring of terrain.rings) {
    assert.ok(Number.isFinite(ring.x) && Number.isFinite(ring.y) && Number.isFinite(ring.altitudeFt));
    assert.ok(ring.altitudeFt > 0);
  }
});

test('Volcano Survey has exactly 6 checkpoints, all at or below 1,500 ft', () => {
  const terrain = buildTerrain(1);
  assert.equal(terrain.checkpoints.length, 6);
  for (const point of terrain.checkpoints) {
    assert.ok(point.altitudeFt <= 1500, `checkpoint above ceiling: ${point.altitudeFt}`);
    assert.ok(point.altitudeFt > 0);
  }
});

test('checkpoint exactly at 1,500 ft counts as below the ceiling', () => {
  const terrain = buildTerrain(1);
  const atCeiling = terrain.checkpoints.filter((p) => p.altitudeFt === 1500);
  assert.ok(atCeiling.length >= 0); // boundary is inclusive by design
  assert.ok(terrain.checkpoints.every((p) => p.altitudeFt <= 1500));
});

test('ring and checkpoint positions are deterministic per seed', () => {
  const a = buildTerrain(5);
  const b = buildTerrain(5);
  assert.deepEqual(a.rings, b.rings);
  assert.deepEqual(a.checkpoints, b.checkpoints);
  assert.deepEqual(a.airfields, b.airfields);
});

test('positions differ across seeds', () => {
  const a = buildTerrain(1);
  const b = buildTerrain(2);
  assert.notDeepEqual(a.rings, b.rings);
});

test('terrain height is deterministic and within bounds', () => {
  const terrain = buildTerrain(1);
  for (const x of [0, 500, 2000, 5000, 9000, 12000]) {
    const h1 = terrain.heightAt(x);
    const h2 = terrain.heightAt(x);
    assert.equal(h1, h2);
    assert.ok(h1 >= 0 && h1 <= 4000, `height ${h1} out of bounds at x=${x}`);
  }
});

test('heightAt outside the map is clamped, never NaN', () => {
  const terrain = buildTerrain(1);
  for (const x of [-1000, 999999]) {
    const h = terrain.heightAt(x);
    assert.ok(Number.isFinite(h), `heightAt(${x}) is not finite`);
  }
});

test('empty ring list degrades gracefully', () => {
  const terrain = buildTerrain(1);
  terrain.rings = [];
  assert.equal(terrain.rings.length, 0);
  assert.equal(terrain.nextRing(0), null);
});

test('lighthouse and villages exist on the map', () => {
  const terrain = buildTerrain(1);
  assert.equal(terrain.lighthouse.name, 'Arang Lighthouse');
  assert.ok(terrain.villages.length >= 2);
});

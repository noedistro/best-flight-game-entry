// Determinism + staged-shot tests (PLAN.md §4.3).
// Staged scenes come from game/src/shots.js; they must be deterministic
// and match the cover spec in PLAN.md §2.7 exactly.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildShotScene, SHOT_NAMES } from '../game/src/shots.js';
import { parseShotQuery } from '../game/src/main.js';

test('shot names are exactly the four staged scenes', () => {
  assert.deepEqual([...SHOT_NAMES].sort(), ['cover', 'flight', 'landing', 'rings']);
});

test('cover shot matches the PLAN §2.7 spec', () => {
  const scene = buildShotScene('cover', 1);
  assert.equal(scene.view, 'chase');
  assert.equal(scene.hud.altitudeFt, 1240);
  assert.equal(scene.hud.speedKt, 112);
  assert.equal(scene.hud.headingDeg, 45);
  assert.equal(scene.hud.throttle, 62);
  assert.equal(scene.hud.fuel, 88);
  assert.equal(scene.hud.damage, 0);
  assert.equal(scene.hud.timeLeftSec, 211); // 240 - 29 elapsed = 03:31
  assert.equal(scene.runwayAhead, true);
  assert.equal(scene.ringAhead, true);
  assert.equal(scene.landmarks.mountArang, true);
  assert.equal(scene.landmarks.lighthouse, true);
  assert.equal(scene.landmarks.coastline, true);
});

test('flight shot is the cockpit view climbing', () => {
  const scene = buildShotScene('flight', 1);
  assert.equal(scene.view, 'cockpit');
  assert.ok(scene.hud.verticalSpeedFpm > 0, 'climbing means positive vertical speed');
  assert.equal(scene.ringAhead, true);
});

test('rings shot is mid Ring Run at 7/12', () => {
  const scene = buildShotScene('rings', 1);
  assert.equal(scene.view, 'chase');
  assert.equal(scene.mission.id, 'ring-run');
  assert.equal(scene.mission.count, 7);
  assert.equal(scene.mission.max, 12);
  assert.equal(scene.ringHalfPassed, true);
  assert.equal(scene.nextRingAhead, true);
});

test('landing shot is final approach, gear and flaps down', () => {
  const scene = buildShotScene('landing', 1);
  assert.equal(scene.view, 'chase');
  assert.equal(scene.aircraft.gearDown, true);
  assert.equal(scene.aircraft.flapsDown, true);
  assert.equal(scene.runwayAhead, true);
  assert.equal(scene.touchdownZoneMarked, true);
  assert.equal(scene.approachLights, true);
  assert.ok(scene.hud.altitudeFt < 600, 'final approach is low');
  assert.ok(scene.landingPanel, 'landing numbers panel must be shown');
});

test('same seed renders the same staged scene twice', () => {
  const a = buildShotScene('cover', 1);
  const b = buildShotScene('cover', 1);
  // Scenes carry terrain functions (heightAt/nextRing), which deepEqual
  // compares by reference; compare the serialised scene instead.
  assert.equal(JSON.stringify(a), JSON.stringify(b));
});

test('malformed ?shot= falls back to the normal game', () => {
  assert.equal(parseShotQuery('?shot=bogus&seed=1').shot, null);
  assert.equal(parseShotQuery('?shot=&seed=1').shot, null);
  assert.equal(parseShotQuery('').shot, null);
});

test('malformed ?seed= falls back to seed 1', () => {
  assert.equal(parseShotQuery('?shot=cover&seed=banana').seed, 1);
  assert.equal(parseShotQuery('?shot=cover&seed=').seed, 1);
  assert.equal(parseShotQuery('?shot=cover&seed=7').seed, 7);
});

test('unknown shot names never crash the scene builder', () => {
  assert.doesNotThrow(() => buildShotScene('nope', 1));
  assert.equal(buildShotScene('nope', 1), null);
});

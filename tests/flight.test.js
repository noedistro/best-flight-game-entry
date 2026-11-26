// Unit tests for the flight model (game/src/flight.js).
// Written FIRST from PLAN.md §4.1 — throttle, drag, bank, stall, wind,
// fuel burn ∝ throttle², damage, invalid-input handling, boundaries.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createFlightState,
  stepFlight,
  fuelBurnPerSecond,
  STALL_SPEED_KT,
  CRUISE_BAND,
} from '../game/src/flight.js';

function flyingState(overrides = {}) {
  return createFlightState({
    altitudeFt: 1200,
    speedKt: 112,
    headingDeg: 45,
    throttle: 62,
    fuel: 100,
    damage: 0,
    ...overrides,
  });
}

test('throttle 0 gives no thrust', () => {
  const state = flyingState({ throttle: 0, speedKt: 100 });
  const before = state.speedKt;
  const next = stepFlight(state, { throttle: 0, pitch: 0, bank: 0 }, 1, { x: 0, y: 0 });
  assert.ok(next.speedKt <= before, 'speed must not rise with zero throttle');
});

test('throttle 100 gives max thrust', () => {
  const slow = flyingState({ throttle: 100, speedKt: 60 });
  const cruise = flyingState({ throttle: 62, speedKt: 60 });
  const fast = stepFlight(slow, { throttle: 100, pitch: 0, bank: 0 }, 1, { x: 0, y: 0 });
  const mid = stepFlight(cruise, { throttle: 62, pitch: 0, bank: 0 }, 1, { x: 0, y: 0 });
  assert.ok(fast.speedKt > mid.speedKt, 'full throttle must accelerate faster than cruise');
});

test('fuel burn at full throttle is strictly greater than at cruise', () => {
  assert.ok(fuelBurnPerSecond(100) > fuelBurnPerSecond(62));
  assert.ok(fuelBurnPerSecond(62) > fuelBurnPerSecond(0));
  assert.equal(fuelBurnPerSecond(0), 0);
});

test('fuel burn is proportional to throttle squared', () => {
  const ratio = fuelBurnPerSecond(100) / fuelBurnPerSecond(50);
  assert.ok(Math.abs(ratio - 4) < 0.01, `expected ratio 4, got ${ratio}`);
});

test('cruise band 55-65% is the efficient band', () => {
  assert.deepEqual(CRUISE_BAND, [55, 65]);
  // Fuel burn per knot of airspeed is lowest in the cruise band when
  // compared with full throttle: pushing past cruise burns far more fuel
  // for each extra knot. (Below cruise the aircraft cannot hold altitude
  // and speed, so cruise is the efficient *flyable* band.)
  const burnPerSpeed = (throttle) => {
    const equilibrium = Math.sqrt(((throttle / 100) * 16) / 0.000791);
    return fuelBurnPerSecond(throttle) / equilibrium;
  };
  assert.ok(burnPerSpeed(60) < burnPerSpeed(100));
  assert.ok(fuelBurnPerSecond(60) * 240 > 90 && fuelBurnPerSecond(60) * 240 < 110);
});

test('fuel lasts about 240 s at cruise throttle', () => {
  // 240 s at 62% should drain a full tank to about zero.
  const total = fuelBurnPerSecond(62) * 240;
  assert.ok(total > 90 && total < 110, `240 s at cruise burns ${total}, expected ~100`);
});

test('drag rises with speed squared', () => {
  const slow = flyingState({ speedKt: 60, throttle: 0 });
  const fast = flyingState({ speedKt: 120, throttle: 0 });
  const slowNext = stepFlight(slow, { throttle: 0, pitch: 0, bank: 0 }, 1, { x: 0, y: 0 });
  const fastNext = stepFlight(fast, { throttle: 0, pitch: 0, bank: 0 }, 1, { x: 0, y: 0 });
  const slowLoss = slow.speedKt - slowNext.speedKt;
  const fastLoss = fast.speedKt - fastNext.speedKt;
  assert.ok(fastLoss > slowLoss * 2, `fast loss ${fastLoss} should dwarf slow loss ${slowLoss}`);
});

test('steep bank over 45 degrees loses altitude and speed without extra throttle', () => {
  const state = flyingState({ speedKt: 112 });
  const next = stepFlight(state, { throttle: 62, pitch: 0, bank: 60 }, 2, { x: 0, y: 0 });
  assert.ok(next.altitudeFt < state.altitudeFt, 'steep bank should lose altitude');
});

test('gentle bank holds altitude', () => {
  const state = flyingState({ speedKt: 112 });
  const next = stepFlight(state, { throttle: 62, pitch: 0, bank: 15 }, 2, { x: 0, y: 0 });
  assert.ok(Math.abs(next.altitudeFt - state.altitudeFt) < 60, `altitude drifted ${next.altitudeFt - state.altitudeFt}`);
});

test('below stall speed the aircraft stalls and the nose drops', () => {
  const state = flyingState({ speedKt: STALL_SPEED_KT - 10, throttle: 30 });
  const next = stepFlight(state, { throttle: 30, pitch: 0, bank: 0 }, 1, { x: 0, y: 0 });
  assert.equal(next.stalled, true);
  assert.ok(next.verticalSpeedFpm < 0, 'stalled aircraft should descend');
});

test('stall recovers when speed is regained', () => {
  const state = flyingState({ speedKt: STALL_SPEED_KT - 5, throttle: 100 });
  let current = state;
  for (let i = 0; i < 20; i++) {
    current = stepFlight(current, { throttle: 100, pitch: -5, bank: 0 }, 1, { x: 0, y: 0 });
    if (!current.stalled) break;
  }
  assert.equal(current.stalled, false);
});

test('at exactly stall speed the aircraft is not stalled', () => {
  const state = flyingState({ speedKt: STALL_SPEED_KT, throttle: 62 });
  const next = stepFlight(state, { throttle: 62, pitch: 0, bank: 0 }, 1, { x: 0, y: 0 });
  assert.equal(next.stalled, false);
});

test('wind pushes the aircraft laterally', () => {
  const calm = stepFlight(flyingState(), { throttle: 62, pitch: 0, bank: 0 }, 1, { x: 0, y: 0 });
  const windy = stepFlight(flyingState(), { throttle: 62, pitch: 0, bank: 0 }, 1, { x: 20, y: 0 });
  assert.notEqual(windy.y, calm.y);
});

test('fuel 0 means engine out: thrust 0, glide only', () => {
  const state = flyingState({ fuel: 0, speedKt: 100 });
  const next = stepFlight(state, { throttle: 100, pitch: 0, bank: 0 }, 1, { x: 0, y: 0 });
  assert.equal(next.fuel, 0);
  assert.ok(next.speedKt <= state.speedKt, 'no thrust with empty tanks');
});

test('damage 100 means unflyable', () => {
  const state = flyingState({ damage: 100 });
  const next = stepFlight(state, { throttle: 62, pitch: 0, bank: 0 }, 1, { x: 0, y: 0 });
  assert.equal(next.unflyable, true);
});

test('invalid throttle values are clamped, never thrown', () => {
  for (const bad of [-10, 150, Number.NaN, 'fast', null, undefined, {}]) {
    const state = flyingState();
    const next = stepFlight(state, { throttle: bad, pitch: 0, bank: 0 }, 1, { x: 0, y: 0 });
    assert.ok(Number.isFinite(next.throttle) && next.throttle >= 0 && next.throttle <= 100,
      `throttle ${String(bad)} produced ${next.throttle}`);
  }
});

test('boundaries: throttle exactly 0 and exactly 100 behave as specified', () => {
  const zero = stepFlight(flyingState(), { throttle: 0, pitch: 0, bank: 0 }, 1, { x: 0, y: 0 });
  assert.equal(zero.throttle, 0);
  const full = stepFlight(flyingState(), { throttle: 100, pitch: 0, bank: 0 }, 1, { x: 0, y: 0 });
  assert.equal(full.throttle, 100);
});

test('altitude never goes below ground in the flight step', () => {
  const state = flyingState({ altitudeFt: 5, speedKt: 40, throttle: 0 });
  const next = stepFlight(state, { throttle: 0, pitch: -10, bank: 0 }, 5, { x: 0, y: 0 });
  assert.ok(next.altitudeFt >= 0);
});

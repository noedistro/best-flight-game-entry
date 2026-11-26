// Unit tests for the aircraft state machine and landing judgement
// (game/src/aircraft.js). Written FIRST from PLAN.md §4.1.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createAircraft,
  setGear,
  setFlaps,
  judgeTouchdown,
  crashCauseFor,
  GEAR_SPEED_LIMIT_KT,
  FLAP_SPEED_LIMIT_KT,
} from '../game/src/aircraft.js';

test('gentle, aligned, in-zone, gear-down, flaps-down landing scores greased', () => {
  const result = judgeTouchdown({
    verticalSpeedFpm: -120,
    alignmentDeg: 2,
    inZone: true,
    gearDown: true,
    flapsDown: true,
    speedKt: 75,
  });
  assert.equal(result.verdict, 'greased');
  assert.ok(result.score > 0);
  assert.equal(result.damage, 0);
});

test('hard touchdown adds damage and a bounce', () => {
  const result = judgeTouchdown({
    verticalSpeedFpm: -900,
    alignmentDeg: 2,
    inZone: true,
    gearDown: true,
    flapsDown: true,
    speedKt: 75,
  });
  assert.equal(result.verdict, 'hard');
  assert.ok(result.damage > 0, 'hard landing must add damage');
  assert.equal(result.bounce, true);
});

test('touchdown exactly at the vertical-speed threshold is not hard', () => {
  const gentle = judgeTouchdown({
    verticalSpeedFpm: -300, alignmentDeg: 0, inZone: true,
    gearDown: true, flapsDown: true, speedKt: 75,
  });
  assert.notEqual(gentle.verdict, 'hard');
});

test('gear-up landing adds heavy damage', () => {
  const result = judgeTouchdown({
    verticalSpeedFpm: -150, alignmentDeg: 1, inZone: true,
    gearDown: false, flapsDown: true, speedKt: 75,
  });
  assert.ok(result.damage >= 40, `gear-up damage ${result.damage} too small`);
  assert.match(result.message, /gear/i);
});

test('runway overshoot adds damage', () => {
  const result = judgeTouchdown({
    verticalSpeedFpm: -150, alignmentDeg: 1, inZone: false,
    gearDown: true, flapsDown: true, speedKt: 75,
  });
  assert.ok(result.damage > 0, 'overshoot must add damage');
  assert.equal(result.verdict, 'overshoot');
});

test('terrain strike at speed is a crash with the ridge cause', () => {
  const cause = crashCauseFor({ kind: 'terrain', speedKt: 140 });
  assert.match(cause, /ridge|terrain/i);
  assert.match(cause, /140/);
});

test('sea ditching is a crash with the ditching cause', () => {
  const cause = crashCauseFor({ kind: 'sea', speedKt: 90 });
  assert.match(cause, /ditch|bay|sea/i);
});

test('fuel exhaustion over the bay is a ditching crash', () => {
  const cause = crashCauseFor({ kind: 'fuel', speedKt: 80 });
  assert.match(cause, /fuel/i);
});

test('gear can only go down below the gear speed limit', () => {
  const aircraft = createAircraft({ speedKt: GEAR_SPEED_LIMIT_KT + 50 });
  const refused = setGear(aircraft, true);
  assert.equal(refused.applied, false);
  assert.equal(aircraft.gearDown, false);
  const slow = createAircraft({ speedKt: GEAR_SPEED_LIMIT_KT - 10 });
  const ok = setGear(slow, true);
  assert.equal(ok.applied, true);
  assert.equal(slow.gearDown, true);
});

test('gear at exactly the speed limit is allowed down', () => {
  const aircraft = createAircraft({ speedKt: GEAR_SPEED_LIMIT_KT });
  const result = setGear(aircraft, true);
  assert.equal(result.applied, true);
});

test('flaps only below the flap speed limit', () => {
  const aircraft = createAircraft({ speedKt: FLAP_SPEED_LIMIT_KT + 40 });
  const refused = setFlaps(aircraft, true);
  assert.equal(refused.applied, false);
  assert.equal(aircraft.flapsDown, false);
});

test('invalid gear/flap transitions are rejected with a defined value, never thrown', () => {
  const aircraft = createAircraft({ speedKt: 60 });
  assert.doesNotThrow(() => setGear(aircraft, 'down'));
  assert.doesNotThrow(() => setFlaps(aircraft, null));
  assert.equal(typeof aircraft.gearDown, 'boolean');
  assert.equal(typeof aircraft.flapsDown, 'boolean');
});

test('aircraft starts with gear down and flaps up on the ground', () => {
  const aircraft = createAircraft({ speedKt: 0 });
  assert.equal(aircraft.gearDown, true);
  assert.equal(aircraft.flapsDown, false);
});

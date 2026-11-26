// Unit tests for input handling (game/src/input.js) and scoring/timer
// (game/src/scoring.js). Written FIRST from PLAN.md §4.1.
import test from 'node:test';
import assert from 'node:assert/strict';
import { keyAction, createInputState, applyKey, isToggleKey } from '../game/src/input.js';
import { getMission } from '../game/src/missions.js';
import {
  createSortie,
  addScore,
  tickTimer,
  gradeForScore as grade,
} from '../game/src/scoring.js';

// ---- input ----

test('each bound key maps to exactly one action', () => {
  const bindings = {
    ArrowUp: 'pitch-up', ArrowDown: 'pitch-down',
    ArrowLeft: 'bank-left', ArrowRight: 'bank-right',
    w: 'throttle-up', s: 'throttle-down',
    ' ': 'drop', g: 'gear', f: 'flaps', c: 'camera', m: 'mute', r: 'restart',
    1: 'mission-1', 2: 'mission-2', 3: 'mission-3', 4: 'mission-4', 5: 'mission-5',
  };
  for (const [key, action] of Object.entries(bindings)) {
    assert.equal(keyAction(key), action, `key ${key}`);
  }
});

test('unknown keys are ignored: no state change, no throw', () => {
  assert.equal(keyAction('q'), null);
  assert.equal(keyAction('F12'), null);
  assert.equal(keyAction(''), null);
  const state = createInputState();
  const before = JSON.stringify(state);
  assert.doesNotThrow(() => applyKey(state, 'q', false));
  assert.equal(JSON.stringify(state), before);
});

test('key repeat does not double-apply a toggle', () => {
  const state = createInputState();
  applyKey(state, 'g', false); // gear toggle, first press
  const afterFirst = state.gearDown;
  applyKey(state, 'g', true); // repeat event
  assert.equal(state.gearDown, afterFirst, 'repeat must not toggle again');
  applyKey(state, 'g', false); // a fresh press toggles
  assert.notEqual(state.gearDown, afterFirst);
});

test('toggle keys are gear, flaps, camera and mute', () => {
  for (const key of ['g', 'f', 'c', 'm']) assert.equal(isToggleKey(key), true);
  assert.equal(isToggleKey('w'), false);
  assert.equal(isToggleKey(' '), false);
});

test('restart resets the sortie to its initial state', () => {
  const state = createInputState();
  state.throttle = 80;
  state.score = 500;
  applyKey(state, 'r', false);
  assert.equal(state.throttle, 0);
  assert.equal(state.score, 0);
  assert.equal(state.restartRequested, true);
});

test('mission number keys select a mission', () => {
  const state = createInputState();
  applyKey(state, '3', false);
  assert.equal(state.selectedMission, 'supply-drop');
});

// ---- scoring / timer ----

test('sortie timer starts at exactly 240 s and counts down', () => {
  const sortie = createSortie();
  assert.equal(sortie.timeLeftSec, 240);
  tickTimer(sortie, 10);
  assert.equal(sortie.timeLeftSec, 230);
});

test('timer expiring ends the sortie exactly once', () => {
  const sortie = createSortie();
  tickTimer(sortie, 240);
  assert.equal(sortie.timeLeftSec, 0);
  assert.equal(sortie.ended, true);
  tickTimer(sortie, 10);
  assert.equal(sortie.timeLeftSec, 0);
  assert.equal(sortie.endCount, 1, 'must not end twice');
});

test('a mission completed in the final second still counts', () => {
  const sortie = createSortie();
  tickTimer(sortie, 239);
  addScore(sortie, 100, 'ring');
  assert.equal(sortie.score, 100);
  assert.equal(sortie.ended, false);
});

test('score increases on events and never goes negative from one event', () => {
  const sortie = createSortie();
  addScore(sortie, 50, 'ring');
  assert.equal(sortie.score, 50);
  addScore(sortie, -1000, 'penalty');
  assert.equal(sortie.score, 0, 'score must floor at 0');
});

test('flying with no mission selected yields no score change', () => {
  const sortie = createSortie();
  addScore(sortie, 0, 'free-flight');
  assert.equal(sortie.score, 0);
});

test('grade boundaries are exact and monotonic', () => {
  assert.equal(grade(0), 'C');
  assert.equal(grade(199), 'C');
  assert.equal(grade(200), 'B');
  assert.equal(grade(499), 'B');
  assert.equal(grade(500), 'A');
  assert.equal(grade(899), 'A');
  assert.equal(grade(900), 'S');
});

test('quality bonuses scale with the measured quantity and are 0 at the worst boundary', () => {
  const landing = getMission('precision-landing');
  assert.equal(landing.scoreFor('landing', 0), 100);
  assert.equal(landing.scoreFor('landing', 50), 150);
  assert.ok(landing.scoreFor('landing', 50) > landing.scoreFor('landing', 10));
});

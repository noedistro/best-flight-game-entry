// Unit tests for the 5 missions (game/src/missions.js).
// Written FIRST from PLAN.md §4.1 — exactly 5 missions, distinct goals,
// progress caps, deterministic grades, unknown-id rejection.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MISSIONS,
  getMission,
  createMissionProgress,
  recordRingPass,
  recordAirfieldVisit,
  recordCheckpoint,
  gradeForScore,
  SORTIE_SECONDS,
} from '../game/src/missions.js';

test('exactly 5 missions', () => {
  assert.equal(MISSIONS.length, 5);
});

test('each mission has a distinct goal type', () => {
  const goals = MISSIONS.map((m) => m.goal);
  assert.equal(new Set(goals).size, 5);
});

test('each mission has a name, briefing, scoring rule and win condition', () => {
  for (const mission of MISSIONS) {
    assert.ok(mission.id && mission.name && mission.briefing, mission.id);
    assert.ok(mission.goal, mission.id);
    assert.ok(typeof mission.winCondition === 'string' && mission.winCondition.length > 0);
    assert.ok(typeof mission.scoreFor === 'function', `${mission.id} needs a scoring rule`);
  }
});

test('mission lookup by id returns the right goal', () => {
  assert.equal(getMission('ring-run').goal, 'rings');
  assert.equal(getMission('precision-landing').goal, 'landing');
  assert.equal(getMission('supply-drop').goal, 'drop');
  assert.equal(getMission('volcano-survey').goal, 'survey');
  assert.equal(getMission('mail-run').goal, 'airfields');
});

test('unknown mission id is rejected', () => {
  assert.equal(getMission('no-such-mission'), null);
  assert.equal(getMission(''), null);
  assert.equal(getMission(null), null);
});

test('mission progress counters start at 0 and cap at their maxima', () => {
  const rings = createMissionProgress('ring-run');
  assert.equal(rings.count, 0);
  assert.equal(rings.max, 12);
  const mail = createMissionProgress('mail-run');
  assert.equal(mail.max, 3);
  const survey = createMissionProgress('volcano-survey');
  assert.equal(survey.max, 6);
});

test('rings must be passed in order', () => {
  const progress = createMissionProgress('ring-run');
  const outOfOrder = recordRingPass(progress, 4, 12); // ring 5 before ring 4
  assert.equal(outOfOrder.counted, false);
  assert.equal(progress.count, 0);
  const inOrder = recordRingPass(progress, 0, 12);
  assert.equal(inOrder.counted, true);
  assert.equal(progress.count, 1);
});

test('duplicate ring passes count once', () => {
  const progress = createMissionProgress('ring-run');
  recordRingPass(progress, 0, 12);
  const again = recordRingPass(progress, 0, 12);
  assert.equal(again.counted, false);
  assert.equal(progress.count, 1);
});

test('ring progress caps at 12', () => {
  const progress = createMissionProgress('ring-run');
  for (let i = 0; i < 12; i++) recordRingPass(progress, i, 12);
  assert.equal(progress.count, 12);
  const extra = recordRingPass(progress, 11, 12);
  assert.equal(extra.counted, false);
  assert.equal(progress.count, 12);
});

test('same airfield visited twice in the Mail Run counts once', () => {
  const progress = createMissionProgress('mail-run');
  recordAirfieldVisit(progress, 'Arang Bay');
  const again = recordAirfieldVisit(progress, 'Arang Bay');
  assert.equal(again.counted, false);
  assert.equal(progress.count, 1);
  recordAirfieldVisit(progress, 'Lighthouse Point');
  recordAirfieldVisit(progress, 'Volcano Flats');
  assert.equal(progress.count, 3);
  assert.equal(progress.complete, true);
});

test('airfields may be visited in any order', () => {
  const a = createMissionProgress('mail-run');
  recordAirfieldVisit(a, 'Volcano Flats');
  recordAirfieldVisit(a, 'Arang Bay');
  recordAirfieldVisit(a, 'Lighthouse Point');
  assert.equal(a.complete, true);
});

test('survey checkpoints cap at 6 and duplicates do not count', () => {
  const progress = createMissionProgress('volcano-survey');
  for (let i = 0; i < 6; i++) recordCheckpoint(progress, i);
  assert.equal(progress.count, 6);
  const dup = recordCheckpoint(progress, 2);
  assert.equal(dup.counted, false);
});

test('empty goal list degrades gracefully', () => {
  const progress = createMissionProgress('ring-run');
  progress.max = 0;
  assert.equal(progress.complete, true);
  assert.equal(recordRingPass(progress, 0, 0).counted, false);
});

test('grades are deterministic from score and monotonic', () => {
  assert.equal(gradeForScore(0), 'C');
  assert.equal(gradeForScore(950), 'S');
  assert.equal(gradeForScore(500), gradeForScore(500));
  const order = ['C', 'B', 'A', 'S'];
  let last = -1;
  for (const score of [0, 100, 300, 600, 900, 1200]) {
    const rank = order.indexOf(gradeForScore(score));
    assert.ok(rank >= last, `grade fell as score rose at ${score}`);
    last = rank;
  }
});

test('sortie timer is exactly 240 seconds', () => {
  assert.equal(SORTIE_SECONDS, 240);
});

test('selecting the same mission twice does not double state', () => {
  const first = createMissionProgress('ring-run');
  const second = createMissionProgress('ring-run');
  assert.deepEqual(first, second);
});

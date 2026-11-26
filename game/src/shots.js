// Deterministic staged scenes for screenshots (game/src/shots.js).
// One clear job: given a shot name and a seed, build the exact scene the
// renderer draws — frozen timer, seeded terrain, no Math.random and no
// Date.now anywhere in this path, so a re-shoot is pixel-identical.
import { buildTerrain } from './terrain.js';

export const SHOT_NAMES = ['cover', 'flight', 'rings', 'landing'];

function baseScene(seed, overrides) {
  const terrain = buildTerrain(seed);
  const scene = {
    view: 'chase',
    terrain,
    aircraftX: 0,
    altitudeFt: 1200,
    speedKt: 112,
    headingDeg: 45,
    bankDeg: 0,
    pitchDeg: 0,
    throttle: 62,
    fuel: 88,
    damage: 0,
    verticalSpeedFpm: 0,
    timeLeftSec: 211,
    score: 350,
    aircraft: { gearDown: false, flapsDown: false },
    rings: terrain.rings.map((ring) => ({ ...ring })),
    mission: null,
    objective: 'Fly the dawn mail run — mind the wind.',
    targetHeadingDeg: 45,
    wind: { knots: 8, fromDeg: 270 },
    message: null,
    messageDetail: null,
    landingPanel: null,
    ...overrides,
  };
  scene.hud = {
    altitudeFt: scene.altitudeFt,
    speedKt: scene.speedKt,
    headingDeg: scene.headingDeg,
    throttle: scene.throttle,
    fuel: scene.fuel,
    damage: scene.damage,
    verticalSpeedFpm: scene.verticalSpeedFpm,
    timeLeftSec: scene.timeLeftSec,
  };
  return scene;
}

function coverScene(seed) {
  const scene = baseScene(seed, {
    aircraftX: -800,
    altitudeFt: 1240,
    speedKt: 112,
    headingDeg: 45,
    throttle: 62,
    fuel: 88,
    damage: 0,
    verticalSpeedFpm: 0,
    timeLeftSec: 211,
    score: 350,
    mission: { id: 'ring-run', name: 'Ring Run', count: 7, max: 12 },
    objective: 'Ring 8 ahead over the strait.',
    targetHeadingDeg: 45,
  });
  // Rings 1-7 passed (green), ring 8 next (gold) ahead.
  scene.rings = scene.rings.map((ring, i) => ({ ...ring, passed: i < 7 }));
  scene.runwayAhead = true;
  scene.ringAhead = true;
  scene.landmarks = { mountArang: true, lighthouse: true, coastline: true };
  return scene;
}

function flightScene(seed) {
  const scene = baseScene(seed, {
    view: 'cockpit',
    aircraftX: 4000,
    altitudeFt: 1800,
    speedKt: 95,
    headingDeg: 60,
    pitchDeg: 8,
    throttle: 70,
    fuel: 76,
    damage: 0,
    verticalSpeedFpm: 620,
    timeLeftSec: 168,
    score: 210,
    mission: { id: 'ring-run', name: 'Ring Run', count: 3, max: 12 },
    objective: 'Climbing through 1,800 ft.',
    targetHeadingDeg: 60,
  });
  scene.rings = scene.rings.map((ring, i) => ({ ...ring, passed: i < 3 }));
  scene.ringAhead = true;
  return scene;
}

function ringsScene(seed) {
  const terrain = buildTerrain(seed);
  const ringSeven = terrain.rings[7];
  const scene = baseScene(seed, {
    aircraftX: ringSeven.x - 50,
    altitudeFt: ringSeven.altitudeFt,
    speedKt: 118,
    headingDeg: 90,
    bankDeg: 28,
    pitchDeg: 0,
    throttle: 68,
    fuel: 64,
    damage: 0,
    verticalSpeedFpm: 40,
    timeLeftSec: 143,
    score: 560,
    mission: { id: 'ring-run', name: 'Ring Run', count: 7, max: 12 },
    objective: 'Through ring 8 — hold the bank.',
    targetHeadingDeg: 90,
  });
  scene.rings = scene.rings.map((ring, i) => ({ ...ring, passed: i < 7 }));
  scene.ringHalfPassed = true;
  scene.nextRingAhead = true;
  return scene;
}

function landingScene(seed) {
  const terrain = buildTerrain(seed);
  const field = terrain.airfields.find((a) => a.name === 'Lighthouse Point');
  const scene = baseScene(seed, {
    aircraftX: field.x - 900,
    altitudeFt: 180,
    speedKt: 78,
    headingDeg: 90,
    pitchDeg: -3,
    throttle: 34,
    fuel: 41,
    damage: 5,
    verticalSpeedFpm: -180,
    timeLeftSec: 96,
    score: 720,
    aircraft: { gearDown: true, flapsDown: true },
    mission: { id: 'precision-landing', name: 'Precision Landing', count: 1, max: 3 },
    objective: 'Final approach — gear down.',
    targetHeadingDeg: 90,
    wind: { knots: 12, fromDeg: 250 },
    landingPanel: {
      verticalSpeedFpm: -180,
      alignmentDeg: 2,
      inZone: true,
      gearDown: true,
      flapsDown: true,
    },
  });
  scene.rings = [];
  scene.runwayAhead = true;
  scene.touchdownZoneMarked = true;
  scene.approachLights = true;
  return scene;
}

export function buildShotScene(name, seed) {
  const safeSeed = Number.isFinite(seed) ? seed : 1;
  if (name === 'cover') return coverScene(safeSeed);
  if (name === 'flight') return flightScene(safeSeed);
  if (name === 'rings') return ringsScene(safeSeed);
  if (name === 'landing') return landingScene(safeSeed);
  return null;
}

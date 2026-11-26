// Teluk Arang map (game/src/terrain.js).
// One clear job: the fictional archipelago — exactly 3 airfields, Mount
// Arang, the lighthouse, two fishing villages, 12 rings and 6 survey
// checkpoints, all placed deterministically from a seed.
import { createRng } from './random.js';
import { MAP_WIDTH, MAP_HEIGHT_FT, RING_COUNT, SURVEY_CHECKPOINT_COUNT } from './config.js';

export const AIRFIELD_NAMES = ['Arang Bay', 'Lighthouse Point', 'Volcano Flats'];

function buildAirfields(rng) {
  const spots = [
    { name: 'Arang Bay', x: 900, lengthM: 620, widthM: 24 },
    { name: 'Lighthouse Point', x: 6500, lengthM: 480, widthM: 20 },
    { name: 'Volcano Flats', x: 10500, lengthM: 700, widthM: 26 },
  ];
  return spots.map((spot) => ({
    name: spot.name,
    x: spot.x + Math.floor(rng() * 60) - 30,
    y: 0,
    runway: {
      lengthM: spot.lengthM,
      widthM: spot.widthM,
      headingDeg: 90,
    },
    windsock: true,
    hangar: true,
  }));
}

function buildRings(rng) {
  const rings = [];
  for (let i = 0; i < RING_COUNT; i++) {
    const fraction = (i + 0.5) / RING_COUNT;
    rings.push({
      index: i,
      x: Math.floor(fraction * MAP_WIDTH * 0.92 + 400 + rng() * 120),
      y: 0,
      altitudeFt: 500 + Math.floor(rng() * 900),
      radiusFt: 60,
      passed: false,
    });
  }
  return rings;
}

function buildCheckpoints(rng) {
  const points = [];
  const volcanoX = 9800;
  for (let i = 0; i < SURVEY_CHECKPOINT_COUNT; i++) {
    const angle = (i / SURVEY_CHECKPOINT_COUNT) * Math.PI * 2;
    points.push({
      index: i,
      x: Math.floor(volcanoX + Math.cos(angle) * (900 + rng() * 500)),
      y: 0,
      // All survey checkpoints sit at or below the 1,500 ft ceiling.
      altitudeFt: 700 + Math.floor(rng() * 800),
      photographed: false,
    });
  }
  return points;
}

export function buildTerrain(seed) {
  const rng = createRng(seed);
  const airfields = buildAirfields(rng);
  const rings = buildRings(rng);
  const checkpoints = buildCheckpoints(rng);
  const volcano = { name: 'Mount Arang', x: 9800, heightFt: 3200 };
  const lighthouse = { name: 'Arang Lighthouse', x: 6200, heightFt: 120 };
  const villages = [
    { name: 'Teluk Village', x: 2400 },
    { name: 'Coral Village', x: 8300 },
  ];
  const clouds = [];
  for (let i = 0; i < 14; i++) {
    clouds.push({ x: Math.floor(rng() * MAP_WIDTH), y: 60 + Math.floor(rng() * 140), scale: 0.7 + rng() * 0.9 });
  }

  function heightAt(x) {
    if (!Number.isFinite(x)) return 0;
    const clamped = Math.max(0, Math.min(MAP_WIDTH, x));
    const ridge = 320 + 260 * Math.sin(clamped / 900) + 180 * Math.sin(clamped / 370 + 1.7);
    const volcanoBump = 2900 * Math.exp(-((clamped - volcano.x) ** 2) / (2 * 1400 * 1400));
    const coastDip = clamped < 600 ? -200 * (1 - clamped / 600) : 0;
    const height = ridge + volcanoBump + coastDip;
    return Math.max(0, Math.min(MAP_HEIGHT_FT, Math.round(height)));
  }

  function nextRing(index) {
    // Reads the live rings list so an emptied list degrades gracefully.
    const list = this && Array.isArray(this.rings) ? this.rings : rings;
    if (!Number.isInteger(index) || index < 0 || index >= list.length) return null;
    return list[index];
  }

  return {
    seed,
    airfields,
    rings,
    checkpoints,
    volcano,
    lighthouse,
    villages,
    clouds,
    heightAt,
    nextRing,
  };
}

// Seeded random numbers for Arang Skylark (game/src/random.js).
// One clear job: deterministic randomness. The game logic never calls
// Math.random, so a seeded sortie (wind, ring jitter, clouds) replays
// exactly — the staged screenshots depend on it.
export function hashSeed(text) {
  const input = typeof text === 'string' ? text : String(text ?? '');
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function createRng(seed) {
  let state = Number.isFinite(seed) ? Math.floor(seed) >>> 0 : 1;
  if (state === 0) state = 1;
  return function nextRandom() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleSeeded(list, seed) {
  const rng = createRng(seed);
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

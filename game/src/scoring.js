// Sortie timer and scoring (game/src/scoring.js).
// One clear job: the 240-second sortie clock and the score — it only
// ever moves in the ways the missions say, and never below zero.
import { SORTIE_SECONDS } from './config.js';
import { gradeForScore } from './missions.js';

export { SORTIE_SECONDS, gradeForScore };

export function createSortie() {
  return {
    timeLeftSec: SORTIE_SECONDS,
    score: 0,
    streak: 0,
    ended: false,
    endCount: 0,
  };
}

export function tickTimer(sortie, dt) {
  if (sortie.ended) return sortie;
  const step = Number.isFinite(dt) && dt > 0 ? dt : 0;
  sortie.timeLeftSec = Math.max(0, sortie.timeLeftSec - step);
  if (sortie.timeLeftSec <= 0) {
    sortie.ended = true;
    sortie.endCount += 1;
  }
  return sortie;
}

export function addScore(sortie, points, kind) {
  const value = Number.isFinite(points) ? points : 0;
  sortie.score = Math.max(0, sortie.score + value);
  if (kind === 'ring' || kind === 'checkpoint') sortie.streak += 1;
  else if (kind === 'penalty') sortie.streak = 0;
  return sortie.score;
}

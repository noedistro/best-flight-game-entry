// The 5 missions of Arang Skylark (game/src/missions.js).
// One clear job: what each mission asks for, how its progress is counted
// and how it is scored. Exactly 5 missions with distinct goals — the
// title's "5 missions" must stay literally true.
import { SORTIE_SECONDS, RING_COUNT, SURVEY_CHECKPOINT_COUNT } from './config.js';

export { SORTIE_SECONDS };

export const MISSIONS = [
  {
    id: 'ring-run',
    name: 'Ring Run',
    goal: 'rings',
    briefing: 'Fly through all 12 rings over the strait, in order. Rings add score only — the timer never extends.',
    winCondition: 'Pass all 12 rings before the sortie timer ends.',
    scoreFor(event) {
      if (event === 'ring') return 50;
      if (event === 'ring-chain') return 25;
      return 0;
    },
  },
  {
    id: 'precision-landing',
    name: 'Precision Landing',
    goal: 'landing',
    briefing: 'Land on the short cliff-top strip at Lighthouse Point. Gentle, aligned, in the zone — three attempts, best counts.',
    winCondition: 'Land in the touchdown zone with a vertical speed under 300 fpm.',
    scoreFor(event, quality = 0) {
      if (event === 'landing') return 100 + Math.round(quality);
      return 0;
    },
  },
  {
    id: 'supply-drop',
    name: 'Supply Drop',
    goal: 'drop',
    briefing: 'Carry a crate to Teluk Village. Fly low and slow over the marker and press Space. One crate per sortie.',
    winCondition: 'Drop the crate within 100 m of the village marker.',
    scoreFor(event, quality = 0) {
      if (event === 'drop') return 80 + Math.round(quality);
      return 0;
    },
  },
  {
    id: 'volcano-survey',
    name: 'Volcano Survey',
    goal: 'survey',
    briefing: 'Photograph 6 checkpoints around Mount Arang, all below 1,500 ft. Above the ceiling, a checkpoint does not count.',
    winCondition: 'Photograph all 6 checkpoints below 1,500 ft.',
    scoreFor(event) {
      if (event === 'checkpoint') return 60;
      return 0;
    },
  },
  {
    id: 'mail-run',
    name: 'Island Mail Run',
    goal: 'airfields',
    briefing: 'Touch down at all 3 airfields — Arang Bay, Lighthouse Point, Volcano Flats — in any order, before the timer ends.',
    winCondition: 'Visit all 3 airfields before the sortie timer ends.',
    scoreFor(event) {
      if (event === 'airfield') return 90;
      return 0;
    },
  },
];

export function getMission(id) {
  if (typeof id !== 'string' || id.length === 0) return null;
  return MISSIONS.find((mission) => mission.id === id) ?? null;
}

function maxFor(mission) {
  if (mission.goal === 'rings') return RING_COUNT;
  if (mission.goal === 'airfields') return 3;
  if (mission.goal === 'survey') return SURVEY_CHECKPOINT_COUNT;
  if (mission.goal === 'landing') return 3;
  if (mission.goal === 'drop') return 1;
  return 0;
}

export function createMissionProgress(missionId) {
  const mission = getMission(missionId);
  const max = mission ? maxFor(mission) : 0;
  const visited = new Set();
  const progress = {
    id: missionId,
    count: 0,
    max,
    visited,
    seen: new Set(),
  };
  // `complete` is a live getter: it stays true the moment the goal is met,
  // and a mission with an empty goal list is complete from the start.
  Object.defineProperty(progress, 'complete', {
    enumerable: true,
    get() {
      return progress.count >= progress.max;
    },
  });
  return progress;
}

export function recordRingPass(progress, index, total) {
  const max = Number.isInteger(total) ? total : progress.max;
  if (!Number.isInteger(index) || index !== progress.count || progress.count >= max) {
    return { counted: false, count: progress.count };
  }
  progress.count += 1;
  return { counted: true, count: progress.count };
}

export function recordAirfieldVisit(progress, name) {
  if (typeof name !== 'string' || progress.visited.has(name) || progress.count >= progress.max) {
    return { counted: false, count: progress.count };
  }
  progress.visited.add(name);
  progress.count += 1;
  return { counted: true, count: progress.count };
}

export function recordCheckpoint(progress, index) {
  if (!Number.isInteger(index) || progress.seen.has(index) || progress.count >= progress.max) {
    return { counted: false, count: progress.count };
  }
  progress.seen.add(index);
  progress.count += 1;
  return { counted: true, count: progress.count };
}

export function gradeForScore(score) {
  if (score >= 900) return 'S';
  if (score >= 500) return 'A';
  if (score >= 200) return 'B';
  return 'C';
}

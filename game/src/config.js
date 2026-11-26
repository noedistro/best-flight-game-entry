// Shared constants for Arang Skylark (game/src/config.js).
// One clear job: every tunable number in one place so the flight model,
// the missions and the HUD can never disagree about a limit.
export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;
export const SORTIE_SECONDS = 240;
export const MAP_WIDTH = 12000;
export const MAP_HEIGHT_FT = 4000;
export const STALL_SPEED_KT = 55;
export const MAX_SPEED_KT = 185;
export const ROTATE_SPEED_KT = 70;
export const GEAR_SPEED_LIMIT_KT = 120;
export const FLAP_SPEED_LIMIT_KT = 110;
export const TOUCHDOWN_VS_LIMIT_FPM = 300;
export const CHECKPOINT_CEILING_FT = 1500;
export const CRUISE_BAND = [55, 65];
export const RING_COUNT = 12;
export const SURVEY_CHECKPOINT_COUNT = 6;
export const AIRFIELD_COUNT = 3;
export const MISSION_COUNT = 5;
export const KEY_BINDINGS = {
  ArrowUp: 'pitch-up',
  ArrowDown: 'pitch-down',
  ArrowLeft: 'bank-left',
  ArrowRight: 'bank-right',
  w: 'throttle-up',
  s: 'throttle-down',
  ' ': 'drop',
  g: 'gear',
  f: 'flaps',
  c: 'camera',
  m: 'mute',
  r: 'restart',
  1: 'mission-1',
  2: 'mission-2',
  3: 'mission-3',
  4: 'mission-4',
  5: 'mission-5',
};
export const PALETTE = {
  skyTop: '#ffd9a0',
  skyMid: '#ffb37a',
  skyLow: '#ff8f6b',
  sea: '#1f7a8c',
  seaDeep: '#155e6e',
  sand: '#f2d8a7',
  grass: '#7fae5a',
  forest: '#3f7d44',
  ridge: '#8a6b4f',
  volcano: '#6b4a3a',
  volcanoSmoke: '#e8e0d4',
  runway: '#5a5148',
  runwayMark: '#f5efdd',
  aircraftCream: '#f7ead0',
  aircraftRed: '#c0392b',
  aircraftTeal: '#1f7a8c',
  hudPanel: '#1c2b33',
  hudGlow: '#ffd166',
  hudGreen: '#7dd069',
  hudRed: '#ff5a4e',
};

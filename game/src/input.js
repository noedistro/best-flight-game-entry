// Keyboard and mouse input (game/src/input.js).
// One clear job: which key does what. Pure mapping plus a small state
// object the game loop owns — no DOM listeners here, so the tests can
// drive input without a browser.
import { KEY_BINDINGS } from './config.js';

const MISSION_BY_NUMBER = {
  'mission-1': 'ring-run',
  'mission-2': 'precision-landing',
  'mission-3': 'supply-drop',
  'mission-4': 'volcano-survey',
  'mission-5': 'mail-run',
};

export function keyAction(key) {
  if (typeof key !== 'string' || key.length === 0) return null;
  return KEY_BINDINGS[key] ?? null;
}

export function isToggleKey(key) {
  return key === 'g' || key === 'f' || key === 'c' || key === 'm';
}

export function createInputState() {
  return {
    throttle: 0,
    pitch: 0,
    bank: 0,
    score: 0,
    gearDown: true,
    flapsDown: false,
    cameraCockpit: false,
    muted: false,
    selectedMission: null,
    dropRequested: false,
    restartRequested: false,
  };
}

export function applyKey(state, key, repeat = false) {
  const action = keyAction(key);
  if (action === null) return state;
  if (repeat && isToggleKey(key)) return state;
  switch (action) {
    case 'gear':
      state.gearDown = !state.gearDown;
      break;
    case 'flaps':
      state.flapsDown = !state.flapsDown;
      break;
    case 'camera':
      state.cameraCockpit = !state.cameraCockpit;
      break;
    case 'mute':
      state.muted = !state.muted;
      break;
    case 'drop':
      state.dropRequested = true;
      break;
    case 'restart':
      state.throttle = 0;
      state.pitch = 0;
      state.bank = 0;
      state.score = 0;
      state.selectedMission = null;
      state.restartRequested = true;
      break;
    default:
      if (action.startsWith('mission-')) {
        state.selectedMission = MISSION_BY_NUMBER[action] ?? null;
      }
      break;
  }
  return state;
}

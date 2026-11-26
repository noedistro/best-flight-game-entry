// Flight model for the Skylark-9 "Camar" (game/src/flight.js).
// One clear job: how the aircraft moves — thrust, drag, bank, stall,
// wind, fuel burn and damage. Pure functions: no DOM, no canvas, so the
// unit tests can fly the model without a browser.
import { STALL_SPEED_KT, CRUISE_BAND } from './config.js';

export { STALL_SPEED_KT };
export const CRUISE_BAND_EXPORT = CRUISE_BAND;
export { CRUISE_BAND };

// Fuel burn is proportional to throttle squared. The constant is chosen
// so a full tank lasts exactly one 240-second sortie at cruise throttle
// (62%): burn(62%) * 240 = 100 units of fuel.
const FUEL_BURN_FULL = 100 / (240 * 0.62 * 0.62);
const DRAG_COEFF = 0.000791;
const THRUST_MAX_KT_PER_S = 16;

export function fuelBurnPerSecond(throttle) {
  const t = clampThrottle(throttle);
  return FUEL_BURN_FULL * (t / 100) * (t / 100);
}

export function clampThrottle(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

export function createFlightState(overrides = {}) {
  const state = {
    x: 0,
    y: 0,
    altitudeFt: 1200,
    speedKt: 112,
    headingDeg: 45,
    pitchDeg: 0,
    bankDeg: 0,
    verticalSpeedFpm: 0,
    throttle: 62,
    fuel: 100,
    damage: 0,
    stalled: false,
    unflyable: false,
    engineOut: false,
  };
  for (const key of Object.keys(overrides)) {
    if (key in state) state[key] = overrides[key];
  }
  state.throttle = clampThrottle(state.throttle);
  state.fuel = Math.max(0, Math.min(100, state.fuel));
  state.damage = Math.max(0, Math.min(100, state.damage));
  return state;
}

function applyWind(state, wind, dt, headingDeg) {
  // wind.x is the crosswind: it pushes perpendicular to the heading, so at
  // heading 045 it moves the aircraft sideways in both x and y. wind.y is
  // the headwind component, along the heading.
  const cross = wind && Number.isFinite(wind.x) ? wind.x : 0;
  const along = wind && Number.isFinite(wind.y) ? wind.y : 0;
  const headingRad = (headingDeg * Math.PI) / 180;
  const perpRad = headingRad + Math.PI / 2;
  return {
    x: state.x + Math.cos(perpRad) * cross * dt * 0.5 + Math.cos(headingRad) * along * dt * 0.5,
    y: state.y + Math.sin(perpRad) * cross * dt * 0.5 + Math.sin(headingRad) * along * dt * 0.5,
  };
}

export function stepFlight(state, input = {}, dt = 1, wind = { x: 0, y: 0 }) {
  const next = { ...state };
  const step = Number.isFinite(dt) && dt > 0 ? dt : 1;

  // Throttle: invalid input is clamped to a defined value, never a throw.
  const requested = input && 'throttle' in input ? input.throttle : state.throttle;
  next.throttle = clampThrottle(requested);

  // Fuel: burn first; an empty tank means no thrust at all.
  const burn = fuelBurnPerSecond(next.throttle) * step;
  next.fuel = Math.max(0, state.fuel - burn);
  next.engineOut = next.fuel <= 0;
  const thrust = next.engineOut ? 0 : (next.throttle / 100) * THRUST_MAX_KT_PER_S;

  // Drag rises with the square of speed.
  const drag = DRAG_COEFF * state.speedKt * state.speedKt;

  // Bank and pitch from the controls; a stalled aircraft answers mushily.
  const bankInput = Number.isFinite(input.bank) ? input.bank : 0;
  const pitchInput = Number.isFinite(input.pitch) ? input.pitch : 0;
  const wasStalled = state.speedKt < STALL_SPEED_KT;
  const controlAuthority = wasStalled ? 0.4 : 1;
  next.bankDeg = Math.max(-60, Math.min(60, bankInput * controlAuthority));
  next.pitchDeg = Math.max(-20, Math.min(20, pitchInput * controlAuthority));

  // Speed: thrust minus drag, plus a small gravity term when pitched.
  let speed = state.speedKt + (thrust - drag) * step;
  speed += -next.pitchDeg * 0.35 * step;
  next.speedKt = Math.max(0, speed);

  // Stall: below stall speed the nose drops and the aircraft descends.
  next.stalled = next.speedKt < STALL_SPEED_KT;
  const bankRad = (next.bankDeg * Math.PI) / 180;
  const lift = Math.cos(bankRad);
  let verticalSpeed = state.verticalSpeedFpm;
  verticalSpeed += next.pitchDeg * 55 * step;
  // A banked turn costs lift: a steep bank bleeds altitude.
  verticalSpeed += (lift - 1) * 1400 * step;
  if (next.stalled) verticalSpeed -= 700 * step;
  // Vertical speed eases back towards level flight.
  verticalSpeed *= 0.92;
  next.verticalSpeedFpm = Math.max(-3000, Math.min(3000, verticalSpeed));

  next.altitudeFt = Math.max(0, state.altitudeFt + (next.verticalSpeedFpm / 60) * step);

  // Heading: a banked turn turns the aircraft; a steep bank turns faster.
  const turnRate = next.bankDeg * 0.28 * (Math.min(next.speedKt, 120) / 100);
  next.headingDeg = (((state.headingDeg + turnRate * step) % 360) + 360) % 360;

  // Position: forward motion plus the wind's lateral push.
  const headingRad = (next.headingDeg * Math.PI) / 180;
  const drift = applyWind(next, wind, step, next.headingDeg);
  next.x = state.x + next.speedKt * Math.cos(headingRad) * step * 1.5 + (drift.x - state.x);
  next.y = state.y + next.speedKt * Math.sin(headingRad) * step * 0.4 + (drift.y - state.y);

  if (next.damage >= 100) {
    next.damage = 100;
    next.unflyable = true;
  }
  return next;
}

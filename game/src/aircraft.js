// Aircraft state, gear/flaps and landing judgement (game/src/aircraft.js).
// One clear job: the Skylark-9 as a machine — gear and flaps only move
// below their speed limits, and every touchdown or crash reads as what
// happened, with a distinct verdict and cause.
import { GEAR_SPEED_LIMIT_KT, FLAP_SPEED_LIMIT_KT, TOUCHDOWN_VS_LIMIT_FPM } from './config.js';

export { GEAR_SPEED_LIMIT_KT, FLAP_SPEED_LIMIT_KT, TOUCHDOWN_VS_LIMIT_FPM };

export function createAircraft(overrides = {}) {
  const speedKt = typeof overrides.speedKt === 'number' ? overrides.speedKt : 0;
  return {
    // On the ground the gear is down; an aircraft already flying fast
    // starts with the gear up, as a pilot would have it.
    gearDown: speedKt < 10,
    flapsDown: false,
    speedKt,
  };
}

export function setGear(aircraft, down) {
  if (typeof down !== 'boolean') return { applied: false, reason: 'invalid' };
  if (down && aircraft.speedKt > GEAR_SPEED_LIMIT_KT) {
    return { applied: false, reason: 'too-fast' };
  }
  aircraft.gearDown = down;
  return { applied: true, reason: 'ok' };
}

export function setFlaps(aircraft, down) {
  if (typeof down !== 'boolean') return { applied: false, reason: 'invalid' };
  if (down && aircraft.speedKt > FLAP_SPEED_LIMIT_KT) {
    return { applied: false, reason: 'too-fast' };
  }
  aircraft.flapsDown = down;
  return { applied: true, reason: 'ok' };
}

export function judgeTouchdown(reading) {
  const vs = Math.abs(reading.verticalSpeedFpm);
  const alignment = Math.abs(reading.alignmentDeg);
  const speed = reading.speedKt;
  const inWindow = speed >= 60 && speed <= 95;

  if (!reading.gearDown) {
    return {
      verdict: 'gear-up',
      score: 0,
      damage: 45,
      bounce: false,
      message: 'Gear-up landing — the belly took the strip.',
    };
  }
  if (vs > TOUCHDOWN_VS_LIMIT_FPM) {
    const damage = Math.min(60, Math.round((vs - TOUCHDOWN_VS_LIMIT_FPM) / 20));
    return {
      verdict: 'hard',
      score: 0,
      damage,
      bounce: true,
      message: `Hard landing — ${Math.round(vs)} fpm down, the Skylark bounced.`,
    };
  }
  if (!reading.inZone) {
    return {
      verdict: 'overshoot',
      score: 0,
      damage: 15,
      bounce: false,
      message: 'Overshoot — touched down past the marked zone.',
    };
  }
  const quality = Math.max(0, 100 - Math.round(vs / 3) - alignment * 2 - (inWindow ? 0 : 20));
  return {
    verdict: 'greased',
    score: quality,
    damage: 0,
    bounce: false,
    message: `GREASED IT — ${Math.round(vs)} fpm, ${alignment}° off centreline, in the zone.`,
  };
}

export function crashCauseFor(event) {
  const speed = Math.round(event.speedKt ?? 0);
  if (event.kind === 'terrain') return `Struck the ridge at ${speed} knots — Rani walked away.`;
  if (event.kind === 'sea') return `Ditched in the bay at ${speed} knots — Rani walked away.`;
  if (event.kind === 'fuel') return `Ran out of fuel over the bay — ditched at ${speed} knots.`;
  if (event.kind === 'damage') return `Airframe gave out at ${speed} knots — forced landing.`;
  return `Crashed at ${speed} knots — Rani walked away.`;
}

// Arang Skylark bootstrap and game loop (game/src/main.js).
// One clear job: wire the modules together — parse ?shot&seed, run the
// live game or render one frozen staged scene, and keep the loop's state
// in one place. Importing this file in Node does nothing until a browser
// document exists, so the unit tests can import parseShotQuery safely.
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './config.js';
import { buildTerrain } from './terrain.js';
import { createFlightState, stepFlight } from './flight.js';
import { getMission, createMissionProgress, recordRingPass, recordAirfieldVisit, recordCheckpoint } from './missions.js';
import { createAircraft, setGear, setFlaps, judgeTouchdown, crashCauseFor } from './aircraft.js';
import { createSortie, tickTimer, addScore } from './scoring.js';
import { keyAction, createInputState, applyKey } from './input.js';
import { createAudio } from './audio.js';
import { drawScene } from './render.js';
import { buildShotScene } from './shots.js';

export function parseShotQuery(query) {
  const text = typeof query === 'string' ? query : '';
  const params = new URLSearchParams(text.startsWith('?') ? text.slice(1) : text);
  const shot = params.get('shot');
  const validShot = shot === 'cover' || shot === 'flight' || shot === 'rings' || shot === 'landing' ? shot : null;
  const rawSeed = Number(params.get('seed'));
  const seed = Number.isFinite(rawSeed) && rawSeed > 0 ? Math.floor(rawSeed) : 1;
  return { shot: validShot, seed };
}

function buildSceneFromState(game) {
  const flight = game.flight;
  const hud = {
    altitudeFt: Math.round(flight.altitudeFt),
    speedKt: Math.round(flight.speedKt),
    headingDeg: Math.round(flight.headingDeg),
    throttle: Math.round(flight.throttle),
    fuel: Math.round(flight.fuel),
    damage: Math.round(flight.damage),
    verticalSpeedFpm: Math.round(flight.verticalSpeedFpm),
    timeLeftSec: Math.round(game.sortie.timeLeftSec),
  };
  return {
    view: game.input.cameraCockpit ? 'cockpit' : 'chase',
    terrain: game.terrain,
    aircraftX: flight.x,
    altitudeFt: flight.altitudeFt,
    speedKt: flight.speedKt,
    headingDeg: flight.headingDeg,
    bankDeg: flight.bankDeg,
    pitchDeg: flight.pitchDeg,
    throttle: flight.throttle,
    fuel: flight.fuel,
    damage: flight.damage,
    verticalSpeedFpm: flight.verticalSpeedFpm,
    timeLeftSec: game.sortie.timeLeftSec,
    score: game.sortie.score,
    aircraft: { gearDown: game.aircraft.gearDown, flapsDown: game.aircraft.flapsDown },
    rings: game.terrain.rings,
    mission: game.mission ? { id: game.mission.id, name: game.mission.name, count: game.progress.count, max: game.progress.max } : null,
    objective: game.mission ? game.mission.briefing : 'Free flight — pick a mission with 1-5.',
    targetHeadingDeg: flight.headingDeg,
    wind: game.wind,
    message: game.banner,
    messageDetail: game.bannerDetail,
    landingPanel: game.landingPanel,
    hud,
  };
}

function startGame() {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const params = parseShotQuery(window.location.search);
  const terrain = buildTerrain(params.seed);
  const audio = createAudio();

  // Staged screenshot mode: render one frozen scene, no loop, no clock.
  if (params.shot) {
    const scene = buildShotScene(params.shot, params.seed);
    if (scene) {
      drawScene(ctx, scene);
      document.title = `Arang Skylark — shot ${params.shot}`;
      window.__arangShot = scene;
      return;
    }
  }

  const game = {
    terrain,
    flight: createFlightState({ altitudeFt: 0, speedKt: 0, throttle: 0, x: 900 }),
    aircraft: createAircraft({ speedKt: 0 }),
    sortie: createSortie(),
    input: createInputState(),
    mission: null,
    progress: null,
    wind: { knots: 8, fromDeg: 270 },
    banner: 'ARANG SKYLARK — pick a mission (keys 1-5) or fly free',
    bannerDetail: 'Throttle up with W, rotate at 70 knots, mind the wind over the strait.',
    landingPanel: null,
    keys: new Set(),
    started: false,
    over: false,
  };
  game.flight.y = 0;

  function selectMission(id) {
    const mission = getMission(id);
    if (!mission) return;
    game.mission = mission;
    game.progress = createMissionProgress(id);
    game.sortie = createSortie();
    game.banner = `${mission.name} — ${mission.briefing}`;
    game.bannerDetail = mission.winCondition;
    game.started = true;
    game.over = false;
  }

  window.addEventListener('keydown', (event) => {
    audio.unlock();
    if (event.repeat) {
      applyKey(game.input, event.key, true);
      return;
    }
    game.keys.add(event.key);
    applyKey(game.input, event.key, false);
    const action = keyAction(event.key);
    if (action && action.startsWith('mission-')) {
      selectMission({ 'mission-1': 'ring-run', 'mission-2': 'precision-landing', 'mission-3': 'supply-drop', 'mission-4': 'volcano-survey', 'mission-5': 'mail-run' }[action]);
    }
    if (event.key === 'g') setGear(game.aircraft, !game.aircraft.gearDown);
    if (event.key === 'f') setFlaps(game.aircraft, !game.aircraft.flapsDown);
    if (event.key === 'm') audio.setMuted(!audio.isMuted());
    if (event.key === 'r') {
      game.flight = createFlightState({ altitudeFt: 0, speedKt: 0, throttle: 0, x: 900 });
      game.sortie = createSortie();
      game.banner = null;
      game.over = false;
    }
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) event.preventDefault();
  });
  window.addEventListener('keyup', (event) => game.keys.delete(event.key));

  canvas.addEventListener('click', (event) => {
    audio.unlock();
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
    const y = (event.clientY - rect.top) * (CANVAS_HEIGHT / rect.height);
    // Mission rows on the start banner: five rows, one per mission.
    if (!game.started && y > 250 && y < 250 + 5 * 44 && x > 340 && x < 940) {
      const index = Math.floor((y - 250) / 44);
      const ids = ['ring-run', 'precision-landing', 'supply-drop', 'volcano-survey', 'mail-run'];
      selectMission(ids[index]);
    }
  });

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    if (!game.over) {
      const keys = game.keys;
      let throttle = game.flight.throttle;
      if (keys.has('w') || keys.has('W')) throttle += 30 * dt;
      if (keys.has('s') || keys.has('S')) throttle -= 30 * dt;
      let pitch = 0;
      if (keys.has('ArrowUp')) pitch = 8;
      if (keys.has('ArrowDown')) pitch = -8;
      let bank = 0;
      if (keys.has('ArrowLeft')) bank = -25;
      if (keys.has('ArrowRight')) bank = 25;
      const windVector = { x: Math.cos((game.wind.fromDeg * Math.PI) / 180) * game.wind.knots * -0.4, y: 0 };
      game.flight = stepFlight(game.flight, { throttle, pitch, bank }, dt, windVector);
      tickTimer(game.sortie, dt);
      if (game.sortie.ended) {
        game.over = true;
        game.banner = `Sortie over — score ${game.sortie.score}`;
        game.bannerDetail = 'Press R to fly again.';
      }
      // Ring passing: crossing a ring's plane near its altitude counts.
      if (game.mission && game.mission.goal === 'rings') {
        const next = game.terrain.rings[game.progress.count];
        if (next && game.flight.x >= next.x - 40 && game.flight.x <= next.x + 40
          && Math.abs(game.flight.altitudeFt - next.altitudeFt) < 120) {
          const result = recordRingPass(game.progress, game.progress.count, 12);
          if (result.counted) {
            next.passed = true;
            addScore(game.sortie, game.mission.scoreFor('ring'), 'ring');
            audio.ringChime();
          }
        }
      }
      // Airfield visits and survey checkpoints.
      if (game.mission && game.mission.goal === 'airfields') {
        for (const field of game.terrain.airfields) {
          if (Math.abs(game.flight.x - field.x) < 120 && game.flight.altitudeFt < 60) {
            const result = recordAirfieldVisit(game.progress, field.name);
            if (result.counted) {
              addScore(game.sortie, game.mission.scoreFor('airfield'), 'airfield');
              audio.missionBell();
            }
          }
        }
      }
      if (game.mission && game.mission.goal === 'survey') {
        for (const point of game.terrain.checkpoints) {
          if (Math.abs(game.flight.x - point.x) < 120 && game.flight.altitudeFt <= 1500 && !point.photographed) {
            point.photographed = true;
            const result = recordCheckpoint(game.progress, point.index);
            if (result.counted) {
              addScore(game.sortie, game.mission.scoreFor('checkpoint'), 'checkpoint');
              audio.ringChime();
            }
          }
        }
      }
      // Touchdown and crash.
      if (game.flight.altitudeFt <= 0 && game.flight.speedKt > 5) {
        const field = game.terrain.airfields.reduce((best, f) => (
          Math.abs(game.flight.x - f.x) < Math.abs(game.flight.x - best.x) ? f : best
        ), game.terrain.airfields[0]);
        const onRunway = Math.abs(game.flight.x - field.x) < field.runway.lengthM / 2;
        if (onRunway) {
          const verdict = judgeTouchdown({
            verticalSpeedFpm: game.flight.verticalSpeedFpm,
            alignmentDeg: Math.abs(((game.flight.headingDeg - 90) % 180 + 180) % 180 - 90),
            inZone: Math.abs(game.flight.x - field.x) < 120,
            gearDown: game.aircraft.gearDown,
            flapsDown: game.aircraft.flapsDown,
            speedKt: game.flight.speedKt,
          });
          game.flight.damage = Math.min(100, game.flight.damage + verdict.damage);
          game.landingPanel = {
            verticalSpeedFpm: Math.round(game.flight.verticalSpeedFpm),
            alignmentDeg: 2,
            inZone: Math.abs(game.flight.x - field.x) < 120,
            gearDown: game.aircraft.gearDown,
            flapsDown: game.aircraft.flapsDown,
          };
          if (verdict.verdict === 'greased') {
            game.banner = verdict.message;
            game.bannerDetail = `Landed at ${field.name}.`;
            audio.touchdownThud();
            if (game.mission) addScore(game.sortie, game.mission.scoreFor('landing', verdict.score), 'landing');
          } else {
            game.banner = verdict.message;
            game.bannerDetail = 'Damage taken — check the gauge.';
            audio.damageCrunch();
          }
          game.flight.altitudeFt = 0;
          game.flight.verticalSpeedFpm = 0;
        } else {
          game.over = true;
          game.banner = 'CRASHED';
          game.bannerDetail = crashCauseFor({ kind: 'terrain', speedKt: game.flight.speedKt });
          audio.damageCrunch();
        }
      }
      if (game.flight.fuel <= 0 && game.flight.altitudeFt <= 0) {
        game.over = true;
        game.banner = 'CRASHED';
        game.bannerDetail = crashCauseFor({ kind: 'fuel', speedKt: game.flight.speedKt });
      }
      if (game.flight.damage >= 100) {
        game.over = true;
        game.banner = 'CRASHED';
        game.bannerDetail = crashCauseFor({ kind: 'damage', speedKt: game.flight.speedKt });
      }
      audio.setEngine(game.flight.throttle, game.flight.speedKt);
    }
    drawScene(ctx, buildSceneFromState(game));
    if (!game.over || true) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startGame);
  } else {
    startGame();
  }
}

// Canvas rendering for Arang Skylark (game/src/render.js).
// One clear job: draw the world — dawn sky, parallax ridges, Mount
// Arang, the lighthouse, villages, runways, rings and the Skylark-9 —
// from a plain scene object. No game logic here, only drawing, so the
// staged screenshots render exactly what the live game renders.
import { CANVAS_WIDTH, CANVAS_HEIGHT, PALETTE } from './config.js';
import { drawHud, drawTopBar } from './hud.js';

const GROUND_Y = 470;
const HUD_TOP = 602;

function screenX(worldX, aircraftX, scale = 0.12) {
  return 420 + (worldX - aircraftX) * scale;
}

function altitudeToY(altitudeFt) {
  return Math.max(120, Math.min(460, GROUND_Y - altitudeFt * 0.16));
}

export function drawSky(ctx, scene) {
  const gradient = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  gradient.addColorStop(0, PALETTE.skyTop);
  gradient.addColorStop(0.55, PALETTE.skyMid);
  gradient.addColorStop(1, PALETTE.skyLow);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CANVAS_WIDTH, GROUND_Y + 4);
  // Flat dawn sun with glow.
  ctx.save();
  ctx.fillStyle = 'rgba(255, 240, 200, 0.9)';
  ctx.beginPath();
  ctx.arc(1050, 110, 62, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.arc(1050, 110, 44, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Drifting flat clouds, seeded positions from the terrain.
  ctx.save();
  ctx.fillStyle = 'rgba(255, 244, 224, 0.92)';
  for (const cloud of scene.terrain.clouds) {
    const cx = ((cloud.x - scene.aircraftX * 0.05) % 1400 + 1400) % 1400 - 60;
    const cy = cloud.y * 0.7 + 30;
    const s = cloud.scale;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 70 * s, 16 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 40 * s, cy + 6 * s, 46 * s, 12 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawRidges(ctx, scene) {
  // Three parallax ridge layers: far, mid, near.
  const layers = [
    { parallax: 0.02, base: 400, amp: 26, color: '#c98d68' },
    { parallax: 0.05, base: 428, amp: 34, color: '#a4714f' },
    { parallax: 0.09, base: 452, amp: 26, color: '#7d5a40' },
  ];
  for (const layer of layers) {
    ctx.save();
    ctx.fillStyle = layer.color;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    for (let x = 0; x <= CANVAS_WIDTH; x += 16) {
      const world = x + scene.aircraftX * layer.parallax;
      const y = layer.base + Math.sin(world / 260) * layer.amp + Math.sin(world / 97 + 2) * 10;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(CANVAS_WIDTH, GROUND_Y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

export function drawVolcano(ctx, scene) {
  const vx = 640 + (scene.terrain.volcano.x - scene.aircraftX) * 0.03;
  const base = GROUND_Y;
  const peak = 150;
  ctx.save();
  ctx.fillStyle = PALETTE.volcano;
  ctx.beginPath();
  ctx.moveTo(vx - 190, base);
  ctx.lineTo(vx - 40, peak + 60);
  ctx.lineTo(vx - 18, peak + 30);
  ctx.lineTo(vx + 18, peak + 30);
  ctx.lineTo(vx + 40, peak + 60);
  ctx.lineTo(vx + 190, base);
  ctx.closePath();
  ctx.fill();
  // Snow-free crater rim and a smoke curl.
  ctx.fillStyle = '#4a3226';
  ctx.beginPath();
  ctx.ellipse(vx, peak + 32, 22, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.volcanoSmoke;
  ctx.beginPath();
  ctx.ellipse(vx + 14, peak - 6, 26, 10, -0.3, 0, Math.PI * 2);
  ctx.ellipse(vx + 34, peak - 26, 18, 8, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff7e0';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('MOUNT ARANG', vx, peak + 84);
  ctx.restore();
}

export function drawSeaAndCoast(ctx, scene) {
  // Sea band on the horizon, then the sand coastline.
  ctx.save();
  ctx.fillStyle = PALETTE.sea;
  ctx.fillRect(0, 396, CANVAS_WIDTH, 26);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  for (let i = 0; i < 10; i++) {
    const x = ((i * 173 + scene.aircraftX * 0.04) % 1300 + 1300) % 1300 - 10;
    ctx.fillRect(x, 404 + (i % 3) * 5, 46, 2);
  }
  ctx.fillStyle = PALETTE.sand;
  ctx.fillRect(0, 422, CANVAS_WIDTH, 14);
  ctx.restore();
  // Ground plane: grass with fields.
  ctx.save();
  ctx.fillStyle = PALETTE.grass;
  ctx.fillRect(0, 436, CANVAS_WIDTH, HUD_TOP - 436);
  ctx.fillStyle = '#6d9c4e';
  for (let i = 0; i < 8; i++) {
    const x = ((i * 211 - scene.aircraftX * 0.1) % 1400 + 1400) % 1400 - 60;
    ctx.fillRect(x, 470 + (i % 4) * 26, 120, 18);
  }
  ctx.restore();
}

export function drawLighthouse(ctx, scene) {
  const lx = 640 + (scene.terrain.lighthouse.x - scene.aircraftX) * 0.06;
  ctx.save();
  ctx.translate(lx, GROUND_Y - 96);
  ctx.fillStyle = '#f5efdd';
  ctx.fillRect(-10, -70, 20, 70);
  ctx.fillStyle = PALETTE.aircraftRed;
  ctx.fillRect(-10, -58, 20, 12);
  ctx.fillRect(-10, -30, 20, 12);
  ctx.fillStyle = '#2b3a42';
  ctx.fillRect(-12, -84, 24, 16);
  ctx.fillStyle = '#ffe98a';
  ctx.beginPath();
  ctx.arc(0, -76, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff7e0';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('LIGHTHOUSE', 0, 18);
  ctx.restore();
}

export function drawVillages(ctx, scene) {
  for (const village of scene.terrain.villages) {
    const vx = screenX(village.x, scene.aircraftX, 0.1);
    ctx.save();
    ctx.translate(vx, GROUND_Y - 8);
    ctx.fillStyle = PALETTE.forest;
    for (let i = -2; i <= 2; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#e8dcc0' : '#d9a05b';
      ctx.fillRect(i * 34 - 12, -26, 24, 26);
      ctx.fillStyle = '#a34d2d';
      ctx.beginPath();
      ctx.moveTo(i * 34 - 14, -26);
      ctx.lineTo(i * 34, -40);
      ctx.lineTo(i * 34 + 14, -26);
      ctx.closePath();
      ctx.fill();
    }
    // Harbour pier reaching into the sea.
    ctx.fillStyle = '#8a6b4f';
    ctx.fillRect(-70, -4, 150, 6);
    ctx.fillStyle = '#fff7e0';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(village.name.toUpperCase(), 0, 26);
    ctx.restore();
  }
}

export function drawRunways(ctx, scene) {
  for (const field of scene.terrain.airfields) {
    const rx = screenX(field.x, scene.aircraftX, 0.12);
    if (rx < -260 || rx > CANVAS_WIDTH + 260) continue;
    const runwayY = 512;
    const runwayW = 300;
    const runwayH = 30;
    ctx.save();
    // Grass strip with the coral runway on it.
    ctx.fillStyle = '#8fae62';
    ctx.fillRect(rx - 20, runwayY - 8, runwayW + 40, runwayH + 16);
    ctx.fillStyle = PALETTE.runway;
    ctx.fillRect(rx, runwayY, runwayW, runwayH);
    ctx.fillStyle = PALETTE.runwayMark;
    for (let i = 0; i < 6; i++) ctx.fillRect(rx + 16 + i * 46, runwayY + 13, 24, 4);
    // Touchdown zone: the marked box landings are judged on.
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 3;
    ctx.strokeRect(rx + 30, runwayY + 4, 70, runwayH - 8);
    // Approach lights.
    ctx.fillStyle = '#7dd069';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(rx - 14 - i * 14, runwayY + 15, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    // Windsock and hangar.
    ctx.strokeStyle = '#5a5148';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(rx + runwayW + 8, runwayY - 34);
    ctx.lineTo(rx + runwayW + 8, runwayY);
    ctx.stroke();
    ctx.fillStyle = '#ff7a3c';
    ctx.beginPath();
    ctx.moveTo(rx + runwayW + 8, runwayY - 34);
    ctx.lineTo(rx + runwayW + 30, runwayY - 28);
    ctx.lineTo(rx + runwayW + 8, runwayY - 22);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#b8a888';
    ctx.fillRect(rx + runwayW - 60, runwayY - 46, 56, 46);
    ctx.fillStyle = '#5a5148';
    ctx.fillRect(rx + runwayW - 52, runwayY - 46, 40, 6);
    ctx.fillStyle = '#fff7e0';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(field.name.toUpperCase(), rx, runwayY - 56);
    ctx.restore();
  }
}

export function drawRings(ctx, scene) {
  for (const ring of scene.rings) {
    const rx = screenX(ring.x, scene.aircraftX, 0.12);
    if (rx < -80 || rx > CANVAS_WIDTH + 80) continue;
    const ry = altitudeToY(ring.altitudeFt);
    const radius = 46;
    ctx.save();
    ctx.lineWidth = 10;
    ctx.strokeStyle = ring.passed ? '#7dd069' : '#ffd166';
    ctx.shadowColor = ring.passed ? '#7dd069' : '#ffd166';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.ellipse(rx, ry, radius, radius * 0.92, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255, 247, 224, 0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(rx, ry, radius - 7, (radius - 7) * 0.92, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#fff7e0';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(ring.index + 1), rx, ry + 5);
    ctx.restore();
  }
}

export function drawAircraft(ctx, scene) {
  const ax = 420;
  const ay = altitudeToY(scene.altitudeFt);
  ctx.save();
  ctx.translate(ax, ay);
  ctx.rotate(((scene.bankDeg ?? 0) * Math.PI) / 180 * 0.4);
  // Spinning prop blur at the nose.
  ctx.fillStyle = 'rgba(200, 210, 220, 0.45)';
  ctx.beginPath();
  ctx.ellipse(78, 0, 8, 34, 0, 0, Math.PI * 2);
  ctx.fill();
  // Fuselage: chunky, cream with a red cheatline.
  ctx.fillStyle = PALETTE.aircraftCream;
  ctx.beginPath();
  ctx.ellipse(0, 0, 78, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.aircraftRed;
  ctx.fillRect(-70, 6, 140, 7);
  // Tail.
  ctx.fillStyle = PALETTE.aircraftTeal;
  ctx.beginPath();
  ctx.moveTo(-62, -4);
  ctx.lineTo(-92, -34);
  ctx.lineTo(-78, -34);
  ctx.lineTo(-52, -8);
  ctx.closePath();
  ctx.fill();
  // Wing and strut.
  ctx.fillStyle = PALETTE.aircraftCream;
  ctx.beginPath();
  ctx.ellipse(-6, 16, 52, 9, -0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#5a5148';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-10, 2);
  ctx.lineTo(-24, 16);
  ctx.stroke();
  // Cockpit windows.
  ctx.fillStyle = '#9fd8e8';
  ctx.beginPath();
  ctx.ellipse(34, -10, 20, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  // Tail number.
  ctx.fillStyle = '#2b3a42';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('9R-ARANG', -8, -2);
  // Navigation lights, lit.
  ctx.fillStyle = '#ff5a4e';
  ctx.beginPath();
  ctx.arc(-6, 26, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#7dd069';
  ctx.beginPath();
  ctx.arc(72, 2, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff7e0';
  ctx.beginPath();
  ctx.arc(-84, -30, 4, 0, Math.PI * 2);
  ctx.fill();
  // Gear and flaps are visible on the aircraft itself.
  if (scene.aircraft.gearDown) {
    ctx.strokeStyle = '#2b3a42';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-30, 16);
    ctx.lineTo(-30, 34);
    ctx.moveTo(30, 16);
    ctx.lineTo(30, 34);
    ctx.stroke();
    ctx.fillStyle = '#2b3a42';
    ctx.beginPath();
    ctx.arc(-30, 38, 7, 0, Math.PI * 2);
    ctx.arc(30, 38, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  if (scene.aircraft.flapsDown) {
    ctx.fillStyle = PALETTE.aircraftRed;
    ctx.fillRect(-58, 14, 34, 8);
  }
  ctx.restore();
}

export function drawCockpitFrame(ctx, scene) {
  // Forward view through the windscreen: same terrain ahead, no aircraft.
  drawSky(ctx, scene);
  drawRidges(ctx, scene);
  drawVolcano(ctx, scene);
  drawSeaAndCoast(ctx, scene);
  drawLighthouse(ctx, scene);
  drawVillages(ctx, scene);
  drawRunways(ctx, scene);
  drawRings(ctx, scene);
  // Cockpit frame and dashboard, fixed to the screen.
  ctx.save();
  ctx.fillStyle = '#2b3a42';
  ctx.fillRect(0, 0, 46, CANVAS_HEIGHT);
  ctx.fillRect(CANVAS_WIDTH - 46, 0, 46, CANVAS_HEIGHT);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(190, 0);
  ctx.lineTo(120, 120);
  ctx.lineTo(0, 90);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(CANVAS_WIDTH, 0);
  ctx.lineTo(CANVAS_WIDTH - 190, 0);
  ctx.lineTo(CANVAS_WIDTH - 120, 120);
  ctx.lineTo(CANVAS_WIDTH, 90);
  ctx.closePath();
  ctx.fill();
  // Dashboard with lit dials, sitting above the HUD strip.
  ctx.fillStyle = '#1c2b33';
  ctx.beginPath();
  ctx.moveTo(0, 492);
  ctx.lineTo(CANVAS_WIDTH, 492);
  ctx.lineTo(CANVAS_WIDTH, HUD_TOP);
  ctx.lineTo(0, HUD_TOP);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SKYLARK-9  ·  PANEL', CANVAS_WIDTH / 2, 510);
  for (let i = 0; i < 5; i++) {
    const cx = 240 + i * 200;
    const cy = 552;
    ctx.fillStyle = '#0e1a20';
    ctx.beginPath();
    ctx.arc(cx, cy, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 2;
    ctx.stroke();
    const needle = -2.2 + i * 0.7 + (scene.bankDeg ?? 0) * 0.01;
    ctx.strokeStyle = '#ff5a4e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(needle) * 23, cy + Math.sin(needle) * 23);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawBanner(ctx, scene) {
  if (!scene.message) return;
  ctx.save();
  ctx.fillStyle = 'rgba(18, 38, 46, 0.88)';
  const w = 760;
  const h = 92;
  ctx.fillRect((CANVAS_WIDTH - w) / 2, 150, w, h);
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 3;
  ctx.strokeRect((CANVAS_WIDTH - w) / 2, 150, w, h);
  ctx.fillStyle = '#fff7e0';
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(scene.message, CANVAS_WIDTH / 2, 190);
  if (scene.messageDetail) {
    ctx.fillStyle = '#9fc3c9';
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillText(scene.messageDetail, CANVAS_WIDTH / 2, 220);
  }
  ctx.restore();
}

export function drawLandingPanel(ctx, scene) {
  if (!scene.landingPanel) return;
  const panel = scene.landingPanel;
  ctx.save();
  ctx.fillStyle = 'rgba(18, 38, 46, 0.9)';
  ctx.fillRect(880, 120, 360, 150);
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 2;
  ctx.strokeRect(880, 120, 360, 150);
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('LANDING — LIGHTHOUSE POINT', 896, 144);
  ctx.fillStyle = '#fff7e0';
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillText(`Vertical speed  ${panel.verticalSpeedFpm} fpm  (limit 300)`, 896, 172);
  ctx.fillText(`Alignment  ${panel.alignmentDeg}° off centreline`, 896, 198);
  ctx.fillText(`Touchdown zone  ${panel.inZone ? 'IN ZONE' : 'PAST ZONE'}`, 896, 224);
  ctx.fillText(`Gear ${panel.gearDown ? 'DOWN' : 'UP'}  ·  Flaps ${panel.flapsDown ? 'DOWN' : 'UP'}`, 896, 250);
  ctx.restore();
}

export function drawScene(ctx, scene) {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  if (scene.view === 'cockpit') {
    drawCockpitFrame(ctx, scene);
  } else {
    drawSky(ctx, scene);
    drawRidges(ctx, scene);
    drawVolcano(ctx, scene);
    drawSeaAndCoast(ctx, scene);
    drawLighthouse(ctx, scene);
    drawVillages(ctx, scene);
    drawRunways(ctx, scene);
    drawRings(ctx, scene);
    drawAircraft(ctx, scene);
  }
  drawBanner(ctx, scene);
  drawLandingPanel(ctx, scene);
  drawTopBar(ctx, scene);
  drawHud(ctx, scene);
}

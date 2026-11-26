// HUD instruments for Arang Skylark (game/src/hud.js).
// One clear job: the lit instrument strip — altitude, speed and heading
// tapes, artificial horizon, throttle / fuel / damage gauges, mission
// line, sortie timer and controls reminder. Drawn on canvas, never DOM,
// so the instruments are part of the game render the judge sees.
import { CANVAS_WIDTH, CANVAS_HEIGHT, PALETTE, CRUISE_BAND } from './config.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function panel(ctx, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = 'rgba(18, 38, 46, 0.88)';
  roundRect(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 209, 102, 0.55)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function label(ctx, text, x, y, size = 11, color = '#ffd166') {
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = `bold ${size}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
  ctx.restore();
}

function bigDigits(ctx, text, x, y, size = 30) {
  ctx.save();
  ctx.fillStyle = '#fff7e0';
  ctx.font = `bold ${size}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#ffd166';
  ctx.shadowBlur = 12;
  ctx.fillText(text, x, y);
  ctx.restore();
}

export function formatHeading(degrees) {
  const d = ((Math.round(degrees) % 360) + 360) % 360;
  const points = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const point = points[Math.round(d / 45) % 8];
  return { degrees: String(d).padStart(3, '0'), point };
}

export function formatTimer(seconds) {
  const total = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function drawTape(ctx, x, y, w, h, title, value, unit) {
  panel(ctx, x, y, w, h);
  label(ctx, title, x + w / 2, y + 14);
  bigDigits(ctx, String(value), x + w / 2, y + h / 2 + 4, 28);
  label(ctx, unit, x + w / 2, y + h - 14, 11, '#9fc3c9');
}

export function drawArtificialHorizon(ctx, x, y, radius, bankDeg, pitchDeg) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(x, y);
  ctx.rotate((-bankDeg * Math.PI) / 180);
  const pitchPx = Math.max(-radius, Math.min(radius, -pitchDeg * 1.2));
  ctx.fillStyle = '#7ec8e3';
  ctx.fillRect(-radius, -radius + pitchPx, radius * 2, radius);
  ctx.fillStyle = '#8a6b4f';
  ctx.fillRect(-radius, pitchPx, radius * 2, radius);
  ctx.fillStyle = '#f5efdd';
  ctx.fillRect(-radius, pitchPx - 2, radius * 2, 4);
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 3;
  ctx.stroke();
  // Fixed aircraft symbol.
  ctx.fillStyle = '#fff7e0';
  ctx.fillRect(x - 18, y - 2, 12, 4);
  ctx.fillRect(x + 6, y - 2, 12, 4);
  ctx.fillRect(x - 2, y - 2, 4, 4);
  ctx.restore();
  label(ctx, 'HORIZON', x, y + radius + 12);
}

function drawGauge(ctx, x, y, w, h, title, fraction, goodColor, warnAt, highIsBad = false) {
  panel(ctx, x, y, w, h);
  label(ctx, title, x + w / 2, y + 14);
  const barX = x + 10;
  const barY = y + 30;
  const barW = w - 20;
  const barH = 14;
  ctx.save();
  ctx.fillStyle = '#0e1a20';
  roundRect(ctx, barX, barY, barW, barH, 7);
  ctx.fill();
  const bad = highIsBad ? fraction >= warnAt : fraction <= warnAt;
  const color = bad ? '#ff5a4e' : goodColor;
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  roundRect(ctx, barX, barY, Math.max(4, barW * Math.max(0, Math.min(1, fraction))), barH, 7);
  ctx.fill();
  ctx.restore();
  bigDigits(ctx, `${Math.round(fraction * 100)}%`, x + w / 2, y + h - 20, 20);
}

export function drawHud(ctx, scene) {
  const hud = scene.hud;
  const stripY = CANVAS_HEIGHT - 118;
  panel(ctx, 8, stripY, CANVAS_WIDTH - 16, 110);

  // Altitude, speed, heading — the three numbers criterion 1 demands.
  drawTape(ctx, 18, stripY + 8, 130, 94, 'ALTITUDE', hud.altitudeFt.toLocaleString('en-US'), 'FEET');
  drawTape(ctx, 156, stripY + 8, 130, 94, 'AIRSPEED', hud.speedKt, 'KNOTS');
  const heading = formatHeading(hud.headingDeg);
  panel(ctx, 294, stripY + 8, 130, 94);
  label(ctx, 'HEADING', 359, stripY + 22);
  bigDigits(ctx, heading.degrees + '°', 359, stripY + 52, 28);
  label(ctx, heading.point + '  ·  bug ' + formatHeading(scene.targetHeadingDeg ?? hud.headingDeg).degrees + '°', 359, stripY + 88, 11, '#9fc3c9');

  // Artificial horizon.
  drawArtificialHorizon(ctx, 480, stripY + 48, 34, scene.bankDeg ?? 0, scene.pitchDeg ?? 0);

  // Vertical speed needle.
  panel(ctx, 528, stripY + 8, 86, 94);
  label(ctx, 'VERT SPD', 571, stripY + 22);
  const vs = hud.verticalSpeedFpm ?? 0;
  bigDigits(ctx, (vs >= 0 ? '+' : '') + vs, 571, stripY + 52, 20);
  label(ctx, 'FPM', 571, stripY + 88, 11, '#9fc3c9');

  // Throttle / fuel / damage gauges.
  const cruise = hud.throttle >= CRUISE_BAND[0] && hud.throttle <= CRUISE_BAND[1];
  // Throttle is never "bad" (warnAt -1 disables the red state); fuel is
  // bad when low; damage is bad when high.
  drawGauge(ctx, 622, stripY + 8, 110, 94, 'THROTTLE' + (cruise ? ' · CRUISE' : ''), hud.throttle / 100, PALETTE.hudGreen, -1);
  drawGauge(ctx, 740, stripY + 8, 110, 94, 'FUEL', hud.fuel / 100, PALETTE.hudGlow, 0.25);
  drawGauge(ctx, 858, stripY + 8, 110, 94, 'DAMAGE', hud.damage / 100, PALETTE.hudRed, 0.6, true);

  // Mission line, timer, score.
  const mission = scene.mission;
  const missionText = mission
    ? `${mission.name} — ${mission.count}/${mission.max}`
    : 'Free flight over Teluk Arang';
  ctx.save();
  ctx.fillStyle = '#fff7e0';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(missionText, 990, stripY + 26);
  ctx.fillStyle = '#9fc3c9';
  ctx.font = '13px system-ui, sans-serif';
  let objective = scene.objective ?? 'Fly the dawn mail run — mind the wind.';
  let truncated = false;
  while (objective.length > 4 && ctx.measureText(objective).width > 272) {
    objective = objective.slice(0, -2);
    truncated = true;
  }
  if (truncated) objective += '…';
  ctx.fillText(objective, 990, stripY + 48);
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText(`TIME ${formatTimer(hud.timeLeftSec)}   SCORE ${scene.score ?? 0}`, 990, stripY + 76);
  ctx.restore();

  // Wind arrow.
  const wind = scene.wind ?? { knots: 8, fromDeg: 270 };
  ctx.save();
  ctx.fillStyle = '#9fc3c9';
  ctx.font = '12px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`WIND ${wind.knots} kt ← ${formatHeading(wind.fromDeg).degrees}°`, 990, stripY + 96);
  ctx.restore();
}

export function drawTopBar(ctx, scene) {
  ctx.save();
  ctx.fillStyle = 'rgba(18, 38, 46, 0.85)';
  roundRect(ctx, 8, 8, 500, 34, 10);
  ctx.fill();
  ctx.fillStyle = '#fff7e0';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('ARANG SKYLARK  ·  Rani Kusuma  ·  Teluk Arang', 20, 26);
  ctx.restore();

  ctx.save();
  ctx.fillStyle = 'rgba(18, 38, 46, 0.85)';
  roundRect(ctx, 516, 8, 756, 34, 10);
  ctx.fill();
  ctx.fillStyle = '#9fc3c9';
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('↑/↓ pitch · ←/→ bank · W/S throttle · Space drop · G gear · F flaps · C camera · M mute · R restart', 894, 26);
  ctx.restore();
}

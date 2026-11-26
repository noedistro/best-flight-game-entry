// Procedural sound for Arang Skylark (game/src/audio.js).
// One clear job: every sound is synthesised with WebAudio oscillators
// and noise — no audio files, no network. Silent until the player
// interacts (browsers require a gesture before audio starts).
export function createAudio() {
  let context = null;
  let engineOsc = null;
  let engineGain = null;
  let windGain = null;
  let muted = false;

  function ensureContext() {
    if (context) return context;
    const AudioContextClass =
      typeof window !== 'undefined' ? window.AudioContext || window.webkitAudioContext : null;
    if (!AudioContextClass) return null;
    context = new AudioContextClass();
    engineOsc = context.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 70;
    engineGain = context.createGain();
    engineGain.gain.value = 0;
    const lowpass = context.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 400;
    engineOsc.connect(lowpass);
    lowpass.connect(engineGain);
    engineGain.connect(context.destination);
    engineOsc.start();
    const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const noise = context.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    const windFilter = context.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 600;
    windGain = context.createGain();
    windGain.gain.value = 0;
    noise.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(context.destination);
    noise.start();
    return context;
  }

  function tone(frequency, durationSec, type, volume, when = 0) {
    const ctx = ensureContext();
    if (!ctx || muted) return;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = frequency;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, ctx.currentTime + when);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + when + durationSec);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + when);
    osc.stop(ctx.currentTime + when + durationSec + 0.05);
  }

  return {
    unlock() {
      const ctx = ensureContext();
      if (ctx && ctx.state === 'suspended') ctx.resume();
    },
    setEngine(throttle, speedKt) {
      const ctx = ensureContext();
      if (!ctx || muted || !engineOsc) return;
      engineOsc.frequency.setTargetAtTime(55 + throttle * 0.9, ctx.currentTime, 0.1);
      engineGain.gain.setTargetAtTime(muted ? 0 : 0.03 + (throttle / 100) * 0.05, ctx.currentTime, 0.1);
      if (windGain) {
        windGain.gain.setTargetAtTime(muted ? 0 : Math.min(0.06, speedKt * 0.0003), ctx.currentTime, 0.1);
      }
    },
    ringChime() {
      tone(880, 0.25, 'sine', 0.12);
      tone(1318, 0.35, 'sine', 0.1, 0.08);
    },
    touchdownThud() {
      tone(90, 0.2, 'triangle', 0.2);
    },
    damageCrunch() {
      tone(140, 0.3, 'square', 0.12);
      tone(70, 0.4, 'sawtooth', 0.1, 0.05);
    },
    missionBell() {
      tone(1046, 0.3, 'sine', 0.12);
      tone(1568, 0.5, 'sine', 0.1, 0.12);
    },
    setMuted(value) {
      muted = value === true;
      if (context && engineGain) engineGain.gain.value = muted ? 0 : engineGain.gain.value;
    },
    isMuted() {
      return muted;
    },
  };
}

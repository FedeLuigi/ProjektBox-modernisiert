/**
 * Prozedurale Web-Audio-Sound-Engine für Zombie Arena 3D.
 * Benötigt keine externen MP3/WAV-Dateien und funktioniert offline auf TV & Smartphones.
 */

let audioCtx: AudioContext | null = null;
let noiseBuffer: AudioBuffer | null = null;
const lastPlayedAt: Record<string, number> = {};

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    audioCtx = new Ctor();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) {
    return noiseBuffer;
  }
  const len = ctx.sampleRate * 0.6;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  noiseBuffer = buf;
  return buf;
}

function canPlay(key: string, minIntervalMs: number): boolean {
  const now = performance.now();
  const prev = lastPlayedAt[key] || 0;
  if (now - prev < minIntervalMs) return false;
  lastPlayedAt[key] = now;
  return true;
}

export function playWeaponShotSound(weaponId: string): void {
  if (!canPlay(`shot_${weaponId}`, 45)) return;
  const ctx = getCtx();
  if (!ctx) return;

  const t = ctx.currentTime;

  if (weaponId === 'plasma') {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(980, t);
    osc.frequency.exponentialRampToValueAtTime(220, t + 0.14);
    gain.gain.setValueAtTime(0.11, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.15);
    return;
  }

  // Noise burst for ballistic / rocket weapons
  const src = ctx.createBufferSource();
  src.buffer = getNoiseBuffer(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  const gain = ctx.createGain();

  const dur =
    weaponId === 'shotgun'
      ? 0.22
      : weaponId === 'rocket'
        ? 0.34
        : weaponId === 'rifle'
          ? 0.12
          : 0.09;
  const freq =
    weaponId === 'shotgun'
      ? 700
      : weaponId === 'rocket'
        ? 420
        : weaponId === 'smg'
          ? 1500
          : 1150;
  const vol = weaponId === 'shotgun' || weaponId === 'rocket' ? 0.18 : 0.11;

  filter.frequency.setValueAtTime(freq, t);
  filter.frequency.exponentialRampToValueAtTime(180, t + dur);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

  src.connect(filter).connect(gain).connect(ctx.destination);
  src.start(t);
  src.stop(t + dur);

  // Low punch
  const punch = ctx.createOscillator();
  const pGain = ctx.createGain();
  punch.type = 'triangle';
  punch.frequency.setValueAtTime(weaponId === 'shotgun' ? 150 : 190, t);
  punch.frequency.exponentialRampToValueAtTime(45, t + 0.08);
  pGain.gain.setValueAtTime(0.14, t);
  pGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
  punch.connect(pGain).connect(ctx.destination);
  punch.start(t);
  punch.stop(t + 0.08);
}

export function playExplosionSound(): void {
  if (!canPlay('explosion', 90)) return;
  const ctx = getCtx();
  if (!ctx) return;

  const t = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = getNoiseBuffer(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(620, t);
  filter.frequency.exponentialRampToValueAtTime(75, t + 0.52);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.28, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);

  src.connect(filter).connect(gain).connect(ctx.destination);
  src.start(t);
  src.stop(t + 0.55);
}

export function playZombieHitSound(): void {
  if (!canPlay('hit', 55)) return;
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(210, t);
  osc.frequency.exponentialRampToValueAtTime(85, t + 0.055);
  gain.gain.setValueAtTime(0.06, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.06);
}

export function playDashSound(): void {
  if (!canPlay('dash', 150)) return;
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(260, t);
  osc.frequency.exponentialRampToValueAtTime(620, t + 0.12);
  gain.gain.setValueAtTime(0.08, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.13);
}

export function playWaveStartSound(): void {
  if (!canPlay('wave', 500)) return;
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(220, t);
  osc.frequency.linearRampToValueAtTime(340, t + 0.25);
  osc.frequency.linearRampToValueAtTime(190, t + 0.55);
  gain.gain.setValueAtTime(0.001, t);
  gain.gain.linearRampToValueAtTime(0.08, t + 0.12);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.58);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.58);
}

export function playReviveSound(): void {
  if (!canPlay('revive', 300)) return;
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  [440, 554, 659].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t + i * 0.07);
    gain.gain.setValueAtTime(0.09, t + i * 0.07);
    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.07 + 0.16);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t + i * 0.07);
    osc.stop(t + i * 0.07 + 0.16);
  });
}

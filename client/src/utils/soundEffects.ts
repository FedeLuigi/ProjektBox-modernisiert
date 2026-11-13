import { STORAGE_KEYS } from './userProfile';

let audioCtx: AudioContext | null = null;

function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const val = localStorage.getItem(STORAGE_KEYS.SOUND_ENABLED);
    return val !== null ? val === 'true' : true;
  } catch {
    return true;
  }
}

function isVibrationEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const val = localStorage.getItem(STORAGE_KEYS.VIBRATION_ENABLED);
    return val !== null ? val === 'true' : true;
  } catch {
    return true;
  }
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (Ctx) {
      try {
        audioCtx = new Ctx();
      } catch {
        return null;
      }
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function triggerHapticFeedback(pattern: number | number[] = 10) {
  if (!isVibrationEnabled()) return;
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    // ignore
  }
}

function playTone(
  freq: number,
  durationSec: number,
  type: OscillatorType = 'sine',
  gainPeak = 0.07,
  delaySec = 0,
  endFreq?: number
) {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime + delaySec;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq && endFreq !== freq) {
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + durationSec);
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainPeak, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + durationSec + 0.01);
  } catch {
    // ignore audio errors on restricted devices
  }
}

/** Dezenter Klick/Pop bei Zügen, Karten-Umdrehen oder Richtungswechsel */
export function playMoveSound() {
  triggerHapticFeedback(8);
  playTone(420, 0.055, 'triangle', 0.055, 0, 560);
}

/** Positiver Klang bei Treffer, Paar-Match, Apfel, Kachel-Fusion oder Punktgewinn */
export function playScoreSound(combo = 1) {
  triggerHapticFeedback(14);
  const base = Math.min(880, 520 + (combo - 1) * 55);
  playTone(base, 0.09, 'triangle', 0.075, 0, base * 1.25);
  playTone(base * 1.25, 0.12, 'sine', 0.065, 0.055, base * 1.5);
}

/** Motivations-Akkord bei Rundensieg oder neuem Rekord */
export function playWinSound() {
  triggerHapticFeedback([18, 40, 25]);
  playTone(523.25, 0.11, 'triangle', 0.08, 0);
  playTone(659.25, 0.11, 'triangle', 0.08, 0.08);
  playTone(783.99, 0.18, 'sine', 0.09, 0.16);
  playTone(1046.5, 0.26, 'sine', 0.08, 0.25);
}

/** Dezenter tiefer Ton bei Fehler, Kollision, Mine oder Frühstart */
export function playErrorSound() {
  triggerHapticFeedback([25, 30, 25]);
  playTone(240, 0.14, 'sawtooth', 0.055, 0, 140);
  playTone(165, 0.18, 'triangle', 0.06, 0.09, 110);
}

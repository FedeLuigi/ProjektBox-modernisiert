import { STORAGE_KEYS } from './userProfile';

let audioCtx: AudioContext | null = null;
let bgLoopTimer: number | null = null;
let bgMasterGain: GainNode | null = null;
let bgStepIndex = 0;
let bgActive = false;

export function isSoundEnabled(): boolean {
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
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
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

/** Taktiler, moderner UI-Tastensound für Buttons & Menüs */
export function playButtonClickSound() {
  if (!isSoundEnabled()) return;
  triggerHapticFeedback(6);
  // Warmes kurzes Klick-Fundament + heller Kristall-Akzent
  playTone(260, 0.038, 'sine', 0.045, 0, 140);
  playTone(690, 0.042, 'triangle', 0.04, 0.004, 920);
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

/* ─── Dezenter Lounge-/Party-Hintergrundsound (Web Audio API) ─── */

// 32-Step Arpeggio- & Bass-Sequenz (Cmaj9 -> Am9 -> Fmaj9 -> G6)
const BG_CHORDS: { bass: number; arp: number[] }[] = [
  { bass: 130.81, arp: [261.63, 329.63, 392.0, 493.88, 587.33, 493.88, 392.0, 329.63] }, // Cmaj9
  { bass: 110.0, arp: [220.0, 261.63, 329.63, 392.0, 493.88, 392.0, 329.63, 261.63] }, // Am9
  { bass: 87.31, arp: [174.61, 220.0, 261.63, 329.63, 392.0, 329.63, 261.63, 220.0] }, // Fmaj9
  { bass: 98.0, arp: [196.0, 246.94, 293.66, 329.63, 392.0, 329.63, 293.66, 246.94] }, // G6
];

function triggerBgStep() {
  if (!bgActive || !isSoundEnabled()) return;
  if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;

  const ctx = getAudioContext();
  if (!ctx || !bgMasterGain) return;
  if (ctx.state === 'suspended') return;

  try {
    const chordIdx = Math.floor(bgStepIndex / 8) % BG_CHORDS.length;
    const noteIdx = bgStepIndex % 8;
    const chord = BG_CHORDS[chordIdx];
    const now = ctx.currentTime;

    // Warmer Sub-Pad-Ton zu Beginn jedes Taktes
    if (noteIdx === 0) {
      const padOsc = ctx.createOscillator();
      const padGain = ctx.createGain();
      const padFilter = ctx.createBiquadFilter();

      padOsc.type = 'triangle';
      padOsc.frequency.setValueAtTime(chord.bass, now);
      padFilter.type = 'lowpass';
      padFilter.frequency.setValueAtTime(420, now);

      padGain.gain.setValueAtTime(0.0001, now);
      padGain.gain.linearRampToValueAtTime(0.45, now + 0.35);
      padGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);

      padOsc.connect(padFilter);
      padFilter.connect(padGain);
      padGain.connect(bgMasterGain);

      padOsc.start(now);
      padOsc.stop(now + 2.25);
    }

    // Sanftes Lounge-Pluck-Arpeggio
    const arpFreq = chord.arp[noteIdx];
    const arpOsc = ctx.createOscillator();
    const arpGain = ctx.createGain();
    const arpFilter = ctx.createBiquadFilter();

    arpOsc.type = noteIdx % 2 === 0 ? 'sine' : 'triangle';
    arpOsc.frequency.setValueAtTime(arpFreq, now);
    arpFilter.type = 'lowpass';
    arpFilter.frequency.setValueAtTime(980, now);

    arpGain.gain.setValueAtTime(0.0001, now);
    arpGain.gain.linearRampToValueAtTime(0.24, now + 0.025);
    arpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);

    arpOsc.connect(arpFilter);
    arpFilter.connect(arpGain);
    arpGain.connect(bgMasterGain);

    arpOsc.start(now);
    arpOsc.stop(now + 0.45);

    bgStepIndex = (bgStepIndex + 1) % (BG_CHORDS.length * 8);
  } catch {
    // ignore audio errors
  }
}

export function startBackgroundMusic() {
  if (typeof window === 'undefined' || !isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  if (!bgMasterGain) {
    bgMasterGain = ctx.createGain();
    bgMasterGain.gain.setValueAtTime(0.042, ctx.currentTime);
    bgMasterGain.connect(ctx.destination);
  } else {
    bgMasterGain.gain.setTargetAtTime(0.042, ctx.currentTime, 0.12);
  }

  if (bgActive) return;
  bgActive = true;
  triggerBgStep();
  bgLoopTimer = window.setInterval(triggerBgStep, 300);
}

export function stopBackgroundMusic() {
  bgActive = false;
  if (bgLoopTimer !== null) {
    window.clearInterval(bgLoopTimer);
    bgLoopTimer = null;
  }
  if (audioCtx && bgMasterGain) {
    try {
      bgMasterGain.gain.setTargetAtTime(0.0001, audioCtx.currentTime, 0.08);
    } catch {
      // ignore
    }
  }
}

export function syncBackgroundMusic(enabled: boolean) {
  if (enabled) {
    startBackgroundMusic();
  } else {
    stopBackgroundMusic();
  }
}

/**
 * Registriert einmalig globale Audio-Handler:
 * - Spielt beim Klick auf Buttons den Tastensound ab
 * - Startet die Hintergrundmusik beim ersten Benutzer-Tap (Browser-Autoplay-konform)
 * - Pausiert/setzt fort bei Tab-Wechsel
 */
export function installGlobalAudioHandlers(): () => void {
  if (typeof window === 'undefined') return () => {};

  const handlePointerDown = (e: PointerEvent) => {
    if (isSoundEnabled()) {
      startBackgroundMusic();
    }

    const target = e.target;
    if (!(target instanceof Element)) return;
    const btn = target.closest('button, [role="button"], [role="switch"]');
    if (!btn) return;
    if ((btn as HTMLButtonElement).disabled) return;
    if (btn.getAttribute('aria-disabled') === 'true') return;
    if (btn.getAttribute('data-no-click-sound') === 'true') return;

    playButtonClickSound();
  };

  const handleVisibility = () => {
    if (document.visibilityState === 'visible' && isSoundEnabled()) {
      const ctx = getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    if (isSoundEnabled()) {
      startBackgroundMusic();
    }
    const active = document.activeElement;
    if (!(active instanceof Element)) return;
    const btn = active.closest('button, [role="button"], [role="switch"]');
    if (!btn) return;
    if ((btn as HTMLButtonElement).disabled) return;
    if (btn.getAttribute('aria-disabled') === 'true') return;
    if (btn.getAttribute('data-no-click-sound') === 'true') return;
    playButtonClickSound();
  };

  document.addEventListener('pointerdown', handlePointerDown, { capture: true });
  document.addEventListener('keydown', handleKeyDown, { capture: true });
  document.addEventListener('visibilitychange', handleVisibility);

  return () => {
    document.removeEventListener('pointerdown', handlePointerDown, { capture: true });
    document.removeEventListener('keydown', handleKeyDown, { capture: true });
    document.removeEventListener('visibilitychange', handleVisibility);
    stopBackgroundMusic();
  };
}

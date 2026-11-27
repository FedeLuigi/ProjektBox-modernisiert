// Procedural Web Audio API casino sound effects for Roulette
import { isSoundEnabled } from '../../../utils/soundEffects';

class RouletteAudio {
  private ctx: AudioContext | null = null;
  public muted = false;

  private ensureContext(): AudioContext | null {
    if (this.muted || !isSoundEnabled() || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public playChipPlace(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const t = ctx.currentTime;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1180 + Math.random() * 140, t);
    osc.frequency.exponentialRampToValueAtTime(620, t + 0.045);
    gain.gain.setValueAtTime(0.11, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.055);
  }

  public playBallTick(pitchFactor = 1): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const t = ctx.currentTime;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1450 * pitchFactor, t);
    osc.frequency.exponentialRampToValueAtTime(780, t + 0.025);
    gain.gain.setValueAtTime(0.045, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.032);
  }

  public playPocketSettle(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    [523.25, 659.25, 783.99].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = ctx.currentTime + idx * 0.06;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.2);
    });
  }
}

export const rouletteAudio = new RouletteAudio();

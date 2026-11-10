import { useEffect, useRef, useState } from 'react';

interface SplashScreenProps {
  onFinish?: () => void;
}

// ─── Partikel-Typen für Haupt-Canvas (Komet & Explosion) ───
interface FXParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  decay: number;
  color: string;
}

interface SmokePuff {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  decay: number;
  color: string;
}

interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  speed: number;
  color: string;
}

interface Comet {
  startX: number;
  startY: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  progress: number;
  rotation: number;
  duration: number;
}

// ─── Partikel-Typ für TV Rennspiel (Drift-Rauch & Funken) ───
interface TVSmokeParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  decay: number;
  color: string;
}

export function SplashScreen({ onFinish }: SplashScreenProps) {
  const fxCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const tvCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneContainerRef = useRef<HTMLDivElement | null>(null);

  // Status für Timing & Phasen
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [flashActive, setFlashActive] = useState(false);
  const [screenShaking, setScreenShaking] = useState(false);
  const [sceneRevealed, setSceneRevealed] = useState(false);
  const [logoRevealed, setLogoRevealed] = useState(false);

  // Refs für Animation & Timer
  const animPhaseRef = useRef<'comet' | 'explosion' | 'scene'>('comet');
  const animationFrameIdRef = useRef<number | null>(null);
  const finishTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Asteroidenkern Geometrie
  const rockVerticesRef = useRef<{ x: number; y: number }[]>([]);
  if (rockVerticesRef.current.length === 0) {
    const count = 14;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radiusJitter = 12 + Math.sin(i * 3) * 3 + Math.cos(i * 5) * 2;
      rockVerticesRef.current.push({
        x: Math.cos(angle) * radiusJitter,
        y: Math.sin(angle) * radiusJitter,
      });
    }
  }

  // Sanftes Ausblenden und Wechsel zum Hauptmenü
  const triggerFadeOut = () => {
    setIsFadingOut(true);
    fadeTimeoutRef.current = setTimeout(() => {
      setIsDone(true);
      onFinish?.();
    }, 800);
  };

  // ─── Haupt-Animationsschleife (FX Canvas + TV Rennspiel + Ambilight Sync) ───
  useEffect(() => {
    const fxCanvas = fxCanvasRef.current;
    const tvCanvas = tvCanvasRef.current;
    if (!fxCanvas) return;

    const fxCtx = fxCanvas.getContext('2d');
    const tvCtx = tvCanvas ? tvCanvas.getContext('2d') : null;
    if (!fxCtx) return;

    let w = (fxCanvas.width = window.innerWidth);
    let h = (fxCanvas.height = window.innerHeight);

    const handleResize = () => {
      if (!fxCanvas) return;
      w = fxCanvas.width = window.innerWidth;
      h = fxCanvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const particles: FXParticle[] = [];
    const smokePuffs: SmokePuff[] = [];
    const shockwaves: Shockwave[] = [];
    const tvSmoke: TVSmokeParticle[] = [];

    // Komet zielt auf das mittlere TV-Zentrum
    const targetX = w / 2;
    const targetY = h * 0.40;

    const comet: Comet = {
      startX: -100,
      startY: -100,
      x: -100,
      y: -100,
      targetX,
      targetY,
      progress: 0,
      rotation: 0,
      duration: 1350, // 1,35 Sekunden kraftvoller Hyperschall-Anflug
    };

    const startTime = performance.now();

    // ─── Explosion beim Kometeneinschlag erzeugen ───
    const triggerImpactExplosion = (x: number, y: number) => {
      const maxScreenDim = Math.max(w, h);

      // Schockwellen
      shockwaves.push({
        x,
        y,
        radius: 10,
        maxRadius: maxScreenDim * 0.85,
        alpha: 1,
        speed: 24,
        color: '#f59e0b',
      });
      shockwaves.push({
        x,
        y,
        radius: 6,
        maxRadius: maxScreenDim * 0.65,
        alpha: 1,
        speed: 18,
        color: '#f43f5e',
      });
      shockwaves.push({
        x,
        y,
        radius: 2,
        maxRadius: maxScreenDim * 0.45,
        alpha: 1,
        speed: 12,
        color: '#38bdf8',
      });

      // Funken & brennende Asteroidensplitter
      const colors = ['#ffffff', '#fef08a', '#f59e0b', '#ef4444', '#7c2d12', '#38bdf8'];
      for (let i = 0; i < 140; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 18 + 2;
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: Math.random() * 5 + 1.5,
          alpha: 1,
          decay: Math.random() * 0.02 + 0.01,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }

      // Rauchschwaden
      for (let i = 0; i < 30; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 0.5;
        smokePuffs.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.5,
          radius: Math.random() * 22 + 12,
          alpha: 0.8,
          decay: 0.012,
          color:
            Math.random() > 0.5
              ? 'rgba(239, 68, 68, 0.45)'
              : 'rgba(30, 27, 46, 0.65)',
        });
      }

      // Blitzen & Bildbeben
      setFlashActive(true);
      setTimeout(() => setFlashActive(false), 180);

      setScreenShaking(true);
      setTimeout(() => setScreenShaking(false), 550);

      // Wohnzimmer-Szene mit TV enthüllen (nach dem Einschlag)
      setTimeout(() => {
        setSceneRevealed(true);
      }, 200);

      // "Spielbox" Typografie erst in den letzten 1,5 Sekunden einblenden
      // Gesamtdauer: 7.7s -> Logo erscheint bei 6.2s (genau 1.5s vor Start des Fade-Outs)
      logoTimeoutRef.current = setTimeout(() => {
        setLogoRevealed(true);
      }, 4850);

      // Sanfter Fade-Out Übergang nach 6.35s (Gesamtzeit bis Menü: ca. 7.7s)
      finishTimeoutRef.current = setTimeout(() => {
        triggerFadeOut();
      }, 6350);
    };

    // ─── Rendering des flüssigen 60 FPS Rennspiels auf dem TV ───
    const renderTVRaceGame = (ctx: CanvasRenderingContext2D, elapsedSec: number) => {
      const tvW = ctx.canvas.width;
      const tvH = ctx.canvas.height;
      const horizonY = Math.round(tvH * 0.48);

      ctx.clearRect(0, 0, tvW, tvH);

      // 1. Synthwave Himmel
      const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
      skyGrad.addColorStop(0, '#090417');
      skyGrad.addColorStop(0.45, '#220938');
      skyGrad.addColorStop(0.75, '#be123c');
      skyGrad.addColorStop(1, '#f59e0b');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, tvW, horizonY);

      // 2. Retro-Sonne am Horizont
      ctx.save();
      ctx.fillStyle = '#fbbf24';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(tvW / 2, horizonY, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Horizontale Linienstreifen durch die Sonne
      ctx.fillStyle = '#220938';
      ctx.fillRect(tvW / 2 - 36, horizonY - 20, 72, 2);
      ctx.fillRect(tvW / 2 - 34, horizonY - 13, 68, 2.5);
      ctx.fillRect(tvW / 2 - 30, horizonY - 6, 60, 3);
      ctx.fillRect(tvW / 2 - 26, horizonY, 52, 3.5);
      ctx.restore();

      // 3. Neon-Berge / Skyline-Silhouette
      ctx.fillStyle = '#140624';
      ctx.beginPath();
      ctx.moveTo(0, horizonY);
      ctx.lineTo(tvW * 0.12, horizonY - 24);
      ctx.lineTo(tvW * 0.24, horizonY);
      ctx.lineTo(tvW * 0.38, horizonY - 32);
      ctx.lineTo(tvW * 0.50, horizonY);
      ctx.lineTo(tvW * 0.64, horizonY - 28);
      ctx.lineTo(tvW * 0.78, horizonY);
      ctx.lineTo(tvW * 0.90, horizonY - 20);
      ctx.lineTo(tvW, horizonY);
      ctx.closePath();
      ctx.fill();

      // 4. 3D-Perspektive Rennstrecken-Asphalt
      const roadGrad = ctx.createLinearGradient(0, horizonY, 0, tvH);
      roadGrad.addColorStop(0, '#151026');
      roadGrad.addColorStop(1, '#05040a');
      ctx.fillStyle = roadGrad;
      ctx.beginPath();
      ctx.moveTo(tvW * 0.38, horizonY);
      ctx.lineTo(tvW * 0.62, horizonY);
      ctx.lineTo(tvW * 0.98, tvH);
      ctx.lineTo(tvW * 0.02, tvH);
      ctx.closePath();
      ctx.fill();

      // 5. Animierte Curbs
      const curbSpeed = 16;
      const trackOffset = (elapsedSec * curbSpeed) % 1;
      const numSegments = 14;

      for (let i = 0; i < numSegments; i++) {
        const p0 = Math.pow((i + trackOffset) / numSegments, 2.2);
        const p1 = Math.pow((i + 1 + trackOffset) / numSegments, 2.2);

        const y0 = horizonY + (tvH - horizonY) * p0;
        const y1 = horizonY + (tvH - horizonY) * p1;

        const leftOuter0 = tvW * 0.38 - (tvW * 0.37) * p0;
        const leftInner0 = tvW * 0.38 - (tvW * 0.34) * p0;
        const leftOuter1 = tvW * 0.38 - (tvW * 0.37) * p1;
        const leftInner1 = tvW * 0.38 - (tvW * 0.34) * p1;

        const isAlt = (i + Math.floor(elapsedSec * curbSpeed)) % 2 === 0;

        ctx.fillStyle = isAlt ? '#f43f5e' : '#ffffff';
        ctx.beginPath();
        ctx.moveTo(leftOuter0, y0);
        ctx.lineTo(leftInner0, y0);
        ctx.lineTo(leftInner1, y1);
        ctx.lineTo(leftOuter1, y1);
        ctx.closePath();
        ctx.fill();

        const rightInner0 = tvW * 0.62 + (tvW * 0.34) * p0;
        const rightOuter0 = tvW * 0.62 + (tvW * 0.37) * p0;
        const rightInner1 = tvW * 0.62 + (tvW * 0.34) * p1;
        const rightOuter1 = tvW * 0.62 + (tvW * 0.37) * p1;

        ctx.fillStyle = isAlt ? '#38bdf8' : '#ffffff';
        ctx.beginPath();
        ctx.moveTo(rightInner0, y0);
        ctx.lineTo(rightOuter0, y0);
        ctx.lineTo(rightOuter1, y1);
        ctx.lineTo(rightInner1, y1);
        ctx.closePath();
        ctx.fill();

        if (isAlt) {
          const centerY0 = y0;
          const centerY1 = y1;
          const centerWidth = 1.2 + p1 * 4;

          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.moveTo(tvW / 2 - centerWidth / 2, centerY0);
          ctx.lineTo(tvW / 2 + centerWidth / 2, centerY0);
          ctx.lineTo(tvW / 2 + centerWidth / 2, centerY1);
          ctx.lineTo(tvW / 2 - centerWidth / 2, centerY1);
          ctx.closePath();
          ctx.fill();
        }
      }

      // 6. Die 3 driftenden Sportwagen zeichnen
      const t = elapsedSec;

      // ─── CAR 1: CYAN DRIFT CAR (Links) ───
      const c1Phase = t * 2.3;
      const c1X = tvW * 0.22 + Math.sin(c1Phase) * 22 + Math.cos(c1Phase * 1.5) * 6;
      const c1Y = tvH * 0.76 + Math.sin(t * 30) * 0.5;
      const c1Tilt = Math.cos(c1Phase) * 0.14;

      ctx.save();
      ctx.translate(c1X, c1Y);
      ctx.rotate(c1Tilt);
      ctx.fillStyle = '#030712';
      ctx.fillRect(-4, 11, 4, 8);
      ctx.fillRect(34, 11, 4, 8);
      ctx.fillStyle = '#082f49';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(7, 0);
      ctx.lineTo(27, 0);
      ctx.lineTo(34, 18);
      ctx.lineTo(0, 18);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(10, 2);
      ctx.lineTo(24, 2);
      ctx.lineTo(27, 10);
      ctx.lineTo(7, 10);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(2, 15, 30, 2.5);
      const c1Flame = 20 + Math.random() * 7;
      ctx.beginPath();
      ctx.moveTo(13, 18);
      ctx.lineTo(17, c1Flame);
      ctx.lineTo(21, 18);
      ctx.closePath();
      ctx.fill();

      if (Math.abs(Math.cos(c1Phase)) > 0.45 && Math.random() > 0.4) {
        tvSmoke.push({
          x: c1X + 17,
          y: c1Y + 18,
          vx: -Math.cos(c1Phase) * 1.4,
          vy: 1.5,
          size: Math.random() * 3.5 + 1.5,
          alpha: 0.7,
          decay: 0.05,
          color: Math.random() > 0.3 ? '#38bdf8' : '#ffffff',
        });
      }
      ctx.restore();

      // ─── CAR 2: PINK/RED GT SUPERCAR (Mitte) ───
      const c2Phase = t * 1.8 + 1.2;
      const c2X = tvW * 0.48 + Math.sin(c2Phase) * 30 + Math.sin(c2Phase * 2.1) * 7;
      const c2Y = tvH * 0.65 + Math.sin(t * 32) * 0.5;
      const c2Tilt = Math.cos(c2Phase) * 0.16;

      ctx.save();
      ctx.translate(c2X, c2Y);
      ctx.rotate(c2Tilt);
      ctx.fillStyle = '#be123c';
      ctx.fillRect(3, -3, 32, 2.5);
      ctx.fillStyle = '#000000';
      ctx.fillRect(-4, 12, 4, 9);
      ctx.fillRect(38, 12, 4, 9);
      ctx.fillStyle = '#4c0519';
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(8, 2);
      ctx.lineTo(30, 2);
      ctx.lineTo(38, 20);
      ctx.lineTo(0, 20);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.moveTo(12, 4);
      ctx.lineTo(26, 4);
      ctx.lineTo(31, 12);
      ctx.lineTo(7, 12);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fda4af';
      ctx.fillRect(2, 18, 34, 2.5);
      ctx.fillStyle = '#fbbf24';
      const c2Flame = 22 + Math.random() * 9;
      ctx.beginPath();
      ctx.moveTo(14, 20);
      ctx.lineTo(19, c2Flame);
      ctx.lineTo(24, 20);
      ctx.closePath();
      ctx.fill();

      if (Math.abs(Math.cos(c2Phase)) > 0.4 && Math.random() > 0.4) {
        tvSmoke.push({
          x: c2X + 19,
          y: c2Y + 20,
          vx: -Math.cos(c2Phase) * 1.6,
          vy: 1.7,
          size: Math.random() * 4 + 1.8,
          alpha: 0.75,
          decay: 0.05,
          color: Math.random() > 0.4 ? '#f43f5e' : '#fbbf24',
        });
      }
      ctx.restore();

      // ─── CAR 3: ORANGE/PURPLE SPEED RACER (Rechts) ───
      const c3Phase = t * 2.6 + 2.5;
      const c3X = tvW * 0.74 + Math.sin(c3Phase) * 24 + Math.cos(c3Phase * 1.7) * 6;
      const c3Y = tvH * 0.73 + Math.sin(t * 29) * 0.5;
      const c3Tilt = Math.cos(c3Phase) * 0.14;

      ctx.save();
      ctx.translate(c3X, c3Y);
      ctx.rotate(c3Tilt);
      ctx.fillStyle = '#030712';
      ctx.fillRect(-4, 11, 4, 8);
      ctx.fillRect(34, 11, 4, 8);
      ctx.fillStyle = '#2e1065';
      ctx.strokeStyle = '#fb923c';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(7, 0);
      ctx.lineTo(27, 0);
      ctx.lineTo(34, 18);
      ctx.lineTo(0, 18);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fb923c';
      ctx.beginPath();
      ctx.moveTo(10, 2);
      ctx.lineTo(24, 2);
      ctx.lineTo(27, 10);
      ctx.lineTo(7, 10);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fed7aa';
      ctx.fillRect(2, 15, 30, 2.5);
      ctx.fillStyle = '#f97316';
      const c3Flame = 20 + Math.random() * 7;
      ctx.beginPath();
      ctx.moveTo(13, 18);
      ctx.lineTo(17, c3Flame);
      ctx.lineTo(21, 18);
      ctx.closePath();
      ctx.fill();

      if (Math.abs(Math.cos(c3Phase)) > 0.4 && Math.random() > 0.4) {
        tvSmoke.push({
          x: c3X + 17,
          y: c3Y + 18,
          vx: -Math.cos(c3Phase) * 1.4,
          vy: 1.5,
          size: Math.random() * 3.5 + 1.5,
          alpha: 0.7,
          decay: 0.05,
          color: Math.random() > 0.3 ? '#fb923c' : '#ffffff',
        });
      }
      ctx.restore();

      // 7. TV Drift-Partikel zeichnen
      for (let i = tvSmoke.length - 1; i >= 0; i--) {
        const p = tvSmoke[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
        p.size += 0.09;

        if (p.alpha <= 0 || p.y > tvH) {
          tvSmoke.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 8. CRT Scanlines
      ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
      for (let y = 0; y < tvH; y += 3) {
        ctx.fillRect(0, y, tvW, 1);
      }

      // 9. Synchronisierte Ambilight-Lichtstärken auf das Wohnzimmer übertragen
      if (sceneContainerRef.current) {
        const c1Ambi = 0.4 + 0.6 * Math.max(0, Math.cos(c1Phase));
        const c2Ambi = 0.5 + 0.5 * Math.max(0, Math.cos(c2Phase));
        const c3Ambi = 0.4 + 0.6 * Math.max(0, Math.cos(c3Phase));
        sceneContainerRef.current.style.setProperty('--ambi-cyan', c1Ambi.toFixed(2));
        sceneContainerRef.current.style.setProperty('--ambi-pink', c2Ambi.toFixed(2));
        sceneContainerRef.current.style.setProperty('--ambi-orange', c3Ambi.toFixed(2));
      }
    };

    // ─── Haupt-Loop (requestAnimationFrame) ───
    const loop = (now: number) => {
      const elapsed = now - startTime;
      const elapsedSec = elapsed / 1000;

      // 1. TV Game Loop
      if (tvCtx) {
        renderTVRaceGame(tvCtx, elapsedSec);
      }

      // 2. FX-Canvas (Komet & Explosion)
      fxCtx.clearRect(0, 0, w, h);

      // PHASE 1: Kometenflug
      if (animPhaseRef.current === 'comet') {
        const p = Math.min(elapsed / comet.duration, 1);
        const ease = p * p * p;
        comet.x = comet.startX + (comet.targetX - comet.startX) * ease;
        comet.y = comet.startY + (comet.targetY - comet.startY) * ease;
        comet.rotation += 0.1;

        const dirX = comet.targetX - comet.startX;
        const dirY = comet.targetY - comet.startY;
        const len = Math.hypot(dirX, dirY) || 1;
        const normX = dirX / len;
        const normY = dirY / len;

        // Plasma-Schweif
        for (let i = 0; i < 7; i++) {
          const spread = (Math.random() - 0.5) * 8;
          particles.push({
            x: comet.x - normX * (i * 4) + normY * spread,
            y: comet.y - normY * (i * 4) - normX * spread,
            vx: -normX * (Math.random() * 5 + 3) + (Math.random() - 0.5) * 2,
            vy: -normY * (Math.random() * 5 + 3) + (Math.random() - 0.5) * 2,
            size: Math.random() * 4.5 + 1.5,
            alpha: 1,
            decay: 0.032,
            color:
              Math.random() > 0.4
                ? '#f59e0b'
                : Math.random() > 0.3
                ? '#ef4444'
                : '#ffffff',
          });
        }

        // Rauch
        if (Math.random() > 0.3) {
          smokePuffs.push({
            x: comet.x - normX * 20,
            y: comet.y - normY * 20,
            vx: -normX * 1.5 + (Math.random() - 0.5) * 0.8,
            vy: -normY * 1.5 + (Math.random() - 0.5) * 0.8,
            radius: Math.random() * 8 + 6,
            alpha: 0.4,
            decay: 0.016,
            color: 'rgba(234, 88, 12, 0.35)',
          });
        }

        // Komet zeichnen
        fxCtx.save();
        fxCtx.translate(comet.x, comet.y);

        const plasmaSheath = fxCtx.createRadialGradient(0, 0, 5, 0, 0, 38);
        plasmaSheath.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        plasmaSheath.addColorStop(0.3, 'rgba(251, 191, 36, 0.85)');
        plasmaSheath.addColorStop(0.65, 'rgba(239, 68, 68, 0.5)');
        plasmaSheath.addColorStop(1, 'rgba(56, 189, 248, 0)');

        fxCtx.fillStyle = plasmaSheath;
        fxCtx.beginPath();
        fxCtx.arc(0, 0, 38, 0, Math.PI * 2);
        fxCtx.fill();

        fxCtx.save();
        fxCtx.rotate(comet.rotation);
        fxCtx.fillStyle = '#1c1917';
        fxCtx.strokeStyle = '#f97316';
        fxCtx.lineWidth = 1.5;
        fxCtx.beginPath();
        const rockVertices = rockVerticesRef.current;
        for (let i = 0; i < rockVertices.length; i++) {
          const v = rockVertices[i];
          if (i === 0) fxCtx.moveTo(v.x, v.y);
          else fxCtx.lineTo(v.x, v.y);
        }
        fxCtx.closePath();
        fxCtx.fill();
        fxCtx.stroke();
        fxCtx.restore();

        fxCtx.fillStyle = '#ffffff';
        fxCtx.shadowColor = '#ffffff';
        fxCtx.shadowBlur = 18;
        fxCtx.beginPath();
        fxCtx.arc(normX * 4, normY * 4, 6.5, 0, Math.PI * 2);
        fxCtx.fill();
        fxCtx.restore();

        if (p >= 1) {
          animPhaseRef.current = 'explosion';
          triggerImpactExplosion(comet.targetX, comet.targetY);
        }
      }

      // Rauchschwaden zeichnen
      for (let i = smokePuffs.length - 1; i >= 0; i--) {
        const sm = smokePuffs[i];
        sm.x += sm.vx;
        sm.y += sm.vy;
        sm.radius += 0.4;
        sm.alpha -= sm.decay;

        if (sm.alpha <= 0) {
          smokePuffs.splice(i, 1);
          continue;
        }

        fxCtx.save();
        fxCtx.fillStyle = sm.color;
        fxCtx.globalAlpha = sm.alpha;
        fxCtx.beginPath();
        fxCtx.arc(sm.x, sm.y, sm.radius, 0, Math.PI * 2);
        fxCtx.fill();
        fxCtx.restore();
      }

      // Schockwellen zeichnen
      for (let i = shockwaves.length - 1; i >= 0; i--) {
        const sw = shockwaves[i];
        sw.radius += sw.speed;
        sw.alpha -= 0.024;

        if (sw.alpha <= 0 || sw.radius >= sw.maxRadius) {
          shockwaves.splice(i, 1);
          continue;
        }

        fxCtx.save();
        fxCtx.beginPath();
        fxCtx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        fxCtx.strokeStyle = sw.color;
        fxCtx.lineWidth = 4.5 * sw.alpha;
        fxCtx.globalAlpha = sw.alpha;
        fxCtx.shadowBlur = 24;
        fxCtx.shadowColor = sw.color;
        fxCtx.stroke();
        fxCtx.restore();
      }

      // Funken & Trümmer
      for (let i = particles.length - 1; i >= 0; i--) {
        const pt = particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.alpha -= pt.decay;

        if (pt.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }

        fxCtx.save();
        fxCtx.beginPath();
        fxCtx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        fxCtx.fillStyle = pt.color;
        fxCtx.globalAlpha = pt.alpha;
        fxCtx.shadowBlur = 8;
        fxCtx.shadowColor = pt.color;
        fxCtx.fill();
        fxCtx.restore();
      }

      animationFrameIdRef.current = requestAnimationFrame(loop);
    };

    animationFrameIdRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
      if (finishTimeoutRef.current) clearTimeout(finishTimeoutRef.current);
      if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
      if (logoTimeoutRef.current) clearTimeout(logoTimeoutRef.current);
    };
  }, []);

  if (isDone) return null;

  return (
    <div
      role="presentation"
      style={{
        paddingTop: 'max(16px, env(safe-area-inset-top))',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
      className={`fixed inset-0 z-50 w-full h-full min-h-screen overflow-hidden bg-[#030308] flex items-center justify-center select-none font-['Outfit',sans-serif] transition-all duration-800 ease-out pt-[max(1rem,env(safe-area-inset-top))] pb-[env(safe-area-inset-bottom)] ${
        isFadingOut ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* ─── 1. FULLSCREEN CANVAS FÜR KOMET, FUNKEN & SCHOCKWELLEN ─── */}
      <canvas
        ref={fxCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-30"
      />

      {/* ─── WEISSER BLITZ BEIM EINSCHLAG ─── */}
      <div
        className={`absolute inset-0 w-full h-full bg-white z-40 pointer-events-none transition-opacity duration-300 ${
          flashActive ? 'opacity-95' : 'opacity-0'
        }`}
      />

      {/* ─── 2. HARMONISCHE VOLLBILD-SZENE (FÜLLT MITTLERES & UNTERES DRITTEL) ─── */}
      <div
        ref={sceneContainerRef}
        className={`relative w-full h-full max-w-[480px] mx-auto flex flex-col justify-between items-center py-6 px-3 z-20 ${
          screenShaking ? 'screen-shake' : ''
        }`}
      >
        {/* OBERER BEREICH: "SPIELBOX" MIT EDLEM NEONGLOW (BLENDet IN DEN LETZTEN 1,5s EIN) */}
        <div className="w-full h-20 flex flex-col items-center justify-center pt-2">
          <div
            className={`flex flex-col items-center transition-all duration-1000 ease-out transform ${
              logoRevealed
                ? 'opacity-100 translate-y-0 scale-100'
                : 'opacity-0 -translate-y-4 scale-95 pointer-events-none'
            }`}
          >
            <h1 className="text-4xl sm:text-5xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-rose-400 drop-shadow-[0_0_20px_rgba(217,70,239,0.9)] drop-shadow-[0_0_40px_rgba(56,189,248,0.7)] drop-shadow-[0_0_70px_rgba(244,63,94,0.5)]">
              Spielbox
            </h1>
            <span className="text-[11px] font-bold tracking-[0.3em] uppercase text-white/60 mt-1 animate-pulse">
              Gemeinsam Spielen
            </span>
          </div>
        </div>

        {/* MITTLERES DRITTEL: WAND-TV MIT 60 FPS RENNSPIEL & DYNAMISCHEM AMBILIGHT */}
        <div
          className={`w-full flex flex-col items-center justify-center transition-all duration-1000 ease-out my-auto ${
            sceneRevealed
              ? 'opacity-100 translate-y-0 scale-100'
              : 'opacity-0 translate-y-8 scale-95 pointer-events-none'
          }`}
        >
          {/* TV-GEHÄUSE MIT DYNAMISCHER AMBILIGHT-AURA */}
          <div className="relative w-full max-w-[370px] aspect-[16/9] rounded-2xl p-2.5 bg-[#0f111e] border-[1.5px] border-[#252b47] shadow-[0_0_50px_rgba(56,189,248,0.25),0_0_80px_rgba(244,63,94,0.2)] tv-glow-live">
            {/* Bildschirm-Rahmen */}
            <div className="relative w-full h-full rounded-xl overflow-hidden bg-black flex items-center justify-center shadow-inner">
              <canvas
                ref={tvCanvasRef}
                width={360}
                height={202}
                className="w-full h-full block object-cover"
              />

              {/* CRT Scanline Glaze */}
              <div className="absolute inset-0 scanlines opacity-30 pointer-events-none" />

              {/* Glass Glare */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 pointer-events-none" />
            </div>

            {/* Wandhalterung / TV-Sockel */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-24 h-2 bg-[#171a2b] rounded-b border-b border-x border-white/10" />
          </div>

          {/* DYNAMISCHER AMBILIGHT-LICHTKEGEL VOM FERNSEHER NACH UNTEN AUF DIE SPIELER */}
          <div
            className="w-full max-w-[420px] h-14 -mt-2 pointer-events-none rounded-full blur-2xl opacity-75"
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(244, 63, 94, 0.45) 0%, rgba(56, 189, 248, 0.35) 45%, rgba(251, 146, 60, 0.25) 75%, transparent 100%)',
            }}
          />
        </div>

        {/* UNTERES DRITTEL: ZUSAMMENHÄNGENDE 3D-/VEKTOR-SZENE (COUCH & 3 FREUNDE) */}
        <div
          className={`w-full max-w-[500px] mt-auto transition-all duration-1000 ease-out ${
            sceneRevealed
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-12 pointer-events-none'
          }`}
        >
          <svg
            className="w-full h-auto block drop-shadow-[0_-10px_25px_rgba(0,0,0,0.6)]"
            viewBox="0 0 520 280"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Farbverlauf Sofa Backrest */}
              <linearGradient id="sofaBackGrad" x1="260" y1="50" x2="260" y2="280" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#1a1e35" />
                <stop offset="45%" stopColor="#101324" />
                <stop offset="100%" stopColor="#070811" />
              </linearGradient>

              {/* Farbverlauf Sofa Sitzfläche */}
              <linearGradient id="sofaSeatGrad" x1="260" y1="160" x2="260" y2="280" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#14172a" />
                <stop offset="100%" stopColor="#05060c" />
              </linearGradient>

              {/* TV-Lichtsheen auf oberer Sofalehne */}
              <linearGradient id="tvAmbiSheen" x1="50" y1="0" x2="470" y2="0" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#f43f5e" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#fb923c" stopOpacity="0.8" />
              </linearGradient>

              {/* Filter für weiche Ambilight-Reflexe */}
              <filter id="ambiGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* ─── 1. DAS GEMEINSAME SOFA ─── */}
            <g id="couch-group">
              {/* Sofalehne Hauptkörper */}
              <path
                d="M 30 280 L 30 140 C 30 75, 75 55, 260 55 C 445 55, 490 75, 490 140 L 490 280 Z"
                fill="url(#sofaBackGrad)"
                stroke="#252b47"
                strokeWidth="2"
              />

              {/* Dynamische Lichtkante auf oberer Sofalehne (fängt TV-Licht ein) */}
              <path
                d="M 45 130 C 70 78, 120 60, 260 60 C 400 60, 450 78, 475 130"
                stroke="url(#tvAmbiSheen)"
                strokeWidth="2.5"
                strokeLinecap="round"
                opacity="0.6"
              />

              {/* Linke abgerundete Armlehne */}
              <path
                d="M 12 280 L 12 145 C 12 105, 42 95, 58 120 L 58 280 Z"
                fill="#0d0f1c"
                stroke="#1f243b"
                strokeWidth="1.5"
              />

              {/* Rechte abgerundete Armlehne */}
              <path
                d="M 508 280 L 508 145 C 508 105, 478 95, 462 120 L 462 280 Z"
                fill="#0d0f1c"
                stroke="#1f243b"
                strokeWidth="1.5"
              />

              {/* Sitzkissen Basis */}
              <path
                d="M 25 280 C 40 185, 120 162, 260 162 C 400 162, 480 185, 495 280 Z"
                fill="url(#sofaSeatGrad)"
                stroke="#1b2038"
                strokeWidth="1.5"
              />

              {/* Kissennaht Links */}
              <path d="M 175 168 C 170 205, 166 245, 164 280" stroke="#181d33" strokeWidth="2.2" />

              {/* Kissennaht Rechts */}
              <path d="M 345 168 C 350 205, 354 245, 356 280" stroke="#181d33" strokeWidth="2.2" />
            </g>

            {/* ─── 2. GAMER 1: LINKS (CYAN/TÜRKIS DESIGN) ─── */}
            <g id="gamer-left" className="gamer-p1">
              {/* Körper & Hoodie */}
              <path
                d="M 65 158 C 62 192, 70 235, 78 280 L 182 280 C 190 235, 198 192, 195 158 C 178 135, 150 118, 142 115 C 132 112, 122 112, 118 115 C 110 118, 85 135, 65 158 Z"
                fill="#0e1222"
                stroke="#252d4b"
                strokeWidth="1.8"
              />

              {/* Falten im Hoodie */}
              <path d="M 105 160 Q 130 185 155 160" stroke="#090b14" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M 100 190 Q 130 215 160 190" stroke="#090b14" strokeWidth="2.5" strokeLinecap="round" />

              {/* Kopf & Frisur */}
              <ellipse cx="130" cy="85" rx="17" ry="21" fill="#090b16" stroke="#252d4b" strokeWidth="1.5" />

              {/* Gaming-Headset organisch integriert */}
              <path
                d="M 115 80 C 115 60, 145 60, 145 80"
                stroke="#38bdf8"
                strokeWidth="2.6"
                strokeLinecap="round"
                opacity="0.8"
              />
              <rect x="111" y="74" width="6" height="15" rx="3" fill="#090b16" stroke="#38bdf8" strokeWidth="1.4" />
              <rect x="143" y="74" width="6" height="15" rx="3" fill="#090b16" stroke="#38bdf8" strokeWidth="1.4" />

              {/* Arme natürlich nach vorne gebeugt */}
              <path d="M 68 160 Q 72 208 115 228" stroke="#13172c" strokeWidth="14" strokeLinecap="round" />
              <path d="M 192 160 Q 188 208 145 228" stroke="#13172c" strokeWidth="14" strokeLinecap="round" />

              {/* Natürliche Hände halten das Smartphone im Schoß */}
              <ellipse cx="116" cy="227" rx="6" ry="5" fill="#1e2540" />
              <ellipse cx="144" cy="227" rx="6" ry="5" fill="#1e2540" />

              {/* Schräg geneigtes, leuchtendes Cyan-Smartphone im Schoß */}
              <g transform="translate(130, 226) rotate(-12)">
                <rect
                  x="-12"
                  y="-18"
                  width="24"
                  height="36"
                  rx="4.5"
                  fill="#06121e"
                  stroke="#38bdf8"
                  strokeWidth="1.5"
                />
                <rect
                  className="phone-screen-cyan"
                  x="-10"
                  y="-16"
                  width="20"
                  height="32"
                  rx="3.5"
                  fill="#38bdf8"
                />
              </g>

              {/* DYNAMISCHES AMBILIGHT (TÜRKIS/CYAN): Sanfte Farbreflexe auf Kopf & Schulter */}
              <path
                d="M 118 70 C 124 58, 138 58, 144 70"
                stroke="#38bdf8"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="ambi-rim-cyan"
                filter="url(#ambiGlow)"
              />
              <path
                d="M 68 158 C 84 136, 110 120, 120 118"
                stroke="#38bdf8"
                strokeWidth="3.2"
                strokeLinecap="round"
                className="ambi-rim-cyan"
                filter="url(#ambiGlow)"
              />
            </g>

            {/* ─── 3. GAMER 2: MITTE (PINK/ROSE GT DESIGN - LEHNT LEICHT VOR) ─── */}
            <g id="gamer-center" className="gamer-p2">
              {/* Körper & Hoodie mit breiterer Engaged-Silhouette */}
              <path
                d="M 185 145 C 182 188, 192 235, 200 280 L 320 280 C 328 235, 338 188, 335 145 C 312 118, 285 106, 275 104 C 265 101, 255 101, 245 104 C 235 106, 208 118, 185 145 Z"
                fill="#14172b"
                stroke="#323b61"
                strokeWidth="2"
              />

              {/* Hoodie Falten */}
              <path d="M 230 155 Q 260 180 290 155" stroke="#0a0c18" strokeWidth="3" strokeLinecap="round" />
              <path d="M 225 188 Q 260 215 295 188" stroke="#0a0c18" strokeWidth="3" strokeLinecap="round" />

              {/* Kopf & Gamer-Silhouette */}
              <ellipse cx="260" cy="72" rx="19" ry="23" fill="#0b0d18" stroke="#323b61" strokeWidth="1.6" />

              {/* Headset mit neonpinkem Leuchtband */}
              <path
                d="M 243 65 C 243 42, 277 42, 277 65"
                stroke="#f43f5e"
                strokeWidth="3.2"
                strokeLinecap="round"
                opacity="0.85"
              />
              <rect x="238" y="58" width="7" height="17" rx="3.5" fill="#14070d" stroke="#f43f5e" strokeWidth="1.5" />
              <rect x="275" y="58" width="7" height="17" rx="3.5" fill="#14070d" stroke="#f43f5e" strokeWidth="1.5" />

              {/* Beide Arme halten das Smartphone zentriert im Schoß */}
              <path d="M 188 148 Q 194 200 242 220" stroke="#191d36" strokeWidth="15" strokeLinecap="round" />
              <path d="M 332 148 Q 326 200 278 220" stroke="#191d36" strokeWidth="15" strokeLinecap="round" />

              {/* Hände halten Smartphone */}
              <ellipse cx="242" cy="219" rx="6.5" ry="5.5" fill="#252c4d" />
              <ellipse cx="278" cy="219" rx="6.5" ry="5.5" fill="#252c4d" />

              {/* Leicht geneigtes leuchtendes Pink-Smartphone */}
              <g transform="translate(260, 218) rotate(1)">
                <rect
                  x="-13"
                  y="-19"
                  width="26"
                  height="38"
                  rx="5"
                  fill="#1c0712"
                  stroke="#f43f5e"
                  strokeWidth="1.6"
                />
                <rect
                  className="phone-screen-pink"
                  x="-11"
                  y="-17"
                  width="22"
                  height="34"
                  rx="4"
                  fill="#f43f5e"
                />
              </g>

              {/* DYNAMISCHES AMBILIGHT (PINK/ROSE): Synchron zu den Rennwagen */}
              <path
                d="M 246 54 C 253 43, 269 43, 276 54"
                stroke="#f43f5e"
                strokeWidth="3.2"
                strokeLinecap="round"
                className="ambi-rim-pink"
                filter="url(#ambiGlow)"
              />
              <path
                d="M 190 146 C 212 122, 238 110, 260 110 C 282 110, 308 122, 330 146"
                stroke="#f43f5e"
                strokeWidth="3.6"
                strokeLinecap="round"
                className="ambi-rim-pink"
                filter="url(#ambiGlow)"
              />
            </g>

            {/* ─── 4. GAMER 3: RECHTS (ORANGE/VIOLETT DESIGN) ─── */}
            <g id="gamer-right" className="gamer-p3">
              {/* Körper & Hoodie */}
              <path
                d="M 325 158 C 322 192, 330 235, 338 280 L 442 280 C 450 235, 458 192, 455 158 C 434 135, 408 118, 400 115 C 390 112, 380 112, 376 115 C 368 118, 342 135, 325 158 Z"
                fill="#0e1222"
                stroke="#252d4b"
                strokeWidth="1.8"
              />

              {/* Falten im Hoodie */}
              <path d="M 365 160 Q 390 185 415 160" stroke="#090b14" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M 360 190 Q 390 215 420 190" stroke="#090b14" strokeWidth="2.5" strokeLinecap="round" />

              {/* Kopf & Frisur */}
              <ellipse cx="390" cy="85" rx="17" ry="21" fill="#090b16" stroke="#252d4b" strokeWidth="1.5" />

              {/* Gaming-Headset organisch integriert */}
              <path
                d="M 375 80 C 375 60, 405 60, 405 80"
                stroke="#fb923c"
                strokeWidth="2.6"
                strokeLinecap="round"
                opacity="0.8"
              />
              <rect x="371" y="74" width="6" height="15" rx="3" fill="#140a05" stroke="#fb923c" strokeWidth="1.4" />
              <rect x="403" y="74" width="6" height="15" rx="3" fill="#140a05" stroke="#fb923c" strokeWidth="1.4" />

              {/* Arme natürlich nach vorne gebeugt */}
              <path d="M 328 160 Q 332 208 375 228" stroke="#13172c" strokeWidth="14" strokeLinecap="round" />
              <path d="M 452 160 Q 448 208 405 228" stroke="#13172c" strokeWidth="14" strokeLinecap="round" />

              {/* Natürliche Hände halten das Smartphone im Schoß */}
              <ellipse cx="376" cy="227" rx="6" ry="5" fill="#1e2540" />
              <ellipse cx="404" cy="227" rx="6" ry="5" fill="#1e2540" />

              {/* Schräg geneigtes Orange/Violett-Smartphone im Schoß */}
              <g transform="translate(390, 226) rotate(12)">
                <rect
                  x="-12"
                  y="-18"
                  width="24"
                  height="36"
                  rx="4.5"
                  fill="#180b04"
                  stroke="#fb923c"
                  strokeWidth="1.5"
                />
                <rect
                  className="phone-screen-purple"
                  x="-10"
                  y="-16"
                  width="20"
                  height="32"
                  rx="3.5"
                  fill="#fb923c"
                />
              </g>

              {/* DYNAMISCHES AMBILIGHT (ORANGE/GOLD): Farbreflexe auf Kopf & Schulter */}
              <path
                d="M 378 70 C 384 58, 398 58, 404 70"
                stroke="#fb923c"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="ambi-rim-orange"
                filter="url(#ambiGlow)"
              />
              <path
                d="M 452 158 C 436 136, 410 120, 400 118"
                stroke="#fb923c"
                strokeWidth="3.2"
                strokeLinecap="round"
                className="ambi-rim-orange"
                filter="url(#ambiGlow)"
              />
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}

export default SplashScreen;

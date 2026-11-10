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

  // Status für Timing & visuelle Phasen
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [flashActive, setFlashActive] = useState(false);
  const [screenShaking, setScreenShaking] = useState(false);
  const [sceneRevealed, setSceneRevealed] = useState(false);
  const [logoRevealed, setLogoRevealed] = useState(false);

  // Responsive Skalierung für Vollbildmodus
  const [sceneScale, setSceneScale] = useState(() => {
    if (typeof window === 'undefined') return 1;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scaleW = vw / 380;
    const scaleH = vh / 620;
    return Math.max(0.85, Math.min(Math.min(scaleW, scaleH), 1.7));
  });

  // Refs für Animation & Timer
  const animPhaseRef = useRef<'comet' | 'explosion' | 'scene'>('comet');
  const animationFrameIdRef = useRef<number | null>(null);
  const finishTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Unregelmäßige Polygon-Form für den Asteroidenkern
  const rockVerticesRef = useRef<{ x: number; y: number }[]>([]);
  if (rockVerticesRef.current.length === 0) {
    const count = 14;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radiusJitter = 11 + Math.sin(i * 3) * 3 + Math.cos(i * 5) * 2;
      rockVerticesRef.current.push({
        x: Math.cos(angle) * radiusJitter,
        y: Math.sin(angle) * radiusJitter,
      });
    }
  }

  // Sanftes Ausblenden und Wechsel zum Hauptmenü nach ca. 7,7 Sekunden
  const triggerFadeOut = () => {
    setIsFadingOut(true);
    fadeTimeoutRef.current = setTimeout(() => {
      setIsDone(true);
      onFinish?.();
    }, 800); // 800ms sanfter Fade-Out Übergang
  };

  // ─── Responsive Skalierung bei Fenstergrößenänderung ───
  useEffect(() => {
    const updateScale = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      // Basisgröße der Wohnzimmer-Szene: ~360px Breite, 520px Höhe
      const scaleW = vw / 380;
      const scaleH = vh / 620;
      const newScale = Math.min(scaleW, scaleH);
      // Begrenzung: 0.85x auf Mini-Displays bis 1.7x auf Desktop-Monitoren
      setSceneScale(Math.max(0.85, Math.min(newScale, 1.7)));
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  // ─── Haupt-Animationsschleife (FX Canvas + TV Rennspiel) ───
  useEffect(() => {
    const fxCanvas = fxCanvasRef.current;
    const tvCanvas = tvCanvasRef.current;
    if (!fxCanvas) return;

    const fxCtx = fxCanvas.getContext('2d');
    const tvCtx = tvCanvas ? tvCanvas.getContext('2d') : null;
    if (!fxCtx) return;

    // Vollbildgröße für FX-Canvas
    let w = (fxCanvas.width = window.innerWidth);
    let h = (fxCanvas.height = window.innerHeight);

    const handleResize = () => {
      if (!fxCanvas) return;
      w = fxCanvas.width = window.innerWidth;
      h = fxCanvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Partikel-Listen
    let particles: FXParticle[] = [];
    let smokePuffs: SmokePuff[] = [];
    let shockwaves: Shockwave[] = [];
    const tvSmoke: TVSmokeParticle[] = [];

    // Komet-Startparameter (zielgerichtet auf die TV-Position im Zentrum)
    const targetX = w / 2;
    const targetY = h / 2 - 30;

    let comet: Comet = {
      startX: -100,
      startY: -100,
      x: -100,
      y: -100,
      targetX,
      targetY,
      progress: 0,
      rotation: 0,
      duration: 1500, // 1,5s Hyperschall-Flug
    };

    const startTime = performance.now();

    // ─── Explosion beim Kometeneinschlag erzeugen ───
    const triggerImpactExplosion = (x: number, y: number) => {
      // 1. Gewaltige Schockwellen über den gesamten Bildschirm
      const maxScreenDim = Math.max(w, h);
      shockwaves.push({
        x,
        y,
        radius: 10,
        maxRadius: maxScreenDim * 0.85,
        alpha: 1,
        speed: 22,
        color: '#f59e0b',
      });
      shockwaves.push({
        x,
        y,
        radius: 6,
        maxRadius: maxScreenDim * 0.65,
        alpha: 1,
        speed: 16,
        color: '#f43f5e',
      });
      shockwaves.push({
        x,
        y,
        radius: 2,
        maxRadius: maxScreenDim * 0.45,
        alpha: 1,
        speed: 10,
        color: '#38bdf8',
      });

      // 2. Glühende Asteroiden-Trümmer & Funkenfontäne
      const colors = ['#ffffff', '#fef08a', '#f59e0b', '#ef4444', '#7c2d12', '#38bdf8'];
      for (let i = 0; i < 130; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 16 + 2;
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: Math.random() * 4.5 + 1.2,
          alpha: 1,
          decay: Math.random() * 0.02 + 0.01,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }

      // 3. Dichte Rauchschwaden
      for (let i = 0; i < 28; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4.5 + 0.5;
        smokePuffs.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.5,
          radius: Math.random() * 20 + 12,
          alpha: 0.75,
          decay: 0.011,
          color:
            Math.random() > 0.5
              ? 'rgba(239, 68, 68, 0.45)'
              : 'rgba(30, 27, 46, 0.6)',
        });
      }

      // Blitzen & Bildbeben
      setFlashActive(true);
      setTimeout(() => setFlashActive(false), 160);

      setScreenShaking(true);
      setTimeout(() => setScreenShaking(false), 550);

      // Wohnzimmer-Szene mit TV enthüllen
      setTimeout(() => {
        setSceneRevealed(true);
      }, 300);

      // Leuchtendes "Spielbox" Logo enthüllen
      setTimeout(() => {
        setLogoRevealed(true);
      }, 1300);

      // Gesamtdauer: Sanfter Fade-Out nach ca. 6,9 Sekunden (Gesamtzeit bis Menü: ~7,7s)
      finishTimeoutRef.current = setTimeout(() => {
        triggerFadeOut();
      }, 5400);
    };

    // ─── Rendering des flüssigen 60 FPS Rennspiels auf dem TV ───
    const renderTVRaceGame = (ctx: CanvasRenderingContext2D, elapsedSec: number) => {
      const tvW = 320;
      const tvH = 180;
      const horizonY = 88;

      ctx.clearRect(0, 0, tvW, tvH);

      // 1. Synthwave Himmel
      const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
      skyGrad.addColorStop(0, '#0b061d');
      skyGrad.addColorStop(0.45, '#2a0d45');
      skyGrad.addColorStop(0.75, '#e11d48');
      skyGrad.addColorStop(1, '#f59e0b');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, tvW, horizonY);

      // 2. Retro-Sonne am Horizont
      ctx.save();
      ctx.fillStyle = '#fbbf24';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(tvW / 2, horizonY, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Horizontale Linienstreifen durch die Sonne
      ctx.fillStyle = '#2a0d45';
      ctx.fillRect(tvW / 2 - 32, horizonY - 18, 64, 2);
      ctx.fillRect(tvW / 2 - 30, horizonY - 12, 60, 2.5);
      ctx.fillRect(tvW / 2 - 27, horizonY - 6, 54, 3);
      ctx.fillRect(tvW / 2 - 24, horizonY, 48, 3.5);
      ctx.restore();

      // 3. Neon-Berge / Skyline-Silhouette
      ctx.fillStyle = '#1b082e';
      ctx.beginPath();
      ctx.moveTo(0, horizonY);
      ctx.lineTo(40, horizonY - 22);
      ctx.lineTo(75, horizonY);
      ctx.lineTo(125, horizonY - 28);
      ctx.lineTo(160, horizonY);
      ctx.lineTo(210, horizonY - 26);
      ctx.lineTo(250, horizonY);
      ctx.lineTo(285, horizonY - 18);
      ctx.lineTo(tvW, horizonY);
      ctx.closePath();
      ctx.fill();

      // 4. 3D-Perspektive Rennstrecken-Asphalt
      const roadGrad = ctx.createLinearGradient(0, horizonY, 0, tvH);
      roadGrad.addColorStop(0, '#18132b');
      roadGrad.addColorStop(1, '#08070e');
      ctx.fillStyle = roadGrad;
      ctx.beginPath();
      ctx.moveTo(125, horizonY);
      ctx.lineTo(195, horizonY);
      ctx.lineTo(315, tvH);
      ctx.lineTo(5, tvH);
      ctx.closePath();
      ctx.fill();

      // 5. Animierte dynamische Curbs (Rot/Weiß links, Cyan/Weiß rechts)
      const curbSpeed = 16;
      const trackOffset = (elapsedSec * curbSpeed) % 1;
      const numSegments = 14;

      for (let i = 0; i < numSegments; i++) {
        const p0 = Math.pow((i + trackOffset) / numSegments, 2.2);
        const p1 = Math.pow((i + 1 + trackOffset) / numSegments, 2.2);

        const y0 = horizonY + (tvH - horizonY) * p0;
        const y1 = horizonY + (tvH - horizonY) * p1;

        // Linker Rand
        const leftOuter0 = 125 - 120 * p0;
        const leftInner0 = 125 - 110 * p0;
        const leftOuter1 = 125 - 120 * p1;
        const leftInner1 = 125 - 110 * p1;

        const isAlt = (i + Math.floor(elapsedSec * curbSpeed)) % 2 === 0;

        ctx.fillStyle = isAlt ? '#f43f5e' : '#ffffff';
        ctx.beginPath();
        ctx.moveTo(leftOuter0, y0);
        ctx.lineTo(leftInner0, y0);
        ctx.lineTo(leftInner1, y1);
        ctx.lineTo(leftOuter1, y1);
        ctx.closePath();
        ctx.fill();

        // Rechter Rand
        const rightInner0 = 195 + 110 * p0;
        const rightOuter0 = 195 + 120 * p0;
        const rightInner1 = 195 + 110 * p1;
        const rightOuter1 = 195 + 120 * p1;

        ctx.fillStyle = isAlt ? '#38bdf8' : '#ffffff';
        ctx.beginPath();
        ctx.moveTo(rightInner0, y0);
        ctx.lineTo(rightOuter0, y0);
        ctx.lineTo(rightOuter1, y1);
        ctx.lineTo(rightInner1, y1);
        ctx.closePath();
        ctx.fill();

        // Gelbe mittlere Fahrbahnmarkierung (Dashes)
        if (isAlt) {
          const centerY0 = y0;
          const centerY1 = y1;
          const centerWidth = 1 + p1 * 3.5;

          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.moveTo(160 - centerWidth / 2, centerY0);
          ctx.lineTo(160 + centerWidth / 2, centerY0);
          ctx.lineTo(160 + centerWidth / 2, centerY1);
          ctx.lineTo(160 - centerWidth / 2, centerY1);
          ctx.closePath();
          ctx.fill();

          // Violette Fahrbahnspuren (dezent)
          ctx.fillStyle = 'rgba(168, 85, 247, 0.4)';
          const laneL = 160 - 55 * p1;
          const laneR = 160 + 55 * p1;
          ctx.fillRect(laneL - 1, centerY0, 2, centerY1 - centerY0);
          ctx.fillRect(laneR - 1, centerY0, 2, centerY1 - centerY0);
        }
      }

      // 6. Die 3 driftenden Sportwagen zeichnen
      const t = elapsedSec;

      // ─── CAR 1: CYAN DRIFT CAR (Linker Spieler) ───
      const c1Phase = t * 2.3;
      const c1X = 70 + Math.sin(c1Phase) * 18 + Math.cos(c1Phase * 1.5) * 6;
      const c1Y = 138 + Math.sin(t * 30) * 0.4;
      const c1Tilt = Math.cos(c1Phase) * 0.12;

      ctx.save();
      ctx.translate(c1X, c1Y);
      ctx.rotate(c1Tilt);

      // Räder
      ctx.fillStyle = '#030712';
      ctx.fillRect(-4, 10, 4, 7);
      ctx.fillRect(32, 10, 4, 7);

      // Chassis
      ctx.fillStyle = '#082f49';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(6, 0);
      ctx.lineTo(26, 0);
      ctx.lineTo(32, 16);
      ctx.lineTo(0, 16);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Windschutzscheibe & Cockpit
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(9, 2);
      ctx.lineTo(23, 2);
      ctx.lineTo(26, 9);
      ctx.lineTo(6, 9);
      ctx.closePath();
      ctx.fill();

      // Neon-Rücklichter
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(2, 14, 28, 2);

      // Turbo Nitro-Flamme am Auspuff
      ctx.fillStyle = '#38bdf8';
      const c1Flame = 18 + Math.random() * 6;
      ctx.beginPath();
      ctx.moveTo(12, 16);
      ctx.lineTo(16, c1Flame);
      ctx.lineTo(20, 16);
      ctx.closePath();
      ctx.fill();

      // Drift-Rauch & Funken ausstoßen bei Kurvenlage
      if (Math.abs(Math.cos(c1Phase)) > 0.45 && Math.random() > 0.4) {
        tvSmoke.push({
          x: c1X + 16,
          y: c1Y + 16,
          vx: -Math.cos(c1Phase) * 1.2,
          vy: 1.4,
          size: Math.random() * 3 + 1.5,
          alpha: 0.7,
          decay: 0.05,
          color: Math.random() > 0.3 ? '#38bdf8' : '#ffffff',
        });
      }
      ctx.restore();

      // ─── CAR 2: PINK/RED GT SUPERCAR (Mitte - Rennhauptfeld) ───
      const c2Phase = t * 1.8 + 1.2;
      const c2X = 155 + Math.sin(c2Phase) * 26 + Math.sin(c2Phase * 2.1) * 6;
      const c2Y = 118 + Math.sin(t * 32) * 0.4;
      const c2Tilt = Math.cos(c2Phase) * 0.15;

      ctx.save();
      ctx.translate(c2X, c2Y);
      ctx.rotate(c2Tilt);

      // GT Heckspoiler
      ctx.fillStyle = '#be123c';
      ctx.fillRect(3, -3, 30, 2);
      ctx.strokeStyle = '#be123c';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(8, -1);
      ctx.lineTo(8, 2);
      ctx.moveTo(28, -1);
      ctx.lineTo(28, 2);
      ctx.stroke();

      // Räder
      ctx.fillStyle = '#000000';
      ctx.fillRect(-4, 11, 4, 8);
      ctx.fillRect(36, 11, 4, 8);

      // Chassis
      ctx.fillStyle = '#4c0519';
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(7, 2);
      ctx.lineTo(29, 2);
      ctx.lineTo(36, 18);
      ctx.lineTo(0, 18);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Cockpit
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.moveTo(11, 4);
      ctx.lineTo(25, 4);
      ctx.lineTo(29, 11);
      ctx.lineTo(7, 11);
      ctx.closePath();
      ctx.fill();

      // Glühendes Rücklichtband
      ctx.fillStyle = '#fda4af';
      ctx.fillRect(2, 16, 32, 2.5);

      // Doppelte Auspuff-Flammen (Gelb / Orange)
      ctx.fillStyle = '#fbbf24';
      const c2Flame = 20 + Math.random() * 8;
      ctx.beginPath();
      ctx.moveTo(13, 18);
      ctx.lineTo(18, c2Flame);
      ctx.lineTo(23, 18);
      ctx.closePath();
      ctx.fill();

      if (Math.abs(Math.cos(c2Phase)) > 0.4 && Math.random() > 0.4) {
        tvSmoke.push({
          x: c2X + 18,
          y: c2Y + 18,
          vx: -Math.cos(c2Phase) * 1.5,
          vy: 1.6,
          size: Math.random() * 3.5 + 1.8,
          alpha: 0.75,
          decay: 0.05,
          color: Math.random() > 0.4 ? '#f43f5e' : '#fbbf24',
        });
      }
      ctx.restore();

      // ─── CAR 3: PURPLE SPEED RACER (Rechter Spieler) ───
      const c3Phase = t * 2.6 + 2.5;
      const c3X = 232 + Math.sin(c3Phase) * 20 + Math.cos(c3Phase * 1.7) * 5;
      const c3Y = 132 + Math.sin(t * 29) * 0.4;
      const c3Tilt = Math.cos(c3Phase) * 0.13;

      ctx.save();
      ctx.translate(c3X, c3Y);
      ctx.rotate(c3Tilt);

      // Räder
      ctx.fillStyle = '#030712';
      ctx.fillRect(-4, 10, 4, 7);
      ctx.fillRect(32, 10, 4, 7);

      // Chassis
      ctx.fillStyle = '#2e1065';
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(6, 0);
      ctx.lineTo(26, 0);
      ctx.lineTo(32, 16);
      ctx.lineTo(0, 16);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Cockpit
      ctx.fillStyle = '#c084fc';
      ctx.beginPath();
      ctx.moveTo(9, 2);
      ctx.lineTo(23, 2);
      ctx.lineTo(26, 9);
      ctx.lineTo(6, 9);
      ctx.closePath();
      ctx.fill();

      // Rücklicht
      ctx.fillStyle = '#e9d5ff';
      ctx.fillRect(2, 14, 28, 2);

      // Nitro Flamme
      ctx.fillStyle = '#a855f7';
      const c3Flame = 18 + Math.random() * 6;
      ctx.beginPath();
      ctx.moveTo(12, 16);
      ctx.lineTo(16, c3Flame);
      ctx.lineTo(20, 16);
      ctx.closePath();
      ctx.fill();

      if (Math.abs(Math.cos(c3Phase)) > 0.4 && Math.random() > 0.4) {
        tvSmoke.push({
          x: c3X + 16,
          y: c3Y + 16,
          vx: -Math.cos(c3Phase) * 1.2,
          vy: 1.4,
          size: Math.random() * 3 + 1.5,
          alpha: 0.7,
          decay: 0.05,
          color: Math.random() > 0.3 ? '#c084fc' : '#ffffff',
        });
      }
      ctx.restore();

      // 7. TV Drift-Partikel & Reifenspuren zeichnen
      for (let i = tvSmoke.length - 1; i >= 0; i--) {
        const p = tvSmoke[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
        p.size += 0.08;

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

      // 8. CRT Arcade Scanlines (horizontale feine Zeilen)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
      for (let y = 0; y < tvH; y += 3) {
        ctx.fillRect(0, y, tvW, 1);
      }
    };

    // ─── Haupt-Animationsschleife (requestAnimationFrame) ───
    const loop = (now: number) => {
      const elapsed = now - startTime;
      const elapsedSec = elapsed / 1000;

      // 1. TV Rennspiel-Loop rendern
      if (tvCtx) {
        renderTVRaceGame(tvCtx, elapsedSec);
      }

      // 2. FX-Canvas (Komet, Schockwellen & Funken) rendern
      fxCtx.clearRect(0, 0, w, h);

      // PHASE 1: KOMETENFLUG (0.0s - 1.5s)
      if (animPhaseRef.current === 'comet') {
        const p = Math.min(elapsed / comet.duration, 1);
        const ease = p * p * p;
        comet.x = comet.startX + (comet.targetX - comet.startX) * ease;
        comet.y = comet.startY + (comet.targetY - comet.startY) * ease;
        comet.rotation += 0.09;

        const dirX = comet.targetX - comet.startX;
        const dirY = comet.targetY - comet.startY;
        const len = Math.hypot(dirX, dirY) || 1;
        const normX = dirX / len;
        const normY = dirY / len;

        // Kontinuierlicher Plasma-Schweif
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

        // Thermischer Rauch
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

        // Plasma-Hülle
        const plasmaSheath = fxCtx.createRadialGradient(0, 0, 5, 0, 0, 36);
        plasmaSheath.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        plasmaSheath.addColorStop(0.3, 'rgba(251, 191, 36, 0.8)');
        plasmaSheath.addColorStop(0.65, 'rgba(239, 68, 68, 0.45)');
        plasmaSheath.addColorStop(1, 'rgba(56, 189, 248, 0)');

        fxCtx.fillStyle = plasmaSheath;
        fxCtx.beginPath();
        fxCtx.arc(0, 0, 36, 0, Math.PI * 2);
        fxCtx.fill();

        // Gesteinskern
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

        // Glühende Krater
        fxCtx.fillStyle = '#ef4444';
        fxCtx.beginPath();
        fxCtx.arc(-3, -2, 2.5, 0, Math.PI * 2);
        fxCtx.arc(4, 3, 2, 0, Math.PI * 2);
        fxCtx.fill();
        fxCtx.restore();

        // Weiße Stoßspitze
        fxCtx.fillStyle = '#ffffff';
        fxCtx.shadowColor = '#ffffff';
        fxCtx.shadowBlur = 16;
        fxCtx.beginPath();
        fxCtx.arc(normX * 4, normY * 4, 6, 0, Math.PI * 2);
        fxCtx.fill();
        fxCtx.restore();

        // Einschlag prüfen
        if (p >= 1) {
          animPhaseRef.current = 'explosion';
          triggerImpactExplosion(comet.targetX, comet.targetY);
        }
      }

      // RAUCHWOLKEN
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

      // SCHOCKWELLEN
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

      // FUNKEN & TRÜMMER
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
    };
  }, []);

  if (isDone) return null;

  return (
    <div
      role="presentation"
      className={`fixed inset-0 z-50 w-screen h-screen overflow-hidden bg-[#020205] flex items-center justify-center select-none font-['Outfit',sans-serif] transition-all duration-800 ease-out ${
        isFadingOut ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* ─── 1. DYNAMIC FULLSCREEN CANVAS FÜR KOMET, FUNKEN & SCHOCKWELLEN ─── */}
      <canvas
        ref={fxCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-30"
      />

      {/* ─── WEISSER ATMOSPHÄRISCHER BLITZ BEIM EINSCHLAG ─── */}
      <div
        className={`absolute inset-0 w-full h-full bg-white z-40 pointer-events-none transition-opacity duration-300 ${
          flashActive ? 'opacity-90' : 'opacity-0'
        }`}
      />

      {/* ─── 2. VOLLBILD RESPONSIVE SZENE (TV, COUCH, GAMER, LOGO) ─── */}
      <div
        className={`relative w-full h-full flex flex-col items-center justify-center ${
          screenShaking ? 'screen-shake' : ''
        }`}
      >
        <div
          style={{
            transform: `scale(${sceneScale})`,
            transformOrigin: 'center center',
          }}
          className={`flex flex-col items-center justify-center transition-all duration-1000 ease-out ${
            sceneRevealed
              ? 'opacity-100 translate-y-0 scale-100'
              : 'opacity-0 translate-y-6 scale-95 pointer-events-none'
          }`}
        >
          {/* WAND-TV MIT AMBILIGHT & LIVE-CANVAS RENNSPIEL */}
          <div className="relative w-[308px] h-[178px] rounded-2xl p-2 bg-[#101220] border-[1.5px] border-[#252a45] tv-glow-live">
            {/* Bildschirm-Rahmen */}
            <div className="relative w-full h-full rounded-xl overflow-hidden bg-black flex items-center justify-center shadow-inner">
              {/* Live Canvas für das 60 FPS Rennspiel (driftende Autos, animierte Strecke & Horizont) */}
              <canvas
                ref={tvCanvasRef}
                width={320}
                height={180}
                className="w-full h-full block object-cover"
              />

              {/* CRT Scanline Overlay */}
              <div className="absolute inset-0 scanlines opacity-35 pointer-events-none" />

              {/* Glass Glare Glanzeffekt */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 pointer-events-none" />
            </div>

            {/* TV Wandhalterung / Sockel */}
            <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-20 h-2 bg-[#171a2b] rounded-b border-b border-x border-white/10" />
          </div>

          {/* AMBIENTES LICHT AUF DER COUCH */}
          <div className="w-80 h-16 bg-gradient-to-b from-cyan-500/20 via-purple-500/10 to-transparent blur-xl pointer-events-none -mt-2" />

          {/* 3 GAMER MIT SMARTPHONES AUF DER COUCH (VON HINTEN GESEHEN) */}
          <div className="relative -mt-10 flex items-end justify-center w-full max-w-[340px] px-2">
            {/* GEMEINSAME COUCH */}
            <svg
              className="absolute bottom-0 w-full h-[155px]"
              viewBox="0 0 340 155"
              fill="none"
            >
              <path
                d="M15 155 C10 110 40 90 170 90 C300 90 330 110 325 155 Z"
                fill="#0d0e1c"
                stroke="#1d223a"
                strokeWidth="1.8"
              />
              <path
                d="M40 155 C35 125 70 102 170 102 C270 102 305 125 300 155 Z"
                fill="#080912"
                opacity="0.7"
              />
            </svg>

            {/* GAMER 1: LINKS (CYAN/BLAUES SMARTPHONE) */}
            <div className="gamer-p1 relative z-20 flex flex-col items-center -mr-4">
              <svg width="110" height="150" viewBox="0 0 110 150" fill="none">
                <ellipse
                  cx="55"
                  cy="46"
                  rx="16"
                  ry="19"
                  fill="#090a14"
                  stroke="#38bdf8"
                  strokeWidth="1"
                  strokeOpacity="0.4"
                />
                <path
                  d="M38 42 C38 28 45 23 55 23 C65 23 72 28 72 42"
                  stroke="#38bdf8"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  opacity="0.7"
                />
                <rect
                  x="34"
                  y="38"
                  width="6"
                  height="13"
                  rx="3"
                  fill="#090b16"
                  stroke="#38bdf8"
                  strokeWidth="1.5"
                />
                <path
                  d="M22 145 C22 105 35 84 55 84 C75 84 88 105 88 145 Z"
                  fill="#0e101d"
                  stroke="#262d49"
                  strokeWidth="1.5"
                />
                <path
                  d="M28 108 Q24 126 44 130"
                  stroke="#14172a"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                <path
                  d="M82 108 Q86 126 66 130"
                  stroke="#14172a"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                <g transform="translate(55, 126) rotate(-8)">
                  <rect
                    x="-11"
                    y="-17"
                    width="22"
                    height="34"
                    rx="4"
                    fill="#090d16"
                    stroke="#38bdf8"
                    strokeWidth="1.2"
                  />
                  <rect
                    className="phone-screen-cyan"
                    x="-9"
                    y="-15"
                    width="18"
                    height="30"
                    rx="2.5"
                    fill="#38bdf8"
                  />
                </g>
              </svg>
            </div>

            {/* GAMER 2: MITTE (PINKES SMARTPHONE) */}
            <div className="gamer-p2 relative z-30 flex flex-col items-center">
              <svg width="125" height="165" viewBox="0 0 125 165" fill="none">
                <ellipse
                  cx="62"
                  cy="42"
                  rx="18"
                  ry="22"
                  fill="#090a14"
                  stroke="#f43f5e"
                  strokeWidth="1.2"
                  strokeOpacity="0.5"
                />
                <path
                  d="M42 38 C42 22 51 16 62 16 C73 16 82 22 82 38"
                  stroke="#f43f5e"
                  strokeWidth="3"
                  strokeLinecap="round"
                  opacity="0.8"
                />
                <rect
                  x="38"
                  y="34"
                  width="7"
                  height="14"
                  rx="3.5"
                  fill="#090b16"
                  stroke="#f43f5e"
                  strokeWidth="1.5"
                />
                <rect
                  x="80"
                  y="34"
                  width="7"
                  height="14"
                  rx="3.5"
                  fill="#090b16"
                  stroke="#f43f5e"
                  strokeWidth="1.5"
                />
                <path
                  d="M26 150 C26 100 42 78 62 78 C82 78 98 100 98 150 Z"
                  fill="#131526"
                  stroke="#343c61"
                  strokeWidth="1.8"
                />
                <path
                  d="M34 110 Q28 132 50 136"
                  stroke="#171b31"
                  strokeWidth="9"
                  strokeLinecap="round"
                />
                <path
                  d="M90 110 Q96 132 74 136"
                  stroke="#171b31"
                  strokeWidth="9"
                  strokeLinecap="round"
                />
                <g transform="translate(62, 131)">
                  <rect
                    x="-12"
                    y="-18"
                    width="24"
                    height="36"
                    rx="4.5"
                    fill="#160910"
                    stroke="#f43f5e"
                    strokeWidth="1.4"
                  />
                  <rect
                    className="phone-screen-pink"
                    x="-10"
                    y="-16"
                    width="20"
                    height="32"
                    rx="3"
                    fill="#f43f5e"
                  />
                </g>
              </svg>
            </div>

            {/* GAMER 3: RECHTS (LILA SMARTPHONE) */}
            <div className="gamer-p3 relative z-20 flex flex-col items-center -ml-4">
              <svg width="110" height="150" viewBox="0 0 110 150" fill="none">
                <ellipse
                  cx="55"
                  cy="46"
                  rx="16"
                  ry="19"
                  fill="#090a14"
                  stroke="#c084fc"
                  strokeWidth="1"
                  strokeOpacity="0.4"
                />
                <path
                  d="M38 42 C38 28 45 23 55 23 C65 23 72 28 72 42"
                  stroke="#c084fc"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  opacity="0.7"
                />
                <rect
                  x="68"
                  y="38"
                  width="6"
                  height="13"
                  rx="3"
                  fill="#090b16"
                  stroke="#c084fc"
                  strokeWidth="1.5"
                />
                <path
                  d="M22 145 C22 105 35 84 55 84 C75 84 88 105 88 145 Z"
                  fill="#0e101d"
                  stroke="#262d49"
                  strokeWidth="1.5"
                />
                <path
                  d="M28 108 Q24 126 44 130"
                  stroke="#14172a"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                <path
                  d="M82 108 Q86 126 66 130"
                  stroke="#14172a"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                <g transform="translate(55, 126) rotate(8)">
                  <rect
                    x="-11"
                    y="-17"
                    width="22"
                    height="34"
                    rx="4"
                    fill="#120a1c"
                    stroke="#c084fc"
                    strokeWidth="1.2"
                  />
                  <rect
                    className="phone-screen-purple"
                    x="-9"
                    y="-15"
                    width="18"
                    height="30"
                    rx="2.5"
                    fill="#c084fc"
                  />
                </g>
              </svg>
            </div>
          </div>

          {/* ─── 3. LOGO ANZEIGE: "SPIELBOX" MIT NEON-GLOW ─── */}
          <div
            className={`relative z-20 mt-6 flex flex-col items-center transition-all duration-1000 ease-out transform ${
              logoRevealed
                ? 'opacity-100 translate-y-0 scale-100'
                : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
            }`}
          >
            <h1 className="text-4xl sm:text-5xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-500 drop-shadow-[0_0_30px_rgba(168,85,247,0.75)]">
              Spielbox
            </h1>
            <span className="text-xs font-bold tracking-widest uppercase text-white/50 mt-1 animate-pulse">
              Bereit fürs Spiel?
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SplashScreen;

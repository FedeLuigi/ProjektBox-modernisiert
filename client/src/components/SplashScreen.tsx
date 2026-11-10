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

  // Sanftes Ausblenden und Wechsel zum Hauptmenü
  const triggerFadeOut = () => {
    setIsFadingOut(true);
    fadeTimeoutRef.current = setTimeout(() => {
      setIsDone(true);
      onFinish?.();
    }, 600);
  };

  // ─── Responsive Skalierung bei Fenstergrößenänderung ───
  useEffect(() => {
    const updateScale = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const scaleW = vw / 380;
      const scaleH = vh / 620;
      const newScale = Math.min(scaleW, scaleH);
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
      // 1. Schockwellen über den gesamten Bildschirm
      shockwaves.push({
        x,
        y,
        radius: 10,
        maxRadius: Math.max(w, h) * 0.9,
        alpha: 1,
        speed: 16,
        color: '#38bdf8', // Neon Cyan
      });
      shockwaves.push({
        x,
        y,
        radius: 5,
        maxRadius: Math.max(w, h) * 0.7,
        alpha: 1,
        speed: 12,
        color: '#f43f5e', // Neon Pink/Rose
      });
      shockwaves.push({
        x,
        y,
        radius: 2,
        maxRadius: Math.max(w, h) * 0.5,
        alpha: 1,
        speed: 8,
        color: '#fbbf24', // Warmes Gold
      });

      // 2. Schnelle, feurige Funkenpartikel (360 Grad)
      for (let i = 0; i < 90; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 3 + Math.random() * 14;
        const colors = ['#ffffff', '#38bdf8', '#f43f5e', '#fbbf24', '#c084fc', '#f97316'];
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 2 + Math.random() * 4.5,
          alpha: 1,
          decay: 0.015 + Math.random() * 0.025,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }

      // 3. Glühende Rauchwolken nach der Explosion
      for (let i = 0; i < 35; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * 60;
        const colors = ['#f43f5e', '#c084fc', '#38bdf8', '#fb923c'];
        smokePuffs.push({
          x: x + Math.cos(angle) * dist,
          y: y + Math.sin(angle) * dist,
          vx: (Math.random() - 0.5) * 1.5,
          vy: (Math.random() - 0.5) * 1.5 - 0.8,
          radius: 18 + Math.random() * 26,
          alpha: 0.8,
          decay: 0.012 + Math.random() * 0.016,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }

      // 4. Heller Blitz und Erschütterung
      setFlashActive(true);
      setTimeout(() => setFlashActive(false), 220);

      setScreenShaking(true);
      setTimeout(() => setScreenShaking(false), 520);

      // 5. Wohnzimmerszene einblenden
      setTimeout(() => {
        setSceneRevealed(true);
      }, 150);

      // 6. Spielbox Logo einblenden
      setTimeout(() => {
        setLogoRevealed(true);
      }, 1300);

      // Gesamtdauer: Sanfter Fade-Out nach ca. 5 Sekunden
      finishTimeoutRef.current = setTimeout(() => {
        triggerFadeOut();
      }, 5000);
    };

    // ─── Rendering des 60 FPS Rennspiels auf dem TV ───
    const renderTVRaceGame = (ctx: CanvasRenderingContext2D, elapsedSec: number) => {
      const tvW = 320;
      const tvH = 180;

      ctx.clearRect(0, 0, tvW, tvH);

      // 1. Himmel mit dynamischem Farbverlauf
      const skyGrad = ctx.createLinearGradient(0, 0, 0, 100);
      skyGrad.addColorStop(0, '#0b061d');
      skyGrad.addColorStop(0.45, '#2a0d45');
      skyGrad.addColorStop(0.7, '#e11d48');
      skyGrad.addColorStop(1, '#f59e0b');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, tvW, 100);

      // 2. Retro-Sonne mit Streifen
      ctx.save();
      ctx.fillStyle = '#fbbf24';
      ctx.shadowBlur = 18;
      ctx.shadowColor = '#f59e0b';
      ctx.beginPath();
      ctx.arc(tvW / 2, 95, 34, 0, Math.PI * 2);
      ctx.fill();

      // Horizontale Retro-Schnittlinien in der Sonne
      ctx.strokeStyle = '#2a0d45';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(tvW / 2 - 32, 78);
      ctx.lineTo(tvW / 2 + 32, 78);
      ctx.moveTo(tvW / 2 - 30, 84);
      ctx.lineTo(tvW / 2 + 30, 84);
      ctx.moveTo(tvW / 2 - 26, 90);
      ctx.lineTo(tvW / 2 + 26, 90);
      ctx.stroke();
      ctx.restore();

      // 3. Cyberpunk Straßenasphalt
      const roadGrad = ctx.createLinearGradient(0, 95, 0, tvH);
      roadGrad.addColorStop(0, '#19122c');
      roadGrad.addColorStop(1, '#08070e');
      ctx.fillStyle = roadGrad;
      ctx.fillRect(0, 95, tvW, tvH - 95);

      // 4. Animierte neonblaue Straßenmarkierungen
      ctx.save();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 6;
      ctx.shadowColor = '#38bdf8';

      // Fluchtende Seitenlinien
      ctx.beginPath();
      ctx.moveTo(tvW / 2 - 20, 95);
      ctx.lineTo(20, tvH);
      ctx.moveTo(tvW / 2 + 20, 95);
      ctx.lineTo(tvW - 20, tvH);
      ctx.stroke();

      // Fluchtende weiße Mittelstreifen
      const speedOffset = (elapsedSec * 160) % 40;
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 2;
      ctx.setLineDash([14, 18]);
      ctx.lineDashOffset = -speedOffset;
      ctx.beginPath();
      ctx.moveTo(tvW / 2, 95);
      ctx.lineTo(tvW / 2, tvH);
      ctx.stroke();
      ctx.restore();

      // 5. Drei driftende futuristische Rennautos
      const cars = [
        {
          id: 'cyan',
          name: 'P1',
          color: '#38bdf8',
          accent: '#0284c7',
          glow: '#38bdf8',
          laneOffset: Math.sin(elapsedSec * 3.2) * 22 - 38,
          y: 142 + Math.cos(elapsedSec * 4) * 2,
          tilt: Math.cos(elapsedSec * 3.2) * 0.12,
        },
        {
          id: 'pink',
          name: 'P2',
          color: '#f43f5e',
          accent: '#be123c',
          glow: '#f43f5e',
          laneOffset: Math.sin(elapsedSec * 2.8 + 2) * 18,
          y: 134 + Math.sin(elapsedSec * 3.5) * 2.5,
          tilt: Math.cos(elapsedSec * 2.8 + 2) * 0.15,
        },
        {
          id: 'purple',
          name: 'P3',
          color: '#c084fc',
          accent: '#7e22ce',
          glow: '#c084fc',
          laneOffset: Math.cos(elapsedSec * 2.5 + 1) * 20 + 38,
          y: 146 + Math.sin(elapsedSec * 4.2) * 2,
          tilt: -Math.sin(elapsedSec * 2.5 + 1) * 0.14,
        },
      ];

      // Reifenspuren & Rauchpartikel hinter den Autos erzeugen
      for (const car of cars) {
        if (Math.random() < 0.65) {
          tvSmoke.push({
            x: tvW / 2 + car.laneOffset + (Math.random() - 0.5) * 10,
            y: car.y + 7,
            vx: -car.tilt * 1.5,
            vy: -0.6 - Math.random() * 0.5,
            size: 2.5 + Math.random() * 3,
            alpha: 0.75,
            decay: 0.04,
            color: car.color,
          });
        }
      }

      // TV Drift-Rauch rendern
      for (let i = tvSmoke.length - 1; i >= 0; i--) {
        const sm = tvSmoke[i];
        sm.x += sm.vx;
        sm.y += sm.vy;
        sm.size += 0.25;
        sm.alpha -= sm.decay;

        if (sm.alpha <= 0) {
          tvSmoke.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.fillStyle = sm.color;
        ctx.globalAlpha = sm.alpha * 0.5;
        ctx.beginPath();
        ctx.arc(sm.x, sm.y, sm.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Jedes Auto zeichnen (von hinten gesehen)
      for (const car of cars) {
        ctx.save();
        ctx.translate(tvW / 2 + car.laneOffset, car.y);
        ctx.rotate(car.tilt);

        // Neon Glow unter dem Chassis
        ctx.shadowBlur = 14;
        ctx.shadowColor = car.glow;

        // Auto-Karosserie (Keilform)
        ctx.fillStyle = car.color;
        ctx.beginPath();
        ctx.moveTo(-16, 6);
        ctx.lineTo(-13, -4);
        ctx.lineTo(-7, -9);
        ctx.lineTo(7, -9);
        ctx.lineTo(13, -4);
        ctx.lineTo(16, 6);
        ctx.closePath();
        ctx.fill();

        // Cockpit / Heckscheibe
        ctx.fillStyle = '#06070e';
        ctx.fillRect(-7, -8, 14, 5);

        // Spoiler
        ctx.fillStyle = car.accent;
        ctx.fillRect(-15, -11, 30, 2.5);
        ctx.fillRect(-11, -9, 3, 3);
        ctx.fillRect(8, -9, 3, 3);

        // Neon Heckleuchten
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ffffff';
        ctx.fillRect(-14, 2, 6, 2.5);
        ctx.fillRect(8, 2, 6, 2.5);

        // Räder (Breite Sportreifen)
        ctx.fillStyle = '#0b0c14';
        ctx.shadowBlur = 0;
        ctx.fillRect(-18, -1, 3.5, 9);
        ctx.fillRect(14.5, -1, 3.5, 9);

        ctx.restore();
      }
    };

    // ─── Hauptanimationsschleife (60 FPS) ───
    const loop = (currentTime: number) => {
      const elapsed = (currentTime - startTime) / 1000;

      // TV Rennspiel kontinuierlich rendern, sobald Szene aktiv wird
      if (tvCtx) {
        renderTVRaceGame(tvCtx, elapsed);
      }

      // FX Canvas für Kometenflug und Einschlagseffekte
      fxCtx.clearRect(0, 0, w, h);

      // PHASE 1: KOMETENFLUG
      if (animPhaseRef.current === 'comet') {
        const flightProgress = Math.min(1, (currentTime - startTime) / comet.duration);

        // Hyperschall Easing (schnell beschleunigend)
        const ease = Math.pow(flightProgress, 2.2);

        comet.x = comet.startX + (comet.targetX - comet.startX) * ease;
        comet.y = comet.startY + (comet.targetY - comet.startY) * ease;
        comet.rotation += 0.08;

        // Kometen-Schweifpartikel & Plasmafunken generieren
        for (let i = 0; i < 4; i++) {
          const spread = (Math.random() - 0.5) * 16;
          particles.push({
            x: comet.x + spread,
            y: comet.y + spread,
            vx: -4 - Math.random() * 5,
            vy: -4 - Math.random() * 5,
            size: 2.5 + Math.random() * 4.5,
            alpha: 1,
            decay: 0.035 + Math.random() * 0.04,
            color: Math.random() > 0.4 ? '#f97316' : '#fbbf24',
          });
        }

        // Dichter Rauchschweif hinter dem Kometen
        if (Math.random() < 0.8) {
          smokePuffs.push({
            x: comet.x,
            y: comet.y,
            vx: -1.5 + (Math.random() - 0.5),
            vy: -1.5 + (Math.random() - 0.5),
            radius: 10 + Math.random() * 14,
            alpha: 0.7,
            decay: 0.02,
            color: '#a855f7',
          });
        }

        // Kometen-Plasmaschweif (Feuerstrahl nach hinten oben links)
        fxCtx.save();
        const tailGrad = fxCtx.createLinearGradient(comet.x, comet.y, comet.x - 170, comet.y - 170);
        tailGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
        tailGrad.addColorStop(0.15, 'rgba(56, 189, 248, 0.9)');
        tailGrad.addColorStop(0.5, 'rgba(244, 63, 94, 0.6)');
        tailGrad.addColorStop(0.85, 'rgba(168, 85, 247, 0.3)');
        tailGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        fxCtx.strokeStyle = tailGrad;
        fxCtx.lineWidth = 14;
        fxCtx.lineCap = 'round';
        fxCtx.shadowBlur = 24;
        fxCtx.shadowColor = '#38bdf8';
        fxCtx.beginPath();
        fxCtx.moveTo(comet.x, comet.y);
        fxCtx.lineTo(comet.x - 170, comet.y - 170);
        fxCtx.stroke();
        fxCtx.restore();

        // Glühender Asteroidenkern
        fxCtx.save();
        fxCtx.translate(comet.x, comet.y);
        fxCtx.rotate(comet.rotation);

        fxCtx.shadowBlur = 30;
        fxCtx.shadowColor = '#f59e0b';
        fxCtx.fillStyle = '#ffffff';

        fxCtx.beginPath();
        const v = rockVerticesRef.current;
        if (v.length > 0) {
          fxCtx.moveTo(v[0].x, v[0].y);
          for (let i = 1; i < v.length; i++) {
            fxCtx.lineTo(v[i].x, v[i].y);
          }
        }
        fxCtx.closePath();
        fxCtx.fill();

        // Heißer, leuchtender Innenkern
        fxCtx.fillStyle = '#fbbf24';
        fxCtx.beginPath();
        fxCtx.arc(0, 0, 8, 0, Math.PI * 2);
        fxCtx.fill();

        fxCtx.restore();

        // Prüfen, ob der Komet das TV-Zentrum erreicht hat
        if (flightProgress >= 1) {
          animPhaseRef.current = 'scene';
          triggerImpactExplosion(comet.targetX, comet.targetY);
        }
      }

      // SCHOCKWELLEN RENDERN
      for (let i = shockwaves.length - 1; i >= 0; i--) {
        const sw = shockwaves[i];
        sw.radius += sw.speed;
        sw.alpha -= 0.022;

        if (sw.alpha <= 0 || sw.radius >= sw.maxRadius) {
          shockwaves.splice(i, 1);
          continue;
        }

        fxCtx.save();
        fxCtx.strokeStyle = sw.color;
        fxCtx.lineWidth = Math.max(1, 7 * sw.alpha);
        fxCtx.globalAlpha = sw.alpha;
        fxCtx.shadowBlur = 18;
        fxCtx.shadowColor = sw.color;
        fxCtx.beginPath();
        fxCtx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        fxCtx.stroke();
        fxCtx.restore();
      }

      // RAUCHWOLKEN RENDERN
      for (let i = smokePuffs.length - 1; i >= 0; i--) {
        const sp = smokePuffs[i];
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.radius += 0.45;
        sp.alpha -= sp.decay;

        if (sp.alpha <= 0) {
          smokePuffs.splice(i, 1);
          continue;
        }

        fxCtx.save();
        fxCtx.fillStyle = sp.color;
        fxCtx.globalAlpha = sp.alpha * 0.4;
        fxCtx.beginPath();
        fxCtx.arc(sp.x, sp.y, sp.radius, 0, Math.PI * 2);
        fxCtx.fill();
        fxCtx.restore();
      }

      // FUNKEN & PARTIKEL RENDERN
      for (let i = particles.length - 1; i >= 0; i--) {
        const pt = particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.vy += 0.12; // Leichte Schwerkraft
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
      style={{
        paddingTop: 'max(16px, env(safe-area-inset-top))',
        paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
      }}
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
                  x="78"
                  y="34"
                  width="7"
                  height="15"
                  rx="3.5"
                  fill="#150910"
                  stroke="#f43f5e"
                  strokeWidth="1.8"
                />
                <path
                  d="M25 155 C25 110 40 88 62 88 C84 88 99 110 99 155 Z"
                  fill="#130e1c"
                  stroke="#382645"
                  strokeWidth="1.6"
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

      {/* ─── Überspringen-Button unten ─── */}
      <button
        type="button"
        onClick={triggerFadeOut}
        style={{
          bottom: 'max(1.5rem, calc(env(safe-area-inset-bottom) + 0.75rem))',
        }}
        className="absolute rounded-full bg-white/[0.08] hover:bg-white/[0.14] px-4 py-1.5 text-[11px] font-bold tracking-wide text-[#AEAEB2] hover:text-white backdrop-blur-md transition-all active:scale-95 cursor-pointer z-50 ring-1 ring-white/10"
      >
        Überspringen ›
      </button>
    </div>
  );
}

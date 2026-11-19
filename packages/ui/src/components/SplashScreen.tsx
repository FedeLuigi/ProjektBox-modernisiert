import { memo, useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

interface SplashScreenProps {
  onFinish?: () => void;
  onPrepareExit?: () => void;
}

const SPLASH_DURATION_MS = 4600;
const SPLASH_REDUCED_MS = 950;
const FADE_OUT_MS = 420;
const FONTS_WAIT_MAX_MS = 350;
const PREPARE_EXIT_BEFORE_MS = 900;

const WARP_COLORS = ['#F59E0B', '#FBBF24', '#38BDF8', '#10B981', '#F472B6', '#FDE68A'];

/**
 * Vollbild-Canvas-2D:
 * 1) Hyperspace-Warp-Sternenfeld (0 - 1.24s, danach ruhiger Drift)
 * 2) Synchronisierte Partikel-Explosion beim Raketen-Einschlag (ab 1.22s)
 * Optimiert mit Farb-Batching & Frame-Delta-Normierung für 60Hz/120Hz-Displays.
 */
const HyperspaceExplosionCanvas = memo(function HyperspaceExplosionCanvas({
  reducedMotion,
  isReady,
}: {
  reducedMotion: boolean;
  isReady: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    if (!isReady) {
      return;
    }

    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', resize);

    const isCompactViewport = Math.min(width, height) < 640;
    const starCount = reducedMotion ? 45 : isCompactViewport ? 120 : 170;
    const stars = Array.from({ length: starCount }, (_, i) => ({
      x: (Math.random() - 0.5) * width * 1.7,
      y: (Math.random() - 0.5) * height * 1.7,
      z: Math.random() * 1200 + 80,
      colorIndex: i % WARP_COLORS.length,
    }));

    // Pro Farbe 2 Tiefenstufen (fern / nah) -> maximal 12 stroke()-Aufrufe statt 170
    const starBuckets: number[][] = Array.from({ length: WARP_COLORS.length * 2 }, () => []);

    const sparkCount = reducedMotion ? 0 : isCompactViewport ? 84 : 110;
    const sparks = Array.from({ length: sparkCount }, (_, i) => {
      const angle = (i / Math.max(1, sparkCount)) * Math.PI * 2 + (Math.random() - 0.5) * 0.18;
      const speed = 5 + Math.random() * 15;
      return {
        x: 0,
        y: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 3.2,
        colorIndex: i % WARP_COLORS.length,
      };
    });
    let sparkAlpha = 1;
    let explosionTriggered = false;

    const startTime = performance.now();
    let lastTime = startTime;
    let rafId = 0;

    const render = (now: number) => {
      const deltaMs = now - lastTime;
      lastTime = now;
      // Normiert auf 60fps-Einheiten, gedeckelt gegen Sprünge nach Tab-Wechsel
      const stepScale = Math.min(2.5, Math.max(0.25, deltaMs / 16.6667));
      const elapsed = (now - startTime) / 1000;
      const cx = width / 2;
      const cy = height / 2;

      const baseSpeed = reducedMotion
        ? 3
        : elapsed < 1.24
          ? 12 + elapsed * 18
          : Math.max(4.5, 32 - (elapsed - 1.24) * 14);
      const speed = baseSpeed * stepScale;

      ctx.clearRect(0, 0, width, height);

      for (let b = 0; b < starBuckets.length; b++) {
        starBuckets[b].length = 0;
      }

      // 1) Hyperspace-Tunnel (nach Farbe & Tiefe gebatcht)
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        s.z -= speed;
        if (s.z <= 20) {
          s.z = 1200;
          s.x = (Math.random() - 0.5) * width * 1.7;
          s.y = (Math.random() - 0.5) * height * 1.7;
        }
        const k = 320 / s.z;
        const px = cx + s.x * k;
        const py = cy + s.y * k;
        const pk = 320 / (s.z + baseSpeed * 2.4);
        const ox = cx + s.x * pk;
        const oy = cy + s.y * pk;

        const isNear = s.z < 580 ? 1 : 0;
        const bucketIdx = s.colorIndex * 2 + isNear;
        starBuckets[bucketIdx].push(ox, oy, px, py);
      }

      for (let c = 0; c < WARP_COLORS.length; c++) {
        ctx.strokeStyle = WARP_COLORS[c];

        const farCoords = starBuckets[c * 2];
        if (farCoords.length > 0) {
          ctx.globalAlpha = 0.45;
          ctx.lineWidth = 1.35;
          ctx.beginPath();
          for (let j = 0; j < farCoords.length; j += 4) {
            ctx.moveTo(farCoords[j], farCoords[j + 1]);
            ctx.lineTo(farCoords[j + 2], farCoords[j + 3]);
          }
          ctx.stroke();
        }

        const nearCoords = starBuckets[c * 2 + 1];
        if (nearCoords.length > 0) {
          ctx.globalAlpha = 0.92;
          ctx.lineWidth = 2.6;
          ctx.beginPath();
          for (let j = 0; j < nearCoords.length; j += 4) {
            ctx.moveTo(nearCoords[j], nearCoords[j + 1]);
            ctx.lineTo(nearCoords[j + 2], nearCoords[j + 3]);
          }
          ctx.stroke();
        }
      }

      // 2) Partikel-Explosion ab t = 1.22s (nach Farbe gebatcht)
      if (!reducedMotion && elapsed >= 1.22 && sparkAlpha > 0.02 && sparks.length > 0) {
        if (!explosionTriggered) {
          explosionTriggered = true;
          for (const sp of sparks) {
            sp.x = cx;
            sp.y = cy;
          }
        }

        const drag = Math.pow(0.945, stepScale);
        sparkAlpha *= Math.pow(0.965, stepScale);

        for (const sp of sparks) {
          sp.vx *= drag;
          sp.vy *= drag;
          sp.x += sp.vx * stepScale;
          sp.y += sp.vy * stepScale;
        }

        ctx.globalAlpha = Math.max(0, Math.min(1, sparkAlpha));
        for (let c = 0; c < WARP_COLORS.length; c++) {
          ctx.fillStyle = WARP_COLORS[c];
          ctx.beginPath();
          for (let i = c; i < sparks.length; i += WARP_COLORS.length) {
            const sp = sparks[i];
            ctx.moveTo(sp.x + sp.size, sp.y);
            ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
          }
          ctx.fill();
        }
      }

      ctx.globalAlpha = 1;
      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('orientationchange', resize);
    };
  }, [reducedMotion, isReady]);

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-0" />;
});

/* ─── Hero-Rakete für den Einflug vor der Explosion ─── */
function HeroRocketSvg({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <svg
      viewBox="0 0 80 110"
      className="h-24 w-20 sm:h-32 sm:w-24 drop-shadow-[0_0_24px_rgba(245,158,11,0.75)]"
      fill="none"
      aria-hidden="true"
    >
      {/* Große Antriebsflamme */}
      <path
        d="M28 74 L40 108 L52 74 Z"
        fill="#F59E0B"
        className={reducedMotion ? '' : 'spielbox-rocket-flame'}
      />
      <path d="M33 74 L40 97 L47 74 Z" fill="#FEF08A" />
      {/* Seitenflossen */}
      <path
        d="M24 54 L8 72 L24 70 Z"
        fill="#E11D48"
        stroke="#0F172A"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M56 54 L72 72 L56 70 Z"
        fill="#E11D48"
        stroke="#0F172A"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Raketenrumpf */}
      <path
        d="M40 6 C25 22 22 44 24 72 L56 72 C58 44 55 22 40 6 Z"
        fill="#F8FAFC"
        stroke="#0F172A"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* Rote Spitze */}
      <path d="M40 6 C32 15 29 22 27 29 L53 29 C51 22 48 15 40 6 Z" fill="#E11D48" />
      {/* Bullauge */}
      <circle cx="40" cy="46" r="8.5" fill="#38BDF8" stroke="#0F172A" strokeWidth="2.8" />
      <circle cx="37.5" cy="43.5" r="2.6" fill="#E0F2FE" />
    </svg>
  );
}

/* ─── Echte Spiele-Objekte, die aus der offenen Spielbox herausfliegen ─── */
function ControllerSvg() {
  return (
    <svg
      viewBox="0 0 64 64"
      className="h-12 w-12 sm:h-15 sm:w-15 drop-shadow-[0_8px_18px_rgba(56,189,248,0.45)]"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M16 22 H48 C54 22 57 30 55 41 C54 46 49 48 45 45 L40 39 H24 L19 45 C15 48 10 46 9 41 C7 30 10 22 16 22 Z"
        fill="#1E293B"
        stroke="#38BDF8"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path d="M20 28 V36 M16 32 H24" stroke="#F8FAFC" strokeWidth="3" strokeLinecap="round" />
      <circle cx="44" cy="29" r="2.2" fill="#F59E0B" />
      <circle cx="48" cy="33" r="2.2" fill="#10B981" />
      <circle cx="40" cy="33" r="2.2" fill="#EC4899" />
      <circle cx="44" cy="37" r="2.2" fill="#38BDF8" />
    </svg>
  );
}

function PaintPaletteSvg() {
  return (
    <svg
      viewBox="0 0 64 64"
      className="h-12 w-12 sm:h-15 sm:w-15 drop-shadow-[0_8px_18px_rgba(236,72,153,0.45)]"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M32 10 C17 10 8 20 8 33 C8 44 17 52 28 52 C33 52 35 48 34 45 C33 42 36 39 40 40 C48 42 56 37 56 29 C56 17 45 10 32 10 Z"
        fill="#FDE68A"
        stroke="#0F172A"
        strokeWidth="2.5"
      />
      <circle cx="20" cy="27" r="4" fill="#EC4899" />
      <circle cx="30" cy="20" r="4" fill="#38BDF8" />
      <circle cx="42" cy="22" r="4" fill="#10B981" />
      <circle cx="45" cy="32" r="3.6" fill="#F59E0B" />
      <circle cx="21" cy="40" r="4.2" fill="#1E293B" />
    </svg>
  );
}

function CrownSvg() {
  return (
    <svg
      viewBox="0 0 64 64"
      className="h-11 w-11 sm:h-14 sm:w-14 drop-shadow-[0_8px_18px_rgba(251,191,36,0.5)]"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M10 46 L14 20 L25 31 L32 14 L39 31 L50 20 L54 46 Z"
        fill="#FBBF24"
        stroke="#0F172A"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <rect x="10" y="45" width="44" height="6" rx="2.5" fill="#F59E0B" stroke="#0F172A" strokeWidth="2.2" />
      <circle cx="32" cy="34" r="3" fill="#38BDF8" />
    </svg>
  );
}

function DiceSvg() {
  return (
    <svg
      viewBox="0 0 64 64"
      className="h-10 w-10 sm:h-13 sm:w-13 drop-shadow-[0_8px_18px_rgba(16,185,129,0.45)]"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="12"
        y="12"
        width="40"
        height="40"
        rx="9"
        fill="#F8FAFC"
        stroke="#10B981"
        strokeWidth="2.8"
      />
      <circle cx="23" cy="23" r="3.5" fill="#0F172A" />
      <circle cx="41" cy="23" r="3.5" fill="#0F172A" />
      <circle cx="32" cy="32" r="3.5" fill="#F59E0B" />
      <circle cx="23" cy="41" r="3.5" fill="#0F172A" />
      <circle cx="41" cy="41" r="3.5" fill="#0F172A" />
    </svg>
  );
}

function StarGemSvg() {
  return (
    <svg
      viewBox="0 0 64 64"
      className="h-10 w-10 sm:h-12 sm:w-12 drop-shadow-[0_8px_18px_rgba(245,158,11,0.45)]"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M32 8 L39 23 L55 25 L43 36 L46 53 L32 45 L18 53 L21 36 L9 25 L25 23 Z"
        fill="#38BDF8"
        stroke="#FDE68A"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface FlyingObject {
  id: string;
  tx: string;
  ty: string;
  rot: string;
  delayMs: number;
  render: () => ReactNode;
}

// Koordinaten skaliert für alle Bildschirmgrößen (alle 5 Symbole schweben stets frei über Titel & Box)
const FLYING_OBJECTS: FlyingObject[] = [
  {
    id: 'palette',
    tx: 'clamp(-220px, -27vw, -108px)',
    ty: 'clamp(-195px, -34vh, -126px)',
    rot: '-14deg',
    delayMs: 2220,
    render: () => <PaintPaletteSvg />,
  },
  {
    id: 'controller',
    tx: 'clamp(108px, 27vw, 220px)',
    ty: 'clamp(-190px, -33vh, -124px)',
    rot: '14deg',
    delayMs: 2310,
    render: () => <ControllerSvg />,
  },
  {
    id: 'crown',
    tx: '0px',
    ty: 'clamp(-224px, -38vh, -138px)',
    rot: '-4deg',
    delayMs: 2400,
    render: () => <CrownSvg />,
  },
  {
    id: 'dice',
    tx: 'max(-255px, -40vw)',
    ty: 'max(-118px, -16vh)',
    rot: '-18deg',
    delayMs: 2480,
    render: () => <DiceSvg />,
  },
  {
    id: 'star',
    tx: 'min(255px, 40vw)',
    ty: 'max(-118px, -16vh)',
    rot: '20deg',
    delayMs: 2560,
    render: () => <StarGemSvg />,
  },
];

/**
 * Memoisierte Animationsbühne: bleibt bereits während der kurzen Initialisierung
 * leichtgewichtig im DOM und re-rendert während des gesamten Lade-Fortschritts 0-mal.
 */
const SplashStage = memo(function SplashStage({
  isStageReady,
  prefersReducedMotion,
}: {
  isStageReady: boolean;
  prefersReducedMotion: boolean;
}) {
  const animateStage = isStageReady && !prefersReducedMotion;

  return (
    <div
      className={`relative z-20 my-auto flex flex-col items-center justify-center px-2 ${
        !isStageReady ? 'invisible opacity-0 pointer-events-none' : ''
      } ${animateStage ? 'spielbox-stage-shake' : ''}`}
    >
      {/* AKT 1: Hero-Rakete fliegt von links unten ins Zentrum */}
      {!prefersReducedMotion && (
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30">
          <div className={animateStage ? 'spielbox-rocket-in' : 'opacity-0'}>
            <HeroRocketSvg reducedMotion={!animateStage} />
          </div>
        </div>
      )}

      {/* AKT 2: Explosions-Blitz & Schockwelle beim Einschlag */}
      {!prefersReducedMotion && (
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex items-center justify-center">
          <div
            className={`h-48 w-48 sm:h-60 sm:w-60 rounded-full bg-[radial-gradient(circle,#FFFFFF_0%,#FBBF24_32%,rgba(245,158,11,0.34)_54%,rgba(245,158,11,0)_72%)] ${
              animateStage ? 'spielbox-blast-flash' : 'opacity-0'
            }`}
          />
          <div
            className={`absolute h-36 w-36 sm:h-48 sm:w-48 rounded-full border-[3px] border-[#FDE68A] shadow-[0_0_24px_#F59E0B] ${
              animateStage ? 'spielbox-shockwave' : 'opacity-0'
            }`}
          />
        </div>
      )}

      {/* AKT 4b: Echte Spiele-Objekte fliegen um den Titel herum aus der Box */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
        {FLYING_OBJECTS.map((obj) => (
          <div
            key={obj.id}
            style={
              prefersReducedMotion
                ? ({
                    transform: `translate3d(${obj.tx}, ${obj.ty}, 0) rotate(${obj.rot})`,
                  } as CSSProperties)
                : ({
                    '--tx': obj.tx,
                    '--ty': obj.ty,
                    '--rot': obj.rot,
                    animationDelay: animateStage ? `${obj.delayMs}ms` : undefined,
                  } as CSSProperties)
            }
            className={`absolute -top-6 -left-6 block ${
              prefersReducedMotion ? 'opacity-100' : animateStage ? 'spielbox-burst' : 'opacity-0'
            }`}
          >
            <div
              style={
                animateStage
                  ? ({ animationDelay: `${obj.delayMs + 860}ms` } as CSSProperties)
                  : undefined
              }
              className={animateStage ? 'spielbox-float' : undefined}
            >
              {obj.render()}
            </div>
          </div>
        ))}
      </div>

      {/* AKT 4c: Titel über der offenen Spielbox */}
      <div
        className={`relative z-20 mb-3 sm:mb-4 landscape:mb-1.5 flex flex-col items-center text-center ${
          animateStage ? 'spielbox-title' : !prefersReducedMotion ? 'opacity-0' : ''
        }`}
      >
        <span className="font-arcade mb-1 text-[10px] sm:text-xs landscape:text-[9px] tracking-[0.26em] text-[#FDE68A]/85 uppercase">
          PARTY &amp; MULTIPLAYER
        </span>
        <h1 className="font-arcade text-4xl xs:text-5xl sm:text-6xl md:text-7xl landscape:text-4xl leading-none tracking-[0.08em] text-white uppercase drop-shadow-[0_10px_28px_rgba(0,0,0,0.65)]">
          PROJEKT <span className="text-[#FBBF24]">BOX</span>
        </h1>
        <div className="mt-2.5 landscape:mt-1.5 h-[3px] w-40 sm:w-64 rounded-full bg-gradient-to-r from-transparent via-[#F59E0B] to-transparent shadow-[0_0_16px_#F59E0B]" />
      </div>

      {/* AKT 3: Isometrische 3D-Spielbox erscheint aus der Explosion & öffnet sich */}
      <div
        className={`relative z-10 ${
          animateStage ? 'spielbox-drop' : !prefersReducedMotion ? 'opacity-0' : ''
        }`}
      >
        {/* AKT 4a: Aufsteigender Lichtkegel direkt aus dem Box-Inneren (verankert an der Box für alle Seitenverhältnisse) */}
        <svg
          viewBox="0 0 240 220"
          preserveAspectRatio="none"
          aria-hidden="true"
          className={`pointer-events-none absolute bottom-[46%] left-1/2 h-[32vh] sm:h-[38vh] landscape:h-[40vh] w-56 sm:w-80 landscape:w-60 -translate-x-1/2 ${
            animateStage ? 'spielbox-beam' : !prefersReducedMotion ? 'opacity-0' : ''
          }`}
        >
          <defs>
            <linearGradient id="spielboxBeamGrad" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity="0" />
              <stop offset="14%" stopColor="#FBBF24" stopOpacity="0.34" />
              <stop offset="56%" stopColor="#38BDF8" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#38BDF8" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="spielboxBeamEdgeMask" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="white" stopOpacity="0" />
              <stop offset="28%" stopColor="white" stopOpacity="1" />
              <stop offset="72%" stopColor="white" stopOpacity="1" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </linearGradient>
            <mask id="spielboxBeamMask">
              <rect width="240" height="220" fill="url(#spielboxBeamEdgeMask)" />
            </mask>
          </defs>
          <polygon
            points="82,220 158,220 240,0 0,0"
            fill="url(#spielboxBeamGrad)"
            mask="url(#spielboxBeamMask)"
          />
        </svg>

        {/* Nahtloser, weich auslaufender Boden-Glow unter der Box (ohne harte Oval-Kante) */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute -bottom-11 sm:-bottom-14 landscape:-bottom-7 left-1/2 flex h-32 w-80 sm:h-36 sm:w-[26rem] landscape:h-20 landscape:w-64 -translate-x-1/2 items-center justify-center ${
            animateStage ? 'spielbox-floor' : !prefersReducedMotion ? 'opacity-0' : ''
          }`}
        >
          {/* Weite, samtig verlaufende Studio-Aura (läuft weit vor dem Rand auf 0% Transparenz) */}
          <div className="spielbox-floor-pulse absolute inset-0 bg-[radial-gradient(ellipse_62%_48%_at_50%_46%,rgba(251,191,36,0.30)_0%,rgba(245,158,11,0.16)_32%,rgba(245,158,11,0.05)_54%,transparent_72%)]" />
          {/* Konzentrierter goldener Bodenreflex direkt unter dem Sockel */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_36%_24%_at_50%_42%,rgba(255,251,235,0.52)_0%,rgba(253,224,71,0.32)_36%,rgba(245,158,11,0.10)_58%,transparent_72%)]" />
        </div>

        <svg
          viewBox="0 0 220 200"
          className="h-32 w-36 sm:h-44 sm:w-48 landscape:h-24 landscape:w-28 drop-shadow-[0_18px_30px_rgba(0,0,0,0.6)]"
          fill="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="boxCoreGlow" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="60%" stopColor="#FBBF24" />
              <stop offset="100%" stopColor="#38BDF8" />
            </linearGradient>
          </defs>
          <polygon
            points="110,58 176,90 110,122 44,90"
            fill="url(#boxCoreGlow)"
            opacity="0.92"
          />
          <polygon
            points="40,92 110,126 110,184 40,150"
            fill="#0F172A"
            stroke="#F59E0B"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <polygon points="56,114 94,132 94,142 56,124" fill="#F59E0B" opacity="0.85" />
          <polygon
            points="180,92 110,126 110,184 180,150"
            fill="#1E293B"
            stroke="#F59E0B"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <circle cx="146" cy="138" r="9" fill="#10B981" opacity="0.9" />
          <rect
            x="104"
            y="119"
            width="12"
            height="16"
            rx="3"
            fill="#FBBF24"
            stroke="#0F172A"
            strokeWidth="2"
          />
          <g className={animateStage ? 'spielbox-lid' : undefined}>
            <polygon
              points="110,48 184,84 110,120 36,84"
              fill="#334155"
              stroke="#F59E0B"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            <polygon
              points="36,84 110,120 110,130 36,94"
              fill="#0F172A"
              stroke="#F59E0B"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <polygon
              points="184,84 110,120 110,130 184,94"
              fill="#1E293B"
              stroke="#F59E0B"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </g>
        </svg>
      </div>
    </div>
  );
});

const ProgressTrack = memo(function ProgressTrack({
  fillRef,
  dotTrackRef,
  isFadingOut,
}: {
  fillRef: React.RefObject<HTMLDivElement | null>;
  dotTrackRef: React.RefObject<HTMLDivElement | null>;
  isFadingOut: boolean;
}) {
  return (
    <div className="relative h-3 sm:h-3.5 landscape:h-2.5 w-full rounded-full border border-white/25 bg-[#09111F]/90 p-[2px] shadow-[0_6px_22px_rgba(0,0,0,0.6),0_0_24px_rgba(245,158,11,0.18),inset_0_1px_2px_rgba(0,0,0,0.7)]">
      <div className="relative h-full w-full overflow-hidden rounded-full bg-white/[0.07]">
        <div
          ref={fillRef}
          style={{
            transform: isFadingOut ? 'scaleX(1)' : 'scaleX(0)',
            background: 'linear-gradient(90deg, #F59E0B 0%, #FBBF24 46%, #34D399 84%, #10B981 100%)',
          }}
          className="relative h-full w-full origin-left rounded-full will-change-transform shadow-[0_0_18px_rgba(251,191,36,0.85)]"
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-full bg-white/30"
          />
        </div>
      </div>
      <div
        ref={dotTrackRef}
        style={{
          transform: isFadingOut ? 'translate3d(0%, 0, 0)' : 'translate3d(-100%, 0, 0)',
        }}
        className="pointer-events-none absolute inset-0 will-change-transform"
      >
        <span className="absolute right-0 top-1/2 h-4 w-4 sm:h-[18px] sm:w-[18px] landscape:h-3 landscape:w-3 translate-x-1/2 -translate-y-1/2 rounded-full border border-[#FDE68A] bg-white shadow-[0_0_14px_#FDE68A,0_0_6px_#FFFFFF]" />
      </div>
    </div>
  );
});

/**
 * Isolierte Fortschrittsleiste mit GPU-scaleX ohne Layout-Reflows und ohne Re-Renders der Bühne.
 */
const SplashProgressBar = memo(function SplashProgressBar({
  isStageReady,
  isFadingOut,
  prefersReducedMotion,
  onPrepareExit,
  onComplete,
}: {
  isStageReady: boolean;
  isFadingOut: boolean;
  prefersReducedMotion: boolean;
  onPrepareExit?: () => void;
  onComplete: () => void;
}) {
  const [progressPct, setProgressPct] = useState(0);
  const fillRef = useRef<HTMLDivElement | null>(null);
  const dotTrackRef = useRef<HTMLDivElement | null>(null);
  const lastPctRef = useRef(0);
  const preparedRef = useRef(false);

  useEffect(() => {
    if (!isStageReady || isFadingOut) return;

    const totalDuration = prefersReducedMotion ? SPLASH_REDUCED_MS : SPLASH_DURATION_MS;
    const fillDuration = Math.max(400, totalDuration - 260);
    const prepareAtMs = Math.max(200, totalDuration - PREPARE_EXIT_BEFORE_MS);
    const startTime = performance.now();
    let rafId: number | null = null;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const ratio = Math.min(1, elapsed / fillDuration);
      const eased = 1 - Math.pow(1 - ratio, 2.2);

      if (fillRef.current) {
        fillRef.current.style.transform = `scaleX(${eased})`;
      }
      if (dotTrackRef.current) {
        dotTrackRef.current.style.transform = `translate3d(${(eased - 1) * 100}%, 0, 0)`;
      }

      if (!preparedRef.current && elapsed >= prepareAtMs) {
        preparedRef.current = true;
        onPrepareExit?.();
      }

      const nextPct = Math.min(100, Math.round(eased * 100));
      if (nextPct !== lastPctRef.current) {
        lastPctRef.current = nextPct;
        setProgressPct(nextPct);
      }

      if (ratio < 1) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    const doneTimer = setTimeout(() => {
      if (!preparedRef.current) {
        preparedRef.current = true;
        onPrepareExit?.();
      }
      onComplete();
    }, totalDuration);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      clearTimeout(doneTimer);
    };
  }, [isStageReady, isFadingOut, prefersReducedMotion, onPrepareExit, onComplete]);

  const displayPct = isFadingOut ? 100 : progressPct;
  const isReadyState = displayPct >= 88;
  const statusText =
    displayPct < 32
      ? 'RAKETE IM ANFLUG...'
      : displayPct < 56
        ? 'SPIELBOX ERSCHEINT...'
        : displayPct < 88
          ? 'SPIELE WERDEN GELADEN...'
          : 'BEREIT ZUM SPIELEN!';

  return (
    <div className="relative z-20 mx-auto mb-2 sm:mb-6 landscape:mb-1 flex w-full max-w-[min(100%,24rem)] sm:max-w-[28rem] md:max-w-[32rem] flex-col gap-2.5 sm:gap-3 px-2 sm:px-4">
      <div className="flex items-center justify-between gap-3">
        <span
          className={`font-arcade text-xs sm:text-[13px] landscape:text-[11px] tracking-[0.14em] uppercase drop-shadow-[0_2px_6px_rgba(0,0,0,0.75)] transition-colors duration-200 ${
            isReadyState ? 'text-[#6EE7B7]' : 'text-[#E2E8F0]'
          }`}
        >
          {statusText}
        </span>
        <span className="font-arcade text-xs sm:text-sm landscape:text-[11px] tracking-widest text-[#FDE68A] drop-shadow-[0_2px_6px_rgba(0,0,0,0.75)] shrink-0">
          {displayPct}%
        </span>
      </div>

      <ProgressTrack fillRef={fillRef} dotTrackRef={dotTrackRef} isFadingOut={isFadingOut} />
    </div>
  );
});

export function SplashScreen({ onFinish, onPrepareExit }: SplashScreenProps) {
  const [isStageReady, setIsStageReady] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [prefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  const finishedRef = useRef(false);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Startet nach kurzer Font-Prüfung (mit festem Timeout, ohne Endlos-Warten auf window.load)
  useEffect(() => {
    let cancelled = false;
    let raf1 = 0;
    let raf2 = 0;
    let fontFallbackTimer: ReturnType<typeof setTimeout> | null = null;
    let armed = false;

    const revealStage = () => {
      if (cancelled || armed) return;
      armed = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      setIsStageReady(true);
    };

    const armWhenVisible = () => {
      if (cancelled || armed || document.visibilityState !== 'visible') return;
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(revealStage);
      });
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        armWhenVisible();
      }
    };

    const prepare = async () => {
      if (document.fonts?.ready) {
        try {
          await Promise.race([
            document.fonts.ready.then(() => undefined),
            new Promise<void>((resolve) => {
              fontFallbackTimer = setTimeout(resolve, FONTS_WAIT_MAX_MS);
            }),
          ]);
        } finally {
          if (fontFallbackTimer) {
            clearTimeout(fontFallbackTimer);
            fontFallbackTimer = null;
          }
        }
      }

      if (cancelled) return;
      if (document.visibilityState === 'visible') {
        armWhenVisible();
      } else {
        document.addEventListener('visibilitychange', onVisibilityChange);
      }
    };

    void prepare();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      if (fontFallbackTimer) clearTimeout(fontFallbackTimer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, []);

  const triggerFadeOut = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onPrepareExit?.();
    setIsFadingOut(true);

    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    fadeTimerRef.current = setTimeout(() => {
      setIsDone(true);
      onFinish?.();
    }, FADE_OUT_MS);
  }, [onFinish, onPrepareExit]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        triggerFadeOut();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [triggerFadeOut]);

  if (isDone) return null;

  return (
    <div
      aria-label="ProjektBox wird gestartet"
      className={`fixed inset-0 z-50 flex flex-col justify-between overflow-hidden bg-[#101928] text-white select-none transition-[opacity,transform] duration-350 ease-out pt-[calc(14px+env(safe-area-inset-top,0px))] pb-[calc(24px+env(safe-area-inset-bottom,0px))] sm:pb-[calc(34px+env(safe-area-inset-bottom,0px))] landscape:pb-[calc(16px+env(safe-area-inset-bottom,0px))] pl-[max(24px,env(safe-area-inset-left,0px))] pr-[max(24px,env(safe-area-inset-right,0px))] ${
        isFadingOut ? 'opacity-0 scale-[1.03] pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* 1. Vollbild Canvas-2D Hyperspace-Warp + Partikel-Explosion */}
      <HyperspaceExplosionCanvas reducedMotion={prefersReducedMotion} isReady={isStageReady} />

      {/* Subtiler Studio-Radialschein (reiner Verlauf ohne GPU-Blur-Filter) */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-1/2 left-1/2 h-[66vh] w-[86vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.12)_0%,rgba(245,158,11,0.04)_44%,transparent_72%)]" />
      </div>

      {/* Platzhalter oben für vertikale Zentrierung */}
      <div aria-hidden="true" className="h-4" />

      {/* 3. ZENTRUM: AKT 1 RAKETE -> AKT 2 EXPLOSION -> AKT 3 SPIELBOX -> AKT 4 SPIELE & TITEL */}
      <SplashStage isStageReady={isStageReady} prefersReducedMotion={prefersReducedMotion} />

      {/* 4. Unterer Ladehorizont */}
      <SplashProgressBar
        isStageReady={isStageReady}
        isFadingOut={isFadingOut}
        prefersReducedMotion={prefersReducedMotion}
        onPrepareExit={onPrepareExit}
        onComplete={triggerFadeOut}
      />
    </div>
  );
}

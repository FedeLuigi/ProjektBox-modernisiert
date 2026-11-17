import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

interface SplashScreenProps {
  onFinish?: () => void;
}

const SPLASH_DURATION_MS = 4600;
const SPLASH_REDUCED_MS = 950;
const FADE_OUT_MS = 420;

const WARP_COLORS = ['#F59E0B', '#FBBF24', '#38BDF8', '#10B981', '#F472B6', '#FDE68A'];

/**
 * Vollbild-Canvas-2D:
 * 1) Hyperspace-Warp-Sternenfeld (0 - 0.9s)
 * 2) Synchronisierte Partikel-Explosion beim Raketen-Einschlag (ab 0.9s)
 */
function HyperspaceExplosionCanvas({
  reducedMotion,
  isReady,
}: {
  reducedMotion: boolean;
  isReady: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!isReady) return;
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
    window.addEventListener('resize', resize);

    const starCount = reducedMotion ? 50 : 190;
    const stars = Array.from({ length: starCount }, (_, i) => ({
      x: (Math.random() - 0.5) * width * 1.7,
      y: (Math.random() - 0.5) * height * 1.7,
      z: Math.random() * 1200 + 80,
      color: WARP_COLORS[i % WARP_COLORS.length],
    }));

    // Explosions-Funken beim Einschlag der Rakete (t = 0.9s)
    const sparkCount = reducedMotion ? 0 : 120;
    const sparks = Array.from({ length: sparkCount }, (_, i) => {
      const angle = (i / sparkCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.18;
      const speed = 5 + Math.random() * 16;
      return {
        x: 0,
        y: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 3.5,
        alpha: 1,
        color: WARP_COLORS[i % WARP_COLORS.length],
      };
    });
    let explosionTriggered = false;

    const startTime = performance.now();
    let rafId = 0;

    const render = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      const cx = width / 2;
      const cy = height / 2;

      // Warp beschleunigt bis zum Einschlag (1.22s), danach ruhiger Drift
      const speed = reducedMotion
        ? 3
        : elapsed < 1.24
          ? 12 + elapsed * 18
          : Math.max(4.5, 32 - (elapsed - 1.24) * 14);

      ctx.clearRect(0, 0, width, height);

      // 1) Hyperspace-Tunnel
      for (const s of stars) {
        s.z -= speed;
        if (s.z <= 20) {
          s.z = 1200;
          s.x = (Math.random() - 0.5) * width * 1.7;
          s.y = (Math.random() - 0.5) * height * 1.7;
        }
        const k = 320 / s.z;
        const px = cx + s.x * k;
        const py = cy + s.y * k;
        const pk = 320 / (s.z + speed * 2.4);
        const ox = cx + s.x * pk;
        const oy = cy + s.y * pk;

        ctx.beginPath();
        ctx.strokeStyle = s.color;
        ctx.lineWidth = Math.max(1, (1 - s.z / 1200) * 3.2);
        ctx.globalAlpha = Math.min(1, (1 - s.z / 1200) * 1.1);
        ctx.moveTo(ox, oy);
        ctx.lineTo(px, py);
        ctx.stroke();
      }

      // 2) Partikel-Explosion ab t = 1.22s
      if (!reducedMotion && elapsed >= 1.22) {
        if (!explosionTriggered) {
          explosionTriggered = true;
          for (const sp of sparks) {
            sp.x = cx;
            sp.y = cy;
          }
        }

        for (const sp of sparks) {
          if (sp.alpha <= 0.02) continue;
          sp.vx *= 0.945;
          sp.vy *= 0.945;
          sp.x += sp.vx;
          sp.y += sp.vy;
          sp.alpha *= 0.965;

          ctx.beginPath();
          ctx.fillStyle = sp.color;
          ctx.globalAlpha = sp.alpha;
          ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
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
    };
  }, [reducedMotion, isReady]);

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-0" />;
}

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
  delay: string;
  render: () => ReactNode;
}

// Koordinaten skaliert für alle Bildschirmgrößen (alle 5 Symbole überall sichtbar)
const FLYING_OBJECTS: FlyingObject[] = [
  {
    id: 'palette',
    tx: 'max(-128px, -27vw)',
    ty: 'max(-185px, -25vh)',
    rot: '-14deg',
    delay: '2220ms',
    render: () => <PaintPaletteSvg />,
  },
  {
    id: 'controller',
    tx: 'min(128px, 27vw)',
    ty: 'max(-180px, -24vh)',
    rot: '14deg',
    delay: '2310ms',
    render: () => <ControllerSvg />,
  },
  {
    id: 'crown',
    tx: '0px',
    ty: 'max(-218px, -30vh)',
    rot: '-4deg',
    delay: '2400ms',
    render: () => <CrownSvg />,
  },
  {
    id: 'dice',
    tx: 'max(-255px, -39vw)',
    ty: 'max(-118px, -16vh)',
    rot: '-18deg',
    delay: '2480ms',
    render: () => <DiceSvg />,
  },
  {
    id: 'star',
    tx: 'min(255px, 39vw)',
    ty: 'max(-118px, -16vh)',
    rot: '20deg',
    delay: '2560ms',
    render: () => <StarGemSvg />,
  },
];

export function SplashScreen({ onFinish }: SplashScreenProps) {
  const [isStageReady, setIsStageReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [prefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  const finishedRef = useRef(false);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Warten bis Seite geladen, Tab sichtbar, Fonts bereit und erster Frame gerendert ist
  useEffect(() => {
    let cancelled = false;
    let raf1 = 0;
    let raf2 = 0;
    let fontFallbackTimer: ReturnType<typeof setTimeout> | null = null;

    const armWhenVisible = () => {
      if (cancelled) return;
      if (document.visibilityState !== 'visible') return;

      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          if (!cancelled) setIsStageReady(true);
        });
      });
    };

    const waitForLoadAndFonts = async () => {
      if (document.readyState !== 'complete') {
        await new Promise<void>((resolve) => {
          const onLoad = () => {
            window.removeEventListener('load', onLoad);
            resolve();
          };
          window.addEventListener('load', onLoad);
        });
      }

      if (document.fonts?.ready) {
        await Promise.race([
          document.fonts.ready.then(() => undefined),
          new Promise<void>((resolve) => {
            fontFallbackTimer = setTimeout(resolve, 900);
          }),
        ]);
      }

      if (!cancelled) {
        if (document.visibilityState === 'visible') {
          armWhenVisible();
        } else {
          document.addEventListener('visibilitychange', armWhenVisible, { once: true });
        }
      }
    };

    void waitForLoadAndFonts();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      if (fontFallbackTimer) clearTimeout(fontFallbackTimer);
      document.removeEventListener('visibilitychange', armWhenVisible);
    };
  }, []);

  const triggerFadeOut = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setProgress(100);
    setIsFadingOut(true);

    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    fadeTimerRef.current = setTimeout(() => {
      setIsDone(true);
      onFinish?.();
    }, FADE_OUT_MS);
  }, [onFinish]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        triggerFadeOut();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [triggerFadeOut]);

  useEffect(() => {
    if (!isStageReady) return;

    const totalDuration = prefersReducedMotion ? SPLASH_REDUCED_MS : SPLASH_DURATION_MS;
    const fillDuration = Math.max(400, totalDuration - 260);
    const startTime = performance.now();
    let rafId: number | null = null;

    const updateProgress = (now: number) => {
      const elapsed = now - startTime;
      const ratio = Math.min(1, elapsed / fillDuration);
      const eased = 1 - Math.pow(1 - ratio, 2.2);
      const nextPct = Math.min(100, Math.round(eased * 100));
      setProgress(nextPct);

      if (ratio < 1 && !finishedRef.current) {
        rafId = requestAnimationFrame(updateProgress);
      }
    };

    rafId = requestAnimationFrame(updateProgress);
    const doneTimer = setTimeout(triggerFadeOut, totalDuration);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      clearTimeout(doneTimer);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, [isStageReady, prefersReducedMotion, triggerFadeOut]);

  if (isDone) return null;

  const isReadyState = progress >= 88;
  const statusText =
    progress < 32
      ? 'RAKETE IM ANFLUG...'
      : progress < 56
        ? 'SPIELBOX ERSCHEINT...'
        : progress < 88
          ? 'SPIELE WERDEN GELADEN...'
          : 'BEREIT ZUM SPIELEN!';

  return (
    <div
      aria-label="ProjektBox wird gestartet"
      className={`fixed inset-0 z-50 flex flex-col justify-between overflow-hidden bg-[#101928] text-white select-none transition-[opacity,transform] duration-350 ease-out pt-[calc(14px+env(safe-area-inset-top,0px))] pb-[calc(16px+env(safe-area-inset-bottom,0px))] pl-[max(20px,env(safe-area-inset-left,0px))] pr-[max(20px,env(safe-area-inset-right,0px))] ${
        isFadingOut ? 'opacity-0 scale-[1.03] pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* 1. Vollbild Canvas-2D Hyperspace-Warp + Partikel-Explosion */}
      <HyperspaceExplosionCanvas reducedMotion={prefersReducedMotion} isReady={isStageReady} />

      {/* Subtiler Studio-Radialschein */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-1/2 left-1/2 h-[54vh] w-[72vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#F59E0B]/[0.09] blur-[110px]" />
      </div>

      {/* Platzhalter oben für vertikale Zentrierung */}
      <div aria-hidden="true" className="h-4" />

      {/* 3. ZENTRUM: AKT 1 RAKETE -> AKT 2 EXPLOSION -> AKT 3 SPIELBOX -> AKT 4 SPIELE & TITEL */}
      {isStageReady && (
      <div
        className={`relative z-20 my-auto flex flex-col items-center justify-center px-2 ${
          prefersReducedMotion ? '' : 'spielbox-stage-shake'
        }`}
      >
        {/* AKT 1: Hero-Rakete fliegt von links unten ins Zentrum */}
        {!prefersReducedMotion && (
          <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30">
            <div className="spielbox-rocket-in">
              <HeroRocketSvg reducedMotion={prefersReducedMotion} />
            </div>
          </div>
        )}

        {/* AKT 2: Explosions-Blitz & Schockwelle beim Einschlag */}
        {!prefersReducedMotion && (
          <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex items-center justify-center">
            <div className="spielbox-blast-flash h-44 w-44 sm:h-56 sm:w-56 rounded-full bg-[radial-gradient(circle,#FFFFFF_0%,#FBBF24_38%,rgba(245,158,11,0)_72%)] blur-md" />
            <div className="spielbox-shockwave absolute h-36 w-36 sm:h-48 sm:w-48 rounded-full border-[#FDE68A] shadow-[0_0_32px_#F59E0B]" />
          </div>
        )}

        {/* AKT 4a: Aufsteigender Lichtkegel aus der geöffneten Box */}
        <div
          className={`pointer-events-none absolute bottom-[36%] left-1/2 h-[34vh] sm:h-[40vh] w-56 sm:w-80 -translate-x-1/2 bg-gradient-to-t from-[#F59E0B]/35 via-[#38BDF8]/15 to-transparent blur-xl ${
            prefersReducedMotion ? '' : 'spielbox-beam'
          }`}
          style={{ clipPath: 'polygon(30% 100%, 70% 100%, 100% 0%, 0% 0%)' }}
        />

        {/* AKT 4b: Echte Spiele-Objekte fliegen um den Titel herum aus der Box */}
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
          {FLYING_OBJECTS.map((obj) => (
            <div
              key={obj.id}
              style={
                {
                  '--tx': obj.tx,
                  '--ty': obj.ty,
                  '--rot': obj.rot,
                  animationDelay: prefersReducedMotion ? undefined : `${obj.delay}, 3250ms`,
                } as CSSProperties
              }
              className={`absolute -top-6 -left-6 block ${
                prefersReducedMotion ? 'opacity-100' : 'spielbox-burst'
              }`}
            >
              {obj.render()}
            </div>
          ))}
        </div>

        {/* AKT 4c: Titel über der offenen Spielbox */}
        <div
          className={`relative z-20 mb-3 sm:mb-4 flex flex-col items-center text-center ${
            prefersReducedMotion ? '' : 'spielbox-title'
          }`}
        >
          <span className="font-arcade mb-1 text-[10px] sm:text-xs tracking-[0.26em] text-[#FDE68A]/85 uppercase">
            PARTY &amp; MULTIPLAYER
          </span>
          <h1 className="font-arcade text-4xl xs:text-5xl sm:text-6xl md:text-7xl leading-none tracking-[0.08em] text-white uppercase drop-shadow-[0_10px_28px_rgba(0,0,0,0.65)]">
            PROJEKT <span className="text-[#FBBF24]">BOX</span>
          </h1>
          <div className="mt-2.5 h-[3px] w-40 sm:w-64 rounded-full bg-gradient-to-r from-transparent via-[#F59E0B] to-transparent shadow-[0_0_16px_#F59E0B]" />
        </div>

        {/* AKT 3: Isometrische 3D-Spielbox erscheint aus der Explosion & öffnet sich */}
        <div className={`relative z-10 ${prefersReducedMotion ? '' : 'spielbox-drop'}`}>
          <div
            className={`pointer-events-none absolute -bottom-3 left-1/2 h-6 w-36 sm:w-44 -translate-x-1/2 rounded-full bg-[#F59E0B]/30 blur-md ${
              prefersReducedMotion ? '' : 'spielbox-floor'
            }`}
          />

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
            <g className={prefersReducedMotion ? '' : 'spielbox-lid'}>
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
      )}

      {/* 4. Unterer Ladehorizont */}
      <div className="relative z-20 mx-auto flex w-full max-w-[1440px] flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <span
            className={`font-arcade text-[11px] sm:text-xs tracking-[0.16em] uppercase transition-colors duration-200 ${
              isReadyState ? 'text-[#6EE7B7]' : 'text-[#CBD5E1]'
            }`}
          >
            {statusText}
          </span>
          <span className="font-arcade text-xs sm:text-sm tracking-widest text-[#FDE68A]">
            {progress}%
          </span>
        </div>

        <div className="relative h-1 w-full overflow-hidden rounded-full bg-white/10">
          <div
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #F59E0B 0%, #FBBF24 55%, #10B981 100%)',
            }}
            className="relative h-full rounded-full transition-[width] duration-75 ease-out shadow-[0_0_16px_rgba(245,158,11,0.75)]"
          >
            <span className="absolute right-0 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-white shadow-[0_0_12px_#FFFFFF]" />
          </div>
        </div>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

interface SplashScreenProps {
  onFinish?: () => void;
}

const SPLASH_DURATION_MS = 2700;
const SPLASH_REDUCED_MS = 950;
const FADE_OUT_MS = 360;

const WARP_COLORS = ['#F59E0B', '#FBBF24', '#38BDF8', '#10B981', '#F472B6', '#FDE68A'];

/**
 * Vollbild-Canvas-2D Hyperspace-Warp-Sternenfeld mit 3D-Z-Tiefenprojektion.
 */
function HyperspaceWarpCanvas({ reducedMotion }: { reducedMotion: boolean }) {
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
    window.addEventListener('resize', resize);

    const starCount = reducedMotion ? 55 : 190;
    const stars = Array.from({ length: starCount }, (_, i) => ({
      x: (Math.random() - 0.5) * width * 1.7,
      y: (Math.random() - 0.5) * height * 1.7,
      z: Math.random() * 1200 + 80,
      color: WARP_COLORS[i % WARP_COLORS.length],
    }));

    const startTime = performance.now();
    let rafId = 0;

    const render = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      const cx = width / 2;
      const cy = height / 2;
      const speed = reducedMotion ? 3 : Math.min(30, 8 + elapsed * 14);

      ctx.clearRect(0, 0, width, height);

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
        ctx.lineWidth = Math.max(1, (1 - s.z / 1200) * 3.1);
        ctx.globalAlpha = Math.min(1, (1 - s.z / 1200) * 1.15);
        ctx.moveTo(ox, oy);
        ctx.lineTo(px, py);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, [reducedMotion]);

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-0" />;
}

/* ─── Echte illustrierte SVG-Objekte, die aus der Spielbox fliegen ─── */

function RocketSvg({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <svg viewBox="0 0 64 64" className="h-14 w-14 sm:h-16 sm:w-16 drop-shadow-[0_8px_16px_rgba(245,158,11,0.45)]" fill="none" aria-hidden="true">
      {/* Antriebsflamme */}
      <path
        d="M27 46 L32 61 L37 46 Z"
        fill="#F59E0B"
        className={reducedMotion ? '' : 'spielbox-rocket-flame'}
      />
      <path d="M29.5 46 L32 55 L34.5 46 Z" fill="#FEF08A" />
      {/* Seitenflossen */}
      <path d="M22 33 L12 44 L22 43 Z" fill="#E11D48" stroke="#0F172A" strokeWidth="2" strokeLinejoin="round" />
      <path d="M42 33 L52 44 L42 43 Z" fill="#E11D48" stroke="#0F172A" strokeWidth="2" strokeLinejoin="round" />
      {/* Raketenkörper */}
      <path
        d="M32 6 C23 15 21 28 22 44 L42 44 C43 28 41 15 32 6 Z"
        fill="#F8FAFC"
        stroke="#0F172A"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Rote Spitze */}
      <path d="M32 6 C27.5 11 25.5 15 24.5 19 L39.5 19 C38.5 15 36.5 11 32 6 Z" fill="#E11D48" />
      {/* Bullauge */}
      <circle cx="32" cy="29" r="5.5" fill="#38BDF8" stroke="#0F172A" strokeWidth="2.2" />
      <circle cx="30.5" cy="27.5" r="1.6" fill="#E0F2FE" />
    </svg>
  );
}

function ControllerSvg() {
  return (
    <svg viewBox="0 0 64 64" className="h-13 w-13 sm:h-15 sm:w-15 drop-shadow-[0_8px_16px_rgba(56,189,248,0.4)]" fill="none" aria-hidden="true">
      <path
        d="M16 22 H48 C54 22 57 30 55 41 C54 46 49 48 45 45 L40 39 H24 L19 45 C15 48 10 46 9 41 C7 30 10 22 16 22 Z"
        fill="#1E293B"
        stroke="#38BDF8"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Steuerkreuz */}
      <path d="M20 28 V36 M16 32 H24" stroke="#F8FAFC" strokeWidth="3" strokeLinecap="round" />
      {/* Aktionstasten */}
      <circle cx="44" cy="29" r="2.2" fill="#F59E0B" />
      <circle cx="48" cy="33" r="2.2" fill="#10B981" />
      <circle cx="40" cy="33" r="2.2" fill="#EC4899" />
      <circle cx="44" cy="37" r="2.2" fill="#38BDF8" />
    </svg>
  );
}

function PaintPaletteSvg() {
  return (
    <svg viewBox="0 0 64 64" className="h-13 w-13 sm:h-15 sm:w-15 drop-shadow-[0_8px_16px_rgba(236,72,153,0.4)]" fill="none" aria-hidden="true">
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
    <svg viewBox="0 0 64 64" className="h-12 w-12 sm:h-14 sm:w-14 drop-shadow-[0_8px_16px_rgba(251,191,36,0.45)]" fill="none" aria-hidden="true">
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
    <svg viewBox="0 0 64 64" className="h-11 w-11 sm:h-13 sm:w-13 drop-shadow-[0_8px_16px_rgba(16,185,129,0.4)]" fill="none" aria-hidden="true">
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
    <svg viewBox="0 0 64 64" className="h-11 w-11 sm:h-12 sm:w-12 drop-shadow-[0_8px_16px_rgba(245,158,11,0.4)]" fill="none" aria-hidden="true">
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
  mobileHide: boolean;
  render: (reducedMotion: boolean) => ReactNode;
}

const FLYING_OBJECTS: FlyingObject[] = [
  {
    id: 'rocket',
    tx: '-148px',
    ty: '-150px',
    rot: '-22deg',
    delay: '620ms',
    mobileHide: false,
    render: (rm) => <RocketSvg reducedMotion={rm} />,
  },
  {
    id: 'controller',
    tx: '150px',
    ty: '-142px',
    rot: '14deg',
    delay: '690ms',
    mobileHide: false,
    render: () => <ControllerSvg />,
  },
  {
    id: 'palette',
    tx: '-110px',
    ty: '-225px',
    rot: '-10deg',
    delay: '760ms',
    mobileHide: true,
    render: () => <PaintPaletteSvg />,
  },
  {
    id: 'crown',
    tx: '112px',
    ty: '-220px',
    rot: '12deg',
    delay: '820ms',
    mobileHide: true,
    render: () => <CrownSvg />,
  },
  {
    id: 'dice',
    tx: '-215px',
    ty: '-55px',
    rot: '-18deg',
    delay: '880ms',
    mobileHide: true,
    render: () => <DiceSvg />,
  },
  {
    id: 'star',
    tx: '215px',
    ty: '-58px',
    rot: '20deg',
    delay: '930ms',
    mobileHide: true,
    render: () => <StarGemSvg />,
  },
];

export function SplashScreen({ onFinish }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [prefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  const finishedRef = useRef(false);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        triggerFadeOut();
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      clearTimeout(doneTimer);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [prefersReducedMotion, triggerFadeOut]);

  if (isDone) return null;

  const isReadyState = progress >= 88;
  const statusText =
    progress < 36
      ? 'HYPERSPACE-WARP AKTIV...'
      : progress < 86
        ? 'SPIELBOX WIRD GEÖFFNET...'
        : 'BEREIT ZUM SPIELEN!';

  return (
    <div
      onClick={triggerFadeOut}
      aria-label="ProjektBox wird gestartet"
      className={`fixed inset-0 z-50 flex flex-col justify-between overflow-hidden bg-[#101928] text-white select-none cursor-pointer transition-[opacity,transform] duration-350 ease-out pt-[calc(14px+env(safe-area-inset-top,0px))] pb-[calc(16px+env(safe-area-inset-bottom,0px))] pl-[max(20px,env(safe-area-inset-left,0px))] pr-[max(20px,env(safe-area-inset-right,0px))] ${
        isFadingOut ? 'opacity-0 scale-[1.03] pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* 1. Vollbild Canvas-2D Hyperspace-Warp Tunnel */}
      <HyperspaceWarpCanvas reducedMotion={prefersReducedMotion} />

      {/* Subtiler Studio-Radialschein hinter der Spielbox */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-1/2 left-1/2 h-[54vh] w-[72vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#F59E0B]/[0.09] blur-[110px]" />
      </div>

      {/* 2. Obere Zeile */}
      <div className="relative z-20 mx-auto flex w-full max-w-[1440px] items-center justify-between text-[10px] sm:text-xs font-arcade tracking-[0.2em] text-white/55 uppercase">
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#34D399] shadow-[0_0_10px_#34D399] animate-pulse" />
          <span>PROJEKTBOX ARENA</span>
        </span>
        <span className="text-white/45">TIPPEN ZUM ÜBERSPRINGEN</span>
      </div>

      {/* 3. ZENTRUM: SPIELBOX UNBOXING + HERAUSFLIEGENDE OBJEKTE */}
      <div className="relative z-20 my-auto flex flex-col items-center justify-center px-2">
        {/* Aufsteigender Lichtkegel aus der Box */}
        <div
          className={`pointer-events-none absolute bottom-[36%] left-1/2 h-[34vh] sm:h-[40vh] w-56 sm:w-80 -translate-x-1/2 bg-gradient-to-t from-[#F59E0B]/35 via-[#38BDF8]/15 to-transparent blur-xl ${
            prefersReducedMotion ? '' : 'spielbox-beam'
          }`}
          style={{ clipPath: 'polygon(30% 100%, 70% 100%, 100% 0%, 0% 0%)' }}
        />

        {/* Echte Objekte (Rakete, Controller, Palette, Krone, Würfel, Stern), die aus der Box fliegen */}
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          {FLYING_OBJECTS.map((obj) => (
            <div
              key={obj.id}
              style={
                {
                  '--tx': obj.tx,
                  '--ty': obj.ty,
                  '--rot': obj.rot,
                  animationDelay: prefersReducedMotion ? undefined : `${obj.delay}, 1450ms`,
                } as CSSProperties
              }
              className={`absolute -top-7 -left-7 ${obj.mobileHide ? 'hidden sm:block' : 'block'} ${
                prefersReducedMotion ? 'opacity-100' : 'spielbox-burst'
              }`}
            >
              {obj.render(prefersReducedMotion)}
            </div>
          ))}
        </div>

        {/* Titel über der offenen Spielbox */}
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

        {/* Isometrische 3D-Spielbox */}
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

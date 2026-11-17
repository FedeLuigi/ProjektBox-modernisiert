import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { Dices, Gamepad2, Palette, Sparkles, Tv, Zap } from 'lucide-react';

interface SplashScreenProps {
  onFinish?: () => void;
}

const SPLASH_DURATION_MS = 2600;
const SPLASH_REDUCED_MS = 950;
const FADE_OUT_MS = 360;

const BURST_TOKENS = [
  {
    id: 'palette',
    icon: Palette,
    tx: '-155px',
    ty: '-140px',
    rot: '-14deg',
    delay: '640ms',
    boxClass: 'border-[#F59E0B]/55 bg-[#F59E0B]/20 text-[#FDE68A] shadow-[0_0_24px_rgba(245,158,11,0.35)]',
    mobileHide: false,
  },
  {
    id: 'tv',
    icon: Tv,
    tx: '155px',
    ty: '-135px',
    rot: '12deg',
    delay: '700ms',
    boxClass: 'border-[#38BDF8]/55 bg-[#38BDF8]/20 text-[#BAE6FD] shadow-[0_0_24px_rgba(56,189,248,0.35)]',
    mobileHide: false,
  },
  {
    id: 'gamepad',
    icon: Gamepad2,
    tx: '-105px',
    ty: '-210px',
    rot: '-8deg',
    delay: '760ms',
    boxClass: 'border-[#34D399]/55 bg-[#10B981]/20 text-[#A7F3D0] shadow-[0_0_24px_rgba(16,185,129,0.35)]',
    mobileHide: true,
  },
  {
    id: 'dices',
    icon: Dices,
    tx: '110px',
    ty: '-205px',
    rot: '16deg',
    delay: '820ms',
    boxClass: 'border-[#F472B6]/55 bg-[#EC4899]/20 text-[#FBCFE8] shadow-[0_0_24px_rgba(236,72,153,0.35)]',
    mobileHide: true,
  },
  {
    id: 'spark',
    icon: Sparkles,
    tx: '-215px',
    ty: '-55px',
    rot: '-20deg',
    delay: '860ms',
    boxClass: 'border-white/30 bg-white/10 text-[#FDE68A]',
    mobileHide: true,
  },
  {
    id: 'zap',
    icon: Zap,
    tx: '215px',
    ty: '-55px',
    rot: '18deg',
    delay: '900ms',
    boxClass: 'border-[#FBBF24]/50 bg-[#F59E0B]/15 text-[#FBBF24]',
    mobileHide: true,
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
      ? 'SPIELBOX LANDET...'
      : progress < 86
        ? 'SPIELBOX WIRD GEÖFFNET...'
        : 'BEREIT ZUM SPIELEN!';

  return (
    <div
      onClick={triggerFadeOut}
      aria-label="ProjektBox wird gestartet"
      className={`fixed inset-0 z-50 flex flex-col justify-between overflow-hidden bg-[#131F30] text-white select-none cursor-pointer transition-[opacity,transform] duration-350 ease-out pt-[calc(14px+env(safe-area-inset-top,0px))] pb-[calc(16px+env(safe-area-inset-bottom,0px))] pl-[max(20px,env(safe-area-inset-left,0px))] pr-[max(20px,env(safe-area-inset-right,0px))] ${
        isFadingOut ? 'opacity-0 scale-[1.03] pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* 1. Eigenständige Spotlight- & Bühnen-Atmosphäre (Spielbox-Stage) */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        {/* Radialer Studio-Verlauf */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 50% 48%, rgba(30, 49, 77, 0.95) 0%, rgba(19, 31, 48, 1) 70%)',
          }}
        />

        {/* Dezentes Perspektiv-Bühnenraster unten */}
        <div
          className="absolute inset-x-0 bottom-0 h-[44vh] opacity-20"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(245,158,11,0.22) 1px, transparent 1px), linear-gradient(to bottom, rgba(245,158,11,0.18) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
            maskImage: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 90%)',
            WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 90%)',
          }}
        />

        {/* Goldener & cyanfarbener Ambient-Glow */}
        <div className="absolute top-1/2 left-1/2 h-[52vh] w-[72vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#F59E0B]/[0.10] blur-[110px]" />
        <div className="absolute top-[30%] left-1/2 h-[38vh] w-[50vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#38BDF8]/[0.08] blur-[100px]" />
      </div>

      {/* 2. Obere Zeile */}
      <div className="relative z-10 mx-auto flex w-full max-w-[1440px] items-center justify-between text-[10px] sm:text-xs font-arcade tracking-[0.2em] text-white/55 uppercase">
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#F59E0B] shadow-[0_0_10px_#F59E0B] animate-pulse" />
          <span>EDITION 2.0</span>
        </span>
        <span className="text-white/45">TIPPEN ZUM ÜBERSPRINGEN</span>
      </div>

      {/* 3. ZENTRALE SPIELBOX-UNBOXING-BÜHNE */}
      <div className="relative z-10 my-auto flex flex-col items-center justify-center">
        {/* Aufsteigender Lichtkegel aus der geöffneten Spielbox */}
        <div
          className={`pointer-events-none absolute bottom-[38%] left-1/2 h-[34vh] sm:h-[40vh] w-56 sm:w-80 -translate-x-1/2 bg-gradient-to-t from-[#F59E0B]/35 via-[#38BDF8]/15 to-transparent blur-xl ${
            prefersReducedMotion ? '' : 'spielbox-beam'
          }`}
          style={{ clipPath: 'polygon(30% 100%, 70% 100%, 100% 0%, 0% 0%)' }}
        />

        {/* Hervorbrechende Spiele-Tokens rund um die Box */}
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          {BURST_TOKENS.map((token) => {
            const Icon = token.icon;
            return (
              <div
                key={token.id}
                style={
                  {
                    '--tx': token.tx,
                    '--ty': token.ty,
                    '--rot': token.rot,
                    animationDelay: prefersReducedMotion ? undefined : `${token.delay}, 1400ms`,
                  } as CSSProperties
                }
                className={`absolute -top-6 -left-6 flex h-11 w-11 sm:h-13 sm:w-13 items-center justify-center rounded-2xl border backdrop-blur-md ${
                  token.boxClass
                } ${token.mobileHide ? 'hidden sm:flex' : 'flex'} ${
                  prefersReducedMotion ? 'opacity-100' : 'spielbox-burst'
                }`}
              >
                <Icon className="h-5 w-5 sm:h-6 sm:w-6 stroke-[2.2]" />
              </div>
            );
          })}
        </div>

        {/* Titel, der aus der geöffneten Spielbox aufsteigt */}
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

        {/* Isometrische 3D-Spielbox (SVG) mit sich öffnendem Deckel */}
        <div className={`relative z-10 ${prefersReducedMotion ? '' : 'spielbox-drop'}`}>
          {/* Leuchtendes Boden-Podest unter der Spielbox */}
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
              <linearGradient id="boxLeftFace" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#1E293B" />
                <stop offset="100%" stopColor="#0F172A" />
              </linearGradient>
              <linearGradient id="boxRightFace" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#283548" />
                <stop offset="100%" stopColor="#162235" />
              </linearGradient>
              <linearGradient id="boxLidTop" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#334155" />
                <stop offset="100%" stopColor="#1E293B" />
              </linearGradient>
            </defs>

            {/* Inneres Leuchten der Box (sichtbar sobald sich der Deckel hebt) */}
            <polygon
              points="110,58 176,90 110,122 44,90"
              fill="url(#boxCoreGlow)"
              opacity="0.92"
            />

            {/* Linke Vorderseite der Spielbox */}
            <polygon
              points="40,92 110,126 110,184 40,150"
              fill="url(#boxLeftFace)"
              stroke="#F59E0B"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            {/* Dekorative Spielbox-Streifen links */}
            <polygon points="56,114 94,132 94,142 56,124" fill="#F59E0B" opacity="0.85" />
            <polygon points="56,133 82,146 82,152 56,139" fill="#38BDF8" opacity="0.65" />

            {/* Rechte Vorderseite der Spielbox */}
            <polygon
              points="180,92 110,126 110,184 180,150"
              fill="url(#boxRightFace)"
              stroke="#F59E0B"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            {/* Grünes Status-Emblem rechts */}
            <circle cx="146" cy="138" r="9" fill="#10B981" opacity="0.9" />
            <circle cx="146" cy="138" r="4" fill="#ECFDF5" />

            {/* Vorderes goldenes Schloss */}
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

            {/* Animierter Spielbox-Deckel, der sich nach oben öffnet */}
            <g className={prefersReducedMotion ? '' : 'spielbox-lid'}>
              {/* Deckel-Oberfläche */}
              <polygon
                points="110,48 184,84 110,120 36,84"
                fill="url(#boxLidTop)"
                stroke="#F59E0B"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              {/* Deckel-Kante links */}
              <polygon
                points="36,84 110,120 110,130 36,94"
                fill="#0F172A"
                stroke="#F59E0B"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              {/* Deckel-Kante rechts */}
              <polygon
                points="184,84 110,120 110,130 184,94"
                fill="#1E293B"
                stroke="#F59E0B"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              {/* Emblem auf dem Deckel */}
              <polygon
                points="110,68 144,84 110,100 76,84"
                fill="#F59E0B"
                fillOpacity="0.25"
                stroke="#FDE68A"
                strokeWidth="1.5"
              />
            </g>
          </svg>
        </div>
      </div>

      {/* 4. Unterer Ladehorizont */}
      <div className="relative z-10 mx-auto flex w-full max-w-[1440px] flex-col gap-2">
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

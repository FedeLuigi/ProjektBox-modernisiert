import { useCallback, useEffect, useRef, useState } from 'react';
import { Palette, Sparkles, Tv, Users } from 'lucide-react';
import { BackgroundCometCanvas } from './BackgroundCometCanvas';

interface SplashScreenProps {
  onFinish?: () => void;
}

const SPLASH_DURATION_MS = 2400;
const SPLASH_REDUCED_MS = 900;
const FADE_OUT_MS = 360;

const STAGE_PILLS = [
  {
    id: 'draw',
    label: 'ZEICHNEN & RATEN',
    icon: Palette,
    accent: 'border-[#F59E0B]/40 bg-[#F59E0B]/10 text-[#FDE68A]',
    iconColor: 'text-[#FBBF24]',
    cornerClass: 'sm:top-[18%] sm:left-[8%] lg:left-[13%]',
    delayMs: 320,
  },
  {
    id: 'tv',
    label: 'TV & CONTROLLER',
    icon: Tv,
    accent: 'border-[#38BDF8]/40 bg-[#38BDF8]/10 text-[#BAE6FD]',
    iconColor: 'text-[#38BDF8]',
    cornerClass: 'sm:top-[20%] sm:right-[8%] lg:right-[13%]',
    delayMs: 460,
  },
  {
    id: 'multi',
    label: 'ECHTZEIT-LOBBY',
    icon: Users,
    accent: 'border-[#34D399]/40 bg-[#10B981]/10 text-[#A7F3D0]',
    iconColor: 'text-[#34D399]',
    cornerClass: 'sm:bottom-[22%] sm:right-[10%] lg:right-[16%]',
    delayMs: 600,
  },
  {
    id: 'spark',
    label: 'OPEN GALLERY',
    icon: Sparkles,
    accent: 'border-white/20 bg-white/[0.06] text-white/90',
    iconColor: 'text-[#FDE68A]',
    cornerClass: 'sm:bottom-[24%] sm:left-[10%] lg:left-[16%]',
    delayMs: 720,
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
      const eased = 1 - Math.pow(1 - ratio, 2.3);
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
    progress < 42
      ? 'BÜHNE WIRD VORBEREITET...'
      : progress < 88
        ? 'SPIELWELT & LOBBY STARTEN...'
        : 'BEREIT ZUM SPIELEN';

  return (
    <div
      onClick={triggerFadeOut}
      aria-label="ProjektBox wird gestartet"
      className={`fixed inset-0 z-50 flex flex-col justify-between overflow-hidden bg-[#1B2B40] text-white select-none cursor-pointer transition-[opacity,transform] duration-350 ease-out pt-[calc(16px+env(safe-area-inset-top,0px))] pb-[calc(18px+env(safe-area-inset-bottom,0px))] pl-[max(20px,env(safe-area-inset-left,0px))] pr-[max(20px,env(safe-area-inset-right,0px))] ${
        isFadingOut ? 'opacity-0 scale-[1.03] pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* 1. Animierter Geometrie- & Kometen-Hintergrund über den gesamten Bildschirm */}
      <BackgroundCometCanvas opacity={0.95} />

      {/* 2. Vollbild-Lichtatmosphäre & Konzentrische Orbit-Ringe */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-[20vh] left-1/2 h-[65vh] w-[95vw] -translate-x-1/2 rounded-full bg-[#F59E0B]/[0.11] blur-[120px]" />
        <div className="absolute -bottom-[22vh] left-1/2 h-[60vh] w-[90vw] -translate-x-1/2 rounded-full bg-[#10B981]/[0.10] blur-[120px]" />

        {/* Konzentrische Vollbild-Ringe */}
        <div
          className={`absolute top-1/2 left-1/2 h-[56vmin] w-[56vmin] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#F59E0B]/20 ${
            prefersReducedMotion ? '' : 'splash-ring'
          }`}
        />
        <div
          style={prefersReducedMotion ? undefined : { animationDelay: '140ms' }}
          className={`absolute top-1/2 left-1/2 h-[96vmin] w-[96vmin] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.08] ${
            prefersReducedMotion ? '' : 'splash-ring'
          }`}
        />
        <div
          style={prefersReducedMotion ? undefined : { animationDelay: '280ms' }}
          className={`absolute top-1/2 left-1/2 h-[138vmin] w-[138vmin] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#38BDF8]/[0.09] ${
            prefersReducedMotion ? '' : 'splash-ring'
          }`}
        />

        {/* Vollbild-Lichtlinien (Horizont-Sweep) */}
        <div
          className={`absolute top-1/2 inset-x-0 h-px -translate-y-16 bg-gradient-to-r from-transparent via-[#F59E0B]/55 to-transparent ${
            prefersReducedMotion ? '' : 'splash-beam'
          }`}
        />
        <div
          style={prefersReducedMotion ? undefined : { animationDelay: '180ms' }}
          className={`absolute top-1/2 inset-x-0 h-px translate-y-16 bg-gradient-to-r from-transparent via-[#38BDF8]/40 to-transparent ${
            prefersReducedMotion ? '' : 'splash-beam'
          }`}
        />
      </div>

      {/* 3. Schwebende Feature-Konstellation im Vollbild (Desktop/Tablet) */}
      <div className="pointer-events-none fixed inset-0 hidden sm:block z-10">
        {STAGE_PILLS.map((pill) => {
          const Icon = pill.icon;
          return (
            <div
              key={pill.id}
              style={prefersReducedMotion ? undefined : { animationDelay: `${pill.delayMs}ms` }}
              className={`absolute ${pill.cornerClass} flex items-center gap-2 rounded-full border px-3.5 py-1.5 backdrop-blur-md shadow-[0_12px_30px_rgba(0,0,0,0.3)] ${pill.accent} ${
                prefersReducedMotion ? '' : 'splash-pill'
              }`}
            >
              <Icon className={`h-3.5 w-3.5 shrink-0 ${pill.iconColor}`} />
              <span className="font-arcade text-[11px] tracking-wider uppercase">{pill.label}</span>
            </div>
          );
        })}
      </div>

      {/* 4. Obere Dezente Statuszeile */}
      <div className="relative z-10 mx-auto flex w-full max-w-[1440px] items-center justify-between text-[10px] sm:text-xs font-arcade tracking-[0.2em] text-white/55 uppercase">
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#34D399] shadow-[0_0_10px_#34D399] animate-pulse" />
          <span>LIVE ARENA</span>
        </span>
        <span className="text-white/45">TIPPEN ZUM ÜBERSPRINGEN</span>
      </div>

      {/* 5. Zentrale Kinetische Wortmarke im Open-Gallery-Stil */}
      <div className="relative z-10 my-auto flex flex-col items-center justify-center text-center px-2">
        <span className="font-arcade mb-2 sm:mb-3 text-[10px] sm:text-xs tracking-[0.28em] text-[#FDE68A]/85 uppercase">
          PARTY &amp; MULTIPLAYER SUITE
        </span>

        <h1
          className={`font-arcade text-5xl xs:text-6xl sm:text-7xl md:text-8xl leading-none tracking-[0.08em] text-white uppercase drop-shadow-[0_12px_32px_rgba(0,0,0,0.55)] ${
            prefersReducedMotion ? '' : 'splash-word'
          }`}
        >
          PROJEKT <span className="text-[#FBBF24]">BOX</span>
        </h1>

        <div
          className={`mt-3 sm:mt-4 h-[3px] w-48 sm:w-80 md:w-96 rounded-full bg-gradient-to-r from-transparent via-[#F59E0B] to-transparent shadow-[0_0_18px_#F59E0B] ${
            prefersReducedMotion ? '' : 'splash-underline'
          }`}
        />

        {/* Kompakte Feature-Pills auf Smartphones */}
        <div className="mt-5 flex sm:hidden flex-wrap items-center justify-center gap-2">
          {STAGE_PILLS.slice(0, 2).map((pill) => {
            const Icon = pill.icon;
            return (
              <div
                key={pill.id}
                style={prefersReducedMotion ? undefined : { animationDelay: `${pill.delayMs}ms` }}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 backdrop-blur-md ${pill.accent} ${
                  prefersReducedMotion ? '' : 'splash-pill'
                }`}
              >
                <Icon className={`h-3 w-3 shrink-0 ${pill.iconColor}`} />
                <span className="font-arcade text-[10px] tracking-wider uppercase">
                  {pill.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 6. Unterer Vollbild-Ladehorizont */}
      <div className="relative z-10 mx-auto flex w-full max-w-[1440px] flex-col gap-2.5">
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

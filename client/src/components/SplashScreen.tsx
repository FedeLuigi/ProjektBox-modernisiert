import { useCallback, useEffect, useRef, useState } from 'react';
import { Palette, Tv, type LucideIcon } from 'lucide-react';
import { IslandBackground } from './IslandBackground';

interface SplashScreenProps {
  onFinish?: () => void;
}

const SPLASH_DURATION_MS = 2200;
const SPLASH_REDUCED_MS = 950;
const FADE_OUT_MS = 320;

interface PartyIntroBadge {
  id: string;
  label: string;
  icon: LucideIcon;
  outerBg: string;
  innerBg: string;
  facetBg: string;
  borderColor: string;
  positionClass: string;
  tiltClass: string;
  clipPath: string;
  delayMs: number;
}

const PARTY_INTRO_ICONS: PartyIntroBadge[] = [
  {
    id: 'draw',
    label: 'Zeichnen & Raten',
    icon: Palette,
    outerBg: '#831843',
    innerBg: '#DB2777',
    facetBg: '#EC4899',
    borderColor: '#FBCFE8',
    positionClass: '-bottom-5 -left-3 sm:-bottom-7 sm:-left-8',
    tiltClass: 'rotate-8',
    clipPath: 'polygon(0% 6%, 95% 0%, 100% 94%, 6% 100%)',
    delayMs: 340,
  },
  {
    id: 'tv',
    label: 'TV & Controller',
    icon: Tv,
    outerBg: '#064E3B',
    innerBg: '#059669',
    facetBg: '#10B981',
    borderColor: '#A7F3D0',
    positionClass: '-bottom-5 -right-3 sm:-bottom-7 sm:-right-8',
    tiltClass: '-rotate-8',
    clipPath: 'polygon(6% 0%, 100% 6%, 94% 100%, 0% 94%)',
    delayMs: 470,
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
    const fillDuration = Math.max(400, totalDuration - 240);
    const startTime = performance.now();
    let rafId: number | null = null;

    const updateProgress = (now: number) => {
      const elapsed = now - startTime;
      const ratio = Math.min(1, elapsed / fillDuration);
      // Leichtes Ease-Out für ein organisches Arcade-Ladegefühl
      const eased = 1 - Math.pow(1 - ratio, 2.1);
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

  const statusText =
    progress < 48
      ? 'SPIELE WERDEN GELADEN...'
      : progress < 88
        ? 'MULTIPLAYER-ARENA STARTET...'
        : 'LOBBY-SYSTEM BEREIT!';

  const isReadyState = progress >= 88;

  return (
    <div
      onClick={triggerFadeOut}
      className={`fixed inset-0 min-h-dvh z-50 flex items-center justify-center overflow-hidden bg-[#1B2B40] select-none cursor-pointer transition-[opacity,transform] duration-300 ease-out ${
        isFadingOut ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
      aria-label="ProjektBox wird gestartet"
    >
      <IslandBackground />

      <div className="relative z-10 flex w-full max-w-lg flex-col items-center justify-center gap-10 sm:gap-12 px-6 py-8">
        {/* 1. ZENTRALES "PROJEKT BOX" LOGO UMGEBEN VON DEN 4 SPIEL-ICONS */}
        <div className="relative flex flex-col items-center justify-center px-7 py-6 sm:px-10 sm:py-7">
          {/* Charakteristische Spiel-Icons mit gestaffelter, federnder Pop-in-Animation */}
          {PARTY_INTRO_ICONS.map((badge) => {
            const Icon = badge.icon;
            return (
              <div
                key={badge.id}
                aria-hidden="true"
                className={`pointer-events-none absolute z-20 ${badge.positionClass} ${
                  prefersReducedMotion ? '' : 'pb-icon-pop'
                }`}
                style={
                  prefersReducedMotion
                    ? undefined
                    : { animationDelay: `${badge.delayMs}ms` }
                }
              >
                <div
                  style={{
                    clipPath: badge.clipPath,
                    backgroundColor: badge.outerBg,
                  }}
                  className={`p-[3px] shadow-[0_6px_0_rgba(15,23,42,0.55)] ${badge.tiltClass}`}
                >
                  <div
                    style={{
                      clipPath: badge.clipPath,
                      backgroundColor: badge.innerBg,
                      borderColor: badge.borderColor,
                    }}
                    className="relative flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center overflow-hidden border-t-2 border-l-2 text-white"
                  >
                    <div
                      style={{
                        backgroundColor: badge.facetBg,
                        clipPath: 'polygon(0 0, 58% 0, 36% 100%, 0 100%)',
                      }}
                      className="pointer-events-none absolute inset-0"
                    />
                    <Icon className="relative z-10 h-6 w-6 sm:h-7 sm:w-7 stroke-[2.5] drop-shadow-[0_2px_0_rgba(15,23,42,0.55)]" />
                  </div>
                </div>
              </div>
            );
          })}

          {/* Großes, leicht angeschrägtes "PROJEKT BOX" Hauptlogo im Header-Tab-Stil */}
          <div className="relative z-10 -rotate-2 transform transition-transform">
            <div
              style={{ clipPath: 'polygon(0% 0%, 100% 5%, 95% 100%, 5% 100%)' }}
              className="bg-[#0F172A] p-[4px] sm:p-[5px] shadow-[0_12px_28px_rgba(0,0,0,0.5),0_7px_0_rgba(15,23,42,0.7)]"
            >
              <div
                style={{ clipPath: 'polygon(0% 0%, 100% 5%, 95% 100%, 5% 100%)' }}
                className="relative flex flex-col items-center justify-center overflow-hidden border-[3px] border-[#F59E0B] bg-[#1E293B] px-8 py-4 sm:px-12 sm:py-5"
              >
                {/* Schräge Kristall-Facette im Hintergrund */}
                <div
                  className="pointer-events-none absolute inset-0 bg-[#334155]/75"
                  style={{ clipPath: 'polygon(0 0, 54% 0, 68% 100%, 0 100%)' }}
                />

                {/* Obere Glanzkante */}
                <div className="pointer-events-none absolute inset-x-3 top-1.5 h-1 bg-[#FDE68A]/35" />

                <h1 className="font-arcade relative z-10 text-4xl sm:text-6xl tracking-wider text-[#F8FAFC] uppercase drop-shadow-[0_4px_0_rgba(15,23,42,0.9)]">
                  PROJEKT <span className="text-[#FBBF24]">BOX</span>
                </h1>

                <span
                  style={{ clipPath: 'polygon(2% 0%, 100% 6%, 98% 100%, 0% 94%)' }}
                  className="font-arcade relative z-10 mt-1.5 border border-[#F59E0B]/60 bg-[#0F172A]/90 px-3 py-0.5 text-[10px] sm:text-xs tracking-[0.2em] text-[#FDE68A] uppercase"
                >
                  PARTY &amp; MULTIPLAYER ARENA
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. SCHRÄG ANGESCHNITTENER COMIC-ARCADE LADEBALKEN & DEUTSCHE STATUSTEXTE */}
        <div className="flex w-full max-w-[310px] sm:max-w-[360px] flex-col items-center gap-3">
          {/* Schräger Ladebalken mit Lila -> Orange -> Grün Verlauf */}
          <div
            style={{ clipPath: 'polygon(1.5% 0%, 100% 8%, 98.5% 100%, 0% 92%)' }}
            className="w-full bg-[#0F172A] p-[4px] shadow-[0_6px_0_rgba(15,23,42,0.55)]"
          >
            <div
              style={{ clipPath: 'polygon(1.5% 0%, 100% 8%, 98.5% 100%, 0% 92%)' }}
              className="relative h-6 sm:h-7 w-full overflow-hidden border-2 border-[#334155] bg-[#1E293B]"
            >
              {/* Farbiger Fortschrittsbalken (Lila -> Orange -> Grün) */}
              <div
                style={{
                  width: `${progress}%`,
                  background:
                    'linear-gradient(90deg, #7C3AED 0%, #EC4899 34%, #F59E0B 68%, #10B981 100%)',
                }}
                className="relative h-full transition-[width] duration-75 ease-out"
              >
                {/* Obere Kristall-Glanzfacette im Balken */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-white/30" />
              </div>

              {/* Prozentanzeige mittig im Ladebalken */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="font-arcade text-xs sm:text-sm tracking-widest text-white drop-shadow-[0_1.5px_0_rgba(15,23,42,0.95)]">
                  {progress}%
                </span>
              </div>
            </div>
          </div>

          {/* Wechselnder deutscher Multiplayer-Statustext ohne Überlappung */}
          <div className="min-h-[1.5rem] flex items-center justify-center text-center">
            <span
              className={`font-arcade text-xs sm:text-sm tracking-[0.14em] uppercase drop-shadow-[0_2px_0_rgba(15,23,42,0.9)] transition-colors duration-200 ${
                isReadyState ? 'text-[#6EE7B7]' : 'text-[#F8FAFC]'
              }`}
            >
              {statusText}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

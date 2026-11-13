import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { CrystalCoin, CrystalPanel, CrystalReadout, CrystalStar } from './CrystalUI';
import { IslandBackground } from './IslandBackground';

interface SplashScreenProps {
  onFinish?: () => void;
}

const SPLASH_DURATION_MS = 2600;
const SPLASH_REDUCED_MS = 1100;
const FADE_OUT_MS = 350;

const BURST_SHARDS = [
  { px: '-115px', py: '-95px', pr: '-25deg', type: 'star' as const },
  { px: '115px', py: '-95px', pr: '25deg', type: 'star' as const },
  { px: '-135px', py: '25px', pr: '-15deg', type: 'coin' as const },
  { px: '135px', py: '25px', pr: '15deg', type: 'coin' as const },
  { px: '-85px', py: '115px', pr: '-18deg', type: 'star' as const },
  { px: '85px', py: '115px', pr: '18deg', type: 'star' as const },
];

export function SplashScreen({ onFinish }: SplashScreenProps) {
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
    setIsFadingOut(true);

    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    fadeTimerRef.current = setTimeout(() => {
      setIsDone(true);
      onFinish?.();
    }, FADE_OUT_MS);
  }, [onFinish]);

  useEffect(() => {
    const duration = prefersReducedMotion ? SPLASH_REDUCED_MS : SPLASH_DURATION_MS;
    const timer = setTimeout(triggerFadeOut, duration);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') triggerFadeOut();
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      clearTimeout(timer);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [prefersReducedMotion, triggerFadeOut]);

  if (isDone) return null;

  return (
    <div
      onClick={triggerFadeOut}
      className={`fixed inset-0 min-h-dvh z-50 flex items-center justify-center overflow-hidden bg-[#1B2B40] select-none cursor-pointer transition-[opacity,transform] duration-350 ease-out ${
        isFadingOut ? 'opacity-0 scale-[1.03] pointer-events-none' : 'opacity-100 scale-100'
      }`}
      aria-label="ProjektBox wird gestartet"
    >
      <IslandBackground />

      <div className="relative z-10 flex items-center justify-center p-4">
        {/* Aufsteigende facettierte Goldsterne & Kristall-Münzen */}
        {!prefersReducedMotion &&
          BURST_SHARDS.map((item, idx) => (
            <div
              key={idx}
              className="pb-splash-figure pointer-events-none absolute z-20"
              style={
                {
                  animationDelay: `${0.18 + idx * 0.06}s`,
                  '--gx': item.px,
                  '--gy': item.py,
                  '--gr': item.pr,
                } as CSSProperties
              }
            >
              {item.type === 'star' ? <CrystalStar size={44} active /> : <CrystalCoin size={40} />}
            </div>
          ))}

        {/* Zentrales Kristall-Startfenster */}
        <div className="w-[290px] sm:w-[330px] animate-fade-in">
          <CrystalPanel title="PROJEKT BOX" accent="amber" contentClassName="gap-3.5 py-6">
            <CrystalReadout label="SCORE" value="25873" />
            <CrystalReadout label="REWARD" value="63581" />
            <span className="font-arcade mt-2 text-sm tracking-widest text-[#334155] uppercase animate-pulse">
              LOADING CRYSTAL UI...
            </span>
          </CrystalPanel>
        </div>
      </div>
    </div>
  );
}

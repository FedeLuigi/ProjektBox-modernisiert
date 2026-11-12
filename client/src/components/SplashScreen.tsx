import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

interface SplashScreenProps {
  onFinish?: () => void;
}

const SPLASH_DURATION_MS = 3150;
const SPLASH_REDUCED_MS = 1300;
const FADE_OUT_MS = 400;

interface FigureSpec {
  id: string;
  label: string;
  gx: string;
  gy: string;
  gr: string;
  delay: string;
  badgeRing: string;
  badgeBg: string;
  renderSvg: () => ReactNode;
}

const FIGURES: FigureSpec[] = [
  {
    id: 'meeple',
    label: 'Meeple-Figur',
    gx: '-102px',
    gy: '-112px',
    gr: '-12deg',
    delay: '0.70s',
    badgeRing: 'ring-[#FBBF24]/45',
    badgeBg: 'from-[#3B2A14] via-[#2A1D12] to-[#171214]',
    renderSvg: () => (
      <svg viewBox="0 0 64 64" className="h-11 w-11">
        <defs>
          <linearGradient id="figMeeple" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FDE047" />
            <stop offset="100%" stopColor="#EA580C" />
          </linearGradient>
        </defs>
        {/* Kleine Krone */}
        <path d="M23 14 L26 7 L32 11 L38 7 L41 14 Z" fill="#FACC15" />
        {/* Klassische Meeple-Silhouette */}
        <path
          d="M32 14 C37 14 40 17.5 40 22 C40 24.5 38.8 26.7 37 28 L49 31.5 C52 32.5 52.5 37 48.8 38.5 L41.5 40.5 L45.5 53 C46.2 55.2 44.5 57 42 57 H36.5 L32 48 L27.5 57 H22 C19.5 57 17.8 55.2 18.5 53 L22.5 40.5 L15.2 38.5 C11.5 37 12 32.5 15 31.5 L27 28 C25.2 26.7 24 24.5 24 22 C24 17.5 27 14 32 14 Z"
          fill="url(#figMeeple)"
        />
        <circle cx="29" cy="21.5" r="1.8" fill="#18181B" />
        <circle cx="35" cy="21.5" r="1.8" fill="#18181B" />
        <path d="M29.5 25 Q32 27.2 34.5 25" fill="none" stroke="#18181B" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'knight',
    label: 'Schach-Springer',
    gx: '0px',
    gy: '-138px',
    gr: '3deg',
    delay: '0.73s',
    badgeRing: 'ring-[#A78BFA]/50',
    badgeBg: 'from-[#2D2254] via-[#21193F] to-[#151226]',
    renderSvg: () => (
      <svg viewBox="0 0 64 64" className="h-11 w-11">
        <defs>
          <linearGradient id="figKnight" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#DDD6FE" />
            <stop offset="55%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#4C1D95" />
          </linearGradient>
        </defs>
        <path
          d="M21 52 L25 36 C25 36 17 37 15 31 C13.5 26.5 19 20 25 17 L24 10 L31 14 C39 14 46 21 46 31 C46 39 42 45 43 52 Z"
          fill="url(#figKnight)"
        />
        <rect x="17" y="51" width="30" height="6" rx="3" fill="#C4B5FD" />
        <circle cx="25.5" cy="22.5" r="2" fill="#0B0B0F" />
        <circle cx="26" cy="22" r="0.7" fill="#FFFFFF" />
      </svg>
    ),
  },
  {
    id: 'ghost',
    label: 'Arcade-Geist',
    gx: '102px',
    gy: '-112px',
    gr: '12deg',
    delay: '0.76s',
    badgeRing: 'ring-[#38BDF8]/50',
    badgeBg: 'from-[#143454] via-[#122740] to-[#0E1929]',
    renderSvg: () => (
      <svg viewBox="0 0 64 64" className="h-11 w-11">
        <defs>
          <linearGradient id="figGhost" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#67E8F9" />
            <stop offset="100%" stopColor="#0284C7" />
          </linearGradient>
        </defs>
        <path
          d="M14 33 C14 19.5 22 12 32 12 C42 12 50 19.5 50 33 V51 L43.5 46 L37.5 51 L32 46 L26.5 51 L20.5 46 L14 51 Z"
          fill="url(#figGhost)"
        />
        <ellipse cx="25.5" cy="28" rx="4.2" ry="5" fill="#FFFFFF" />
        <ellipse cx="38.5" cy="28" rx="4.2" ry="5" fill="#FFFFFF" />
        <circle cx="26.8" cy="28.5" r="2.2" fill="#0F172A" />
        <circle cx="39.8" cy="28.5" r="2.2" fill="#0F172A" />
      </svg>
    ),
  },
  {
    id: 'alien',
    label: 'Space-Alien',
    gx: '-120px',
    gy: '92px',
    gr: '-10deg',
    delay: '0.79s',
    badgeRing: 'ring-[#F472B6]/50',
    badgeBg: 'from-[#421C3A] via-[#31162E] to-[#1D1221]',
    renderSvg: () => (
      <svg viewBox="0 0 64 64" className="h-11 w-11">
        <defs>
          <linearGradient id="figAlien" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F9A8D4" />
            <stop offset="100%" stopColor="#C026D3" />
          </linearGradient>
        </defs>
        {/* Antennen */}
        <path d="M22 14 L26 21 M42 14 L38 21" stroke="#F472B6" strokeWidth="3" strokeLinecap="round" />
        <circle cx="21" cy="13" r="2.8" fill="#FDE047" />
        <circle cx="43" cy="13" r="2.8" fill="#FDE047" />
        {/* Kopf/Körper */}
        <rect x="14" y="20" width="36" height="26" rx="11" fill="url(#figAlien)" />
        {/* Seitliche Arme & Beinchen */}
        <rect x="9" y="28" width="5" height="12" rx="2.5" fill="#E879F9" />
        <rect x="50" y="28" width="5" height="12" rx="2.5" fill="#E879F9" />
        <rect x="21" y="45" width="7" height="7" rx="3" fill="#C026D3" />
        <rect x="36" y="45" width="7" height="7" rx="3" fill="#C026D3" />
        {/* Augen */}
        <circle cx="25" cy="32" r="4" fill="#18181B" />
        <circle cx="39" cy="32" r="4" fill="#18181B" />
        <circle cx="26.2" cy="30.8" r="1.4" fill="#FFFFFF" />
        <circle cx="40.2" cy="30.8" r="1.4" fill="#FFFFFF" />
      </svg>
    ),
  },
  {
    id: 'robo',
    label: 'Mini-Robo',
    gx: '-42px',
    gy: '126px',
    gr: '-5deg',
    delay: '0.82s',
    badgeRing: 'ring-[#34D399]/45',
    badgeBg: 'from-[#14392E] via-[#112A23] to-[#0D1B17]',
    renderSvg: () => (
      <svg viewBox="0 0 64 64" className="h-11 w-11">
        <defs>
          <linearGradient id="figRobo" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6EE7B7" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>
        <line x1="32" y1="10" x2="32" y2="18" stroke="#6EE7B7" strokeWidth="3" strokeLinecap="round" />
        <circle cx="32" cy="9" r="3.5" fill="#FACC15" />
        <rect x="16" y="18" width="32" height="24" rx="8" fill="url(#figRobo)" />
        <rect x="21" y="24" width="22" height="11" rx="4.5" fill="#0B0B0F" />
        <circle cx="27" cy="29.5" r="2.4" fill="#34D399" />
        <circle cx="37" cy="29.5" r="2.4" fill="#34D399" />
        <rect x="21" y="44" width="22" height="10" rx="4" fill="#10B981" />
      </svg>
    ),
  },
  {
    id: 'star-hero',
    label: 'Stern-Held',
    gx: '44px',
    gy: '126px',
    gr: '5deg',
    delay: '0.85s',
    badgeRing: 'ring-[#FB923C]/50',
    badgeBg: 'from-[#3D201A] via-[#2B1716] to-[#1A1215]',
    renderSvg: () => (
      <svg viewBox="0 0 64 64" className="h-11 w-11">
        <defs>
          <linearGradient id="figStar" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FDE047" />
            <stop offset="60%" stopColor="#FB923C" />
            <stop offset="100%" stopColor="#EA580C" />
          </linearGradient>
        </defs>
        <path
          d="M32 9 L38.5 22.5 L53.5 24.5 L42.5 35 L45.2 50 L32 42.8 L18.8 50 L21.5 35 L10.5 24.5 L25.5 22.5 Z"
          fill="url(#figStar)"
          stroke="#FEF08A"
          strokeOpacity="0.45"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <ellipse cx="27.5" cy="30.5" rx="2" ry="3.2" fill="#18181B" />
        <ellipse cx="36.5" cy="30.5" rx="2" ry="3.2" fill="#18181B" />
        <circle cx="28" cy="29.3" r="0.8" fill="#FFFFFF" />
        <circle cx="37" cy="29.3" r="0.8" fill="#FFFFFF" />
      </svg>
    ),
  },
  {
    id: 'pawn',
    label: 'Brettspiel-Figur',
    gx: '120px',
    gy: '92px',
    gr: '10deg',
    delay: '0.88s',
    badgeRing: 'ring-[#818CF8]/50',
    badgeBg: 'from-[#22275A] via-[#1B1E42] to-[#13152A]',
    renderSvg: () => (
      <svg viewBox="0 0 64 64" className="h-11 w-11">
        <defs>
          <linearGradient id="figPawn" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#A5B4FC" />
            <stop offset="100%" stopColor="#4F46E5" />
          </linearGradient>
        </defs>
        {/* Kopf */}
        <circle cx="32" cy="19.5" r="9.5" fill="url(#figPawn)" />
        {/* Kragen */}
        <rect x="24" y="28.5" width="16" height="4" rx="2" fill="#C7D2FE" />
        {/* Körper & Sockel */}
        <path d="M25 32.5 C24 41 19 47 17 53 H47 C45 47 40 41 39 32.5 Z" fill="url(#figPawn)" />
        <rect x="15" y="51.5" width="34" height="5.5" rx="2.75" fill="#818CF8" />
        <circle cx="29" cy="19" r="1.6" fill="#0B0B0F" />
        <circle cx="35" cy="19" r="1.6" fill="#0B0B0F" />
        <circle cx="29.5" cy="18.4" r="0.6" fill="#FFFFFF" />
        <circle cx="35.5" cy="18.4" r="0.6" fill="#FFFFFF" />
      </svg>
    ),
  },
];

const BURST_PARTICLES = [
  { px: '-88px', py: '-72px', pr: '140deg', color: '#A78BFA', size: 'h-2.5 w-2.5' },
  { px: '92px', py: '-68px', pr: '-120deg', color: '#FB923C', size: 'h-2 w-2' },
  { px: '-114px', py: '12px', pr: '95deg', color: '#38BDF8', size: 'h-2 w-2' },
  { px: '116px', py: '18px', pr: '-110deg', color: '#34D399', size: 'h-2.5 w-2.5' },
  { px: '-70px', py: '86px', pr: '160deg', color: '#F472B6', size: 'h-2 w-2' },
  { px: '74px', py: '84px', pr: '-150deg', color: '#A78BFA', size: 'h-2 w-2' },
  { px: '0px', py: '-98px', pr: '90deg', color: '#FBBF24', size: 'h-2 w-2' },
  { px: '-44px', py: '-90px', pr: '-80deg', color: '#38BDF8', size: 'h-1.5 w-3 rounded-full' },
  { px: '48px', py: '-86px', pr: '80deg', color: '#F472B6', size: 'h-1.5 w-3 rounded-full' },
  { px: '0px', py: '82px', pr: '45deg', color: '#FB923C', size: 'h-2 w-2' },
];

const BRAND_LETTERS = [
  { char: 'P', accent: false },
  { char: 'r', accent: false },
  { char: 'o', accent: false },
  { char: 'j', accent: false },
  { char: 'e', accent: false },
  { char: 'k', accent: false },
  { char: 't', accent: false },
  { char: 'B', accent: true },
  { char: 'o', accent: true },
  { char: 'x', accent: true },
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
      if (e.key === 'Escape') triggerFadeOut();
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
      className={`fixed inset-0 min-h-dvh z-50 flex items-center justify-center overflow-hidden bg-[#0B0B0F] select-none transition-[opacity,transform] duration-400 ease-out ${
        isFadingOut ? 'opacity-0 scale-[1.03] pointer-events-none' : 'opacity-100 scale-100'
      }`}
      aria-label="ProjektBox wird gestartet"
    >
      {/* Statischer GPU-freundlicher Ambient-Verlauf im App-Look */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(124, 58, 237, 0.24) 0%, rgba(192, 38, 211, 0.1) 28%, rgba(11, 11, 15, 0) 68%)',
        }}
      />

      {/* Zentrierte Bühne: zuerst die Box in der Mitte -> explodiert -> Spielfiguren & dynamischer Schriftzug */}
      <div className="relative flex items-center justify-center scale-[0.92] sm:scale-105">
        {/* Druckwellen beim Aufplatzen (0.68s) */}
        {!prefersReducedMotion && (
          <>
            <span
              className="pb-splash-shockwave pointer-events-none absolute h-20 w-20 rounded-full border-2 border-[#A78BFA]/75"
              style={{ animationDelay: '0.68s' }}
            />
            <span
              className="pb-splash-shockwave pointer-events-none absolute h-20 w-20 rounded-full border border-[#FB923C]/70"
              style={{ animationDelay: '0.75s' }}
            />
          </>
        )}

        {/* Funken / Partikel */}
        {!prefersReducedMotion &&
          BURST_PARTICLES.map((p, idx) => (
            <span
              key={idx}
              className={`pb-splash-particle pointer-events-none absolute rounded-sm ${p.size}`}
              style={
                {
                  backgroundColor: p.color,
                  animationDelay: '0.69s',
                  '--px': p.px,
                  '--py': p.py,
                  '--pr': p.pr,
                } as CSSProperties
              }
            />
          ))}

        {/* Diverse Spielfiguren fliegen aus der Box */}
        {FIGURES.map((fig) => {
          const figStyle = prefersReducedMotion
            ? ({ transform: `translate3d(${fig.gx}, ${fig.gy}, 0) rotate(${fig.gr})` } as CSSProperties)
            : ({
                animationDelay: fig.delay,
                '--gx': fig.gx,
                '--gy': fig.gy,
                '--gr': fig.gr,
              } as CSSProperties);

          return (
            <div
              key={fig.id}
              className={`pointer-events-none absolute z-10 flex items-center justify-center ${
                prefersReducedMotion ? '' : 'pb-splash-figure'
              }`}
              style={figStyle}
              aria-hidden="true"
            >
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${fig.badgeBg} ring-1 ${fig.badgeRing} shadow-[0_12px_28px_rgba(0,0,0,0.55)]`}
              >
                {fig.renderSvg()}
              </div>
            </div>
          );
        })}

        {/* Phase 1: Kleine isometrische Box exakt im Zentrum, platzt auf */}
        {!prefersReducedMotion && (
          <div className="pb-splash-box pointer-events-none absolute z-20" aria-hidden="true">
            <svg
              viewBox="0 0 96 96"
              className="h-20 w-20 drop-shadow-[0_14px_24px_rgba(124,58,237,0.45)]"
            >
              <defs>
                <linearGradient id="pbBoxLeft" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366F1" />
                  <stop offset="100%" stopColor="#312E81" />
                </linearGradient>
                <linearGradient id="pbBoxRight" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#FB923C" />
                  <stop offset="100%" stopColor="#C2410C" />
                </linearGradient>
                <linearGradient id="pbBoxLid" x1="0" y1="1" x2="1" y2="0">
                  <stop offset="0%" stopColor="#7C3AED" />
                  <stop offset="100%" stopColor="#C084FC" />
                </linearGradient>
              </defs>

              <path d="M48 48 L14 31 V67 L48 84 Z" fill="url(#pbBoxLeft)" />
              <path d="M48 48 L82 31 V67 L48 84 Z" fill="url(#pbBoxRight)" />
              <g className="pb-splash-lid">
                <path d="M48 14 L82 31 L48 48 L14 31 Z" fill="url(#pbBoxLid)" />
                <path
                  d="M48 14 L82 31 L48 48 L14 31 Z"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeOpacity="0.45"
                  strokeWidth="1.5"
                />
              </g>
              <path d="M48 48 V84" stroke="#FFFFFF" strokeOpacity="0.28" strokeWidth="1.5" />
            </svg>
          </div>
        )}

        {/* Phase 2: Dynamischer „ProjektBox“-Reveal direkt aus der Explosion im freien Zentrum */}
        <div className="relative z-30 flex flex-col items-center">
          <h1 className="flex items-baseline text-4xl font-black tracking-tight sm:text-5xl">
            {BRAND_LETTERS.map((item, idx) => (
              <span
                key={idx}
                className={`${prefersReducedMotion ? '' : 'pb-splash-letter'} ${
                  item.accent
                    ? 'bg-gradient-to-br from-[#A78BFA] via-[#C084FC] to-[#F472B6] bg-clip-text text-transparent'
                    : 'text-white'
                }`}
                style={
                  prefersReducedMotion
                    ? undefined
                    : { animationDelay: `${0.78 + idx * 0.036}s` }
                }
              >
                {item.char}
              </span>
            ))}
          </h1>
          <span
            className={`mt-2 h-1 w-28 rounded-full bg-gradient-to-r from-[#7C3AED] via-[#C026D3] to-[#FB923C] ${
              prefersReducedMotion ? '' : 'pb-splash-accent-line'
            }`}
            style={prefersReducedMotion ? undefined : { animationDelay: '1.14s' }}
          />
        </div>
      </div>
    </div>
  );
}

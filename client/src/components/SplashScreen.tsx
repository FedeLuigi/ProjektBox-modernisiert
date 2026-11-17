import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { Dices, Gamepad2, Palette, Sparkles, Tv, Zap } from 'lucide-react';
import { SplashCanvasEffect } from './splash/SplashCanvasEffects';
import {
  getSavedSplashVariant,
  SPLASH_VARIANTS,
  type SplashVariantId,
} from './splash/splashVariants';

interface SplashScreenProps {
  onFinish?: () => void;
  variantOverride?: SplashVariantId;
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

function StandardTitle({
  eyebrow = 'PARTY & MULTIPLAYER',
  className = '',
}: {
  eyebrow?: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      <span className="font-arcade mb-1.5 text-[10px] sm:text-xs tracking-[0.26em] text-[#FDE68A]/85 uppercase">
        {eyebrow}
      </span>
      <h1 className="font-arcade text-4xl xs:text-5xl sm:text-6xl md:text-7xl leading-none tracking-[0.08em] text-white uppercase drop-shadow-[0_10px_28px_rgba(0,0,0,0.65)]">
        PROJEKT <span className="text-[#FBBF24]">BOX</span>
      </h1>
      <div className="mt-2.5 h-[3px] w-40 sm:w-64 rounded-full bg-gradient-to-r from-transparent via-[#F59E0B] to-transparent shadow-[0_0_16px_#F59E0B]" />
    </div>
  );
}

export function SplashScreen({ onFinish, variantOverride }: SplashScreenProps) {
  const activeVariant = variantOverride ?? getSavedSplashVariant();
  const variantMeta = SPLASH_VARIANTS.find((v) => v.id === activeVariant) ?? SPLASH_VARIANTS[0];

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
      ? 'SPIELBOX STARTET...'
      : progress < 86
        ? `${variantMeta.title.toUpperCase()}...`
        : 'BEREIT ZUM SPIELEN!';

  const hasCanvasMode =
    activeVariant === 'particle-forge' ||
    activeVariant === 'cyber-warp' ||
    activeVariant === 'pixel-wave' ||
    activeVariant === 'party-confetti';

  return (
    <div
      onClick={triggerFadeOut}
      aria-label="ProjektBox wird gestartet"
      className={`fixed inset-0 z-90 flex flex-col justify-between overflow-hidden bg-[#131F30] text-white select-none cursor-pointer transition-[opacity,transform] duration-350 ease-out pt-[calc(14px+env(safe-area-inset-top,0px))] pb-[calc(16px+env(safe-area-inset-bottom,0px))] pl-[max(20px,env(safe-area-inset-left,0px))] pr-[max(20px,env(safe-area-inset-right,0px))] ${
        isFadingOut ? 'opacity-0 scale-[1.03] pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* 1. Hintergrund-Ebene */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 50% 48%, rgba(30, 49, 77, 0.95) 0%, rgba(19, 31, 48, 1) 72%)',
          }}
        />
        <div className="absolute top-1/2 left-1/2 h-[52vh] w-[72vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#F59E0B]/[0.09] blur-[110px]" />
      </div>

      {/* Canvas-Engine für die 4 Physik-/Projektions-Varianten */}
      {hasCanvasMode && (
        <SplashCanvasEffect mode={activeVariant} reducedMotion={prefersReducedMotion} />
      )}

      {/* 2. Obere Zeile */}
      <div className="relative z-20 mx-auto flex w-full max-w-[1440px] items-center justify-between text-[10px] sm:text-xs font-arcade tracking-[0.2em] text-white/55 uppercase">
        <span className="inline-flex items-center gap-2">
          <span
            style={{ backgroundColor: variantMeta.accentHex }}
            className="h-2 w-2 rounded-full animate-pulse"
          />
          <span>{variantMeta.techTag}</span>
        </span>
        <span className="text-white/45">TIPPEN ZUM ÜBERSPRINGEN</span>
      </div>

      {/* 3. ZENTRALE BÜHNE JE NACH AUSGEWÄHLTER VARIANTE */}
      <div className="relative z-20 my-auto flex flex-col items-center justify-center px-2">
        {/* VARIANTE 1: SPIELBOX UNBOXING */}
        {activeVariant === 'box-unboxing' && (
          <div className="relative flex flex-col items-center justify-center">
            <div
              className={`pointer-events-none absolute bottom-[38%] left-1/2 h-[34vh] sm:h-[40vh] w-56 sm:w-80 -translate-x-1/2 bg-gradient-to-t from-[#F59E0B]/35 via-[#38BDF8]/15 to-transparent blur-xl ${
                prefersReducedMotion ? '' : 'spielbox-beam'
              }`}
              style={{ clipPath: 'polygon(30% 100%, 70% 100%, 100% 0%, 0% 0%)' }}
            />

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

            <StandardTitle
              className={`mb-3 sm:mb-4 ${prefersReducedMotion ? '' : 'spielbox-title'}`}
            />

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

        {/* VARIANTE 2: ECHTER CSS 3D WÜRFEL */}
        {activeVariant === 'cube-3d' && (
          <div className="flex flex-col items-center gap-6 sm:gap-8 landscape:gap-3">
            <div style={{ perspective: '1000px' }} className="relative flex items-center justify-center">
              <div
                className={`relative h-28 w-28 sm:h-36 sm:w-36 landscape:h-22 landscape:w-22 ${
                  prefersReducedMotion ? '' : 'splash-cube-3d'
                }`}
              >
                {[
                  { tr: 'translateZ(56px)', smTr: 'sm:translate-z', bg: 'bg-[#0F172A]/95 border-[#F59E0B]' },
                  { tr: 'rotateY(180deg) translateZ(56px)', bg: 'bg-[#1E293B]/95 border-[#38BDF8]' },
                  { tr: 'rotateY(90deg) translateZ(56px)', bg: 'bg-[#162235]/95 border-[#10B981]' },
                  { tr: 'rotateY(-90deg) translateZ(56px)', bg: 'bg-[#162235]/95 border-[#F59E0B]' },
                  { tr: 'rotateX(90deg) translateZ(56px)', bg: 'bg-[#334155]/95 border-[#FDE68A]' },
                  { tr: 'rotateX(-90deg) translateZ(56px)', bg: 'bg-[#0F172A]/95 border-[#38BDF8]' },
                ].map((face, idx) => (
                  <div
                    key={idx}
                    style={{ transform: face.tr }}
                    className={`absolute inset-0 flex items-center justify-center rounded-2xl border-2 backdrop-blur-md shadow-[inset_0_0_24px_rgba(245,158,11,0.2)] ${face.bg}`}
                  >
                    {idx === 0 && (
                      <span className="font-arcade text-2xl sm:text-3xl text-[#FBBF24]">PB</span>
                    )}
                    {idx === 2 && <Palette className="h-8 w-8 text-[#34D399]" />}
                    {idx === 3 && <Tv className="h-8 w-8 text-[#F59E0B]" />}
                  </div>
                ))}
              </div>
            </div>
            <StandardTitle eyebrow="3D SPATIAL ENGINE" />
          </div>
        )}

        {/* VARIANTE 3: PARTIKEL-SCHWARM */}
        {activeVariant === 'particle-forge' && (
          <div className="rounded-3xl border border-[#F59E0B]/30 bg-[#0F172A]/55 px-8 py-6 sm:px-14 sm:py-9 backdrop-blur-md shadow-[0_0_50px_rgba(245,158,11,0.18)]">
            <StandardTitle eyebrow="240+ PARTIKEL-PHYSIK" />
          </div>
        )}

        {/* VARIANTE 4: LASER-VEKTOR-GRAVUR */}
        {activeVariant === 'vector-blueprint' && (
          <div className="relative flex flex-col items-center justify-center gap-4">
            <svg
              viewBox="0 0 380 150"
              className="w-72 sm:w-96 landscape:w-64 overflow-visible"
              fill="none"
            >
              <rect
                x="10"
                y="10"
                width="360"
                height="130"
                rx="22"
                stroke="#38BDF8"
                strokeWidth="2.5"
                className={prefersReducedMotion ? '' : 'splash-svg-draw'}
              />
              <rect
                x="22"
                y="22"
                width="336"
                height="106"
                rx="14"
                stroke="#F59E0B"
                strokeWidth="1.5"
                strokeOpacity="0.7"
                className={prefersReducedMotion ? '' : 'splash-svg-draw'}
                style={{ animationDelay: '220ms' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <StandardTitle eyebrow="SVG LASER-BLUEPRINT" />
            </div>
          </div>
        )}

        {/* VARIANTE 5: KINO-BLENDE (CLIP-PATH SHUTTER) */}
        {activeVariant === 'cinema-shutter' && (
          <>
            {!prefersReducedMotion && (
              <>
                <div className="pointer-events-none fixed inset-0 z-30 bg-[#090F1A] splash-shutter-left" />
                <div className="pointer-events-none fixed inset-0 z-30 bg-[#0F172A] splash-shutter-right" />
              </>
            )}
            <StandardTitle
              eyebrow="WIDESCREEN CINEMA WIPE"
              className="scale-105 sm:scale-110"
            />
          </>
        )}

        {/* VARIANTE 6: HYPERSPACE WARP */}
        {activeVariant === 'cyber-warp' && (
          <div className="relative flex flex-col items-center">
            <div className="pointer-events-none absolute -inset-10 rounded-full border border-[#10B981]/30 animate-ping" />
            <StandardTitle eyebrow="3D Z-DEPTH TUNNEL" />
          </div>
        )}

        {/* VARIANTE 7: LIQUID AURORA (SVG GOOEY SHADER) */}
        {activeVariant === 'liquid-aurora' && (
          <div className="relative flex items-center justify-center">
            <svg className="pointer-events-none absolute h-0 w-0" aria-hidden="true">
              <defs>
                <filter id="aurora-goo">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="16" result="blur" />
                  <feColorMatrix
                    in="blur"
                    mode="matrix"
                    values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9"
                    result="goo"
                  />
                </filter>
              </defs>
            </svg>
            <div
              style={{ filter: 'url(#aurora-goo)' }}
              className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-75"
            >
              <div className="splash-liquid-blob h-36 w-36 rounded-full bg-[#F59E0B]/60" />
              <div
                style={{ animationDelay: '-1.4s' }}
                className="splash-liquid-blob -ml-14 h-40 w-40 rounded-full bg-[#EC4899]/55"
              />
              <div
                style={{ animationDelay: '-2.6s' }}
                className="splash-liquid-blob -ml-16 h-32 w-32 rounded-full bg-[#38BDF8]/55"
              />
            </div>
            <div className="relative z-10 px-6 py-4">
              <StandardTitle eyebrow="SVG METABALL SHADER" />
            </div>
          </div>
        )}

        {/* VARIANTE 8: KINETISCHE TYPOGRAFIE-KASKADE */}
        {activeVariant === 'kinetic-type' && (
          <div className="flex flex-col items-center text-center" style={{ perspective: '900px' }}>
            <span className="font-arcade mb-2 text-[10px] sm:text-xs tracking-[0.28em] text-[#FDE68A]/85 uppercase">
              3D KINETIC TYPOGRAPHY
            </span>
            <h1 className="font-arcade text-4xl xs:text-5xl sm:text-7xl md:text-8xl leading-none tracking-[0.06em] uppercase">
              {'PROJEKT'.split('').map((ch, idx) => (
                <span
                  key={`p-${idx}`}
                  style={prefersReducedMotion ? undefined : { animationDelay: `${idx * 65}ms` }}
                  className={prefersReducedMotion ? 'text-white' : 'splash-letter text-white'}
                >
                  {ch}
                </span>
              ))}
              <span className="inline-block w-3 sm:w-5" />
              {'BOX'.split('').map((ch, idx) => (
                <span
                  key={`b-${idx}`}
                  style={
                    prefersReducedMotion ? undefined : { animationDelay: `${(idx + 8) * 65}ms` }
                  }
                  className={
                    prefersReducedMotion ? 'text-[#FBBF24]' : 'splash-letter text-[#FBBF24]'
                  }
                >
                  {ch}
                </span>
              ))}
            </h1>
            <div className="mt-3 h-[3px] w-48 sm:w-72 rounded-full bg-gradient-to-r from-transparent via-[#F59E0B] to-transparent shadow-[0_0_16px_#F59E0B]" />
          </div>
        )}

        {/* VARIANTE 9: MATRIX-WELLE */}
        {activeVariant === 'pixel-wave' && (
          <div className="rounded-2xl border border-[#34D399]/30 bg-[#0F172A]/60 px-7 py-5 sm:px-12 sm:py-8 backdrop-blur-md">
            <StandardTitle eyebrow="RADIALE SINUS-MATRIX" />
          </div>
        )}

        {/* VARIANTE 10: KONFETTI-SALVE */}
        {activeVariant === 'party-confetti' && (
          <div className={prefersReducedMotion ? '' : 'spielbox-drop'}>
            <StandardTitle eyebrow="BALLISTISCHE PARTY-KANONEN" />
          </div>
        )}
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

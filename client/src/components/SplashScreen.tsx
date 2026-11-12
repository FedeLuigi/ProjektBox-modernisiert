import { useCallback, useEffect, useRef, useState } from 'react';

interface SplashScreenProps {
  onFinish?: () => void;
}

const SPLASH_DURATION_MS = 4850;
const SPLASH_REDUCED_MS = 1800;
const SPLASH_FALLBACK_MS = 6000;

export function SplashScreen({ onFinish }: SplashScreenProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [prefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  const finishedRef = useRef(false);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerFadeOut = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (exitTimerRef.current) {
      clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
    setIsFadingOut(true);
    fadeTimerRef.current = setTimeout(() => {
      setIsDone(true);
      onFinish?.();
    }, 420);
  }, [onFinish]);

  useEffect(() => {
    if (prefersReducedMotion) {
      exitTimerRef.current = setTimeout(triggerFadeOut, SPLASH_REDUCED_MS);
      return () => {
        if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
        if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
      };
    }

    // Sicherheits-Fallback, falls Energiesparmodus Video-Autoplay verzögert
    exitTimerRef.current = setTimeout(triggerFadeOut, SPLASH_FALLBACK_MS);

    const video = videoRef.current;
    if (video) {
      video.defaultMuted = true;
      video.muted = true;
      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          // WebP-Poster bleibt sichtbar, Fallback-Timer blendet sauber aus
        });
      }
    }

    return () => {
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, [prefersReducedMotion, triggerFadeOut]);

  const handleVideoPlaying = useCallback(() => {
    if (finishedRef.current) return;
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    exitTimerRef.current = setTimeout(triggerFadeOut, SPLASH_DURATION_MS);
  }, [triggerFadeOut]);

  if (isDone) return null;

  return (
    <div
      role="presentation"
      style={{
        background: 'linear-gradient(180deg, #2b2855 0%, #373164 48%, #3c366c 100%)',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden select-none will-change-[opacity,transform] transition-[opacity,transform] duration-400 ease-out ${
        isFadingOut ? 'opacity-0 scale-[1.03] pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Portrait-Branding oberhalb der weich eingebetteten 3D-Bühne */}
      <div className="splash-portrait-brand pointer-events-none z-10 mb-3 flex-col items-center px-6 text-center">
        <h1 className="text-4xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-400">
          Spielbox
        </h1>
        <p className="mt-1 text-[11px] font-bold tracking-[0.22em] uppercase text-white/60">
          Bereit fürs Spiel?
        </p>
      </div>

      {/* Hardware-dekodiertes 720p H.264 Loop-Video + WebP-Poster für 0 ms Startzeit */}
      <div className="splash-video-stage relative shrink-0 overflow-hidden">
        <img
          src="/splash-poster.webp"
          alt=""
          aria-hidden="true"
          decoding="sync"
          fetchPriority="high"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
        />

        {!prefersReducedMotion && (
          <video
            ref={videoRef}
            src="/splash-animation.mp4"
            poster="/splash-poster.webp"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            disablePictureInPicture
            onPlaying={handleVideoPlaying}
            onError={triggerFadeOut}
            className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center will-change-transform"
          />
        )}
      </div>

      {/* Schlanker GPU-Fortschrittsbalken & Überspringen-Button */}
      <div
        style={{
          bottom: 'max(1rem, calc(env(safe-area-inset-bottom) + 0.5rem))',
        }}
        className="absolute inset-x-0 z-20 flex flex-col items-center gap-2.5 px-4"
      >
        <div className="h-1 w-32 overflow-hidden rounded-full bg-white/15">
          <div
            style={{
              animationDuration: `${prefersReducedMotion ? SPLASH_REDUCED_MS : SPLASH_DURATION_MS}ms`,
            }}
            className="h-full w-full origin-left rounded-full bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 animate-splash-progress"
          />
        </div>

        <button
          type="button"
          onClick={triggerFadeOut}
          className="rounded-full bg-[#120d26]/85 hover:bg-[#1e1740] px-4 py-1.5 text-xs font-bold tracking-wide text-zinc-200 hover:text-white ring-1 ring-white/20 transition-transform active:scale-95 cursor-pointer"
        >
          Überspringen ›
        </button>
      </div>
    </div>
  );
}

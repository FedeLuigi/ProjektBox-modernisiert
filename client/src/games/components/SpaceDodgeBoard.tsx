import { useCallback, useEffect, useRef, useState } from 'react';
import { Flame, Pause, Play, Rocket, Shield, Sparkles } from 'lucide-react';
import type { GameRendererProps } from '../types';
import { CrystalGem } from '../../components/CrystalUI';
import {
  playErrorSound,
  playMoveSound,
  playScoreSound,
  triggerHapticFeedback,
} from '../../utils/soundEffects';

interface Obstacle {
  id: number;
  x: number; // 0..100 %
  y: number; // 0..100 %
  size: number;
  speed: number;
  isCore: boolean;
}

const STARFIELD = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  left: `${(i * 37) % 96 + 2}%`,
  top: `${(i * 53) % 96 + 2}%`,
  size: i % 4 === 0 ? 3.5 : 2,
  opacity: i % 3 === 0 ? 'opacity-60' : 'opacity-30',
}));

export function SpaceDodgeBoard({
  isGameOver,
  disabled,
  onMove,
}: GameRendererProps) {
  const [shipX, setShipX] = useState(50);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [score, setScore] = useState(0);
  const [shields, setShields] = useState(3);
  const [coresCollected, setCoresCollected] = useState(0);
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [invulnerable, setInvulnerable] = useState(false);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const shipXRef = useRef(50);
  const scoreRef = useRef(0);
  const shieldsRef = useRef(3);
  const coresRef = useRef(0);
  const invulnUntilRef = useRef(0);
  const nextIdRef = useRef(1);
  const endedRef = useRef(false);

  const wave = Math.min(8, 1 + Math.floor(score / 250));

  const nudgeShip = useCallback((delta: number) => {
    if (endedRef.current) return;
    setStarted(true);
    setPaused(false);
    const next = Math.max(7, Math.min(93, shipXRef.current + delta));
    shipXRef.current = next;
    setShipX(next);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        nudgeShip(-10);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        nudgeShip(10);
      } else if (e.key === ' ' || e.key === 'p' || e.key === 'P') {
        if (started && !endedRef.current) {
          e.preventDefault();
          setPaused((p) => !p);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nudgeShip, started]);

  useEffect(() => {
    if (!started || paused || isGameOver || disabled || endedRef.current) return;

    const id = setInterval(() => {
      const now = performance.now();
      const isCurrentlyInvuln = now < invulnUntilRef.current;
      setInvulnerable(isCurrentlyInvuln);

      let tookDamage = false;
      let bonus = 0;

      const currentWave = Math.min(8, 1 + Math.floor(scoreRef.current / 250));
      const speedFactor = 1 + (currentWave - 1) * 0.12;

      setObstacles((prev) => {
        const moved = prev
          .map((o) => ({ ...o, y: o.y + o.speed * speedFactor }))
          .filter((o) => {
            const hitY = o.y >= 78 && o.y <= 92;
            const hitX = Math.abs(o.x - shipXRef.current) < (o.isCore ? 11 : 9.5);
            if (hitY && hitX) {
              if (o.isCore) {
                bonus += 30;
                return false;
              } else if (!isCurrentlyInvuln) {
                tookDamage = true;
                return false;
              }
            }
            return o.y <= 106;
          });

        const spawnChance = Math.min(0.52, 0.32 + currentWave * 0.025);
        if (Math.random() < spawnChance) {
          const isCore = Math.random() < 0.26;
          moved.push({
            id: nextIdRef.current++,
            x: 8 + Math.random() * 84,
            y: -6,
            size: isCore ? 28 : 24 + Math.floor(Math.random() * 14),
            speed: isCore ? 3.8 : 4.2 + Math.random() * 1.4,
            isCore,
          });
        }
        return moved;
      });

      if (bonus > 0) {
        coresRef.current += 1;
        setCoresCollected(coresRef.current);
        playScoreSound(Math.min(4, coresRef.current));
        triggerHapticFeedback(12);
      }

      if (tookDamage) {
        const nextShields = shieldsRef.current - 1;
        shieldsRef.current = nextShields;
        setShields(nextShields);
        playErrorSound();
        triggerHapticFeedback([30, 45]);

        if (nextShields <= 0 && !endedRef.current) {
          endedRef.current = true;
          const finalScore = scoreRef.current;
          setTimeout(() => {
            onMove({
              score: finalScore,
              isAbsolute: true,
              finish: true,
              label: `${finalScore} PKT (WELLE ${currentWave} • ${coresRef.current} KRISTALLE)`,
            });
          }, 0);
          return;
        } else {
          invulnUntilRef.current = performance.now() + 1200;
          setInvulnerable(true);
        }
      }

      scoreRef.current += 2 + bonus;
      setScore(scoreRef.current);
    }, 60);

    return () => clearInterval(id);
  }, [started, paused, isGameOver, disabled, onMove]);

  const updateShipFromClientX = (clientX: number) => {
    if (!stageRef.current || endedRef.current) return;
    if (!started) {
      playMoveSound();
      setStarted(true);
    }
    if (paused) setPaused(false);
    const rect = stageRef.current.getBoundingClientRect();
    const pct = Math.max(7, Math.min(93, ((clientX - rect.left) / rect.width) * 100));
    shipXRef.current = pct;
    setShipX(pct);
  };

  return (
    <div className="flex h-full w-full max-w-5xl flex-1 min-h-0 flex-col items-center justify-between gap-2 sm:gap-2.5 px-1 sm:px-3 py-1 select-none">
      {/* INTEGRIERTES COCKPIT-TELEMETRIE-PANEL */}
      <div className="flex flex-wrap items-center justify-between gap-2 w-full px-3 sm:px-4 py-1.5 sm:py-2 bg-[#160B2E]/95 border-[3px] border-[#C084FC] shadow-[0_8px_20px_rgba(0,0,0,0.5)] text-xs sm:text-sm font-arcade uppercase text-[#F3E8FF] shrink-0">
        <div className="flex items-center gap-3 sm:gap-4">
          <span>
            SCORE: <strong className="text-[#38BDF8]">{score}</strong>
          </span>
          <span className="text-[#E9D5FF]">
            WELLE <strong className="text-white">{wave}</strong>
          </span>
          <span className="inline-flex items-center gap-1 text-[#FDE68A]">
            <Sparkles className="h-3.5 w-3.5 text-[#FBBF24]" />
            <strong>{coresCollected}</strong>
          </span>
        </div>

        {/* Schutzschilde & Pause */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1 bg-[#090514] px-2.5 py-0.5 border border-[#7C3AED]">
            <span className="text-[10px] text-[#C4B5FD] mr-1 hidden xs:inline">SCHILDE</span>
            {Array.from({ length: 3 }).map((_, i) => (
              <Shield
                key={i}
                className={`h-4 w-4 transition-all ${
                  i < shields
                    ? 'text-[#34D399] fill-[#10B981] drop-shadow-[0_0_6px_#10B981]'
                    : 'text-[#475569] opacity-35'
                }`}
              />
            ))}
          </div>

          {started && (
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] bg-[#2E1065] hover:bg-[#4C1D95] text-white border-2 border-[#C084FC] cursor-pointer active:scale-95"
            >
              {paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
              <span>{paused ? 'WEITER' : 'PAUSE'}</span>
            </button>
          )}
        </div>
      </div>

      {/* VOLLFLÄCHIGE DEEP-COSMOS ARENA */}
      <div
        ref={stageRef}
        onPointerDown={(e) => updateShipFromClientX(e.clientX)}
        onPointerMove={(e) => {
          if (e.buttons > 0 || e.pointerType === 'touch') updateShipFromClientX(e.clientX);
        }}
        className={`relative w-full flex-1 min-h-[48dvh] sm:min-h-[58dvh] landscape:min-h-0 h-full bg-gradient-to-b from-[#040611] via-[#0B1026] to-[#1A103C] border-[4px] border-[#A855F7] shadow-[inset_0_0_36px_rgba(168,85,247,0.25),0_16px_36px_rgba(0,0,0,0.7)] overflow-hidden touch-none cursor-ew-resize ${
          invulnerable ? 'ring-4 ring-[#F43F5E]' : ''
        }`}
      >
        {/* Kosmischer Sternenhimmel */}
        {STARFIELD.map((st) => (
          <div
            key={st.id}
            style={{
              left: st.left,
              top: st.top,
              width: `${st.size}px`,
              height: `${st.size}px`,
            }}
            className={`pointer-events-none absolute rounded-full bg-white ${st.opacity}`}
          />
        ))}

        {/* Horizont-Nebelschein unten */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#7C3AED]/20 to-transparent" />

        {obstacles.map((o) => (
          <div
            key={o.id}
            style={{ left: `${o.x}%`, top: `${o.y}%` }}
            className="absolute -translate-x-1/2 -translate-y-1/2"
          >
            {o.isCore ? (
              <div className="drop-shadow-[0_0_12px_rgba(56,189,248,0.85)]">
                <CrystalGem size={o.size} active />
              </div>
            ) : (
              <div
                style={{
                  width: `${o.size}px`,
                  height: `${o.size}px`,
                  clipPath: 'polygon(18% 0%, 86% 10%, 100% 72%, 68% 100%, 6% 84%, 0% 28%)',
                }}
                className="bg-gradient-to-br from-[#94A3B8] via-[#475569] to-[#1E293B] border-2 border-[#E2E8F0] shadow-[0_0_10px_rgba(0,0,0,0.65)]"
              />
            )}
          </div>
        ))}

        {/* Raumschiff mit Energieschild-Kuppel & Triebwerksflamme */}
        <div
          style={{ left: `${shipX}%`, top: '84%' }}
          className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition-opacity ${
            invulnerable ? 'opacity-55 animate-pulse' : 'opacity-100'
          }`}
        >
          <div className="relative grid h-12 w-12 sm:h-14 sm:w-14 place-items-center rounded-full bg-gradient-to-b from-[#083344] to-[#0F172A] text-[#38BDF8] border-[3px] border-[#22D3EE] shadow-[0_0_20px_rgba(34,211,238,0.6)]">
            <Rocket className="h-6 w-6 sm:h-7 sm:w-7 -rotate-45 text-white drop-shadow-[0_0_6px_#38BDF8]" />
          </div>
          <Flame className="h-4 w-4 sm:h-5 sm:w-5 text-[#F59E0B] fill-[#FBBF24] -mt-1 rotate-180 animate-pulse" />
        </div>

        {/* Start- oder Pausen-Overlay */}
        {(!started || paused) && (
          <div
            onClick={() => {
              if (!started) setStarted(true);
              if (paused) setPaused(false);
            }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-[#040611]/80 backdrop-blur-[2px] cursor-pointer text-center p-6"
          >
            <span className="font-arcade text-2xl sm:text-4xl text-[#38BDF8] uppercase tracking-wider drop-shadow-[0_3px_0_#0F172A]">
              {paused ? 'SEKTOR PAUSIERT' : 'ZIEHEN ODER TIPPEN ZUM STARTEN'}
            </span>
            <span className="font-arcade text-xs sm:text-sm text-[#E9D5FF] uppercase">
              WEICHE ASTEROIDEN AUS • SAMMLE ENERGIE-KRISTALLE (+30 PKT)
            </span>
          </div>
        )}
      </div>

      {/* Kompakte Schubdüsen-Steuerleiste unten */}
      <div className="grid grid-cols-2 gap-2.5 w-full max-w-md shrink-0">
        <button
          type="button"
          onClick={() => nudgeShip(-14)}
          className="h-10 sm:h-11 bg-[#2E1065]/90 hover:bg-[#4C1D95] text-[#F3E8FF] border-[3px] border-[#C084FC] font-arcade text-xs sm:text-sm uppercase shadow-[0_4px_0_rgba(0,0,0,0.45)] active:scale-95 cursor-pointer"
        >
          ◀ SCHUB LINKS
        </button>
        <button
          type="button"
          onClick={() => nudgeShip(14)}
          className="h-10 sm:h-11 bg-[#2E1065]/90 hover:bg-[#4C1D95] text-[#F3E8FF] border-[3px] border-[#C084FC] font-arcade text-xs sm:text-sm uppercase shadow-[0_4px_0_rgba(0,0,0,0.45)] active:scale-95 cursor-pointer"
        >
          SCHUB RECHTS ▶
        </button>
      </div>
    </div>
  );
}

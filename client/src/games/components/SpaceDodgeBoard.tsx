import { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play, Rocket, Shield } from 'lucide-react';
import type { GameRendererProps } from '../types';
import { CrystalButton, CrystalGem, CrystalReadout } from '../../components/CrystalUI';
import {
  playErrorSound,
  playMoveSound,
  playScoreSound,
} from '../../utils/soundEffects';

interface Obstacle {
  id: number;
  x: number; // 0..100 %
  y: number; // 0..100 %
  size: number;
  speed: number;
  isCore: boolean;
}

const STARFIELD = Array.from({ length: 22 }, (_, i) => ({
  id: i,
  left: `${(i * 37) % 96 + 2}%`,
  top: `${(i * 53) % 96 + 2}%`,
  size: i % 3 === 0 ? 3 : 2,
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
            size: isCore ? 26 : 22 + Math.floor(Math.random() * 14),
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
      }

      if (tookDamage) {
        const nextShields = shieldsRef.current - 1;
        shieldsRef.current = nextShields;
        setShields(nextShields);
        playErrorSound();

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
          // 1.2s Unverwundbarkeit nach Schildtreffer
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
    <div className="flex h-full w-full max-w-6xl flex-1 min-h-0 flex-col lg:grid lg:grid-cols-[1fr_17rem] landscape:grid landscape:grid-cols-[1fr_15.5rem] items-stretch justify-center gap-2.5 sm:gap-5 px-1 sm:px-3 py-1 select-none">
      {/* Hochformat Info-Zeile */}
      <div className="flex lg:hidden landscape:hidden items-center justify-between w-full px-3 py-1.5 bg-[#F8FAFC] border-[3px] border-[#334155] shadow-[0_4px_0_rgba(15,23,42,0.28)] text-xs sm:text-sm font-arcade uppercase text-[#1E293B] shrink-0">
        <div className="flex items-center gap-3">
          <span>
            SCORE: <strong className="text-[#0284C7]">{score}</strong>
          </span>
          <span>WELLE {wave}</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <Shield
                key={i}
                className={`h-4 w-4 ${
                  i < shields
                    ? 'text-[#10B981] fill-[#10B981]'
                    : 'text-[#94A3B8] opacity-40'
                }`}
              />
            ))}
          </div>
          {started && (
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              className="px-2 py-0.5 text-[11px] bg-[#1E293B] text-white border-2 border-[#0F172A] cursor-pointer"
            >
              {paused ? 'GO' : 'PAUSE'}
            </button>
          )}
        </div>
      </div>

      {/* GROSSFLÄCHIGE DEEP-SPACE-ARENA */}
      <div
        ref={stageRef}
        onPointerDown={(e) => updateShipFromClientX(e.clientX)}
        onPointerMove={(e) => {
          if (e.buttons > 0 || e.pointerType === 'touch') updateShipFromClientX(e.clientX);
        }}
        className={`relative w-full flex-1 min-h-[48dvh] sm:min-h-[58dvh] landscape:min-h-0 h-full bg-gradient-to-b from-[#090D16] via-[#0F172A] to-[#1E293B] border-[4px] border-[#334155] shadow-[inset_0_0_0_3px_#475569,0_12px_28px_rgba(9,13,22,0.55)] overflow-hidden touch-none cursor-ew-resize ${
          invulnerable ? 'ring-2 ring-[#F43F5E]' : ''
        }`}
      >
        {/* Statischer Sternenhimmel für Tiefenwirkung */}
        {STARFIELD.map((st) => (
          <div
            key={st.id}
            style={{
              left: st.left,
              top: st.top,
              width: `${st.size}px`,
              height: `${st.size}px`,
            }}
            className="pointer-events-none absolute rounded-full bg-white/35"
          />
        ))}

        {/* Diagonal nebula sheen */}
        <div
          className="pointer-events-none absolute inset-0 bg-white/[0.03]"
          style={{ clipPath: 'polygon(0 0, 58% 0, 32% 100%, 0 100%)' }}
        />

        {obstacles.map((o) => (
          <div
            key={o.id}
            style={{ left: `${o.x}%`, top: `${o.y}%` }}
            className="absolute -translate-x-1/2 -translate-y-1/2"
          >
            {o.isCore ? (
              <CrystalGem size={o.size} active />
            ) : (
              <div
                style={{
                  width: `${o.size}px`,
                  height: `${o.size}px`,
                  clipPath: 'polygon(15% 0%, 88% 8%, 100% 75%, 72% 100%, 0% 82%)',
                }}
                className="bg-[#64748B] border-2 border-[#CBD5E1] shadow-md"
              />
            )}
          </div>
        ))}

        {/* Raumschiff mit Schutzschild-Ring */}
        <div
          style={{ left: `${shipX}%`, top: '85%' }}
          className={`absolute -translate-x-1/2 -translate-y-1/2 grid h-12 w-12 sm:h-14 sm:w-14 place-items-center bg-[#F8FAFC] text-[#059669] border-[3px] border-[#10B981] shadow-[inset_0_0_0_2px_#FFFFFF,0_4px_14px_rgba(16,185,129,0.55)] transition-opacity ${
            invulnerable ? 'opacity-60 animate-pulse' : 'opacity-100'
          }`}
        >
          <Rocket className="h-6 w-6 sm:h-7 sm:w-7 -rotate-45" />
        </div>

        {/* Start- oder Pausen-Overlay */}
        {(!started || paused) && (
          <div
            onClick={() => {
              if (!started) setStarted(true);
              if (paused) setPaused(false);
            }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-[#090D16]/75 backdrop-blur-[2px] cursor-pointer text-center p-6"
          >
            <span className="font-arcade text-2xl sm:text-3xl text-[#38BDF8] uppercase tracking-wider drop-shadow-[0_2px_0_#0F172A]">
              {paused ? 'FLUG PAUSIERT' : 'ZIEHEN ODER TIPPEN ZUM STARTEN'}
            </span>
            <span className="font-arcade text-xs sm:text-sm text-[#E2E8F0] uppercase">
              WEICHE ASTEROIDEN AUS • SAMMLE BLAUE ENERGIE-KRISTALLE (+30 PKT)
            </span>
          </div>
        )}
      </div>

      {/* Cockpit-Seitenleiste & Steuerung */}
      <aside className="flex flex-col justify-between gap-2.5 bg-[#F8FAFC] border-[3px] border-[#334155] shadow-[inset_0_0_0_3px_#FFFFFF,0_8px_0_rgba(15,23,42,0.35)] p-3 sm:p-4 shrink-0">
        <div className="hidden lg:flex landscape:flex flex-col gap-2.5">
          <CrystalReadout label="PUNKTE" value={score} />
          <CrystalReadout
            variant="emerald"
            label="SCHUTZSCHILDE"
            value={`${shields} / 3 AKTIV`}
          />
          <CrystalReadout
            variant="gold"
            label="WELLE / KRISTALLE"
            value={`W${wave} • ${coresCollected} 💎`}
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <CrystalButton size="md" variant="secondary" onClick={() => nudgeShip(-14)}>
              ◀ LINKS
            </CrystalButton>
            <CrystalButton size="md" variant="secondary" onClick={() => nudgeShip(14)}>
              RECHTS ▶
            </CrystalButton>
          </div>

          <div className="hidden lg:block landscape:block">
            <CrystalButton
              size="sm"
              fullWidth
              variant="secondary"
              disabled={!started}
              onClick={() => setPaused((p) => !p)}
            >
              {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              <span>{paused ? 'FORTSETZEN' : 'PAUSE'}</span>
            </CrystalButton>
          </div>
        </div>
      </aside>
    </div>
  );
}

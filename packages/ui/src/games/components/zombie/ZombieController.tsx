import { useEffect, useRef, useState } from 'react';
import {
  Crosshair,
  Heart,
  RotateCw,
  Skull,
  Sparkles,
  Zap,
} from 'lucide-react';
import type {
  ZombieHudStatePayload,
  ZombiePlayerHudState,
} from '@projektbox/shared/types';
import {
  getWeaponById,
  getXpBoundsForLevel,
  ZOMBIE_WEAPONS,
} from '@projektbox/shared/utils';
import { socketService } from '../../../services/socket';
import { playWinSound, triggerHapticFeedback } from '../../../utils/soundEffects';

interface ZombieControllerProps {
  myPlayerId: string;
}

interface StickState {
  active: boolean;
  pointerId: number | null;
  x: number; // -1..1
  y: number; // -1..1
}

export function ZombieController({ myPlayerId }: ZombieControllerProps) {
  const [wave, setWave] = useState(1);
  const [zombiesRemaining, setZombiesRemaining] = useState(0);
  const [hud, setHud] = useState<ZombiePlayerHudState>({
    playerId: myPlayerId,
    hp: 100,
    maxHp: 100,
    xp: 0,
    level: 1,
    weaponId: 'pistol',
    ammo: 12,
    maxAmmo: 12,
    reloading: false,
    kills: 0,
    score: 0,
    alive: true,
  });
  const [autoFire, setAutoFire] = useState(false);
  const [levelUpBanner, setLevelUpBanner] = useState<string | null>(null);
  const prevLevelRef = useRef(1);

  const [leftStick, setLeftStick] = useState<StickState>({
    active: false,
    pointerId: null,
    x: 0,
    y: 0,
  });
  const [rightStick, setRightStick] = useState<StickState>({
    active: false,
    pointerId: null,
    x: 0,
    y: 0,
  });

  const leftStickRef = useRef<StickState>(leftStick);
  const rightStickRef = useRef<StickState>(rightStick);
  const autoFireRef = useRef(autoFire);
  const reloadQueuedRef = useRef(false);
  const dashQueuedRef = useRef(false);

  leftStickRef.current = leftStick;
  rightStickRef.current = rightStick;
  autoFireRef.current = autoFire;

  const leftPadRef = useRef<HTMLDivElement | null>(null);
  const rightPadRef = useRef<HTMLDivElement | null>(null);

  // Receive live HUD updates from TV
  useEffect(() => {
    const unsub = socketService.onZombieState((payload: ZombieHudStatePayload) => {
      setWave(payload.wave);
      setZombiesRemaining(payload.zombiesRemaining);
      const mine = payload.players?.[myPlayerId];
      if (mine) {
        setHud(mine);
        if (mine.level > prevLevelRef.current) {
          prevLevelRef.current = mine.level;
          const unlocked = getWeaponById(mine.weaponId);
          setLevelUpBanner(`LEVEL ${mine.level}! ${unlocked.name.toUpperCase()}`);
          playWinSound();
          triggerHapticFeedback([30, 40, 60]);
          window.setTimeout(() => setLevelUpBanner(null), 3000);
        }
      }
    });
    return () => unsub();
  }, [myPlayerId]);

  // Stream controller input to TV (~25Hz)
  useEffect(() => {
    const interval = window.setInterval(() => {
      const l = leftStickRef.current;
      const r = rightStickRef.current;
      const aimMag = Math.hypot(r.x, r.y);
      const shouldFire = (r.active && aimMag > 0.25) || autoFireRef.current;

      socketService.emitZombieInput({
        moveX: Number(l.x.toFixed(3)),
        moveY: Number(l.y.toFixed(3)),
        aimX: Number(r.x.toFixed(3)),
        aimY: Number(r.y.toFixed(3)),
        firing: shouldFire,
        reload: reloadQueuedRef.current,
        dash: dashQueuedRef.current,
      });

      reloadQueuedRef.current = false;
      dashQueuedRef.current = false;
    }, 40);

    return () => window.clearInterval(interval);
  }, []);

  const computeStickOffset = (
    el: HTMLDivElement | null,
    clientX: number,
    clientY: number
  ): { x: number; y: number } => {
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = Math.max(24, rect.width / 2 - 18);
    let dx = (clientX - cx) / maxR;
    let dy = (clientY - cy) / maxR;
    const mag = Math.hypot(dx, dy);
    if (mag > 1) {
      dx /= mag;
      dy /= mag;
    }
    return { x: dx, y: dy };
  };

  const weapon = getWeaponById(hud.weaponId);
  const nextWeapon = ZOMBIE_WEAPONS.find((w) => w.unlockLevel > hud.level);
  const { currentMinXp, nextLevelXp } = getXpBoundsForLevel(hud.level);
  const xpPct = Math.min(
    100,
    Math.max(0, ((hud.xp - currentMinXp) / Math.max(1, nextLevelXp - currentMinXp)) * 100)
  );
  const hpPct = Math.max(0, (hud.hp / Math.max(1, hud.maxHp)) * 100);

  return (
    <div className="flex h-full min-h-[420px] w-full flex-col justify-between gap-3 select-none touch-none">
      {/* Top Controller HUD */}
      <div className="flex flex-col gap-2 rounded-2xl border border-white/15 bg-white/[0.04] p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-[#F59E0B]/20 border border-[#F59E0B]/50 px-2.5 py-1 font-arcade text-xs text-[#FDE68A]">
              LVL {hud.level}
            </span>
            <span className="font-arcade text-xs text-[#CBD5E1] uppercase">
              WELLE {wave}
            </span>
          </div>
          <div className="flex items-center gap-3 font-arcade text-xs">
            <span className="inline-flex items-center gap-1 text-[#FDA4AF]">
              <Skull className="h-3.5 w-3.5" />
              {hud.kills} KILLS
            </span>
            <span className="text-[#94A3B8]">{zombiesRemaining} ÜBRIG</span>
          </div>
        </div>

        {/* HP & XP Bars */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[10px] font-arcade text-[#CBD5E1]">
              <span className="inline-flex items-center gap-1 text-[#FB7185]">
                <Heart className="h-3 w-3" /> HP
              </span>
              <span>
                {hud.hp}/{hud.maxHp}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full transition-all duration-150"
                style={{
                  width: `${hpPct}%`,
                  backgroundColor: hpPct <= 30 ? '#EF4444' : '#10B981',
                }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[10px] font-arcade text-[#CBD5E1]">
              <span className="inline-flex items-center gap-1 text-[#38BDF8]">
                <Zap className="h-3 w-3" /> XP
              </span>
              <span>
                {hud.xp}/{nextLevelXp}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[#38BDF8] transition-all duration-150"
                style={{ width: `${xpPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Active Weapon Strip */}
        <div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-[#0F172A]/60 px-3 py-2">
          <div className="flex flex-col">
            <span className="font-arcade text-xs uppercase" style={{ color: weapon.color }}>
              {weapon.name}
            </span>
            {nextWeapon && (
              <span className="font-arcade text-[10px] text-[#94A3B8] uppercase">
                NÄCHSTE: {nextWeapon.shortName} (LVL {nextWeapon.unlockLevel})
              </span>
            )}
          </div>
          <span className="font-arcade text-sm text-white">
            {hud.reloading ? 'LÄDT...' : `${hud.ammo} / ${hud.maxAmmo}`}
          </span>
        </div>
      </div>

      {/* Level-Up Celebration */}
      {levelUpBanner && (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-[#FBBF24] bg-[#F59E0B]/20 px-4 py-2 text-center animate-bounce">
          <Sparkles className="h-4 w-4 text-[#FBBF24]" />
          <span className="font-arcade text-xs sm:text-sm text-[#FDE68A] uppercase">
            {levelUpBanner}
          </span>
        </div>
      )}

      {/* Dead Notice */}
      {!hud.alive ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-3xl border border-[#EF4444]/40 bg-[#EF4444]/10 p-6 text-center">
          <Skull className="h-10 w-10 text-[#FDA4AF]" />
          <span className="font-arcade text-base text-white uppercase">
            DU WURDEST ÜBERRANNT
          </span>
          <span className="font-arcade text-xs text-[#CBD5E1] uppercase">
            WARTE AUF DEIN TEAM ODER DIE ENDWERTUNG AM TV
          </span>
        </div>
      ) : (
        /* Dual-Stick Controller Surface */
        <div className="flex flex-1 items-center justify-between gap-2 px-1 py-2">
          {/* Left Stick: Move */}
          <div className="flex flex-col items-center gap-1.5">
            <div
              ref={leftPadRef}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                const off = computeStickOffset(leftPadRef.current, e.clientX, e.clientY);
                setLeftStick({ active: true, pointerId: e.pointerId, x: off.x, y: off.y });
              }}
              onPointerMove={(e) => {
                if (leftStickRef.current.pointerId !== e.pointerId) return;
                const off = computeStickOffset(leftPadRef.current, e.clientX, e.clientY);
                setLeftStick({ active: true, pointerId: e.pointerId, x: off.x, y: off.y });
              }}
              onPointerUp={(e) => {
                if (leftStickRef.current.pointerId !== e.pointerId) return;
                setLeftStick({ active: false, pointerId: null, x: 0, y: 0 });
              }}
              onPointerCancel={() => {
                setLeftStick({ active: false, pointerId: null, x: 0, y: 0 });
              }}
              className="relative flex h-36 w-36 sm:h-44 sm:w-44 items-center justify-center rounded-full border-2 border-[#38BDF8]/40 bg-[#0F172A]/70 shadow-inner touch-none"
            >
              <div
                className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-[#38BDF8] shadow-[0_0_20px_rgba(56,189,248,0.5)] transition-transform duration-75"
                style={{
                  transform: `translate(${leftStick.x * 42}px, ${leftStick.y * 42}px)`,
                }}
              />
            </div>
            <span className="font-arcade text-[10px] tracking-wider text-[#94A3B8] uppercase">
              BEWEGEN
            </span>
          </div>

          {/* Center Action Buttons */}
          <div className="flex flex-col items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                reloadQueuedRef.current = true;
                triggerHapticFeedback(20);
              }}
              className="flex h-12 w-24 flex-col items-center justify-center gap-0.5 rounded-2xl border border-[#F59E0B]/50 bg-[#F59E0B]/15 font-arcade text-[10px] text-[#FDE68A] active:scale-95"
            >
              <RotateCw className="h-4 w-4" />
              <span>LADEN</span>
            </button>

            <button
              type="button"
              onClick={() => {
                dashQueuedRef.current = true;
                triggerHapticFeedback(25);
              }}
              className="flex h-12 w-24 flex-col items-center justify-center gap-0.5 rounded-2xl border border-[#38BDF8]/50 bg-[#38BDF8]/15 font-arcade text-[10px] text-[#7DD3FC] active:scale-95"
            >
              <Zap className="h-4 w-4" />
              <span>DASH</span>
            </button>

            <button
              type="button"
              onClick={() => setAutoFire((v) => !v)}
              className={`flex h-10 w-24 items-center justify-center gap-1 rounded-xl border font-arcade text-[10px] uppercase transition-all ${
                autoFire
                  ? 'border-[#34D399] bg-[#10B981]/25 text-[#6EE7B7]'
                  : 'border-white/15 bg-white/[0.04] text-[#94A3B8]'
              }`}
            >
              <Crosshair className="h-3.5 w-3.5" />
              <span>AUTO</span>
            </button>
          </div>

          {/* Right Stick: Aim & Shoot */}
          <div className="flex flex-col items-center gap-1.5">
            <div
              ref={rightPadRef}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                const off = computeStickOffset(rightPadRef.current, e.clientX, e.clientY);
                setRightStick({ active: true, pointerId: e.pointerId, x: off.x, y: off.y });
              }}
              onPointerMove={(e) => {
                if (rightStickRef.current.pointerId !== e.pointerId) return;
                const off = computeStickOffset(rightPadRef.current, e.clientX, e.clientY);
                setRightStick({ active: true, pointerId: e.pointerId, x: off.x, y: off.y });
              }}
              onPointerUp={(e) => {
                if (rightStickRef.current.pointerId !== e.pointerId) return;
                setRightStick({ active: false, pointerId: null, x: 0, y: 0 });
              }}
              onPointerCancel={() => {
                setRightStick({ active: false, pointerId: null, x: 0, y: 0 });
              }}
              className="relative flex h-36 w-36 sm:h-44 sm:w-44 items-center justify-center rounded-full border-2 border-[#F43F5E]/45 bg-[#0F172A]/70 shadow-inner touch-none"
            >
              <div
                className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-[#F43F5E] text-white shadow-[0_0_20px_rgba(244,63,94,0.55)] transition-transform duration-75"
                style={{
                  transform: `translate(${rightStick.x * 42}px, ${rightStick.y * 42}px)`,
                }}
              >
                <Crosshair className="h-6 w-6" />
              </div>
            </div>
            <span className="font-arcade text-[10px] tracking-wider text-[#94A3B8] uppercase">
              ZIELEN & FEUERN
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

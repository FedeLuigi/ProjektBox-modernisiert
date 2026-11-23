import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Biohazard,
  Crosshair,
  Heart,
  RotateCw,
  Shield,
  Skull,
  User,
  X,
  Zap,
} from 'lucide-react';
import type {
  Player,
  ZombieHudStatePayload,
  ZombiePlayerHudState,
  ZombieSkillKey,
} from '@projektbox/shared/types';
import {
  getWeaponById,
  getXpBoundsForLevel,
  ZOMBIE_WEAPONS,
} from '@projektbox/shared/utils';
import { Avatar } from '../../../components/Avatar';
import { socketService } from '../../../services/socket';
import { playWinSound, triggerHapticFeedback } from '../../../utils/soundEffects';

interface ZombieControllerProps {
  myPlayerId: string;
  myPlayer?: Player;
}

interface StickState {
  active: boolean;
  pointerId: number | null;
  x: number; // -1..1
  y: number; // -1..1
}

export function ZombieController({ myPlayerId, myPlayer }: ZombieControllerProps) {
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
    skillPoints: 0,
    skills: { hp: 0, damage: 0, speed: 0, ammo: 0 },
  });
  const [autoFire, setAutoFire] = useState(false);
  const [showCharMenu, setShowCharMenu] = useState(false);
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

  // Stream controller input to TV/Host (~25Hz), including optional keyboard fallback
  useEffect(() => {
    const keys = new Set<string>();
    const onKeyDown = (e: KeyboardEvent) => keys.add(e.key.toLowerCase());
    const onKeyUp = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const interval = window.setInterval(() => {
      const l = leftStickRef.current;
      const r = rightStickRef.current;
      const kx = (keys.has('d') ? 1 : 0) - (keys.has('a') ? 1 : 0);
      const ky = (keys.has('s') ? 1 : 0) - (keys.has('w') ? 1 : 0);
      const ax = (keys.has('arrowright') ? 1 : 0) - (keys.has('arrowleft') ? 1 : 0);
      const ay = (keys.has('arrowdown') ? 1 : 0) - (keys.has('arrowup') ? 1 : 0);

      const moveX = kx !== 0 ? kx : l.x;
      const moveY = ky !== 0 ? ky : l.y;
      const aimX = ax !== 0 ? ax : r.x;
      const aimY = ay !== 0 ? ay : r.y;

      const aimMag = Math.hypot(r.x, r.y);
      const shouldFire =
        (r.active && aimMag > 0.25) ||
        ax !== 0 ||
        ay !== 0 ||
        keys.has(' ') ||
        autoFireRef.current;

      socketService.emitZombieInput({
        moveX: Number(moveX.toFixed(3)),
        moveY: Number(moveY.toFixed(3)),
        aimX: Number(aimX.toFixed(3)),
        aimY: Number(aimY.toFixed(3)),
        firing: shouldFire,
        reload: reloadQueuedRef.current || keys.has('r'),
        dash: dashQueuedRef.current || keys.has('shift'),
      });

      reloadQueuedRef.current = false;
      dashQueuedRef.current = false;
    }, 40);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
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

  const sendUpgrade = (skill: ZombieSkillKey) => {
    socketService.emitZombieInput({
      moveX: 0,
      moveY: 0,
      aimX: 0,
      aimY: 0,
      firing: false,
      upgradeSkill: skill,
    });
    triggerHapticFeedback(25);
  };

  const sendSelectWeapon = (weaponId: string) => {
    socketService.emitZombieInput({
      moveX: 0,
      moveY: 0,
      aimX: 0,
      aimY: 0,
      firing: false,
      selectWeaponId: weaponId,
    });
    triggerHapticFeedback(20);
  };

  const skillPoints = hud.skillPoints ?? 0;
  const skills = hud.skills ?? { hp: 0, damage: 0, speed: 0, ammo: 0 };

  return (
    <div className="relative flex h-full min-h-0 flex-1 w-full flex-col justify-between gap-2 overflow-hidden select-none touch-none">
      {/* Top Tactical Controller HUD */}
      <div className="flex shrink-0 flex-col gap-1.5 border border-white/12 border-l-2 border-l-[#EF4444] bg-[#070B12]/85 px-3 py-2 backdrop-blur-md">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="bg-[#F59E0B]/20 border border-[#F59E0B]/50 px-2 py-0.5 font-mono text-[11px] font-bold tracking-wider text-[#FDE68A]">
              RANG {String(hud.level).padStart(2, '0')}
            </span>
            <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold tracking-wider text-[#CBD5E1] uppercase">
              <Biohazard className="h-3.5 w-3.5 text-[#EF4444]" />
              WELLE {String(wave).padStart(2, '0')}
            </span>
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px] font-bold tracking-wider">
            <span className="inline-flex items-center gap-1 text-[#FCA5A5]">
              <Skull className="h-3.5 w-3.5" />
              {hud.kills} KILLS
            </span>
            <span className="text-[#94A3B8]">{zombiesRemaining} ÜBRIG</span>
          </div>
        </div>

        {/* HP & XP Bars */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[10px] font-mono font-bold text-[#CBD5E1]">
              <span className="inline-flex items-center gap-1 text-[#EF4444]">
                <Heart className="h-3 w-3" /> HP
              </span>
              <span>
                {hud.hp}/{hud.maxHp}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden bg-white/10">
              <div
                className="h-full transition-all duration-150"
                style={{
                  width: `${hpPct}%`,
                  backgroundColor: hpPct <= 30 ? '#EF4444' : hpPct <= 60 ? '#F59E0B' : '#22C55E',
                }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[10px] font-mono font-bold text-[#CBD5E1]">
              <span className="inline-flex items-center gap-1 text-[#38BDF8]">
                <Zap className="h-3 w-3" /> XP
              </span>
              <span>
                {hud.xp}/{nextLevelXp}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden bg-white/10">
              <div
                className="h-full bg-[#38BDF8] transition-all duration-150"
                style={{ width: `${xpPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Active Weapon Strip + Character Menu Trigger */}
        <div className="flex items-center justify-between gap-2 border-t border-white/10 pt-1.5">
          <div className="flex flex-col min-w-0">
            <span className="font-mono text-xs font-bold tracking-wider uppercase truncate" style={{ color: weapon.color }}>
              {weapon.name}
            </span>
            {nextWeapon && (
              <span className="font-mono text-[10px] tracking-wider text-[#94A3B8] uppercase truncate">
                NÄCHSTE: {nextWeapon.shortName} (RANG {String(nextWeapon.unlockLevel).padStart(2, '0')})
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-mono text-xs sm:text-sm font-bold tracking-widest text-white">
              {hud.reloading ? 'NACHLADEN...' : `${hud.ammo}/${hud.maxAmmo}`}
            </span>
            <button
              type="button"
              onClick={() => setShowCharMenu(true)}
              className={`relative inline-flex items-center gap-1 border px-2.5 py-1 font-mono text-[10px] font-bold tracking-wider uppercase active:scale-95 ${
                skillPoints > 0
                  ? 'border-[#F59E0B] bg-[#F59E0B]/20 text-[#FDE68A]'
                  : 'border-white/20 bg-white/[0.06] text-white'
              }`}
            >
              <User className="h-3.5 w-3.5" />
              <span>CHARAKTER</span>
              {skillPoints > 0 && (
                <span className="ml-0.5 rounded-full bg-[#EF4444] px-1.5 text-[9px] text-white">
                  +{skillPoints}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Character & Upgrade Menu Overlay */}
      {showCharMenu && (
        <div className="absolute inset-0 z-40 flex flex-col gap-3 overflow-y-auto bg-[#070B12]/96 p-3 backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-white/15 pb-2">
            <div className="flex items-center gap-2.5">
              {myPlayer && <Avatar config={myPlayer.avatar} size={38} />}
              <div className="flex flex-col leading-tight">
                <span className="font-mono text-xs font-bold tracking-wider text-white uppercase">
                  {myPlayer?.name || 'OPERATOR'} • RANG {String(hud.level).padStart(2, '0')}
                </span>
                <span className="font-mono text-[10px] tracking-wider text-[#94A3B8] uppercase">
                  HP {hud.hp}/{hud.maxHp} • {hud.kills} KILLS • SKILL-PUNKTE: {skillPoints}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowCharMenu(false)}
              className="inline-flex items-center gap-1 border border-white/20 bg-white/10 px-2.5 py-1 font-mono text-[10px] font-bold text-white uppercase active:scale-95"
            >
              <X className="h-3.5 w-3.5" />
              <span>ZURÜCK</span>
            </button>
          </div>

          {/* Skills Section */}
          <div className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] font-bold tracking-[0.2em] text-[#FDE68A] uppercase">
              OPERATOR-SKILLS ({skillPoints} PUNKTE VERFÜGBAR)
            </span>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'hp' as const, label: 'VITALITÄT', desc: '+25 MAX HP', val: skills.hp, icon: Heart, color: '#EF4444' },
                { key: 'damage' as const, label: 'FEUERKRAFT', desc: '+15% SCHADEN', val: skills.damage, icon: Crosshair, color: '#F59E0B' },
                { key: 'speed' as const, label: 'TEMPO', desc: '+10% LAUF/LADEN', val: skills.speed, icon: Zap, color: '#38BDF8' },
                { key: 'ammo' as const, label: 'MAGAZIN', desc: '+25% MUNITION', val: skills.ammo, icon: Shield, color: '#10B981' },
              ].map((sk) => {
                const Icon = sk.icon;
                return (
                  <button
                    key={sk.key}
                    type="button"
                    disabled={skillPoints <= 0}
                    onClick={() => sendUpgrade(sk.key)}
                    className={`flex items-center justify-between gap-2 border px-2.5 py-2 text-left transition-all ${
                      skillPoints > 0
                        ? 'border-[#F59E0B]/60 bg-[#F59E0B]/10 hover:bg-[#F59E0B]/20 active:scale-95'
                        : 'border-white/10 bg-white/[0.03] opacity-65'
                    }`}
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-white uppercase">
                        <Icon className="h-3 w-3 shrink-0" style={{ color: sk.color }} />
                        {sk.label}
                      </span>
                      <span className="font-mono text-[9px] text-[#94A3B8] uppercase">
                        {sk.desc}
                      </span>
                    </div>
                    <span className="font-mono shrink-0 bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-[#FDE68A]">
                      +{sk.val}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Weapon Arsenal Section */}
          <div className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] font-bold tracking-[0.2em] text-[#38BDF8] uppercase">
              WAFFEN-ARSENAL
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ZOMBIE_WEAPONS.map((w) => {
                const unlocked = hud.level >= w.unlockLevel;
                const equipped = hud.weaponId === w.id;
                return (
                  <button
                    key={w.id}
                    type="button"
                    disabled={!unlocked}
                    onClick={() => sendSelectWeapon(w.id)}
                    className={`flex flex-col gap-0.5 border px-2.5 py-1.5 text-left transition-all ${
                      equipped
                        ? 'border-[#38BDF8] bg-[#38BDF8]/20'
                        : unlocked
                          ? 'border-white/20 bg-white/[0.05] active:scale-95'
                          : 'border-white/10 bg-white/[0.02] opacity-45'
                    }`}
                  >
                    <span className="font-mono text-[11px] font-bold uppercase truncate" style={{ color: w.color }}>
                      {w.name}
                    </span>
                    <span className="font-mono text-[9px] text-[#94A3B8] uppercase">
                      {equipped ? 'AUSGERÜSTET' : unlocked ? `SCHADEN ${w.damage}` : `AB RANG ${w.unlockLevel}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tactical Level-Up Alert */}
      {levelUpBanner && (
        <div className="flex items-center justify-center gap-2 border-y border-[#F59E0B] bg-[#070B12]/90 px-4 py-1.5 text-center">
          <AlertTriangle className="h-4 w-4 text-[#F59E0B]" />
          <span className="font-mono text-xs font-bold tracking-[0.18em] text-[#FDE68A] uppercase">
            {levelUpBanner}
          </span>
        </div>
      )}

      {/* Dead Notice */}
      {!hud.alive ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 border border-[#EF4444]/40 bg-[#070B12]/80 p-6 text-center">
          <Skull className="h-10 w-10 text-[#EF4444]" />
          <span className="font-mono text-base font-bold tracking-[0.2em] text-white uppercase">
            K.I.A. • AUSSER GEFECHT
          </span>
          <span className="font-mono text-xs tracking-wider text-[#94A3B8] uppercase">
            WARTE AUF DEIN TEAM ODER DIE ENDWERTUNG AM TV
          </span>
        </div>
      ) : (
        <div className="flex flex-1 min-h-0 items-center justify-between gap-2 px-1 py-1">
          {/* Dual-Stick Controller Surface */}
          {/* Left Stick: Move */}
          <div className="flex flex-col items-center gap-1">
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
              className="relative flex h-32 w-32 sm:h-40 sm:w-40 items-center justify-center rounded-full border-2 border-[#38BDF8]/40 bg-[#0F172A]/70 shadow-inner touch-none"
            >
              <div
                className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-[#38BDF8] shadow-[0_0_20px_rgba(56,189,248,0.5)] transition-transform duration-75"
                style={{
                  transform: `translate(${leftStick.x * 36}px, ${leftStick.y * 36}px)`,
                }}
              />
            </div>
            <span className="font-arcade text-[10px] tracking-wider text-[#94A3B8] uppercase">
              BEWEGEN
            </span>
          </div>

          {/* Center Action Buttons */}
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => {
                reloadQueuedRef.current = true;
                triggerHapticFeedback(20);
              }}
              className="flex h-10 w-24 flex-col items-center justify-center gap-0.5 rounded-2xl border border-[#F59E0B]/50 bg-[#F59E0B]/15 font-arcade text-[10px] text-[#FDE68A] active:scale-95"
            >
              <RotateCw className="h-3.5 w-3.5" />
              <span>LADEN</span>
            </button>

            <button
              type="button"
              onClick={() => {
                dashQueuedRef.current = true;
                triggerHapticFeedback(25);
              }}
              className="flex h-10 w-24 flex-col items-center justify-center gap-0.5 rounded-2xl border border-[#38BDF8]/50 bg-[#38BDF8]/15 font-arcade text-[10px] text-[#7DD3FC] active:scale-95"
            >
              <Zap className="h-3.5 w-3.5" />
              <span>DASH</span>
            </button>

            <button
              type="button"
              onClick={() => setAutoFire((v) => !v)}
              className={`flex h-9 w-24 items-center justify-center gap-1 rounded-xl border font-arcade text-[10px] uppercase transition-all ${
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
          <div className="flex flex-col items-center gap-1">
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
              className="relative flex h-32 w-32 sm:h-40 sm:w-40 items-center justify-center rounded-full border-2 border-[#F43F5E]/45 bg-[#0F172A]/70 shadow-inner touch-none"
            >
              <div
                className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-[#F43F5E] text-white shadow-[0_0_20px_rgba(244,63,94,0.55)] transition-transform duration-75"
                style={{
                  transform: `translate(${rightStick.x * 36}px, ${rightStick.y * 36}px)`,
                }}
              >
                <Crosshair className="h-5 w-5" />
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

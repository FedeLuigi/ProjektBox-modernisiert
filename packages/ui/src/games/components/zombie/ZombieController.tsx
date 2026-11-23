import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
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
import {
  AnalogGaugeSvg,
  BiohazardEmblemSvg,
  LockedChainOverlaySvg,
  RivetCorners,
  WeaponSilhouetteSvg,
  ZOMBIE_UI_TEXTURES,
} from './zombieControllerArt';

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
  const hpSegments = Math.round((hpPct / 100) * 12);
  const xpSegments = Math.round((xpPct / 100) * 12);

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
    <div
      className="relative flex h-full min-h-0 flex-1 w-full flex-col justify-between gap-1.5 overflow-hidden bg-[#0A0C0E] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))] select-none touch-none"
      style={{
        backgroundImage: `radial-gradient(circle at 50% 48%, rgba(185,28,28,0.16) 0%, rgba(10,12,14,0.82) 56%, rgba(4,5,7,0.96) 100%), url(${ZOMBIE_UI_TEXTURES.diamondPlate})`,
        backgroundSize: 'cover, 240px 240px',
        backgroundRepeat: 'no-repeat, repeat',
      }}
    >
      {/* Top Industrial HUD Row */}
      <div className="relative z-10 flex shrink-0 items-start justify-between gap-2 pr-20">
        {/* Left: Distressed Military Tag */}
        <div className="relative -rotate-2 shrink-0 rounded-sm border border-[#78654C] bg-gradient-to-br from-[#D6C7A9] to-[#B09B78] px-2.5 py-1 text-[#1C1917] shadow-[0_3px_10px_rgba(0,0,0,0.65)]">
          <span
            className="absolute top-1/2 -left-1 h-2 w-2 -translate-y-1/2 rounded-full bg-[#1C1917] ring-1 ring-[#78654C]"
            aria-hidden="true"
          />
          <div className="flex flex-col leading-tight pl-1">
            <span className="font-mono text-[10px] font-extrabold tracking-[0.14em] uppercase">
              WELLE {String(wave).padStart(2, '0')}
            </span>
            <span className="font-mono text-[10px] font-bold tracking-[0.14em] text-[#44403C] uppercase">
              RANG {String(hud.level).padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* Center: Riveted Brushed-Steel Dual Gauge Panel */}
        <div
          className="relative flex flex-1 max-w-md items-center justify-between gap-2.5 rounded border border-[#52525B] px-3 py-1.5 shadow-[0_4px_14px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,255,255,0.18)]"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(24,27,32,0.84) 0%, rgba(15,17,21,0.9) 100%), url(${ZOMBIE_UI_TEXTURES.brushedSteel})`,
            backgroundSize: 'cover, 180px 180px',
          }}
        >
          <RivetCorners />
          {/* HP Gauge + Segmented Bar */}
          <div className="flex flex-1 items-center gap-2 min-w-0">
            <AnalogGaugeSvg
              pct={hpPct}
              accentColor={hpPct <= 30 ? '#EF4444' : hpPct <= 60 ? '#F59E0B' : '#22C55E'}
              size={28}
            />
            <div className="flex flex-1 flex-col gap-0.5 min-w-0">
              <div className="flex items-center justify-between font-mono text-[10px] font-bold text-[#E2E8F0]">
                <span className="text-[#86EFAC]">HP</span>
                <span>
                  {hud.hp}/{hud.maxHp}
                </span>
              </div>
              <div className="grid grid-cols-12 gap-0.5 rounded-sm bg-black/70 p-0.5 border border-white/10">
                {Array.from({ length: 12 }).map((_, i) => (
                  <span
                    key={i}
                    className="h-1.5 rounded-[1px]"
                    style={{
                      backgroundColor:
                        i < hpSegments
                          ? hpPct <= 30
                            ? '#EF4444'
                            : hpPct <= 60
                              ? '#F59E0B'
                              : '#22C55E'
                          : 'rgba(255,255,255,0.08)',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* XP Gauge + Segmented Bar */}
          <div className="flex flex-1 items-center gap-2 min-w-0">
            <AnalogGaugeSvg pct={xpPct} accentColor="#FBBF24" size={28} />
            <div className="flex flex-1 flex-col gap-0.5 min-w-0">
              <div className="flex items-center justify-between font-mono text-[10px] font-bold text-[#E2E8F0]">
                <span className="text-[#FDE68A]">XP</span>
                <span className="truncate">
                  {hud.xp}/{nextLevelXp}
                </span>
              </div>
              <div className="grid grid-cols-12 gap-0.5 rounded-sm bg-black/70 p-0.5 border border-white/10">
                {Array.from({ length: 12 }).map((_, i) => (
                  <span
                    key={i}
                    className="h-1.5 rounded-[1px]"
                    style={{
                      backgroundColor: i < xpSegments ? '#FBBF24' : 'rgba(255,255,255,0.08)',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Scratched Kill / Remaining Readout */}
        <div className="hidden sm:flex shrink-0 flex-col items-end font-mono leading-tight text-right">
          <span className="text-xs font-extrabold tracking-[0.14em] text-[#E2E8F0] drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
            {hud.kills} KILLS
          </span>
          <span className="text-[10px] font-bold tracking-[0.14em] text-[#94A3B8]">
            {zombiesRemaining} ÜBRIG
          </span>
        </div>
      </div>

      {/* Tactical Weapon & Character Strip */}
      <div
        className="relative z-10 flex shrink-0 items-center justify-between gap-2 rounded border border-[#3F3F46] px-3 py-1 shadow-[0_3px_10px_rgba(0,0,0,0.65)]"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(17,20,25,0.88) 0%, rgba(10,12,15,0.94) 100%), url(${ZOMBIE_UI_TEXTURES.brushedSteel})`,
          backgroundSize: 'cover, 160px 160px',
        }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <WeaponSilhouetteSvg weaponId={weapon.id} className="h-5 w-12 shrink-0" color={weapon.color} />
          <div className="flex flex-col leading-tight min-w-0">
            <span className="font-mono text-[11px] font-bold tracking-wider uppercase truncate" style={{ color: weapon.color }}>
              {weapon.name}
            </span>
            {nextWeapon && (
              <span className="font-mono text-[9px] tracking-wider text-[#94A3B8] uppercase truncate">
                NÄCHSTE: {nextWeapon.shortName} (RANG {String(nextWeapon.unlockLevel).padStart(2, '0')})
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <span className="sm:hidden font-mono text-[10px] font-bold text-[#FCA5A5]">
            {hud.kills} KILLS
          </span>
          <span className="font-mono text-xs font-extrabold tracking-widest text-[#F8FAFC]">
            {hud.reloading ? 'NACHLADEN...' : `${hud.ammo}/${hud.maxAmmo}`}
          </span>
          <button
            type="button"
            onClick={() => setShowCharMenu(true)}
            className={`relative inline-flex items-center gap-1 rounded border px-2.5 py-1 font-mono text-[10px] font-bold tracking-wider uppercase shadow-md active:scale-95 ${
              skillPoints > 0
                ? 'border-[#F59E0B] bg-gradient-to-b from-[#78350F]/90 to-[#451A03]/95 text-[#FDE68A]'
                : 'border-[#52525B] bg-gradient-to-b from-[#27272A]/90 to-[#18181B]/95 text-[#E2E8F0]'
            }`}
          >
            <User className="h-3.5 w-3.5" />
            <span>CHARAKTER</span>
            {skillPoints > 0 && (
              <span className="ml-0.5 rounded-full bg-[#DC2626] px-1.5 text-[9px] text-white ring-1 ring-white/30">
                +{skillPoints}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Character & Upgrade Menu Overlay (Military Olive-Steel Aesthetic) */}
      {showCharMenu && (
        <div
          className="absolute inset-0 z-50 flex flex-col gap-2.5 overflow-y-auto bg-[#121912] p-3 shadow-2xl"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(16,24,16,0.82) 0%, rgba(10,14,10,0.92) 100%), url(${ZOMBIE_UI_TEXTURES.oliveSteel})`,
            backgroundSize: 'cover, 260px 260px',
            backgroundRepeat: 'no-repeat, repeat',
          }}
        >
          {/* Operator Dog-Tag Header */}
          <div className="relative flex items-center justify-between gap-2 rounded border border-[#475547] bg-[#182018]/90 px-3 py-2 shadow-lg">
            <RivetCorners />
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative flex items-center gap-2 rounded-sm border border-[#64748B]/60 bg-gradient-to-b from-[#94A3B8]/25 to-[#334155]/40 px-2 py-1">
                {myPlayer && <Avatar config={myPlayer.avatar} size={32} />}
                <div className="flex flex-col leading-tight min-w-0">
                  <span className="font-mono text-xs font-extrabold tracking-wider text-white uppercase truncate">
                    {myPlayer?.name || 'OPERATOR'} • RANG {String(hud.level).padStart(2, '0')}
                  </span>
                  <span className="font-mono text-[10px] tracking-wider text-[#CBD5E1] uppercase">
                    HP {hud.hp}/{hud.maxHp} • {hud.kills} KILLS • SKILL-PUNKTE: {skillPoints}
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowCharMenu(false)}
              className="relative inline-flex items-center gap-1 rounded border border-[#DC2626]/70 bg-gradient-to-b from-[#450A0A] to-[#270606] px-3 py-1.5 font-mono text-[11px] font-bold tracking-wider text-[#FCA5A5] uppercase shadow-md active:scale-95"
            >
              <X className="h-3.5 w-3.5 text-[#EF4444]" />
              <span>ZURÜCK</span>
            </button>
          </div>

          {/* Operator-Skills: Riveted Brushed-Steel Plates */}
          <div className="flex flex-col gap-1.5">
            <span className="font-mono text-[11px] font-extrabold tracking-[0.2em] text-[#E2E8F0] uppercase drop-shadow">
              OPERATOR-SKILLS ({skillPoints} PUNKTE VERFÜGBAR)
            </span>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'hp' as const, label: 'VITALITÄT', desc: '+25 MAX HP', val: skills.hp, icon: Heart, color: '#EF4444' },
                { key: 'damage' as const, label: 'FEUERKRAFT', desc: '+15% SCHADEN', val: skills.damage, icon: Crosshair, color: '#F59E0B' },
                { key: 'speed' as const, label: 'TEMPO', desc: '+10% LAUF/LADEN', val: skills.speed, icon: Zap, color: '#38BDF8' },
                { key: 'ammo' as const, label: 'MAGAZIN', desc: '+25% MUNITION', val: skills.ammo, icon: Shield, color: '#22C55E' },
              ].map((sk) => {
                const Icon = sk.icon;
                const fillPct = Math.min(100, sk.val * 20);
                return (
                  <button
                    key={sk.key}
                    type="button"
                    disabled={skillPoints <= 0}
                    onClick={() => sendUpgrade(sk.key)}
                    className={`relative flex items-center justify-between gap-2 rounded border px-3 py-2 text-left shadow-md transition-all ${
                      skillPoints > 0
                        ? 'border-[#D97706] active:scale-95'
                        : 'border-[#52525B] opacity-80'
                    }`}
                    style={{
                      backgroundImage: `linear-gradient(180deg, rgba(63,63,70,0.82) 0%, rgba(24,24,27,0.9) 100%), url(${ZOMBIE_UI_TEXTURES.brushedSteel})`,
                      backgroundSize: 'cover, 150px 150px',
                    }}
                  >
                    <RivetCorners />
                    <div className="flex flex-col min-w-0 pl-1">
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] font-extrabold tracking-wider text-white uppercase">
                        <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: sk.color }} />
                        {sk.label}
                      </span>
                      <span className="font-mono text-[9px] font-bold text-[#CBD5E1] uppercase">
                        {sk.desc} (+{sk.val})
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <AnalogGaugeSvg pct={fillPct} accentColor={sk.color} size={24} />
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded border font-mono text-sm font-black ${
                          skillPoints > 0
                            ? 'border-[#F59E0B] bg-[#F59E0B]/25 text-[#FDE68A]'
                            : 'border-white/20 bg-black/40 text-[#94A3B8]'
                        }`}
                      >
                        +
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Weapon Arsenal: 3x2 Gunmetal Cards with Weapon Silhouettes & Chains */}
          <div className="flex flex-col gap-1.5">
            <span className="font-mono text-[11px] font-extrabold tracking-[0.2em] text-[#E2E8F0] uppercase drop-shadow">
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
                    className={`relative flex flex-col justify-between gap-1 overflow-hidden rounded border px-2.5 py-2 text-left shadow-md transition-all ${
                      equipped
                        ? 'border-[#38BDF8] bg-[#0F172A]/90 ring-1 ring-[#38BDF8]/50'
                        : unlocked
                          ? 'border-[#52525B] bg-[#18181B]/90 active:scale-95'
                          : 'border-[#27272A] bg-[#09090B]/90'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className="font-mono text-[10px] font-extrabold tracking-wider uppercase truncate"
                        style={{ color: unlocked ? w.color : '#64748B' }}
                      >
                        {w.name}
                      </span>
                      <span className="font-mono text-[9px] text-[#94A3B8]">
                        {unlocked ? `DMG ${w.damage}` : `R${w.unlockLevel}`}
                      </span>
                    </div>

                    <div className="flex items-center justify-center py-0.5">
                      <WeaponSilhouetteSvg
                        weaponId={w.id}
                        className="h-8 w-24"
                        color={equipped ? '#E2E8F0' : unlocked ? '#94A3B8' : '#334155'}
                      />
                    </div>

                    {equipped && (
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <span className="-rotate-12 border-2 border-[#EF4444]/85 bg-[#450A0A]/80 px-2 py-0.5 font-mono text-[10px] font-black tracking-[0.18em] text-[#FCA5A5] uppercase shadow">
                          AUSGERÜSTET
                        </span>
                      </div>
                    )}

                    {!unlocked && <LockedChainOverlaySvg />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tactical Level-Up Alert */}
      {levelUpBanner && (
        <div className="relative z-20 flex items-center justify-center gap-2 border-y border-[#F59E0B] bg-[#070B12]/92 px-4 py-1 text-center shadow-lg">
          <AlertTriangle className="h-4 w-4 text-[#F59E0B]" />
          <span className="font-mono text-xs font-bold tracking-[0.18em] text-[#FDE68A] uppercase">
            {levelUpBanner}
          </span>
        </div>
      )}

      {/* Dead Notice or Dual-Stick Industrial Control Deck */}
      {!hud.alive ? (
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-2 rounded border border-[#EF4444]/50 bg-[#070B12]/88 p-6 text-center shadow-xl">
          <Skull className="h-10 w-10 text-[#EF4444]" />
          <span className="font-mono text-base font-bold tracking-[0.2em] text-white uppercase">
            K.I.A. • AUSSER GEFECHT
          </span>
          <span className="font-mono text-xs tracking-wider text-[#94A3B8] uppercase">
            WARTE AUF DEIN TEAM ODER DIE ENDWERTUNG AM TV
          </span>
        </div>
      ) : (
        <div className="relative z-10 flex flex-1 min-h-0 items-center justify-between gap-2 px-1 py-0.5">
          {/* Subtle Center Biohazard Glow Backdrop */}
          <div className="pointer-events-none absolute inset-x-0 top-1 flex justify-center opacity-75">
            <BiohazardEmblemSvg className="h-11 w-11" />
          </div>

          {/* Left Stick: Industrial Steel Gimbal */}
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
              className="relative flex h-32 w-32 sm:h-40 sm:w-40 items-center justify-center rounded-full border-[5px] border-[#52525B] bg-gradient-to-b from-[#18181B] to-[#09090B] shadow-[0_8px_20px_rgba(0,0,0,0.85),inset_0_4px_14px_rgba(0,0,0,0.95)] touch-none"
            >
              {/* Inner metallic crosshair & ring */}
              <div className="pointer-events-none absolute inset-2 rounded-full border border-[#71717A]/35" />
              <div
                className="relative flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full border-2 border-[#94A3B8] shadow-[0_4px_12px_rgba(0,0,0,0.9),inset_0_2px_4px_rgba(255,255,255,0.25)] transition-transform duration-75"
                style={{
                  backgroundImage: `radial-gradient(circle at 35% 35%, #94A3B8 0%, #475569 55%, #1E293B 100%)`,
                  transform: `translate(${leftStick.x * 36}px, ${leftStick.y * 36}px)`,
                }}
              >
                <span className="h-5 w-5 rounded-full border border-[#CBD5E1]/50 bg-[#0F172A]/70 shadow-inner" />
              </div>
            </div>
            <span className="font-mono text-[10px] font-extrabold tracking-[0.2em] text-[#CBD5E1] uppercase drop-shadow">
              BEWEGEN
            </span>
          </div>

          {/* Center Riveted Steel Action Plate (LADEN / DASH / AUTO) */}
          <div
            className="relative mt-6 flex flex-col items-center gap-1.5 rounded-lg border-2 border-[#52525B] p-2 shadow-[0_6px_16px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.16)]"
            style={{
              backgroundImage: `linear-gradient(180deg, rgba(39,39,42,0.88) 0%, rgba(24,24,27,0.94) 100%), url(${ZOMBIE_UI_TEXTURES.brushedSteel})`,
              backgroundSize: 'cover, 140px 140px',
            }}
          >
            <RivetCorners />
            <button
              type="button"
              onClick={() => {
                reloadQueuedRef.current = true;
                triggerHapticFeedback(20);
              }}
              className="flex h-9 w-24 items-center justify-center gap-1 rounded border border-[#D97706]/80 bg-gradient-to-b from-[#92400E] to-[#451A03] font-mono text-[11px] font-extrabold tracking-wider text-[#FDE68A] uppercase shadow-md active:scale-95"
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
              className="flex h-9 w-24 items-center justify-center gap-1 rounded border border-[#71717A] bg-gradient-to-b from-[#52525B] to-[#27272A] font-mono text-[11px] font-extrabold tracking-wider text-[#F8FAFC] uppercase shadow-md active:scale-95"
            >
              <Zap className="h-3.5 w-3.5 text-[#38BDF8]" />
              <span>DASH</span>
            </button>

            <button
              type="button"
              onClick={() => setAutoFire((v) => !v)}
              className={`flex h-8 w-24 items-center justify-center gap-1 rounded border font-mono text-[10px] font-extrabold tracking-wider uppercase shadow-md transition-all ${
                autoFire
                  ? 'border-[#22C55E] bg-gradient-to-b from-[#166534] to-[#052E16] text-[#86EFAC]'
                  : 'border-[#3F3F46] bg-gradient-to-b from-[#27272A] to-[#09090B] text-[#94A3B8]'
              }`}
            >
              <Crosshair className="h-3.5 w-3.5" />
              <span>AUTO</span>
            </button>
          </div>

          {/* Right Stick: Industrial Red Crosshair Gimbal */}
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
              className="relative flex h-32 w-32 sm:h-40 sm:w-40 items-center justify-center rounded-full border-[5px] border-[#52525B] bg-gradient-to-b from-[#18181B] to-[#09090B] shadow-[0_8px_20px_rgba(0,0,0,0.85),inset_0_4px_14px_rgba(0,0,0,0.95)] touch-none"
            >
              <div className="pointer-events-none absolute inset-2 rounded-full border border-[#EF4444]/40" />
              <div
                className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full border-2 border-[#FCA5A5]/80 bg-gradient-to-b from-[#EF4444] to-[#991B1B] text-white shadow-[0_0_22px_rgba(239,68,68,0.65),inset_0_2px_4px_rgba(255,255,255,0.3)] transition-transform duration-75"
                style={{
                  transform: `translate(${rightStick.x * 36}px, ${rightStick.y * 36}px)`,
                }}
              >
                <Crosshair className="h-6 w-6" />
              </div>
            </div>
            <span className="font-mono text-[10px] font-extrabold tracking-[0.2em] text-[#CBD5E1] uppercase drop-shadow">
              ZIELEN & FEUERN
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

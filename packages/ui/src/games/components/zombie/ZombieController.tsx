import { useEffect, useRef, useState } from 'react';
import nipplejs from 'nipplejs';
import { AnimatePresence, motion } from 'motion/react';
import {
  GiAmmoBox,
  GiCrosshair,
  GiCycle,
  GiHealthNormal,
  GiHelmet,
  GiShield,
  GiSkullCrossedBones,
  GiSprint,
} from 'react-icons/gi';
import { AlertTriangle, X } from 'lucide-react';
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
  BiohazardEmblem,
  GrungeDetailsOverlay,
  LockedChainOverlaySvg,
  RivetCorners,
  WeaponGameIcon,
  WeaponSilhouetteSvg,
  ZOMBIE_UI_TEXTURES,
  ZombieSvgFilters,
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
  const [damageFlash, setDamageFlash] = useState(false);
  const [teammateDowned, setTeammateDowned] = useState(false);
  const [squadTeammates, setSquadTeammates] = useState<ZombiePlayerHudState[]>([]);
  const prevLevelRef = useRef(1);
  const prevHpRef = useRef(100);
  const damageTimerRef = useRef<number | null>(null);

  const leftStickRef = useRef<StickState>({
    active: false,
    pointerId: null,
    x: 0,
    y: 0,
  });
  const rightStickRef = useRef<StickState>({
    active: false,
    pointerId: null,
    x: 0,
    y: 0,
  });
  const autoFireRef = useRef(autoFire);
  const reloadQueuedRef = useRef(false);
  const dashQueuedRef = useRef(false);

  autoFireRef.current = autoFire;

  const leftPadRef = useRef<HTMLDivElement | null>(null);
  const rightPadRef = useRef<HTMLDivElement | null>(null);

  // Mount nipplejs dynamic/semi multi-touch joysticks
  useEffect(() => {
    const leftZone = leftPadRef.current;
    const rightZone = rightPadRef.current;
    if (!leftZone || !rightZone) return;

    const leftManager = nipplejs.create({
      zone: leftZone,
      mode: 'semi',
      catchDistance: 120,
      size: 112,
      color: '#64748b',
      restOpacity: 0.75,
    });

    leftManager.on('move', (evt) => {
      const vec = evt.data?.vector;
      if (!vec) return;
      leftStickRef.current = {
        active: true,
        pointerId: null,
        x: vec.x,
        y: -vec.y,
      };
    });
    leftManager.on('end', () => {
      leftStickRef.current = { active: false, pointerId: null, x: 0, y: 0 };
    });

    const rightManager = nipplejs.create({
      zone: rightZone,
      mode: 'semi',
      catchDistance: 120,
      size: 112,
      color: '#ef4444',
      restOpacity: 0.75,
    });

    rightManager.on('move', (evt) => {
      const vec = evt.data?.vector;
      if (!vec) return;
      rightStickRef.current = {
        active: true,
        pointerId: null,
        x: vec.x,
        y: -vec.y,
      };
    });
    rightManager.on('end', () => {
      rightStickRef.current = { active: false, pointerId: null, x: 0, y: 0 };
    });

    return () => {
      leftManager.destroy();
      rightManager.destroy();
    };
  }, [hud.alive, hud.downed]);

  // Receive live HUD updates from TV
  useEffect(() => {
    const unsub = socketService.onZombieState((payload: ZombieHudStatePayload) => {
      setWave(payload.wave);
      setZombiesRemaining(payload.zombiesRemaining);
      const others = Object.values(payload.players || {}).filter(
        (pl) => pl.playerId !== myPlayerId
      );
      setSquadTeammates(others);
      const anyOtherDowned = others.some((pl) => pl.alive && pl.downed);
      setTeammateDowned(anyOtherDowned);

      const mine = payload.players?.[myPlayerId];
      if (mine) {
        if (mine.hp < prevHpRef.current && mine.alive) {
          setDamageFlash(true);
          triggerHapticFeedback(35);
          if (damageTimerRef.current) window.clearTimeout(damageTimerRef.current);
          damageTimerRef.current = window.setTimeout(() => setDamageFlash(false), 240);
        }
        prevHpRef.current = mine.hp;
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
    return () => {
      unsub();
      if (damageTimerRef.current) window.clearTimeout(damageTimerRef.current);
    };
  }, [myPlayerId]);

  // Stream controller input to TV/Host (~25Hz), including optional keyboard fallback
  useEffect(() => {
    const keys = new Set<string>();
    const onKeyDown = (e: KeyboardEvent) => keys.add(e.key.toLowerCase());
    const onKeyUp = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    let lastSentSig = '';
    let lastSentAt = 0;

    const interval = window.setInterval(() => {
      const l = leftStickRef.current;
      const r = rightStickRef.current;
      const kx = (keys.has('d') ? 1 : 0) - (keys.has('a') ? 1 : 0);
      const ky = (keys.has('s') ? 1 : 0) - (keys.has('w') ? 1 : 0);
      const ax = (keys.has('arrowright') ? 1 : 0) - (keys.has('arrowleft') ? 1 : 0);
      const ay = (keys.has('arrowdown') ? 1 : 0) - (keys.has('arrowup') ? 1 : 0);

      const moveX = Number((kx !== 0 ? kx : l.x).toFixed(3));
      const moveY = Number((ky !== 0 ? ky : l.y).toFixed(3));
      const aimX = Number((ax !== 0 ? ax : r.x).toFixed(3));
      const aimY = Number((ay !== 0 ? ay : r.y).toFixed(3));

      const aimMag = Math.hypot(r.x, r.y);
      const shouldFire =
        (r.active && aimMag > 0.25) ||
        ax !== 0 ||
        ay !== 0 ||
        keys.has(' ') ||
        autoFireRef.current;
      const reload = reloadQueuedRef.current || keys.has('r');
      const dash = dashQueuedRef.current || keys.has('shift');

      const sig = `${moveX}|${moveY}|${aimX}|${aimY}|${shouldFire ? 1 : 0}|${reload ? 1 : 0}|${dash ? 1 : 0}`;
      const now = performance.now();
      const isIdle = moveX === 0 && moveY === 0 && aimX === 0 && aimY === 0 && !shouldFire && !reload && !dash;

      if (!isIdle || sig !== lastSentSig || now - lastSentAt >= 250) {
        lastSentSig = sig;
        lastSentAt = now;
        socketService.emitZombieInput({
          moveX,
          moveY,
          aimX,
          aimY,
          firing: shouldFire,
          reload,
          dash,
        });
      }

      reloadQueuedRef.current = false;
      dashQueuedRef.current = false;
    }, 40);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

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
    const l = leftStickRef.current;
    const r = rightStickRef.current;
    socketService.emitZombieInput({
      moveX: Number(l.x.toFixed(3)),
      moveY: Number(l.y.toFixed(3)),
      aimX: Number(r.x.toFixed(3)),
      aimY: Number(r.y.toFixed(3)),
      firing: autoFireRef.current,
      upgradeSkill: skill,
    });
    triggerHapticFeedback(25);
  };

  const sendSelectWeapon = (weaponId: string) => {
    const l = leftStickRef.current;
    const r = rightStickRef.current;
    socketService.emitZombieInput({
      moveX: Number(l.x.toFixed(3)),
      moveY: Number(l.y.toFixed(3)),
      aimX: Number(r.x.toFixed(3)),
      aimY: Number(r.y.toFixed(3)),
      firing: autoFireRef.current,
      selectWeaponId: weaponId,
    });
    triggerHapticFeedback(20);
  };

  const skillPoints = hud.skillPoints ?? 0;
  const skills = hud.skills ?? { hp: 0, damage: 0, speed: 0, ammo: 0 };

  return (
    <div
      className="font-shooter-tech relative flex h-full min-h-0 flex-1 w-full flex-col justify-between gap-1.5 overflow-hidden bg-[#0A0C0E] pl-[max(1.5rem,calc(env(safe-area-inset-left)+1rem))] pr-[max(1.5rem,calc(env(safe-area-inset-right)+1rem))] pt-[max(0.65rem,calc(env(safe-area-inset-top)+0.35rem))] pb-[max(0.85rem,calc(env(safe-area-inset-bottom)+0.5rem))] select-none touch-none"
      style={{
        backgroundImage: `radial-gradient(circle at 50% 52%, rgba(220,38,38,0.22) 0%, rgba(10,12,14,0.8) 54%, rgba(3,4,6,0.96) 100%), url(${ZOMBIE_UI_TEXTURES.rust}), url(${ZOMBIE_UI_TEXTURES.diamondPlate})`,
        backgroundSize: 'cover, 360px 360px, 220px 220px',
        backgroundBlendMode: 'normal, soft-light, normal',
        backgroundRepeat: 'no-repeat, repeat, repeat',
      }}
    >
      <ZombieSvgFilters />
      <GrungeDetailsOverlay className="opacity-85" />

      {/* Red Edge Hit-Flash Overlay */}
      {damageFlash && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-30 shadow-[inset_0_0_55px_rgba(239,68,68,0.85)] bg-[#EF4444]/10 transition-opacity"
        />
      )}

      {/* Compact Top Industrial HUD Row */}
      <div className="relative z-10 flex shrink-0 items-center justify-between gap-2 pr-20">
        {/* Left: Weathered Wood / Parchment Military Tag */}
        <div
          className="clip-tag-chamfer relative -rotate-2 shrink-0 border-2 border-[#5C442B] px-2.5 py-1 text-[#1C1917] shadow-[0_4px_12px_rgba(0,0,0,0.8)]"
          style={{
            backgroundImage: `linear-gradient(135deg, rgba(214,195,161,0.92) 0%, rgba(168,140,101,0.9) 100%), url(${ZOMBIE_UI_TEXTURES.darkWood})`,
            backgroundSize: 'cover, 160px 160px',
          }}
        >
          <span
            className="absolute top-1/2 -left-1 h-2 w-2 -translate-y-1/2 rounded-full bg-[#1C1917] ring-1 ring-[#78654C]"
            aria-hidden="true"
          />
          <div className="flex flex-col leading-none pl-1">
            <span className="font-shooter-display text-[11px] uppercase tracking-wider">
              WELLE {String(wave).padStart(2, '0')}
            </span>
            <span className="font-shooter-display text-[10px] text-[#3F2E1E] uppercase tracking-wider">
              RANG {String(hud.level).padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* Center: Compact Riveted Rusty-Steel Dual Gauge Panel */}
        <div
          className="clip-armor-plate relative flex flex-1 max-w-md items-center justify-between gap-2 border-2 border-[#52525B] px-3 py-1 shadow-[0_6px_16px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.2)]"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(24,27,32,0.82) 0%, rgba(12,14,18,0.94) 100%), url(${ZOMBIE_UI_TEXTURES.rust}), url(${ZOMBIE_UI_TEXTURES.brushedSteel})`,
            backgroundSize: 'cover, 240px 240px, 160px 160px',
            backgroundBlendMode: 'normal, overlay, normal',
          }}
        >
          <RivetCorners />
          {/* HP Gauge + Segmented Bar */}
          <div className="flex flex-1 items-center gap-1.5 min-w-0">
            <AnalogGaugeSvg
              pct={hpPct}
              accentColor={hpPct <= 30 ? '#EF4444' : hpPct <= 60 ? '#F59E0B' : '#22C55E'}
              size={24}
            />
            <div className="flex flex-1 flex-col gap-0.5 min-w-0">
              <div className="flex items-center justify-between text-[10px] font-bold text-[#E2E8F0]">
                <span className="inline-flex items-center gap-1 text-[#86EFAC]">
                  <GiHealthNormal className="h-2.5 w-2.5" /> HP
                </span>
                <span>
                  {hud.hp}/{hud.maxHp}
                </span>
              </div>
              <div className="grid grid-cols-12 gap-0.5 bg-black/80 p-0.5 border border-white/15">
                {Array.from({ length: 12 }).map((_, i) => (
                  <span
                    key={i}
                    className="h-1.5"
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
          <div className="flex flex-1 items-center gap-1.5 min-w-0">
            <AnalogGaugeSvg pct={xpPct} accentColor="#FBBF24" size={24} />
            <div className="flex flex-1 flex-col gap-0.5 min-w-0">
              <div className="flex items-center justify-between text-[10px] font-bold text-[#E2E8F0]">
                <span className="inline-flex items-center gap-1 text-[#FDE68A]">
                  <GiSprint className="h-2.5 w-2.5" /> XP
                </span>
                <span className="truncate">
                  {hud.xp}/{nextLevelXp}
                </span>
              </div>
              <div className="grid grid-cols-12 gap-0.5 bg-black/80 p-0.5 border border-white/15">
                {Array.from({ length: 12 }).map((_, i) => (
                  <span
                    key={i}
                    className="h-1.5"
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
        <div className="hidden sm:flex shrink-0 flex-col items-end leading-tight text-right">
          <span className="font-shooter-display inline-flex items-center gap-1 text-xs text-[#E2E8F0] drop-shadow-[0_2px_3px_rgba(0,0,0,0.95)]">
            <GiSkullCrossedBones className="h-3.5 w-3.5 text-[#EF4444]" />
            {hud.kills} KILLS
          </span>
          <span className="text-[10px] font-bold tracking-wider text-[#94A3B8]">
            {zombiesRemaining} ÜBRIG
          </span>
        </div>
      </div>

      {/* Compact Tactical Weapon & Character Armor Strip */}
      <div
        className="clip-armor-plate relative z-10 flex shrink-0 items-center justify-between gap-2 border-2 border-[#4B5563]/75 px-3.5 py-1 shadow-[0_4px_12px_rgba(0,0,0,0.8)]"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(20,23,28,0.84) 0%, rgba(10,12,15,0.94) 100%), url(${ZOMBIE_UI_TEXTURES.rustyPlate}), url(${ZOMBIE_UI_TEXTURES.brushedSteel})`,
          backgroundSize: 'cover, 200px 200px, 160px 160px',
          backgroundBlendMode: 'normal, overlay, normal',
        }}
      >
        <RivetCorners />
        <div className="flex items-center gap-2 min-w-0 pl-1">
          <WeaponGameIcon weaponId={weapon.id} className="h-5 w-5 shrink-0" color={weapon.color} />
          <div className="flex items-baseline gap-2 min-w-0">
            <span className="font-shooter-display text-xs uppercase truncate" style={{ color: weapon.color }}>
              {weapon.name}
            </span>
            {nextWeapon && (
              <span className="hidden sm:inline text-[10px] font-bold tracking-wider text-[#94A3B8] uppercase truncate">
                • NÄCHSTE: {nextWeapon.shortName} (R{nextWeapon.unlockLevel})
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 pr-1">
          <span className="sm:hidden inline-flex items-center gap-1 text-[10px] font-bold text-[#FCA5A5]">
            <GiSkullCrossedBones className="h-3 w-3" /> {hud.kills}
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-bold tracking-wider text-[#F8FAFC]">
            <GiAmmoBox className="h-3.5 w-3.5 text-[#FBBF24]" />
            {hud.reloading ? 'NACHLADEN...' : `${hud.ammo}/${hud.maxAmmo}`}
          </span>
          <button
            type="button"
            onClick={() => setShowCharMenu(true)}
            className={`clip-tag-chamfer relative inline-flex items-center gap-1.5 border-2 px-3 py-0.5 text-[11px] font-bold tracking-wider uppercase shadow-md active:scale-95 ${
              skillPoints > 0
                ? 'border-[#D97706] bg-gradient-to-b from-[#92400E] to-[#451A03] text-[#FDE68A]'
                : 'border-[#64748B] bg-gradient-to-b from-[#3F3F46] to-[#18181B] text-[#E2E8F0]'
            }`}
          >
            <GiHelmet className="h-3.5 w-3.5" />
            <span className="font-shooter-display">CHARAKTER</span>
            {skillPoints > 0 && (
              <span className="ml-0.5 rounded-full bg-[#DC2626] px-1.5 text-[9px] text-white ring-1 ring-white/40">
                +{skillPoints}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Multiplayer Squad Status Strip (CoD/L4D style) */}
      {squadTeammates.length > 0 && (
        <div className="relative z-10 flex shrink-0 items-center gap-1.5 overflow-x-auto no-scrollbar">
          {squadTeammates.slice(0, 4).map((tm, idx) => {
            const tmHpPct = Math.max(0, (tm.hp / Math.max(1, tm.maxHp)) * 100);
            return (
              <div
                key={tm.playerId}
                className={`flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-[9px] font-bold uppercase shadow-sm ${
                  !tm.alive
                    ? 'border-[#3F3F46] bg-black/60 text-[#64748B]'
                    : tm.downed
                      ? 'border-[#EF4444] bg-[#450A0A]/85 text-[#FCA5A5] animate-pulse'
                      : 'border-[#52525B] bg-[#18181B]/85 text-[#E2E8F0]'
                }`}
              >
                <span className="font-shooter-display text-[9px]">P{idx + 2}</span>
                <span>R{tm.level}</span>
                <div className="h-1.5 w-10 bg-black/80 border border-white/10">
                  <div
                    className="h-full"
                    style={{
                      width: `${!tm.alive ? 0 : tmHpPct}%`,
                      backgroundColor: tm.downed
                        ? '#EF4444'
                        : tmHpPct <= 30
                          ? '#EF4444'
                          : tmHpPct <= 60
                            ? '#F59E0B'
                            : '#22C55E',
                    }}
                  />
                </div>
                {!tm.alive && <span className="text-[#EF4444]">K.I.A.</span>}
                {tm.downed && <span className="text-[#FCA5A5]">RETTEN!</span>}
              </div>
            );
          })}
        </div>
      )}

      {/* Character & Upgrade Menu Overlay (Animated with motion/react) */}
      <AnimatePresence>
      {showCharMenu && (
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 14, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="absolute inset-0 z-50 flex flex-col gap-2.5 overflow-y-auto bg-[#101610] pl-[max(1.5rem,calc(env(safe-area-inset-left)+1rem))] pr-[max(1.5rem,calc(env(safe-area-inset-right)+1rem))] pt-[max(0.75rem,calc(env(safe-area-inset-top)+0.4rem))] pb-[max(2.75rem,calc(env(safe-area-inset-bottom)+2.25rem))] shadow-2xl"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(16,24,16,0.78) 0%, rgba(8,12,8,0.92) 100%), url(${ZOMBIE_UI_TEXTURES.rust}), url(${ZOMBIE_UI_TEXTURES.oliveSteel})`,
            backgroundSize: 'cover, 320px 320px, 260px 260px',
            backgroundBlendMode: 'normal, soft-light, normal',
            backgroundRepeat: 'no-repeat, repeat, repeat',
          }}
        >
          <GrungeDetailsOverlay className="opacity-75" />

          {/* Operator Dog-Tag Header */}
          <div className="clip-armor-plate relative z-10 flex shrink-0 items-center justify-between gap-2 border-2 border-[#475547] bg-[#182018]/92 px-3.5 py-2 shadow-lg">
            <RivetCorners />
            <div className="flex items-center gap-2.5 min-w-0 pl-1">
              <div className="relative flex items-center gap-2 rounded-sm border border-[#94A3B8]/60 bg-gradient-to-b from-[#94A3B8]/25 to-[#334155]/50 px-2.5 py-1 shadow-inner">
                {myPlayer && <Avatar config={myPlayer.avatar} size={30} />}
                <div className="flex flex-col leading-tight min-w-0">
                  <span className="font-shooter-display text-xs text-white uppercase truncate">
                    {myPlayer?.name || 'OPERATOR'} • RANG {String(hud.level).padStart(2, '0')}
                  </span>
                  <span className="text-[10px] font-bold tracking-wider text-[#CBD5E1] uppercase">
                    HP {hud.hp}/{hud.maxHp} • {hud.kills} KILLS • SKILL-PUNKTE: {skillPoints}
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowCharMenu(false)}
              className="clip-tag-chamfer relative inline-flex items-center gap-1 border-2 border-[#DC2626]/80 bg-gradient-to-b from-[#521212] to-[#280707] px-3 py-1.5 font-shooter-display text-xs text-[#FCA5A5] uppercase shadow-md active:scale-95"
              style={{ filter: 'url(#zombieDistress)' }}
            >
              <X className="h-3.5 w-3.5 text-[#EF4444]" />
              <span>ZURÜCK</span>
            </button>
          </div>

          {/* Operator-Skills: Riveted Brushed-Steel Plates with Before/After & Upgrade Stages */}
          <div className="relative z-10 flex shrink-0 flex-col gap-1.5">
            <span className="font-shooter-display text-xs tracking-[0.18em] text-[#E2E8F0] uppercase drop-shadow">
              OPERATOR-SKILLS ({skillPoints} PUNKTE VERFÜGBAR)
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              {(() => {
                const rankMult = 1 + (hud.level - 1) * 0.1;
                const curDmg = Math.round(weapon.damage * rankMult * (1 + skills.damage * 0.15));
                const nextDmg = Math.round(weapon.damage * rankMult * (1 + (skills.damage + 1) * 0.15));
                const curSpeedPct = 100 + skills.speed * 10;
                const nextSpeedPct = 100 + (skills.speed + 1) * 10;
                const curMag = Math.round(weapon.magSize * (1 + skills.ammo * 0.25));
                const nextMag = Math.round(weapon.magSize * (1 + (skills.ammo + 1) * 0.25));
                return [
                  {
                    key: 'hp' as const,
                    label: 'VITALITÄT',
                    activeBonus: `+${skills.hp * 25} MAX HP`,
                    beforeAfter: `${hud.maxHp} → ${hud.maxHp + 25} HP`,
                    val: skills.hp,
                    icon: GiShield,
                    color: '#EF4444',
                  },
                  {
                    key: 'damage' as const,
                    label: 'FEUERKRAFT',
                    activeBonus: `+${skills.damage * 15}% SCHADEN`,
                    beforeAfter: `${curDmg} → ${nextDmg} DMG`,
                    val: skills.damage,
                    icon: GiCrosshair,
                    color: '#F59E0B',
                  },
                  {
                    key: 'speed' as const,
                    label: 'TEMPO',
                    activeBonus: `+${skills.speed * 10}% LAUF / -${Math.min(45, skills.speed * 8)}% LADEN`,
                    beforeAfter: `${curSpeedPct}% → ${nextSpeedPct}% TEMPO`,
                    val: skills.speed,
                    icon: GiSprint,
                    color: '#38BDF8',
                  },
                  {
                    key: 'ammo' as const,
                    label: 'MAGAZIN',
                    activeBonus: `+${skills.ammo * 25}% KAPAZITÄT`,
                    beforeAfter: `${curMag} → ${nextMag} SCHUSS`,
                    val: skills.ammo,
                    icon: GiAmmoBox,
                    color: '#22C55E',
                  },
                ];
              })().map((sk) => {
                const Icon = sk.icon;
                const fillPct = Math.min(100, sk.val * 20);
                return (
                  <button
                    key={sk.key}
                    type="button"
                    disabled={skillPoints <= 0}
                    onClick={() => sendUpgrade(sk.key)}
                    className={`clip-armor-plate relative flex items-center justify-between gap-2 border-2 px-3 py-2 text-left shadow-lg transition-all ${
                      skillPoints > 0
                        ? 'border-[#D97706] active:scale-95'
                        : 'border-[#52525B] opacity-90'
                    }`}
                    style={{
                      backgroundImage: `linear-gradient(180deg, rgba(63,63,70,0.8) 0%, rgba(24,24,27,0.94) 100%), url(${ZOMBIE_UI_TEXTURES.rustyPlate}), url(${ZOMBIE_UI_TEXTURES.brushedSteel})`,
                      backgroundSize: 'cover, 180px 180px, 150px 150px',
                      backgroundBlendMode: 'normal, overlay, normal',
                    }}
                  >
                    <RivetCorners />
                    <div className="flex flex-1 flex-col gap-0.5 min-w-0 pl-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-shooter-display inline-flex items-center gap-1 text-xs text-white uppercase">
                          <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: sk.color }} />
                          {sk.label}
                        </span>
                        <span
                          className="text-[10px] font-bold uppercase"
                          style={{ color: sk.val > 0 ? sk.color : '#94A3B8' }}
                        >
                          STUFE {sk.val}
                        </span>
                      </div>

                      <span className="text-[10px] font-bold text-[#FDE68A] uppercase truncate">
                        AKTIV: {sk.activeBonus}
                      </span>
                      <span className="text-[10px] font-semibold text-[#CBD5E1] uppercase truncate">
                        NÄCHSTE: {sk.beforeAfter}
                      </span>

                      <div className="mt-0.5 flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, idx) => (
                          <span
                            key={idx}
                            className="h-1.5 flex-1 border border-black/60"
                            style={{
                              backgroundColor:
                                idx < sk.val ? sk.color : 'rgba(255,255,255,0.1)',
                            }}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 pr-1">
                      <AnalogGaugeSvg pct={fillPct} accentColor={sk.color} size={24} />
                      <span
                        className={`font-shooter-display flex h-6 w-6 items-center justify-center rounded-sm border-2 text-sm ${
                          skillPoints > 0
                            ? 'border-[#F59E0B] bg-[#78350F]/80 text-[#FDE68A]'
                            : 'border-[#52525B] bg-black/50 text-[#94A3B8]'
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

          {/* Weapon Arsenal: 3x2 Gunmetal Cards with Detailed Weapon Illustrations & Chains */}
          <div className="relative z-10 flex shrink-0 flex-col gap-1.5 pb-4">
            <span className="font-shooter-display text-xs tracking-[0.18em] text-[#E2E8F0] uppercase drop-shadow">
              WAFFEN-ARSENAL
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {ZOMBIE_WEAPONS.map((w) => {
                const unlocked = hud.level >= w.unlockLevel;
                const equipped = hud.weaponId === w.id;
                const effectiveDmg = Math.round(
                  w.damage * (1 + (hud.level - 1) * 0.1) * (1 + skills.damage * 0.15)
                );
                const effectiveMag = Math.round(w.magSize * (1 + skills.ammo * 0.25));
                return (
                  <button
                    key={w.id}
                    type="button"
                    disabled={!unlocked}
                    onClick={() => sendSelectWeapon(w.id)}
                    className={`clip-armor-plate relative flex flex-col justify-between gap-1 overflow-hidden border-2 px-3 py-2 text-left shadow-lg transition-all ${
                      equipped
                        ? 'border-[#D97706] bg-[#141A21]/95 ring-1 ring-[#F59E0B]/40'
                        : unlocked
                          ? 'border-[#52525B] bg-[#18181B]/92 active:scale-95'
                          : 'border-[#27272A] bg-[#09090B]/95'
                    }`}
                    style={{
                      backgroundImage: `linear-gradient(180deg, rgba(30,34,40,0.85) 0%, rgba(12,14,18,0.96) 100%), url(${ZOMBIE_UI_TEXTURES.brushedSteel})`,
                      backgroundSize: 'cover, 140px 140px',
                    }}
                  >
                    <RivetCorners />
                    <div className="flex items-center justify-between gap-1 pl-1 pr-1">
                      <span
                        className="font-shooter-display text-[11px] uppercase truncate"
                        style={{ color: unlocked ? w.color : '#64748B' }}
                      >
                        {w.name}
                      </span>
                      <span className="text-[10px] font-bold text-[#94A3B8] shrink-0">
                        {unlocked ? `${effectiveDmg} DMG • ${effectiveMag}` : `R${w.unlockLevel}`}
                      </span>
                    </div>

                    <div className="flex items-center justify-center py-0.5">
                      <WeaponSilhouetteSvg
                        weaponId={w.id}
                        className="h-10 w-28"
                        color={equipped ? '#E2E8F0' : unlocked ? '#94A3B8' : '#334155'}
                      />
                    </div>

                    {equipped && (
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <span
                          className="font-shooter-display -rotate-12 border-2 border-dashed border-[#EF4444]/90 bg-[#3B0707]/88 px-2.5 py-0.5 text-[11px] tracking-[0.18em] text-[#FCA5A5] uppercase shadow-[0_2px_8px_rgba(0,0,0,0.85)]"
                          style={{ filter: 'url(#zombieDistress)' }}
                        >
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
        </motion.div>
      )}
      </AnimatePresence>

      {/* Teammate Downed Warning */}
      {teammateDowned && hud.alive && !hud.downed && (
        <div className="relative z-20 flex items-center justify-center gap-2 border-y-2 border-[#EF4444] bg-[#450A0A]/90 px-4 py-1 text-center shadow-lg animate-pulse">
          <GiHealthNormal className="h-3.5 w-3.5 text-[#FCA5A5]" />
          <span className="font-shooter-display text-[11px] tracking-[0.16em] text-[#FCA5A5] uppercase">
            KAMERAD AM BODEN — IN DIE NÄHE LAUFEN ZUM RETTEN!
          </span>
        </div>
      )}

      {/* Tactical Level-Up Alert */}
      {levelUpBanner && (
        <div className="relative z-20 flex items-center justify-center gap-2 border-y-2 border-[#D97706] bg-[#070B12]/92 px-4 py-1 text-center shadow-lg">
          <AlertTriangle className="h-4 w-4 text-[#F59E0B]" />
          <span className="font-shooter-display text-xs tracking-[0.16em] text-[#FDE68A] uppercase">
            {levelUpBanner}
          </span>
        </div>
      )}

      {/* Dead / Downed Notice or Dual-Stick Industrial Control Deck */}
      {!hud.alive ? (
        <div className="clip-armor-plate relative z-10 flex flex-1 flex-col items-center justify-center gap-2 border-2 border-[#EF4444]/60 bg-[#070B12]/88 p-6 text-center shadow-xl">
          <GiSkullCrossedBones className="h-12 w-12 text-[#EF4444]" />
          <span className="font-shooter-display text-base tracking-[0.18em] text-white uppercase">
            K.I.A. • AUSSER GEFECHT
          </span>
          <span className="text-xs font-bold tracking-wider text-[#94A3B8] uppercase">
            WARTE AUF DEIN TEAM ODER DIE ENDWERTUNG AM TV
          </span>
        </div>
      ) : hud.downed ? (
        <div className="clip-armor-plate relative z-10 flex flex-1 flex-col items-center justify-center gap-2.5 border-2 border-[#EF4444] bg-[#280707]/90 p-5 text-center shadow-xl">
          <GiHealthNormal className="h-10 w-10 text-[#EF4444] animate-pulse" />
          <span className="font-shooter-display text-base tracking-[0.18em] text-[#FCA5A5] uppercase">
            AM BODEN • RETTUNG ERFORDERLICH ({hud.downedRemainingSec ?? 0}s)
          </span>
          <div className="w-full max-w-xs bg-black/75 p-1 border border-white/20">
            <div
              className="h-2.5 transition-all duration-100"
              style={{
                width: `${Math.round((hud.reviveProgress ?? 0) * 100)}%`,
                backgroundColor: (hud.reviveProgress ?? 0) > 0 ? '#22C55E' : '#EF4444',
              }}
            />
          </div>
          <span className="text-xs font-bold tracking-wider text-[#CBD5E1] uppercase">
            {(hud.reviveProgress ?? 0) > 0
              ? `WIEDERBELEBUNG LÄUFT (${Math.round((hud.reviveProgress ?? 0) * 100)}%)...`
              : 'EIN TEAMKOLLEGE MUSS NEBEN DIR STEHEN!'}
          </span>
        </div>
      ) : (
        <div className="relative z-10 flex flex-1 min-h-0 items-stretch justify-between gap-3 px-1 py-0.5">
          {/* Larger Glowing Center Biohazard Emblem */}
          <div className="pointer-events-none absolute inset-x-0 top-1 flex justify-center">
            <BiohazardEmblem className="h-20 w-20 sm:h-24 sm:w-24" />
          </div>

          {/* Left Touch Zone: nipplejs Dynamic/Semi Industrial Steel Stick */}
          <div className="flex flex-1 min-w-0 flex-col items-center justify-end gap-1">
            <div
              ref={leftPadRef}
              className="zombie-stick-zone-left relative flex h-full min-h-[128px] w-full items-center justify-center rounded border border-white/10 bg-black/25 touch-none overflow-hidden"
            >
              <div className="pointer-events-none flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-[#64748B]/35">
                <span className="h-3 w-3 rounded-full bg-[#64748B]/40" />
              </div>
            </div>
            <span className="font-shooter-display text-[10px] tracking-[0.2em] text-[#CBD5E1] uppercase drop-shadow">
              BEWEGEN
            </span>
          </div>

          {/* Center Riveted Rusty Steel Action Plate (LADEN / DASH / AUTO) */}
          <div
            className="clip-armor-plate relative self-center flex shrink-0 flex-col items-center gap-1.5 border-2 border-[#52525B] p-2 shadow-[0_8px_20px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.18)]"
            style={{
              backgroundImage: `linear-gradient(180deg, rgba(39,39,42,0.84) 0%, rgba(20,20,24,0.95) 100%), url(${ZOMBIE_UI_TEXTURES.rustyPlate}), url(${ZOMBIE_UI_TEXTURES.brushedSteel})`,
              backgroundSize: 'cover, 160px 160px, 140px 140px',
              backgroundBlendMode: 'normal, overlay, normal',
            }}
          >
            <RivetCorners />
            <button
              type="button"
              onClick={() => {
                reloadQueuedRef.current = true;
                triggerHapticFeedback(20);
              }}
              className="flex h-9 w-24 items-center justify-center gap-1 rounded-sm border-2 border-[#B45309] bg-gradient-to-b from-[#92400E] to-[#451A03] text-xs font-bold tracking-wider text-[#FDE68A] uppercase shadow-md active:scale-95"
            >
              <GiCycle className="h-3.5 w-3.5" />
              <span>LADEN</span>
            </button>

            <button
              type="button"
              onClick={() => {
                dashQueuedRef.current = true;
                triggerHapticFeedback(25);
              }}
              className="flex h-9 w-24 items-center justify-center gap-1 rounded-sm border-2 border-[#64748B] bg-gradient-to-b from-[#52525B] to-[#27272A] text-xs font-bold tracking-wider text-[#F8FAFC] uppercase shadow-md active:scale-95"
            >
              <GiSprint className="h-3.5 w-3.5 text-[#38BDF8]" />
              <span>DASH</span>
            </button>

            <button
              type="button"
              onClick={() => setAutoFire((v) => !v)}
              className={`flex h-8 w-24 items-center justify-center gap-1 rounded-sm border-2 text-[11px] font-bold tracking-wider uppercase shadow-md transition-all ${
                autoFire
                  ? 'border-[#22C55E] bg-gradient-to-b from-[#166534] to-[#052E16] text-[#86EFAC]'
                  : 'border-[#3F3F46] bg-gradient-to-b from-[#27272A] to-[#09090B] text-[#94A3B8]'
              }`}
            >
              <GiCrosshair className="h-3.5 w-3.5" />
              <span>AUTO</span>
            </button>
          </div>

          {/* Right Touch Zone: nipplejs Dynamic/Semi Red Crosshair Stick */}
          <div className="flex flex-1 min-w-0 flex-col items-center justify-end gap-1">
            <div
              ref={rightPadRef}
              className="zombie-stick-zone-right relative flex h-full min-h-[128px] w-full items-center justify-center rounded border border-[#EF4444]/15 bg-black/25 touch-none overflow-hidden"
            >
              <div className="pointer-events-none flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-[#EF4444]/35">
                <GiCrosshair className="h-6 w-6 text-[#EF4444]/40" />
              </div>
            </div>
            <span className="font-shooter-display text-[10px] tracking-[0.2em] text-[#CBD5E1] uppercase drop-shadow">
              ZIELEN & FEUERN
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

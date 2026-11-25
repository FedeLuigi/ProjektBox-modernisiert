import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { playButtonClickSound, triggerHapticFeedback } from '../../../utils/soundEffects';
import {
  GiClover,
  GiCoins,
  GiDiamondHard,
  GiDynamite,
  GiMuscleUp,
  GiSpellBook,
} from 'react-icons/gi';
import type {
  GoldMinerHudStatePayload,
  GoldMinerShopItemId,
  Player,
} from '@projektbox/shared/types';
import {
  GOLD_MINER_OBJECT_SPECS,
  GOLD_MINER_SHOP_ITEMS,
  type GoldMinerObjectKind,
} from '@projektbox/shared/utils';
import { socketService } from '../../../services/socket';
import backdropUrl from '../../../assets/textures/goldminer/mine_backdrop.jpg';
import woodTextureUrl from '../../../assets/textures/goldminer/wood_texture.jpg';
import hookClawUrl from '../../../assets/textures/goldminer/sprites/hook_claw.png';
import minerWinchUrl from '../../../assets/textures/goldminer/sprites/miner_winch.png';

interface GoldMinerControllerProps {
  myPlayerId: string;
  myPlayer: Player;
}

const SHOP_ICONS: Record<GoldMinerShopItemId, typeof GiDynamite> = {
  dynamite: GiDynamite,
  strength: GiMuscleUp,
  clover: GiClover,
  rock_book: GiSpellBook,
  diamond_polish: GiDiamondHard,
};

export function GoldMinerController({ myPlayerId, myPlayer }: GoldMinerControllerProps) {
  const [hud, setHud] = useState<GoldMinerHudStatePayload | null>(null);

  useEffect(() => {
    return socketService.onGoldMinerState((state) => {
      setHud(state);
    });
  }, []);

  const me = hud?.players[myPlayerId];
  const myMoney = me?.money ?? 0;
  const dynamiteCount = me?.dynamite ?? 0;
  const hookState = me?.hookState ?? 'swing';
  const phase = hud?.phase ?? 'playing';
  const isCoop = hud?.mode !== 'versus';
  const displayedMoney = isCoop ? (hud?.teamMoney ?? myMoney) : myMoney;
  const targetMoney = hud?.targetMoney ?? 650;
  const progressPct = Math.min(100, Math.round((displayedMoney / Math.max(1, targetMoney)) * 100));
  const isPaused = Boolean(hud?.paused);
  const carryingSpec = me?.carryingKind
    ? GOLD_MINER_OBJECT_SPECS[me.carryingKind as GoldMinerObjectKind]
    : undefined;
  const playerColor = me?.color || myPlayer.color || '#FACC15';
  const playerName = me?.name || myPlayer.name;
  const timeLeftSec = Math.ceil(hud?.timeLeft ?? 60);
  const canDrop = !isPaused && hookState === 'swing';
  const canDynamite = !isPaused && dynamiteCount > 0 && hookState === 'retract';

  const handleDropHook = () => {
    if (!canDrop) return;
    triggerHapticFeedback(25);
    socketService.emitGoldMinerInput({ dropHook: true });
  };

  const handleUseDynamite = () => {
    if (!canDynamite) return;
    triggerHapticFeedback([40, 20, 60]);
    socketService.emitGoldMinerInput({ useDynamite: true });
  };

  const handleBuyItem = (itemId: GoldMinerShopItemId) => {
    playButtonClickSound();
    triggerHapticFeedback(20);
    socketService.emitGoldMinerInput({ buyItemId: itemId });
  };

  const handleNextLevel = () => {
    playButtonClickSound();
    triggerHapticFeedback(20);
    socketService.emitGoldMinerInput({ nextLevelReady: true });
  };

  return (
    <div
      className="relative flex h-full w-full flex-col justify-between overflow-hidden bg-[#241106] bg-cover bg-center pt-[max(0.5rem,env(safe-area-inset-top))] pr-[max(0.75rem,env(safe-area-inset-right))] pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] text-white select-none"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(28,12,4,0.68), rgba(20,9,3,0.88)), url(${backdropUrl})`,
      }}
    >
      <div className="mx-auto flex h-full w-full max-w-4xl flex-col justify-between gap-3">
        {/* Single clean timber header strip (pl-28 reserves clean room for floating EXIT button, zero nested boxes) */}
        <header
          className="flex items-center justify-between gap-3 rounded-2xl border-b-2 border-amber-700/70 bg-cover bg-center py-2.5 pr-4 pl-28 shadow-[0_6px_18px_rgba(0,0,0,0.45)] sm:pl-32 landscape:py-2"
          style={{
            backgroundImage: `linear-gradient(to bottom, rgba(69,26,3,0.86), rgba(39,16,3,0.94)), url(${woodTextureUrl})`,
          }}
        >
          {/* Score & Goal */}
          <div className="flex items-center gap-2.5 leading-none">
            <GiCoins className="h-5 w-5 shrink-0 text-amber-300" />
            <span className="font-goldminer text-xl leading-none text-emerald-400 drop-shadow-[0_2px_0_rgba(0,0,0,0.85)]">
              ${displayedMoney}
            </span>
            <span className="font-goldminer hidden text-sm leading-none text-amber-200/75 sm:inline">
              / ${targetMoney}
            </span>
            <div className="hidden h-2 w-20 overflow-hidden rounded-full bg-black/50 sm:block">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Centered Player Identity (open, no extra pill box) */}
          <div className="flex items-center gap-2 leading-none">
            <span
              className="h-3 w-3 shrink-0 rounded-full border border-white/80 shadow"
              style={{ backgroundColor: playerColor }}
            />
            <span className="font-goldminer max-w-[130px] truncate text-base leading-none tracking-wide text-amber-100">
              {playerName}
            </span>
          </div>

          {/* Level & Countdown */}
          <div className="flex items-center gap-3 leading-none">
            <span className="font-goldminer text-sm leading-none text-amber-200">
              LVL {hud?.level ?? 1}
            </span>
            <span
              className={`font-goldminer text-lg leading-none ${
                timeLeftSec <= 10 && !isPaused
                  ? 'animate-pulse text-red-400'
                  : 'text-amber-300'
              }`}
            >
              {isPaused ? 'PAUSE' : `${timeLeftSec}S`}
            </span>
          </div>
        </header>

        {/* Main Content: Themed Timber Shop OR Open Mechanical Mining Controls */}
        {phase === 'shop' ? (
          <section
            className="flex flex-1 min-h-0 flex-col justify-between gap-3 rounded-3xl border-2 border-amber-700/75 bg-cover bg-center p-4 shadow-2xl"
            style={{
              backgroundImage: `linear-gradient(to bottom, rgba(46,19,5,0.92), rgba(28,11,3,0.96)), url(${woodTextureUrl})`,
            }}
          >
            <div className="flex items-center justify-between border-b border-amber-700/40 pb-2 leading-none">
              <h3 className="font-goldminer text-xl leading-none text-amber-300">
                Zwischen-Shop
              </h3>
              <span className="font-goldminer text-lg leading-none text-emerald-400">
                Guthaben: ${myMoney}
              </span>
            </div>

            {/* Open shelf rows (no heavy boxes around each item) */}
            <div className="grid flex-1 min-h-0 grid-cols-1 content-center gap-x-6 gap-y-2 overflow-y-auto sm:grid-cols-2 landscape:grid-cols-3">
              {(hud?.shopOffers ?? []).map((offer) => {
                const spec = GOLD_MINER_SHOP_ITEMS.find((i) => i.id === offer.id);
                if (!spec) return null;
                const Icon = SHOP_ICONS[offer.id];
                const alreadyOwned =
                  (offer.id === 'strength' && me?.hasStrength) ||
                  (offer.id === 'clover' && me?.hasClover) ||
                  (offer.id === 'rock_book' && me?.hasRockBook) ||
                  (offer.id === 'diamond_polish' && me?.hasDiamondPolish);
                const canAfford = myMoney >= offer.price && !alreadyOwned;

                return (
                  <button
                    key={offer.id}
                    type="button"
                    disabled={!canAfford}
                    onClick={() => handleBuyItem(offer.id)}
                    className={`flex items-center justify-between gap-2 rounded-xl border-b border-amber-700/35 px-2.5 py-2 text-left transition ${
                      alreadyOwned
                        ? 'bg-emerald-950/55 text-emerald-300'
                        : canAfford
                          ? 'bg-amber-900/35 hover:bg-amber-800/50 active:scale-95'
                          : 'opacity-45'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Icon className="h-6 w-6 shrink-0 text-amber-300" />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold leading-tight text-amber-50">
                          {spec.name}
                        </div>
                        <div className="truncate text-[11px] leading-tight text-amber-200/70 landscape:hidden">
                          {spec.description}
                        </div>
                      </div>
                    </div>
                    <span className="font-goldminer shrink-0 text-base leading-none text-yellow-300">
                      {alreadyOwned ? 'AKTIV' : `$${offer.price}`}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleNextLevel}
              className="font-goldminer w-full rounded-2xl border-b-4 border-amber-800 bg-gradient-to-b from-amber-400 to-amber-600 py-3 text-xl leading-none text-[#2a1103] shadow-lg transition active:translate-y-0.5 landscape:py-2.5"
            >
              {me?.readyForNextLevel ? 'Warte auf Team...' : 'Nächstes Level starten!'}
            </button>
          </section>
        ) : (
          <div className="flex flex-1 min-h-0 flex-col items-center justify-center gap-5 sm:flex-row sm:justify-around landscape:flex-row landscape:justify-around">
            {/* Primary Mechanical Winch / Claw Wheel Control (open on backdrop, no flat rectangle box) */}
            <div className="flex flex-col items-center gap-2">
              <motion.button
                type="button"
                whileTap={{ scale: 0.93 }}
                disabled={!canDrop}
                onPointerDown={(e) => {
                  e.preventDefault();
                  handleDropHook();
                }}
                className={`relative flex h-44 w-44 flex-col items-center justify-center rounded-full border-4 shadow-[0_14px_32px_rgba(0,0,0,0.6)] transition sm:h-52 sm:w-52 landscape:h-44 landscape:w-44 ${
                  canDrop
                    ? 'border-[#FDE047] bg-gradient-to-b from-[#F59E0B] via-[#D97706] to-[#78350F] shadow-[0_0_32px_rgba(250,204,21,0.35)]'
                    : 'border-stone-600 bg-gradient-to-b from-stone-700 to-stone-900 opacity-75'
                }`}
              >
                <img
                  src={canDrop ? hookClawUrl : minerWinchUrl}
                  alt={canDrop ? 'Greifer werfen' : 'Winde aktiv'}
                  className={`h-24 w-24 object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.65)] transition-transform ${
                    hookState === 'extend' ? 'scale-95 animate-bounce' : ''
                  }`}
                />
                <span className="font-goldminer mt-1 text-lg leading-none tracking-wide text-amber-50 drop-shadow-[0_2px_0_rgba(0,0,0,0.85)]">
                  {isPaused
                    ? 'PAUSIERT'
                    : canDrop
                      ? 'HAKEN WERFEN'
                      : hookState === 'extend'
                        ? 'FÄHRT AUS...'
                        : carryingSpec
                          ? carryingSpec.label.toUpperCase()
                          : 'ZIEHT EIN...'}
                </span>
              </motion.button>

              {/* Open status caption & active upgrades directly below wheel (no extra box) */}
              <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-bold text-amber-200/90">
                <span>
                  {canDrop
                    ? 'Im richtigen Winkel tippen'
                    : carryingSpec && carryingSpec.weight >= 2.5 && dynamiteCount > 0
                      ? 'Schweres Teil — rechts sprengen!'
                      : 'Warten auf Greifer'}
                </span>
                {me?.hasStrength && <GiMuscleUp className="h-4 w-4 text-orange-400" title="Krafttrank" />}
                {me?.hasClover && <GiClover className="h-4 w-4 text-emerald-400" title="Glücksklee" />}
                {me?.hasRockBook && <GiSpellBook className="h-4 w-4 text-stone-300" title="Steine-Handbuch" />}
                {me?.hasDiamondPolish && (
                  <GiDiamondHard className="h-4 w-4 text-cyan-300" title="Diamant-Politur" />
                )}
              </div>
            </div>

            {/* Secondary Mechanical T-Handle Dynamite Plunger */}
            <div className="flex flex-col items-center gap-2">
              <motion.button
                type="button"
                whileTap={{ scale: 0.92, y: 4 }}
                disabled={!canDynamite}
                onPointerDown={(e) => {
                  e.preventDefault();
                  handleUseDynamite();
                }}
                className={`relative flex h-32 w-32 flex-col items-center justify-center rounded-3xl border-4 border-b-8 shadow-[0_12px_26px_rgba(0,0,0,0.55)] transition sm:h-36 sm:w-36 landscape:h-32 landscape:w-32 ${
                  canDynamite
                    ? 'border-[#7F1D1D] bg-gradient-to-b from-[#EF4444] to-[#991B1B] text-white shadow-[0_0_24px_rgba(239,68,68,0.4)]'
                    : 'border-stone-700 bg-gradient-to-b from-stone-800 to-stone-950 text-stone-400 opacity-60'
                }`}
              >
                <GiDynamite className="h-12 w-12 drop-shadow" />
                <span className="font-goldminer mt-1 text-lg leading-none">
                  DYNAMIT ({dynamiteCount})
                </span>
              </motion.button>
              <span className="text-xs font-bold text-amber-200/75">
                {canDynamite ? 'Last sofort sprengen' : 'Beim Einziehen aktiv'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

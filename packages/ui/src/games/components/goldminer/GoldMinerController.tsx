import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { playButtonClickSound, triggerHapticFeedback } from '../../../utils/soundEffects';
import {
  GiAnchor,
  GiClover,
  GiCoins,
  GiDiamondHard,
  GiDynamite,
  GiMining,
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

  const handleDropHook = () => {
    if (isPaused) return;
    triggerHapticFeedback(25);
    socketService.emitGoldMinerInput({ dropHook: true });
  };

  const handleUseDynamite = () => {
    if (isPaused || dynamiteCount <= 0 || hookState !== 'retract') return;
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

  const canDynamite = !isPaused && dynamiteCount > 0 && hookState === 'retract';

  return (
    <div
      className="relative flex h-full w-full flex-col justify-between overflow-hidden bg-[#2b1407] bg-cover bg-center pt-[max(0.5rem,env(safe-area-inset-top))] pr-[max(0.75rem,env(safe-area-inset-right))] pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] text-white select-none"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(35,16,6,0.72), rgba(24,11,4,0.88)), url(${backdropUrl})`,
      }}
    >
      <div className="mx-auto flex h-full w-full max-w-4xl flex-col justify-between gap-2.5">
        {/* Top Cockpit Bar: pl-28 reserves clean collision-free space for floating EXIT button */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border-2 border-[#B45309]/85 bg-gradient-to-b from-[#5C280B]/95 to-[#3A1705]/95 py-2 pr-3 pl-28 shadow-[0_6px_18px_rgba(0,0,0,0.45)] sm:pl-32 landscape:py-1.5">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <GiCoins className="h-5 w-5 text-amber-300 drop-shadow" />
              <span className="font-goldminer text-xl text-emerald-400 drop-shadow-[0_2px_0_rgba(0,0,0,0.9)] landscape:text-lg">
                ${displayedMoney}
              </span>
            </div>
            <div className="hidden items-center gap-2 sm:flex">
              <span className="text-xs font-bold text-amber-200/80">/ ${targetMoney}</span>
              <div className="h-2 w-20 overflow-hidden rounded-full bg-black/50 ring-1 ring-amber-500/30">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Centered Player Nameplate matching TV Miner Badge */}
          <div className="flex items-center gap-2 rounded-xl border border-amber-500/50 bg-[#271003]/90 px-3 py-1 shadow-inner">
            <span
              className="h-3 w-3 rounded-full border border-white/80 shadow"
              style={{ backgroundColor: playerColor }}
            />
            <span className="font-goldminer max-w-[120px] truncate text-sm tracking-wide text-amber-100">
              {playerName}
            </span>
          </div>

          {/* Level & Timer */}
          <div className="flex items-center gap-2.5">
            <span className="font-goldminer text-sm text-amber-200">Lvl {hud?.level ?? 1}</span>
            <span
              className={`font-goldminer rounded-lg px-2 py-0.5 text-sm shadow-inner ${
                (hud?.timeLeft ?? 60) <= 10 && !isPaused
                  ? 'animate-pulse bg-red-600 text-white'
                  : 'bg-black/45 text-amber-300'
              }`}
            >
              {isPaused ? 'PAUSE' : `${Math.ceil(hud?.timeLeft ?? 60)}s`}
            </span>
          </div>
        </div>

        {/* Main Body: Shop OR Ergonomic Mining Cockpit */}
        {phase === 'shop' ? (
          <div className="flex flex-1 min-h-0 flex-col justify-between gap-2 overflow-y-auto rounded-2xl border-2 border-[#B45309] bg-[#2D1305]/92 p-3 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-goldminer text-xl text-amber-300 drop-shadow landscape:text-lg">
                Zwischen-Shop
              </h3>
              <span className="font-goldminer text-lg text-emerald-400 landscape:text-base">
                Guthaben: ${myMoney}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 landscape:grid-cols-3">
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
                    className={`flex items-center justify-between rounded-xl border-2 p-2.5 text-left transition landscape:p-2 ${
                      alreadyOwned
                        ? 'border-emerald-500/60 bg-emerald-950/65 opacity-80'
                        : canAfford
                          ? 'border-amber-400 bg-amber-900/75 shadow-md active:scale-95'
                          : 'border-stone-700 bg-stone-900/65 opacity-55'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <Icon className="h-6 w-6 shrink-0 text-amber-300" />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-white landscape:text-xs">
                          {spec.name}
                        </div>
                        <div className="truncate text-[11px] text-amber-200/80 landscape:hidden">
                          {spec.description}
                        </div>
                      </div>
                    </div>
                    <div className="font-goldminer ml-2 shrink-0 text-base text-yellow-300 landscape:text-sm">
                      {alreadyOwned ? 'Aktiv' : `$${offer.price}`}
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleNextLevel}
              className="font-goldminer w-full rounded-2xl border-b-4 border-emerald-800 bg-emerald-500 py-3 text-xl text-white shadow-lg active:translate-y-0.5 landscape:py-2 landscape:text-base"
            >
              {me?.readyForNextLevel ? 'Warte auf Team...' : 'Nächstes Level starten!'}
            </button>
          </div>
        ) : (
          <div className="grid flex-1 min-h-0 grid-cols-1 gap-3 sm:grid-cols-[1.55fr_1fr] landscape:grid-cols-[1.55fr_1fr]">
            {/* Left Panel: Winch & Hook Console */}
            <div className="flex flex-col justify-between gap-2.5 rounded-3xl border-2 border-[#B45309]/80 bg-gradient-to-b from-[#451A03]/90 to-[#271003]/95 p-3 shadow-2xl">
              <div className="flex items-center justify-between gap-2 px-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      isPaused
                        ? 'bg-stone-400'
                        : hookState === 'swing'
                          ? 'animate-pulse bg-emerald-400'
                          : 'bg-amber-400'
                    }`}
                  />
                  <span className="text-xs font-bold tracking-wide text-amber-200 uppercase">
                    {isPaused
                      ? 'Pausiert'
                      : hookState === 'swing'
                        ? 'Winde bereit'
                        : hookState === 'extend'
                          ? 'Seil läuft aus'
                          : carryingSpec
                            ? `Zieht: ${carryingSpec.label}`
                            : 'Seil holt ein'}
                  </span>
                </div>

                {/* Active Upgrades */}
                <div className="flex items-center gap-1 text-[11px]">
                  {me?.hasStrength && (
                    <span className="flex items-center gap-1 rounded-md bg-orange-600/85 px-1.5 py-0.5 font-bold">
                      <GiMuscleUp /> Kraft
                    </span>
                  )}
                  {me?.hasClover && (
                    <span className="flex items-center gap-1 rounded-md bg-emerald-600/85 px-1.5 py-0.5 font-bold">
                      <GiClover /> Glück
                    </span>
                  )}
                  {me?.hasRockBook && (
                    <span className="flex items-center gap-1 rounded-md bg-stone-600/85 px-1.5 py-0.5 font-bold">
                      <GiSpellBook /> Stein
                    </span>
                  )}
                  {me?.hasDiamondPolish && (
                    <span className="flex items-center gap-1 rounded-md bg-cyan-600/85 px-1.5 py-0.5 font-bold">
                      <GiDiamondHard /> Diamant
                    </span>
                  )}
                </div>
              </div>

              {/* Tactile Brass Winch Trigger */}
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                disabled={isPaused || hookState !== 'swing'}
                onPointerDown={(e) => {
                  e.preventDefault();
                  handleDropHook();
                }}
                className={`relative flex flex-1 flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-b-[6px] px-4 py-3 shadow-lg transition ${
                  hookState === 'swing' && !isPaused
                    ? 'border-[#92400E] bg-gradient-to-b from-[#FDE047] via-[#FACC15] to-[#D97706] text-[#451A03] shadow-[0_0_24px_rgba(250,204,21,0.28)]'
                    : 'border-[#44403C] bg-gradient-to-b from-[#57534E]/80 to-[#292524]/90 text-amber-100/75'
                }`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-current/25 bg-black/10 shadow-inner">
                  {hookState === 'swing' ? (
                    <GiAnchor className="h-7 w-7" />
                  ) : (
                    <GiMining className="h-7 w-7 animate-pulse" />
                  )}
                </div>
                <span className="font-goldminer text-2xl tracking-wide drop-shadow-sm landscape:text-xl">
                  {isPaused
                    ? 'PAUSIERT'
                    : hookState === 'swing'
                      ? 'HAKEN WERFEN'
                      : hookState === 'extend'
                        ? 'UNTERWEGS...'
                        : carryingSpec
                          ? carryingSpec.label.toUpperCase()
                          : 'ZIEHT EIN...'}
                </span>
                <span className="text-xs font-bold opacity-80">
                  {hookState === 'swing'
                    ? 'Im richtigen Winkel auslösen'
                    : carryingSpec && carryingSpec.weight >= 2.5 && dynamiteCount > 0
                      ? 'Schweres Teil — rechts sprengbar!'
                      : 'Warten bis der Greifer zurück ist'}
                </span>
              </motion.button>
            </div>

            {/* Right Panel: Dynamite Detonator Deck */}
            <div className="flex flex-col justify-between gap-2.5 rounded-3xl border-2 border-[#B45309]/80 bg-gradient-to-b from-[#451A03]/90 to-[#271003]/95 p-3 shadow-2xl">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold tracking-wide text-amber-200 uppercase">
                  Spreng-Deck
                </span>
                <span className="rounded-md bg-black/45 px-2 py-0.5 text-xs font-bold text-red-300">
                  Vorrat: {dynamiteCount}
                </span>
              </div>

              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                disabled={!canDynamite}
                onPointerDown={(e) => {
                  e.preventDefault();
                  handleUseDynamite();
                }}
                className={`flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-b-[6px] p-3 shadow-lg transition ${
                  canDynamite
                    ? 'border-[#7F1D1D] bg-gradient-to-b from-[#F87171] via-[#EF4444] to-[#B91C1C] text-white shadow-[0_0_20px_rgba(239,68,68,0.35)]'
                    : 'border-stone-800 bg-gradient-to-b from-stone-800/75 to-stone-900/90 text-stone-400 opacity-65'
                }`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-current/25 bg-black/20">
                  <GiDynamite className="h-7 w-7" />
                </div>
                <span className="font-goldminer text-xl tracking-wide">
                  DYNAMIT ({dynamiteCount})
                </span>
                <span className="text-center text-[11px] font-bold opacity-80">
                  {canDynamite ? 'Last sofort sprengen!' : 'Nur beim Einziehen aktiv'}
                </span>
              </motion.button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

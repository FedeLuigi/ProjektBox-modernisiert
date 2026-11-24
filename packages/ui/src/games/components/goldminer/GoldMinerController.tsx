import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { playButtonClickSound, triggerHapticFeedback } from '../../../utils/soundEffects';
import {
  GiAnchor,
  GiClover,
  GiCoins,
  GiDiamondHard,
  GiDynamite,
  GiGoldBar,
  GiMining,
  GiMuscleUp,
  GiSpellBook,
} from 'react-icons/gi';
import type {
  GoldMinerHudStatePayload,
  GoldMinerShopItemId,
  Player,
} from '@projektbox/shared/types';
import { GOLD_MINER_SHOP_ITEMS } from '@projektbox/shared/utils';
import { socketService } from '../../../services/socket';

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

  const handleDropHook = () => {
    triggerHapticFeedback(25);
    socketService.emitGoldMinerInput({ dropHook: true });
  };

  const handleUseDynamite = () => {
    if (dynamiteCount <= 0 || hookState !== 'retract') return;
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
    <div className="flex h-full w-full flex-col justify-between overflow-hidden bg-gradient-to-b from-[#FF9F0A] via-[#9A7255] to-[#6E492F] pt-[max(0.55rem,env(safe-area-inset-top))] pr-[max(0.75rem,env(safe-area-inset-right))] pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] text-white select-none">
      <div className="mx-auto flex h-full w-full max-w-4xl flex-col justify-between gap-2 landscape:gap-2">
        {/* Top Gold Miner HUD (pl-20 leaves clean room for floating EXIT button) */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border-2 border-[#C2410C] bg-[#FF9F0A] py-2 pr-3 pl-21 shadow-md landscape:py-1.5">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <GiCoins className="h-6 w-6 text-yellow-200 drop-shadow landscape:h-5 landscape:w-5" />
              <span className="font-goldminer text-xl text-[#16A34A] drop-shadow-[0_2px_0_rgba(0,0,0,0.85)] landscape:text-lg">
                ${displayedMoney}
              </span>
            </div>
            <div className="text-xs font-bold text-[#7C2D12]">
              Ziel:{' '}
              <span className="font-goldminer text-sm text-[#FEF08A] drop-shadow-[0_1px_0_rgba(0,0,0,0.9)]">
                ${targetMoney}
              </span>
            </div>
            <div className="hidden items-center gap-1.5 rounded-lg bg-[#7C2D12]/20 px-2 py-0.5 sm:flex">
              <span
                className="h-2.5 w-2.5 rounded-full border border-white/80"
                style={{ backgroundColor: me?.color || myPlayer.color || '#FACC15' }}
              />
              <span className="max-w-[110px] truncate text-xs font-bold text-amber-950">
                {me?.name || myPlayer.name}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1 rounded-xl bg-[#7C2D12]/25 px-2.5 py-1">
              <GiDynamite className="h-5 w-5 text-red-600 landscape:h-4 landscape:w-4" />
              <span className="font-goldminer text-base text-white drop-shadow-[0_1px_0_rgba(0,0,0,0.8)] landscape:text-sm">
                {dynamiteCount}
              </span>
            </div>
            <div className="flex items-baseline gap-2 text-right">
              <span className="font-goldminer text-sm text-white drop-shadow-[0_1px_0_rgba(0,0,0,0.8)]">
                Lvl {hud?.level ?? 1}
              </span>
              <span className="font-goldminer text-base text-[#DC2626] drop-shadow-[0_1px_0_rgba(255,255,255,0.65)]">
                {hud?.paused ? 'PAUSE' : `${Math.ceil(hud?.timeLeft ?? 60)}s`}
              </span>
            </div>
          </div>
        </div>

        {/* Portrait Player Badge + Active Upgrades */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-black/25 px-3 py-1.5 backdrop-blur-sm landscape:hidden">
          <div className="flex items-center gap-2">
            <span
              className="h-3.5 w-3.5 rounded-full border border-white/80 shadow"
              style={{ backgroundColor: me?.color || myPlayer.color || '#FACC15' }}
            />
            <span className="text-sm font-bold text-amber-100">{me?.name || myPlayer.name}</span>
            {!isCoop && (
              <span className="rounded-md bg-amber-400/20 px-1.5 py-0.5 text-xs font-bold text-amber-200">
                ${myMoney}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            {me?.hasStrength && (
              <span className="flex items-center gap-1 rounded-md bg-orange-600/80 px-2 py-0.5 font-bold">
                <GiMuscleUp /> Kraft
              </span>
            )}
            {me?.hasClover && (
              <span className="flex items-center gap-1 rounded-md bg-emerald-600/80 px-2 py-0.5 font-bold">
                <GiClover /> Glück
              </span>
            )}
            {me?.hasRockBook && (
              <span className="flex items-center gap-1 rounded-md bg-stone-600/80 px-2 py-0.5 font-bold">
                <GiSpellBook /> Stein
              </span>
            )}
            {me?.hasDiamondPolish && (
              <span className="flex items-center gap-1 rounded-md bg-cyan-600/80 px-2 py-0.5 font-bold">
                <GiDiamondHard /> Diamant
              </span>
            )}
          </div>
        </div>

        {/* Main Body: Playing Controls OR Between-Level Shop */}
        {phase === 'shop' ? (
          <div className="flex flex-1 min-h-0 flex-col justify-between gap-2 overflow-y-auto rounded-2xl border-2 border-[#B45309] bg-[#451A03]/85 p-3">
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
                        ? 'border-emerald-500/50 bg-emerald-950/60 opacity-75'
                        : canAfford
                          ? 'border-amber-400 bg-amber-900/70 active:scale-95'
                          : 'border-stone-700 bg-stone-900/60 opacity-55'
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
          <div className="flex flex-1 min-h-0 flex-col gap-3 landscape:grid landscape:grid-cols-[1.65fr_1fr] landscape:gap-3">
            {/* Huge Tactile Hook Drop Button */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onPointerDown={(e) => {
                e.preventDefault();
                handleDropHook();
              }}
              className={`relative flex flex-1 flex-col items-center justify-center gap-2 rounded-3xl border-b-[6px] p-4 shadow-xl transition ${
                hookState === 'swing'
                  ? 'border-[#B45309] bg-gradient-to-b from-[#FACC15] to-[#EAB308] text-[#451A03]'
                  : 'border-[#57534E] bg-[#78716C]/70 text-amber-100'
              }`}
            >
              <div className="flex items-center gap-3">
                {hookState === 'swing' ? (
                  <GiAnchor className="h-12 w-12 animate-bounce landscape:h-10 landscape:w-10" />
                ) : (
                  <GiMining className="h-12 w-12 landscape:h-10 landscape:w-10" />
                )}
                <GiGoldBar className="h-10 w-10 opacity-85 landscape:h-8 landscape:w-8" />
              </div>
              <span className="font-goldminer text-2xl tracking-wide drop-shadow-sm sm:text-3xl landscape:text-2xl">
                {hookState === 'swing'
                  ? 'HAKEN WERFEN!'
                  : hookState === 'extend'
                    ? 'GREIFER UNTERWEGS...'
                    : 'ZIEHT EIN...'}
              </span>
              <span className="text-xs font-bold opacity-80">
                {hookState === 'swing'
                  ? 'Tippe im richtigen Winkel auf den Bildschirm!'
                  : 'Warte bis der Haken zurückkehrt'}
              </span>
            </motion.button>

            {/* Dynamite Trigger Button (tall side-by-side button in landscape) */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              disabled={dynamiteCount <= 0 || hookState !== 'retract'}
              onPointerDown={(e) => {
                e.preventDefault();
                handleUseDynamite();
              }}
              className={`flex items-center justify-center gap-3 rounded-2xl border-b-4 py-3.5 shadow-lg transition landscape:flex-col landscape:rounded-3xl landscape:border-b-[6px] landscape:p-4 ${
                dynamiteCount > 0 && hookState === 'retract'
                  ? 'border-[#7F1D1D] bg-gradient-to-r from-[#EF4444] to-[#DC2626] text-white landscape:bg-gradient-to-b'
                  : 'border-stone-800 bg-stone-800/60 text-stone-400 opacity-60'
              }`}
            >
              <GiDynamite className="h-7 w-7 landscape:h-11 landscape:w-11" />
              <span className="font-goldminer text-center text-lg tracking-wide landscape:text-xl">
                DYNAMIT ({dynamiteCount})
              </span>
            </motion.button>
          </div>
        )}
      </div>
    </div>
  );
}

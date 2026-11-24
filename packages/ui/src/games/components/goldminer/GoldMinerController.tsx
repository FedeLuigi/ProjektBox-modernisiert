import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
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
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(25);
    }
    socketService.emitGoldMinerInput({ dropHook: true });
  };

  const handleUseDynamite = () => {
    if (dynamiteCount <= 0 || hookState !== 'retract') return;
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([40, 20, 60]);
    }
    socketService.emitGoldMinerInput({ useDynamite: true });
  };

  const handleBuyItem = (itemId: GoldMinerShopItemId) => {
    socketService.emitGoldMinerInput({ buyItemId: itemId });
  };

  const handleNextLevel = () => {
    socketService.emitGoldMinerInput({ nextLevelReady: true });
  };

  return (
    <div className="flex h-full w-full flex-col justify-between overflow-hidden rounded-3xl border-4 border-[#9A3412] bg-gradient-to-b from-[#FF9F0A] via-[#9A7255] to-[#6E492F] p-3 text-white shadow-2xl select-none">
      {/* Top Gold Miner HUD */}
      <div className="flex items-center justify-between rounded-2xl border-2 border-[#C2410C] bg-[#FF9F0A] px-3 py-2 shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <GiCoins className="h-6 w-6 text-yellow-200 drop-shadow" />
            <span className="font-goldminer text-xl text-[#16A34A] drop-shadow-[0_2px_0_rgba(0,0,0,0.85)]">
              ${displayedMoney}
            </span>
          </div>
          <div className="text-xs font-bold text-[#7C2D12]">
            Ziel: <span className="font-goldminer text-sm text-[#FEF08A] drop-shadow-[0_1px_0_rgba(0,0,0,0.9)]">${targetMoney}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-xl bg-[#7C2D12]/25 px-2.5 py-1">
            <GiDynamite className="h-5 w-5 text-red-600" />
            <span className="font-goldminer text-base text-white drop-shadow-[0_1px_0_rgba(0,0,0,0.8)]">
              {dynamiteCount}
            </span>
          </div>
          <div className="text-right">
            <div className="font-goldminer text-sm text-white drop-shadow-[0_1px_0_rgba(0,0,0,0.8)]">
              Lvl {hud?.level ?? 1}
            </div>
            <div className="font-goldminer text-base text-[#DC2626] drop-shadow-[0_1px_0_rgba(255,255,255,0.65)]">
              {Math.ceil(hud?.timeLeft ?? 60)}s
            </div>
          </div>
        </div>
      </div>

      {/* Player Badge & Active Upgrades */}
      <div className="my-2 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-black/25 px-3 py-1.5 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span
            className="h-3.5 w-3.5 rounded-full border border-white/80 shadow"
            style={{ backgroundColor: me?.color || myPlayer.color || '#FACC15' }}
          />
          <span className="font-bold text-sm text-amber-100">{me?.name || myPlayer.name}</span>
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
        <div className="flex flex-1 flex-col justify-between gap-2 overflow-y-auto rounded-2xl border-2 border-[#B45309] bg-[#451A03]/80 p-3">
          <div className="flex items-center justify-between">
            <h3 className="font-goldminer text-xl text-amber-300 drop-shadow">
              Zwischen-Shop
            </h3>
            <span className="font-goldminer text-lg text-emerald-400">Guthaben: ${myMoney}</span>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
                  className={`flex items-center justify-between rounded-xl border-2 p-2.5 text-left transition ${
                    alreadyOwned
                      ? 'border-emerald-500/50 bg-emerald-950/60 opacity-75'
                      : canAfford
                        ? 'border-amber-400 bg-amber-900/70 active:scale-95'
                        : 'border-stone-700 bg-stone-900/60 opacity-55'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="h-7 w-7 shrink-0 text-amber-300" />
                    <div>
                      <div className="text-sm font-bold text-white">{spec.name}</div>
                      <div className="text-[11px] text-amber-200/80">{spec.description}</div>
                    </div>
                  </div>
                  <div className="font-goldminer ml-2 shrink-0 text-base text-yellow-300">
                    {alreadyOwned ? 'Aktiv' : `$${offer.price}`}
                  </div>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleNextLevel}
            className="font-goldminer w-full rounded-2xl border-b-4 border-emerald-800 bg-emerald-500 py-3 text-xl text-white shadow-lg active:translate-y-0.5"
          >
            {me?.readyForNextLevel ? 'Warte auf Team...' : 'Nächstes Level starten!'}
          </button>
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-3">
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
                <GiAnchor className="h-12 w-12 animate-bounce" />
              ) : (
                <GiMining className="h-12 w-12" />
              )}
              <GiGoldBar className="h-10 w-10 opacity-85" />
            </div>
            <span className="font-goldminer text-2xl tracking-wide drop-shadow-sm sm:text-3xl">
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

          {/* Dynamite Trigger Button */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            disabled={dynamiteCount <= 0 || hookState !== 'retract'}
            onPointerDown={(e) => {
              e.preventDefault();
              handleUseDynamite();
            }}
            className={`flex items-center justify-center gap-3 rounded-2xl border-b-4 py-3.5 shadow-lg transition ${
              dynamiteCount > 0 && hookState === 'retract'
                ? 'border-[#7F1D1D] bg-gradient-to-r from-[#EF4444] to-[#DC2626] text-white'
                : 'border-stone-800 bg-stone-800/60 text-stone-400 opacity-60'
            }`}
          >
            <GiDynamite className="h-7 w-7" />
            <span className="font-goldminer text-lg tracking-wide">
              DYNAMIT ZÜNDEN ({dynamiteCount})
            </span>
          </motion.button>
        </div>
      )}
    </div>
  );
}

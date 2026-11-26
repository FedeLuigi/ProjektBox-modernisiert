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
import dynamiteSpriteUrl from '../../../assets/textures/goldminer/sprites/dynamite.png';

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

export function GoldMinerController({ myPlayerId }: GoldMinerControllerProps) {
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
        {/* Clean single timber header (pl-28 reserves EXIT zone, no player pill, uniform height) */}
        <header
          className="flex h-11 items-center justify-between gap-3 rounded-2xl border-b-2 border-amber-700/70 bg-cover bg-center pr-4 pl-28 shadow-[0_6px_18px_rgba(0,0,0,0.45)] sm:pl-32"
          style={{
            backgroundImage: `linear-gradient(to bottom, rgba(69,26,3,0.86), rgba(39,16,3,0.94)), url(${woodTextureUrl})`,
          }}
        >
          <div className="flex h-9 items-center gap-2.5 leading-none">
            <GiCoins className="h-5 w-5 shrink-0 text-amber-300" />
            <span className="font-goldminer text-xl leading-none tabular-nums text-emerald-400 drop-shadow-[0_2px_0_rgba(0,0,0,0.85)]">
              ${displayedMoney}
            </span>
            <span className="font-goldminer hidden text-sm leading-none tabular-nums text-amber-200/75 sm:inline">
              / ${targetMoney}
            </span>
            <div className="hidden h-2 w-20 overflow-hidden rounded-full bg-black/50 sm:block">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          <div className="flex h-9 items-center gap-3 leading-none">
            <span className="font-goldminer flex h-9 items-center text-sm leading-none text-amber-200">
              LVL {hud?.level ?? 1}
            </span>
            <span
              className={`font-goldminer flex h-9 items-center text-lg leading-none tabular-nums ${
                timeLeftSec <= 10 && !isPaused ? 'animate-pulse text-red-400' : 'text-amber-300'
              }`}
            >
              {isPaused ? 'PAUSE' : `${timeLeftSec}S`}
            </span>
          </div>
        </header>

        {/* Main Content: Open Timber Shop OR Right-Handed Free-Sprite Controls */}
        {phase === 'shop' ? (
          <section
            className="flex flex-1 min-h-0 flex-col justify-between gap-3 rounded-3xl border-2 border-amber-700/75 bg-cover bg-center p-4 shadow-2xl"
            style={{
              backgroundImage: `linear-gradient(to bottom, rgba(46,19,5,0.92), rgba(28,11,3,0.96)), url(${woodTextureUrl})`,
            }}
          >
            <div className="flex items-center justify-between border-b border-amber-700/40 pb-2 leading-none">
              <h3 className="font-goldminer text-xl leading-none text-amber-300">Zwischen-Shop</h3>
              <span className="font-goldminer text-lg leading-none tabular-nums text-emerald-400">
                Guthaben: ${myMoney}
              </span>
            </div>

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
                        ? 'text-emerald-300 opacity-85'
                        : canAfford
                          ? 'hover:bg-amber-900/40 active:scale-95'
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
                    <span className="font-goldminer shrink-0 text-base leading-none tabular-nums text-yellow-300">
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
          /* Right-handed in landscape: Primary Hook on RIGHT, Secondary Dynamite on LEFT */
          <div className="flex flex-1 min-h-0 flex-col items-center justify-center gap-6 sm:flex-row-reverse sm:justify-around landscape:flex-row-reverse landscape:justify-around">
            {/* Primary Action: Free Grappling Claw Sprite (no CSS circle or box) */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.9, y: 6 }}
              disabled={!canDrop}
              onPointerDown={(e) => {
                e.preventDefault();
                handleDropHook();
              }}
              className={`flex flex-col items-center justify-center gap-2 p-2 transition focus:outline-none ${
                canDrop ? 'cursor-pointer opacity-100' : 'opacity-70'
              }`}
            >
              <img
                src={canDrop ? hookClawUrl : minerWinchUrl}
                alt="Haken werfen"
                className={`h-36 w-36 object-contain transition sm:h-44 sm:w-44 landscape:h-40 landscape:w-40 ${
                  canDrop
                    ? 'drop-shadow-[0_0_26px_rgba(250,204,21,0.65)]'
                    : hookState === 'extend'
                      ? 'animate-bounce drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)]'
                      : 'drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)]'
                }`}
              />
              <span className="font-goldminer text-2xl leading-none tracking-wide text-amber-200 drop-shadow-[0_3px_0_rgba(0,0,0,0.9)]">
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

              {(me?.hasStrength || me?.hasClover || me?.hasRockBook || me?.hasDiamondPolish) && (
                <div className="flex items-center gap-2 pt-1">
                  {me?.hasStrength && <GiMuscleUp className="h-5 w-5 text-orange-400" />}
                  {me?.hasClover && <GiClover className="h-5 w-5 text-emerald-400" />}
                  {me?.hasRockBook && <GiSpellBook className="h-5 w-5 text-stone-300" />}
                  {me?.hasDiamondPolish && <GiDiamondHard className="h-5 w-5 text-cyan-300" />}
                </div>
              )}
            </motion.button>

            {/* Secondary Action (Left in landscape): Free Dynamite Bundle Sprite */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.9, y: 4 }}
              disabled={!canDynamite}
              onPointerDown={(e) => {
                e.preventDefault();
                handleUseDynamite();
              }}
              className={`flex flex-col items-center justify-center gap-2 p-2 transition focus:outline-none ${
                canDynamite
                  ? 'cursor-pointer opacity-100'
                  : 'opacity-45 grayscale'
              }`}
            >
              <img
                src={dynamiteSpriteUrl}
                alt="Dynamit"
                className={`h-24 w-24 object-contain sm:h-32 sm:w-32 landscape:h-28 landscape:w-28 ${
                  canDynamite
                    ? 'drop-shadow-[0_0_24px_rgba(239,68,68,0.75)]'
                    : 'drop-shadow-[0_6px_12px_rgba(0,0,0,0.5)]'
                }`}
              />
              <span className="font-goldminer text-xl leading-none tracking-wide text-red-300 drop-shadow-[0_2px_0_rgba(0,0,0,0.9)]">
                DYNAMIT ×{dynamiteCount}
              </span>
            </motion.button>
          </div>
        )}
      </div>
    </div>
  );
}

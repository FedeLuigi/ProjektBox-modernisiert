import { useCallback, useEffect, useState } from 'react';
import {
  Anchor,
  Compass,
  Crown,
  Flame,
  Gem,
  Moon,
  Rocket,
  Shield,
  Sparkles,
  Zap,
} from 'lucide-react';
import type { GameRendererProps } from '../types';
import { CrystalButton, CrystalReadout } from '../../components/CrystalUI';
import {
  playErrorSound,
  playMoveSound,
  playScoreSound,
  playWinSound,
} from '../../utils/soundEffects';

const ALL_ICONS = [Flame, Crown, Gem, Rocket, Moon, Anchor, Zap, Shield, Compass];

type DeckSize = 6 | 8; // 6 Paare (4x3) oder 8 Paare (4x4)

interface MemoryCard {
  uid: number;
  pairId: number;
  matched: boolean;
}

function createShuffledDeck(pairCount: DeckSize): MemoryCard[] {
  const selected = ALL_ICONS.slice(0, pairCount);
  const pairs = selected.flatMap((_, idx) => [idx, idx]);
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }
  return pairs.map((pairId, uid) => ({ uid, pairId, matched: false }));
}

export function MemoryBoard({
  isGameOver,
  disabled,
  onMove,
}: GameRendererProps) {
  const [pairCount, setPairCount] = useState<DeckSize>(6);
  const [cards, setCards] = useState<MemoryCard[]>(() => createShuffledDeck(6));
  const [flipped, setFlipped] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [mismatchPair, setMismatchPair] = useState<number[]>([]);
  const [locked, setLocked] = useState(false);

  const matchedCount = cards.filter((c) => c.matched).length / 2;

  const resetDeck = useCallback(
    (nextPairCount: DeckSize) => {
      playMoveSound();
      setPairCount(nextPairCount);
      setCards(createShuffledDeck(nextPairCount));
      setFlipped([]);
      setMismatchPair([]);
      setMoves(0);
      setScore(0);
      setStreak(0);
      setBestStreak(0);
      setLocked(false);
      onMove({ score: 0, isAbsolute: true });
    },
    [onMove]
  );

  useEffect(() => {
    if (matchedCount === pairCount && !isGameOver && pairCount > 0) {
      const efficiencyBonus = Math.max(0, (pairCount * 2 - moves) * 45);
      const finalScore = Math.max(150, score + efficiencyBonus);
      playWinSound();
      const timer = setTimeout(() => {
        onMove({
          score: finalScore,
          isAbsolute: true,
          finish: true,
          label: `${finalScore} PKT (${moves} ZÜGE • ${bestStreak}x KOMBO)`,
        });
      }, 380);
      return () => clearTimeout(timer);
    }
  }, [matchedCount, pairCount, moves, score, bestStreak, isGameOver, onMove]);

  const handleCardClick = (uid: number) => {
    if (locked || isGameOver || disabled) return;
    const card = cards.find((c) => c.uid === uid);
    if (!card || card.matched || flipped.includes(uid)) return;

    playMoveSound();
    const nextFlipped = [...flipped, uid];
    setFlipped(nextFlipped);

    if (nextFlipped.length === 2) {
      const nextMoves = moves + 1;
      setMoves(nextMoves);
      const [firstUid, secondUid] = nextFlipped;
      const first = cards.find((c) => c.uid === firstUid)!;
      const second = cards.find((c) => c.uid === secondUid)!;

      if (first.pairId === second.pairId) {
        const nextStreak = streak + 1;
        const nextBestStreak = Math.max(bestStreak, nextStreak);
        const gained = 140 + (nextStreak - 1) * 60;
        const nextScore = score + gained;

        setStreak(nextStreak);
        setBestStreak(nextBestStreak);
        setScore(nextScore);
        playScoreSound(nextStreak);

        setCards((prev) =>
          prev.map((c) =>
            c.uid === firstUid || c.uid === secondUid ? { ...c, matched: true } : c
          )
        );
        setFlipped([]);
        onMove({ score: nextScore, isAbsolute: true });
      } else {
        setStreak(0);
        setMismatchPair([firstUid, secondUid]);
        setLocked(true);
        playErrorSound();
        setTimeout(() => {
          setFlipped([]);
          setMismatchPair([]);
          setLocked(false);
        }, 560);
      }
    }
  };

  const isFourByFour = pairCount === 8;

  return (
    <div className="flex h-full w-full max-w-6xl flex-1 min-h-0 flex-col lg:flex-row landscape:flex-row items-center justify-center gap-3 sm:gap-5 px-1 sm:px-3 select-none">
      {/* Obere kompakte Statusleiste auf Smartphones im Hochformat */}
      <div className="flex lg:hidden landscape:hidden items-center justify-between gap-2 w-full max-w-xl px-3 py-2 bg-[#FFFBEB] border-[3px] border-[#9A3412] shadow-[0_4px_0_rgba(15,23,42,0.28)] text-xs sm:text-sm font-arcade uppercase text-[#78350F] shrink-0">
        <div className="flex items-center gap-3">
          <span>
            PAARE: <strong className="text-[#EA580C]">{matchedCount}/{pairCount}</strong>
          </span>
          <span>
            ZÜGE: <strong className="text-[#1E293B]">{moves}</strong>
          </span>
          {streak >= 2 && (
            <span className="bg-[#059669] text-white px-2 py-0.5 text-[11px] border border-[#064E3B] animate-bounce">
              {streak}x KOMBO!
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => resetDeck(6)}
            className={`px-2 py-0.5 text-[11px] border-2 cursor-pointer ${
              pairCount === 6
                ? 'bg-[#EA580C] text-white border-[#78350F]'
                : 'bg-white text-[#78350F] border-[#D97706]'
            }`}
          >
            4×3
          </button>
          <button
            type="button"
            onClick={() => resetDeck(8)}
            className={`px-2 py-0.5 text-[11px] border-2 cursor-pointer ${
              pairCount === 8
                ? 'bg-[#EA580C] text-white border-[#78350F]'
                : 'bg-white text-[#78350F] border-[#D97706]'
            }`}
          >
            4×4
          </button>
        </div>
      </div>

      {/* GROSSFLÄCHIGES KARTEN-SPIELFELD (füllt den gesamten verfügbaren Hauptbereich dynamisch aus) */}
      <div className="flex-1 min-h-0 w-full flex items-center justify-center">
        <div
          className={`grid grid-cols-4 gap-2 sm:gap-3.5 p-3 sm:p-4 bg-[#FFFBEB] border-[4px] border-[#9A3412] shadow-[inset_0_0_0_4px_#FDE68A,0_12px_24px_rgba(15,23,42,0.45)] w-full ${
            isFourByFour
              ? 'max-w-[min(92vw,calc(100dvh-10.5rem),37rem)] landscape:max-w-[min(64vw,calc(100dvh-4.8rem),36rem)] aspect-square'
              : 'max-w-[min(94vw,calc((100dvh-10.5rem)*1.33),44rem)] landscape:max-w-[min(68vw,calc((100dvh-4.8rem)*1.33),42rem)] aspect-[4/3]'
          }`}
        >
          {cards.map((card) => {
            const isOpen = card.matched || flipped.includes(card.uid);
            const isMismatch = mismatchPair.includes(card.uid);
            const Icon = ALL_ICONS[card.pairId];

            return (
              <button
                key={card.uid}
                type="button"
                onClick={() => handleCardClick(card.uid)}
                className={`group relative flex items-center justify-center transition-all duration-200 cursor-pointer active:scale-95 border-[3px] overflow-hidden ${
                  card.matched
                    ? 'bg-[#059669] text-white border-[#064E3B] shadow-[inset_0_0_0_2px_#6EE7B7,0_4px_0_rgba(6,78,59,0.35)] scale-[0.98]'
                    : isMismatch
                      ? 'bg-[#FEE2E2] text-[#E11D48] border-[#991B1B] shadow-[inset_0_0_0_2px_#FECACA] screen-shake'
                      : isOpen
                        ? 'bg-[#FFFFFF] text-[#1E293B] border-[#334155] shadow-[inset_0_0_0_2px_#F1F5F9,0_4px_0_rgba(15,23,42,0.25)] scale-[1.02]'
                        : 'bg-[#EA580C] hover:bg-[#F97316] text-white border-[#9A3412] shadow-[inset_0_0_0_2px_#FDBA74,0_5px_0_rgba(154,52,18,0.38)] hover:-translate-y-0.5'
                }`}
                style={{
                  clipPath: 'polygon(0% 3%, 100% 0%, 98% 97%, 2% 100%)',
                }}
              >
                <div
                  className="pointer-events-none absolute inset-0 bg-white/15"
                  style={{ clipPath: 'polygon(0 0, 58% 0, 32% 100%, 0 100%)' }}
                />
                {isOpen ? (
                  <Icon
                    className={`relative z-10 h-8 w-8 sm:h-11 sm:w-11 md:h-12 md:w-12 landscape:h-8 landscape:w-8 transition-transform duration-200 scale-110 ${
                      card.matched
                        ? 'text-white drop-shadow-[0_2px_0_rgba(6,78,59,0.65)]'
                        : isMismatch
                          ? 'text-[#E11D48]'
                          : 'text-[#EA580C]'
                    }`}
                  />
                ) : (
                  <Sparkles className="relative z-10 h-6 w-6 sm:h-8 sm:w-8 text-[#FEF3C7]/90 transition-transform group-hover:scale-110" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Rechte Seitenleiste auf Desktop & im Querformat */}
      <aside className="hidden lg:flex landscape:flex flex-col justify-center gap-3 w-52 sm:w-60 shrink-0 bg-[#F8FAFC] border-[3px] border-[#334155] shadow-[inset_0_0_0_3px_#FFFFFF,0_8px_0_rgba(15,23,42,0.35)] p-3.5">
        <CrystalReadout variant="gold" label="PUNKTE" value={score} />
        <CrystalReadout label="PAARE" value={`${matchedCount} / ${pairCount}`} />
        <CrystalReadout
          variant={streak >= 2 ? 'emerald' : 'neutral'}
          label="ZÜGE / KOMBO"
          value={streak >= 2 ? `${moves} (${streak}x 🔥)` : `${moves} ZÜGE`}
        />

        <div className="pt-1 flex flex-col gap-1.5">
          <span className="font-arcade text-[11px] text-center text-[#475569] uppercase">
            FELDGRÖSSE
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            <CrystalButton
              size="sm"
              variant={pairCount === 6 ? 'amber' : 'secondary'}
              onClick={() => resetDeck(6)}
            >
              4×3 (12)
            </CrystalButton>
            <CrystalButton
              size="sm"
              variant={pairCount === 8 ? 'amber' : 'secondary'}
              onClick={() => resetDeck(8)}
            >
              4×4 (16)
            </CrystalButton>
          </div>
        </div>
      </aside>
    </div>
  );
}

import { useCallback, useEffect, useState } from 'react';
import {
  Anchor,
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
import {
  playErrorSound,
  playMoveSound,
  playScoreSound,
  playWinSound,
  triggerHapticFeedback,
} from '../../utils/soundEffects';

const CARD_PAIRS = [
  {
    Icon: Flame,
    label: 'FEUER',
    openBg: 'from-[#FFF1F2] to-[#FFE4E6]',
    openBorder: 'border-[#F43F5E]',
    iconColor: 'text-[#E11D48]',
  },
  {
    Icon: Crown,
    label: 'KRONE',
    openBg: 'from-[#FFFBEB] to-[#FEF3C7]',
    openBorder: 'border-[#F59E0B]',
    iconColor: 'text-[#D97706]',
  },
  {
    Icon: Gem,
    label: 'JUWEL',
    openBg: 'from-[#ECFDF5] to-[#D1FAE5]',
    openBorder: 'border-[#10B981]',
    iconColor: 'text-[#059669]',
  },
  {
    Icon: Rocket,
    label: 'RAKETE',
    openBg: 'from-[#ECFEFF] to-[#CFFAFE]',
    openBorder: 'border-[#06B6D4]',
    iconColor: 'text-[#0891B2]',
  },
  {
    Icon: Moon,
    label: 'MOND',
    openBg: 'from-[#F5F3FF] to-[#EDE9FE]',
    openBorder: 'border-[#8B5CF6]',
    iconColor: 'text-[#7C3AED]',
  },
  {
    Icon: Anchor,
    label: 'ANKER',
    openBg: 'from-[#EFF6FF] to-[#DBEAFE]',
    openBorder: 'border-[#3B82F6]',
    iconColor: 'text-[#2563EB]',
  },
  {
    Icon: Zap,
    label: 'BLITZ',
    openBg: 'from-[#FEFCE8] to-[#FEF08A]',
    openBorder: 'border-[#EAB308]',
    iconColor: 'text-[#CA8A04]',
  },
  {
    Icon: Shield,
    label: 'SCHILD',
    openBg: 'from-[#FDF2F8] to-[#FCE7F3]',
    openBorder: 'border-[#EC4899]',
    iconColor: 'text-[#DB2777]',
  },
];

type DeckSize = 6 | 8; // 6 Paare (4x3) oder 8 Paare (4x4)

interface MemoryCard {
  uid: number;
  pairId: number;
  matched: boolean;
}

function createShuffledDeck(pairCount: DeckSize): MemoryCard[] {
  const pairs = Array.from({ length: pairCount }, (_, idx) => [idx, idx]).flat();
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
      triggerHapticFeedback([20, 40, 30]);
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
    triggerHapticFeedback(10);
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
        triggerHapticFeedback([15, 25]);

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
    <div className="flex h-full w-full max-w-5xl flex-1 min-h-0 flex-col items-center justify-center gap-2 sm:gap-3.5 px-1 sm:px-3 select-none">
      {/* INTEGRIERTE ARCANE-VAULT HUD-LEISTE (direkt über dem Kartentisch) */}
      <div className="flex flex-wrap items-center justify-between gap-2 w-full max-w-[min(95vw,44rem)] landscape:max-w-[min(80vw,40rem)] px-3 sm:px-4 py-2 bg-[#1E1B4B]/95 border-[3px] border-[#8B5CF6] shadow-[0_8px_20px_rgba(0,0,0,0.45)] text-xs sm:text-sm font-arcade uppercase text-[#EDE9FE] shrink-0">
        <div className="flex items-center gap-3 sm:gap-4">
          <span className="inline-flex items-center gap-1">
            PAARE: <strong className="text-[#FBBF24]">{matchedCount}/{pairCount}</strong>
          </span>
          <span className="inline-flex items-center gap-1">
            ZÜGE: <strong className="text-white">{moves}</strong>
          </span>
          <span className="inline-flex items-center gap-1">
            PKT: <strong className="text-[#34D399]">{score}</strong>
          </span>
          {streak >= 2 && (
            <span className="bg-gradient-to-r from-[#F59E0B] to-[#EA580C] text-white px-2.5 py-0.5 text-[11px] border border-[#FEF3C7] shadow-[0_0_12px_rgba(245,158,11,0.6)] animate-bounce">
              {streak}x KOMBO 🔥
            </span>
          )}
        </div>

        {/* Feldgröße-Wahl */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => resetDeck(6)}
            className={`px-2.5 py-1 text-[11px] font-arcade uppercase border-2 transition-all cursor-pointer active:scale-95 ${
              pairCount === 6
                ? 'bg-[#7C3AED] text-white border-[#DDD6FE] shadow-[0_0_10px_rgba(139,92,246,0.5)]'
                : 'bg-[#0F172A]/80 text-[#C4B5FD] border-[#4C1D95] hover:bg-[#2E1065]'
            }`}
          >
            4×3 (12)
          </button>
          <button
            type="button"
            onClick={() => resetDeck(8)}
            className={`px-2.5 py-1 text-[11px] font-arcade uppercase border-2 transition-all cursor-pointer active:scale-95 ${
              pairCount === 8
                ? 'bg-[#7C3AED] text-white border-[#DDD6FE] shadow-[0_0_10px_rgba(139,92,246,0.5)]'
                : 'bg-[#0F172A]/80 text-[#C4B5FD] border-[#4C1D95] hover:bg-[#2E1065]'
            }`}
          >
            4×4 (16)
          </button>
        </div>
      </div>

      {/* GROSSFLÄCHIGER ARCANE-KARTENTISCH */}
      <div className="flex-1 min-h-0 w-full flex items-center justify-center">
        <div
          className={`grid grid-cols-4 gap-2 sm:gap-3.5 landscape:gap-2 p-3 sm:p-5 landscape:p-2.5 bg-gradient-to-br from-[#1E1B4B] via-[#17153B] to-[#0F0C24] border-[4px] border-[#A78BFA] shadow-[inset_0_0_24px_rgba(139,92,246,0.25),0_16px_36px_rgba(0,0,0,0.65)] w-full ${
            isFourByFour
              ? 'max-w-[min(94vw,calc(100dvh-9.2rem),37rem)] landscape:max-w-[min(64vw,calc(100dvh-5.6rem),31rem)] aspect-square'
              : 'max-w-[min(95vw,calc((100dvh-9.2rem)*1.33),45rem)] landscape:max-w-[min(74vw,calc((100dvh-5.6rem)*1.33),38rem)] aspect-[4/3]'
          }`}
        >
          {cards.map((card) => {
            const isOpen = card.matched || flipped.includes(card.uid);
            const isMismatch = mismatchPair.includes(card.uid);
            const pairTheme = CARD_PAIRS[card.pairId] || CARD_PAIRS[0];
            const Icon = pairTheme.Icon;

            return (
              <button
                key={card.uid}
                type="button"
                onClick={() => handleCardClick(card.uid)}
                className={`group relative flex flex-col items-center justify-center gap-1 transition-all duration-200 cursor-pointer active:scale-95 border-[3px] overflow-hidden ${
                  card.matched
                    ? 'bg-gradient-to-br from-[#059669] to-[#047857] text-white border-[#6EE7B7] shadow-[0_0_16px_rgba(16,185,129,0.5)] scale-[0.98]'
                    : isMismatch
                      ? 'bg-gradient-to-br from-[#FFE4E6] to-[#FECDD3] text-[#E11D48] border-[#F43F5E] screen-shake'
                      : isOpen
                        ? `bg-gradient-to-br ${pairTheme.openBg} ${pairTheme.openBorder} shadow-[0_6px_16px_rgba(0,0,0,0.35)] scale-[1.02]`
                        : 'bg-gradient-to-br from-[#4C1D95] via-[#3B0764] to-[#2E1065] hover:from-[#5B21B6] hover:to-[#3B0764] text-white border-[#C4B5FD]/80 shadow-[inset_0_2px_0_rgba(255,255,255,0.22),0_5px_0_rgba(15,12,36,0.75)] hover:-translate-y-0.5'
                }`}
              >
                {/* Edler Diagonal-Glanz */}
                <div
                  className="pointer-events-none absolute inset-0 bg-white/10"
                  style={{ clipPath: 'polygon(0 0, 58% 0, 32% 100%, 0 100%)' }}
                />

                {isOpen ? (
                  <>
                    <Icon
                      className={`relative z-10 h-8 w-8 sm:h-11 sm:w-11 md:h-12 md:w-12 landscape:h-7 landscape:w-7 transition-transform duration-200 scale-110 ${
                        card.matched
                          ? 'text-white drop-shadow-[0_2px_0_rgba(6,78,59,0.75)]'
                          : isMismatch
                            ? 'text-[#E11D48]'
                            : pairTheme.iconColor
                      }`}
                    />
                    <span
                      className={`relative z-10 hidden sm:inline font-arcade text-[10px] tracking-wider uppercase ${
                        card.matched
                          ? 'text-[#D1FAE5]'
                          : isMismatch
                            ? 'text-[#9F1239]'
                            : 'text-[#334155]'
                      }`}
                    >
                      {pairTheme.label}
                    </span>
                  </>
                ) : (
                  <div className="relative z-10 flex h-9 w-9 sm:h-12 sm:w-12 landscape:h-8 landscape:w-8 items-center justify-center rounded-full border-2 border-[#FDE68A]/45 bg-[#1E1B4B]/60 transition-transform group-hover:scale-110">
                    <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-[#FDE68A]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

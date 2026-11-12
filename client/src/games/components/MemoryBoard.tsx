import { useEffect, useState } from 'react';
import {
  Anchor,
  Crown,
  Flame,
  Gem,
  Moon,
  Rocket,
  Sparkles,
} from 'lucide-react';
import type { GameRendererProps } from '../types';
import { getGameTheme } from '../../styles/uiTokens';

const CARD_ICONS = [Flame, Crown, Gem, Rocket, Moon, Anchor];

interface MemoryCard {
  uid: number;
  pairId: number;
  matched: boolean;
}

function createShuffledDeck(): MemoryCard[] {
  const pairs = CARD_ICONS.flatMap((_, idx) => [idx, idx]);
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }
  return pairs.map((pairId, uid) => ({ uid, pairId, matched: false }));
}

export function MemoryBoard({
  gameId = 'memory',
  isGameOver,
  disabled,
  onMove,
}: GameRendererProps) {
  const theme = getGameTheme(gameId);
  const [cards, setCards] = useState<MemoryCard[]>(() => createShuffledDeck());
  const [flipped, setFlipped] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [locked, setLocked] = useState(false);

  const matchedCount = cards.filter((c) => c.matched).length / 2;

  useEffect(() => {
    if (matchedCount === CARD_ICONS.length && !isGameOver) {
      const score = Math.max(100, 1000 - moves * 35);
      const timer = setTimeout(() => {
        onMove({
          score,
          isAbsolute: true,
          finish: true,
          label: `${score} Pkt (${moves} Züge)`,
        });
      }, 320);
      return () => clearTimeout(timer);
    }
  }, [matchedCount, moves, isGameOver, onMove]);

  const handleCardClick = (uid: number) => {
    if (locked || isGameOver || disabled) return;
    const card = cards.find((c) => c.uid === uid);
    if (!card || card.matched || flipped.includes(uid)) return;

    const nextFlipped = [...flipped, uid];
    setFlipped(nextFlipped);

    if (nextFlipped.length === 2) {
      const nextMoves = moves + 1;
      setMoves(nextMoves);
      const [firstUid, secondUid] = nextFlipped;
      const first = cards.find((c) => c.uid === firstUid)!;
      const second = cards.find((c) => c.uid === secondUid)!;

      if (first.pairId === second.pairId) {
        setCards((prev) =>
          prev.map((c) =>
            c.uid === firstUid || c.uid === secondUid ? { ...c, matched: true } : c
          )
        );
        setFlipped([]);
      } else {
        setLocked(true);
        setTimeout(() => {
          setFlipped([]);
          setLocked(false);
        }, 600);
      }
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-xs sm:max-w-sm landscape:max-w-xl landscape:grid landscape:grid-cols-[auto_11rem] landscape:items-center landscape:justify-center landscape:gap-5 gap-2.5 select-none">
      {/* Hochformat Info-Zeile */}
      <div className="flex landscape:hidden items-center justify-between w-full px-1 text-xs font-bold text-[#AEAEB2]">
        <span>Paare: <strong className="text-white">{matchedCount}/{CARD_ICONS.length}</strong></span>
        <span>Züge: <strong className={theme.accentText}>{moves}</strong></span>
      </div>

      {/* Karten-Raster (4x3 -> skaliert im Querformat an verfügbare Höhe) */}
      <div className="grid grid-cols-4 gap-2 sm:gap-2.5 w-full landscape:w-[min(56vw,calc((100dvh-5.2rem)*1.33),25rem)]">
        {cards.map((card) => {
          const isOpen = card.matched || flipped.includes(card.uid);
          const Icon = CARD_ICONS[card.pairId];

          return (
            <button
              key={card.uid}
              type="button"
              onClick={() => handleCardClick(card.uid)}
              className={`aspect-square rounded-2xl flex items-center justify-center transition-all duration-200 cursor-pointer active:scale-95 ${
                card.matched
                  ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/50'
                  : isOpen
                  ? `${theme.activeSurface} ring-2 text-white scale-[1.03]`
                  : `bg-[#161620]/90 hover:bg-[#1E1E2B] ring-1 ring-white/12 ${theme.hoverRing}`
              }`}
            >
              {isOpen ? (
                <Icon className={`h-6 w-6 sm:h-7 sm:w-7 ${card.matched ? 'text-emerald-300' : theme.accentIcon}`} />
              ) : (
                <Sparkles className="h-4 w-4 text-white/20" />
              )}
            </button>
          );
        })}
      </div>

      {/* Rechte Seitenleiste im Querformat */}
      <div className="hidden landscape:flex flex-col gap-2.5 w-full">
        <div className="flex flex-col items-center rounded-2xl bg-white/[0.04] px-3 py-3 ring-1 ring-white/10 text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8E8E93]">Paare</span>
          <strong className="text-2xl font-black text-white tabular-nums">
            {matchedCount}/{CARD_ICONS.length}
          </strong>
        </div>

        <div className="flex flex-col items-center rounded-2xl bg-white/[0.04] px-3 py-3 ring-1 ring-white/10 text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8E8E93]">Züge</span>
          <strong className={`text-2xl font-black tabular-nums ${theme.accentText}`}>{moves}</strong>
        </div>
      </div>
    </div>
  );
}

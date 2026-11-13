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
import { CrystalReadout } from '../../components/CrystalUI';

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
  isGameOver,
  disabled,
  onMove,
}: GameRendererProps) {
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
      <div className="flex landscape:hidden items-center justify-between w-full px-2 py-1.5 bg-[#9CE0FA] border-2 border-[#17608E] text-xs font-arcade uppercase text-[#15608E]">
        <span>PAARE: <strong className="text-[#0E486C]">{matchedCount}/{CARD_ICONS.length}</strong></span>
        <span>ZÜGE: <strong className="text-[#0E486C]">{moves}</strong></span>
      </div>

      {/* Karten-Raster (4x3 -> skaliert im Querformat an verfügbare Höhe) */}
      <div className="grid grid-cols-4 gap-2 sm:gap-2.5 p-3 bg-[#9CE0FA] border-[4px] border-[#17608E] shadow-[inset_0_0_0_4px_#66C4EE,0_8px_0_rgba(14,62,96,0.38)] w-full landscape:w-[min(56vw,calc((100dvh-5.2rem)*1.33),25rem)]">
        {cards.map((card) => {
          const isOpen = card.matched || flipped.includes(card.uid);
          const Icon = CARD_ICONS[card.pairId];

          return (
            <button
              key={card.uid}
              type="button"
              onClick={() => handleCardClick(card.uid)}
              className={`relative aspect-square flex items-center justify-center transition-all duration-200 cursor-pointer active:scale-95 border-[3px] overflow-hidden ${
                card.matched
                  ? 'bg-[#F6B969] text-white border-[#C48232] shadow-[inset_0_0_0_2px_#FDE0A6]'
                  : isOpen
                  ? 'bg-[#DDF6FF] text-[#15608E] border-[#17608E] shadow-[inset_0_0_0_2px_#FFFFFF] scale-[1.03]'
                  : 'bg-[#2B9FD6] hover:bg-[#38ACE0] text-white border-[#17608E] shadow-[inset_0_0_0_2px_#6BC8F4]'
              }`}
              style={{
                clipPath: 'polygon(0% 4%, 100% 0%, 97% 96%, 3% 100%)',
              }}
            >
              <div
                className="pointer-events-none absolute inset-0 bg-white/15"
                style={{ clipPath: 'polygon(0 0, 58% 0, 32% 100%, 0 100%)' }}
              />
              {isOpen ? (
                <Icon className={`relative z-10 h-6 w-6 sm:h-7 sm:w-7 ${card.matched ? 'text-white drop-shadow-[0_2px_0_rgba(140,78,12,0.5)]' : 'text-[#15608E]'}`} />
              ) : (
                <Sparkles className="relative z-10 h-5 w-5 text-[#B6ECFD]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Rechte Seitenleiste im Querformat */}
      <div className="hidden landscape:flex flex-col gap-3 w-full bg-[#9CE0FA] border-[3px] border-[#17608E] shadow-[inset_0_0_0_3px_#66C4EE] p-3">
        <CrystalReadout label="PAARE" value={`${matchedCount}/${CARD_ICONS.length}`} />
        <CrystalReadout label="ZÜGE" value={moves} />
      </div>
    </div>
  );
}

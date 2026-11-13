import { type Game } from '../data/games';
import { CrystalButton, CrystalPanel, CrystalReadout } from './CrystalUI';

interface GameCardProps {
  game: Game;
  isActive: boolean;
  isUnlocked: boolean;
  starsEarned: number;
  onSelect: () => void;
  onPlay: () => void;
  onUnlockRequest: () => void;
}

const GAME_SCORES: Record<string, { score: string; reward: string; stars: 1 | 2 | 3 }> = {
  memory: { score: '25873', reward: '63581', stars: 3 },
  connect: { score: '19420', reward: '48200', stars: 2 },
  reaction: { score: '31050', reward: '75400', stars: 3 },
  'tic-tac-toe': { score: '14890', reward: '32150', stars: 2 },
  snake: { score: '28640', reward: '59300', stars: 3 },
  '2048': { score: '42048', reward: '88500', stars: 3 },
  minesweeper: { score: '17320', reward: '41900', stars: 2 },
  'space-dodge': { score: '36910', reward: '69800', stars: 3 },
  'draw-and-guess': { score: '22500', reward: '54000', stars: 3 },
};

export function GameCard({
  game,
  isActive,
  isUnlocked,
  onSelect,
  onPlay,
}: GameCardProps) {
  const stats = GAME_SCORES[game.id] ?? { score: '25873', reward: '63581', stars: 2 };

  const handleCardClick = () => {
    onSelect();
    onPlay();
  };

  return (
    <article
      onClick={handleCardClick}
      className={`group relative shrink-0 cursor-pointer select-none transition-transform duration-200 ${
        isActive ? 'scale-[1.03] z-20' : 'hover:scale-[1.015] z-10'
      } w-[215px] sm:w-[245px] md:w-[265px]`}
    >
      {/* 1:1 Umsetzung des "LEVEL 16" Kristall-Fensters aus dem Referenzbild */}
      <CrystalPanel
        stars={isUnlocked ? stats.stars : 2}
        contentClassName="pt-6 pb-5 px-4 sm:px-5 gap-2.5"
      >
        {/* Oberer Titel im exakt gleichen dunkelblauen Versalien-Stil wie "LEVEL 16" */}
        <h3 className="font-arcade text-center text-xl sm:text-2xl tracking-wider text-[#15608E] uppercase leading-tight">
          {game.title}
        </h3>

        {/* Untertitel / Kategorie */}
        <span className="font-arcade -mt-1.5 text-[11px] sm:text-xs tracking-widest text-[#17689A]/85 uppercase">
          {game.category} • {game.players}
        </span>

        {/* SCORE-Anzeige wie "SCORE / 25873" im Referenzbild */}
        <CrystalReadout label="SCORE" value={stats.score} className="mt-1 w-full" />

        {/* REWARD-Anzeige wie "REWARD / 63581" im Referenzbild */}
        <CrystalReadout label="REWARD" value={stats.reward} className="mt-0.5 w-full" />

        {/* Unterer abgeschrägter "PLAY" / "OK" Kristall-Button */}
        <div className="mt-2 w-full flex justify-center">
          <CrystalButton
            size="md"
            tilt="left"
            onClick={(e) => {
              e.stopPropagation();
              handleCardClick();
            }}
            className="min-w-[125px] sm:min-w-[140px]"
          >
            PLAY
          </CrystalButton>
        </div>
      </CrystalPanel>
    </article>
  );
}

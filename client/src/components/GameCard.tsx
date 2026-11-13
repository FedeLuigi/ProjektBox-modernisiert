import { type Game } from '../data/games';
import { formatSoloScore, getSoloHighscore } from '../utils/soloScores';
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

export function GameCard({
  game,
  isActive,
  isUnlocked,
  onSelect,
  onPlay,
}: GameCardProps) {
  const savedBest = getSoloHighscore(game.id);
  const scoreDisplay =
    savedBest !== null ? formatSoloScore(game.id, savedBest) : String(game.defaultScore);
  const rewardDisplay = String(game.defaultReward);
  const starCount: 1 | 2 | 3 = savedBest !== null ? 3 : game.starsEarned >= 25 ? 3 : 2;

  const handleCardClick = () => {
    onSelect();
    onPlay();
  };

  return (
    <article
      onClick={handleCardClick}
      className={`group relative shrink-0 cursor-pointer select-none transition-transform duration-200 pt-2 ${
        isActive ? 'scale-[1.02] z-20' : 'hover:scale-[1.015] z-10'
      } w-[205px] sm:w-[240px] md:w-[260px] landscape:w-[190px]`}
    >
      {/* 1:1 Umsetzung des "LEVEL 16" Kristall-Fensters aus dem Referenzbild */}
      <CrystalPanel
        stars={isUnlocked ? starCount : 2}
        contentClassName="pt-5 pb-4 px-3.5 sm:px-5 landscape:pt-3.5 landscape:pb-3 landscape:px-3 gap-2 landscape:gap-1"
      >
        {/* Oberer Titel im dunkelblauen Versalien-Stil wie "LEVEL 16" */}
        <h3 className="font-arcade text-center text-lg sm:text-2xl landscape:text-base tracking-wider text-[#15608E] uppercase leading-tight truncate w-full">
          {game.title}
        </h3>

        {/* Untertitel / Kategorie */}
        <span className="font-arcade -mt-1 text-[10px] sm:text-xs landscape:text-[10px] tracking-widest text-[#17689A]/85 uppercase truncate w-full text-center">
          {game.category} • {game.players}
        </span>

        {/* SCORE-Anzeige wie "SCORE / 25873" im Referenzbild */}
        <CrystalReadout label="SCORE" value={scoreDisplay} className="mt-0.5 w-full" />

        {/* REWARD-Anzeige wie "REWARD / 63581" im Referenzbild (im sehr flachen Smartphone-Querformat ausgeblendet für perfekte Höhe) */}
        <CrystalReadout
          label="REWARD"
          value={rewardDisplay}
          className="mt-0.5 w-full landscape:hidden"
        />

        {/* Unterer abgeschrägter "PLAY" / "OK" Kristall-Button */}
        <div className="mt-1.5 landscape:mt-1 w-full flex justify-center">
          <CrystalButton
            size="md"
            tilt="left"
            onClick={(e) => {
              e.stopPropagation();
              handleCardClick();
            }}
            className="min-w-[115px] sm:min-w-[135px] landscape:min-w-[105px]"
          >
            PLAY
          </CrystalButton>
        </div>
      </CrystalPanel>
    </article>
  );
}

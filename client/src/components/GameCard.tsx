import { type Game } from '../data/games';
import { formatSoloScore, getSoloHighscore } from '../utils/soloScores';
import {
  ACCENT_PALETTES,
  CrystalButton,
  CrystalPanel,
  CrystalReadout,
} from './CrystalUI';

interface GameCardProps {
  game: Game;
  isActive: boolean;
  onSelect: () => void;
  onPlay: () => void;
}

export function GameCard({
  game,
  isActive,
  onSelect,
  onPlay,
}: GameCardProps) {
  const savedBest = getSoloHighscore(game.id);
  const scoreDisplay =
    savedBest !== null ? formatSoloScore(game.id, savedBest) : String(game.defaultScore);
  const rewardDisplay = String(game.defaultReward);
  const Icon = game.icon;
  const palette = ACCENT_PALETTES[game.accent];

  const handleCardClick = () => {
    onSelect();
    onPlay();
  };

  return (
    <article
      onClick={handleCardClick}
      className={`group relative shrink-0 cursor-pointer select-none transition-all duration-200 pt-1 ${
        isActive
          ? 'scale-[1.03] z-20 drop-shadow-[0_14px_28px_rgba(0,0,0,0.45)]'
          : 'hover:scale-[1.015] opacity-95 hover:opacity-100 z-10'
      } w-[205px] sm:w-[240px] md:w-[260px] landscape:w-[190px]`}
    >
      <CrystalPanel
        accent={game.accent}
        contentClassName="pt-4 pb-4 px-3.5 sm:px-5 landscape:pt-3 landscape:pb-2.5 landscape:px-3 gap-2 landscape:gap-1"
      >
        {/* Individuelles Spiel-Emblem + Kategorie-Badge für sofortige optische Unterscheidbarkeit */}
        <div className="flex items-center justify-center gap-2 w-full">
          <div
            style={{
              backgroundColor: palette.bg,
              borderColor: palette.outer,
              clipPath: 'polygon(6% 0%, 100% 6%, 94% 100%, 0% 94%)',
            }}
            className="flex h-8 w-8 sm:h-9 sm:w-9 landscape:h-7 landscape:w-7 shrink-0 items-center justify-center border-2 text-white shadow-sm"
          >
            <Icon className="h-4 w-4 sm:h-5 sm:w-5 landscape:h-3.5 landscape:w-3.5 stroke-[2.4]" />
          </div>

          <span
            style={{
              backgroundColor: palette.badgeBg,
              color: palette.badgeText,
              borderColor: palette.badgeBorder,
            }}
            className="font-arcade px-2.5 py-0.5 text-[10px] sm:text-xs landscape:text-[9px] tracking-wider uppercase border truncate"
          >
            {game.category} • {game.players}
          </span>
        </div>

        {/* Spiel-Titel */}
        <h3 className="font-arcade text-center text-lg sm:text-2xl landscape:text-base tracking-wider text-[#1E293B] uppercase leading-tight truncate w-full">
          {game.title}
        </h3>

        {/* SCORE-Anzeige im kontrastreichen Schiefer-Kristall */}
        <CrystalReadout
          label="SCORE"
          value={scoreDisplay}
          variant="neutral"
          className="mt-0.5 w-full"
        />

        {/* REWARD-Anzeige im warmen Gold-Kristall (im sehr flachen Smartphone-Querformat ausgeblendet) */}
        <CrystalReadout
          label="REWARD"
          value={rewardDisplay}
          variant="gold"
          className="mt-0.5 w-full landscape:hidden"
        />

        {/* Unterer abgeschrägter "PLAY" Button in der jeweiligen Spiel-Akzentfarbe */}
        <div className="mt-1.5 landscape:mt-1 w-full flex justify-center">
          <CrystalButton
            size="md"
            tilt="left"
            variant={game.accent}
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

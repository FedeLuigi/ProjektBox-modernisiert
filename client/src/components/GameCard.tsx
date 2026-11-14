import { Heart, Tv } from 'lucide-react';
import { type Game } from '../data/games';
import {
  ACCENT_PALETTES,
  CrystalButton,
  CrystalIconButton,
  CrystalPanel,
  CrystalReadout,
} from './CrystalUI';
import { GamePreviewArtwork } from './GamePreviewArtwork';

interface GameCardProps {
  game: Game;
  isActive: boolean;
  isFavorite: boolean;
  lastPlayedAt?: number;
  onSelect: () => void;
  onPlay: (tvMode?: boolean) => void;
  onToggleFavorite: () => void;
}

export function GameCard({
  game,
  isActive,
  isFavorite,
  lastPlayedAt,
  onSelect,
  onPlay,
  onToggleFavorite,
}: GameCardProps) {
  const Icon = game.icon;
  const palette = ACCENT_PALETTES[game.accent];

  const handleCardClick = () => {
    onSelect();
    onPlay(false);
  };

  return (
    <article
      onClick={handleCardClick}
      className={`group relative shrink-0 cursor-pointer select-none transition-all duration-200 pt-1 ${
        isActive
          ? 'scale-[1.02] z-20 drop-shadow-[0_14px_28px_rgba(0,0,0,0.45)]'
          : 'hover:scale-[1.01] opacity-95 hover:opacity-100 z-10'
      } w-[265px] sm:w-[300px] md:w-[320px] landscape:w-[240px]`}
    >
      <CrystalPanel
        accent={game.accent}
        contentClassName="pt-3.5 pb-4 px-3.5 sm:px-4 landscape:pt-2.5 landscape:pb-2.5 landscape:px-3 gap-2 landscape:gap-1.5"
      >
        {/* 1. OBERE ZEILE: Spiel-Emblem + Spieltyp-Badge + Favoriten-Kristall-Button */}
        <div className="flex items-center justify-between gap-2 w-full">
          <div className="flex items-center gap-2 min-w-0">
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
              {game.gameTypeLabel} • {game.category}
            </span>
          </div>

          <CrystalIconButton
            size="sm"
            tilt="right"
            variant={isFavorite ? 'rose' : 'neutral'}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            title={isFavorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
            aria-label={isFavorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
          >
            <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
          </CrystalIconButton>
        </div>

        {/* 2. GROSSE AUSSAGEKRÄFTIGE SPIELVORSCHAU IM FACETTIERTEN KRISTALL-RAHMEN */}
        <div
          style={{
            clipPath: 'polygon(1% 3%, 99% 0%, 98% 97%, 0% 100%)',
          }}
          className="relative w-full h-32 sm:h-36 landscape:h-24 bg-[#0F172A] p-[3px] shadow-[0_4px_0_rgba(15,23,42,0.25)]"
        >
          <div
            style={{
              clipPath: 'polygon(1% 3%, 99% 0%, 98% 97%, 0% 100%)',
            }}
            className="relative h-full w-full overflow-hidden"
          >
            <GamePreviewArtwork
              gameId={game.id}
              variant="card"
              className="h-full w-full transition-transform duration-300 group-hover:scale-105"
            />

            {lastPlayedAt && (
              <span
                style={{
                  clipPath: 'polygon(0% 8%, 100% 0%, 96% 94%, 3% 100%)',
                }}
                className="font-arcade absolute bottom-1.5 right-2 bg-[#059669] border border-[#6EE7B7] px-2 py-0.5 text-[9px] tracking-wider text-white uppercase shadow"
              >
                ZULETZT
              </span>
            )}
          </div>
        </div>

        {/* 3. SPIEL-TITEL & BESCHREIBUNG AUF EINEN BLICK */}
        <div className="w-full text-center">
          <h3 className="font-arcade text-lg sm:text-2xl landscape:text-base tracking-wider text-[#1E293B] uppercase leading-tight truncate w-full">
            {game.title}
          </h3>
          <p className="mt-1 text-xs leading-snug font-medium text-[#334155] line-clamp-2 landscape:line-clamp-1 px-1">
            {game.description}
          </p>
        </div>

        {/* 4. SPIELERZAHL & SPIELDAUER IM KONTRASTREICHEN KRISTALL-READOUT */}
        <div className="grid grid-cols-2 gap-2 w-full mt-0.5">
          <CrystalReadout
            label="SPIELER"
            value={game.players.toUpperCase()}
            variant="neutral"
            className="w-full"
          />
          <CrystalReadout
            label="DAUER"
            value={game.duration.toUpperCase()}
            variant="gold"
            className="w-full"
          />
        </div>

        {/* 5. UNTERE ABGESCHRÄGTE CRYSTAL-BUTTONS (PLAY & TV-MODUS) */}
        <div className="mt-1 landscape:mt-0.5 flex w-full items-center justify-center gap-2">
          <CrystalButton
            size="md"
            tilt="left"
            variant={game.accent}
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
              onPlay(false);
            }}
            className="flex-1"
          >
            PLAY
          </CrystalButton>

          {game.supportsTv && (
            <CrystalButton
              size="sm"
              tilt="right"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                onSelect();
                onPlay(true);
              }}
              title="Als TV-Party auf großem Bildschirm starten"
            >
              <Tv className="h-4 w-4" />
              <span>TV</span>
            </CrystalButton>
          )}
        </div>
      </CrystalPanel>
    </article>
  );
}

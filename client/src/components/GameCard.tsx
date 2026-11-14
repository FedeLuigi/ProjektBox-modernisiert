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
  isLastPlayed?: boolean;
  onSelect: () => void;
  onPlay: (tvMode?: boolean) => void;
  onToggleFavorite: () => void;
}

export function GameCard({
  game,
  isActive,
  isFavorite,
  isLastPlayed = false,
  onSelect,
  onPlay,
  onToggleFavorite,
}: GameCardProps) {
  const palette = ACCENT_PALETTES[game.accent];

  const handleCardClick = () => {
    if (!isActive) {
      onSelect();
    } else {
      onPlay(false);
    }
  };

  return (
    <article
      onClick={handleCardClick}
      className={`tablet-carousel-card widescreen-carousel-card landscape-horizontal-card group relative shrink-0 snap-center cursor-pointer select-none transition-all duration-300 pt-1 ${
        isActive
          ? 'scale-100 sm:scale-[1.04] sm:-translate-y-1 xl:-translate-y-2 z-20 opacity-100 saturate-100 drop-shadow-[0_16px_28px_rgba(0,0,0,0.55)] sm:drop-shadow-[0_20px_36px_rgba(0,0,0,0.58)] xl:drop-shadow-[0_24px_44px_rgba(0,0,0,0.65)]'
          : 'scale-[0.93] z-10 opacity-85 saturate-[0.8] hover:opacity-95 hover:saturate-100 hover:scale-[0.95] drop-shadow-[0_8px_18px_rgba(0,0,0,0.3)]'
      } w-[83vw] max-w-[320px] sm:w-[300px] sm:max-w-none md:w-[315px] xl:w-[395px] 2xl:w-[415px] landscape:w-[420px] landscape:max-w-[450px]`}
    >
      <CrystalPanel
        accent={game.accent}
        contentClassName="pt-3 pb-3.5 sm:pt-3.5 sm:pb-4 xl:pt-4 xl:pb-5 px-3.5 sm:px-4 xl:px-5 landscape:p-2.5 gap-1.5 sm:gap-2 xl:gap-2.5 landscape:gap-0"
      >
        {/* ═══ 1. SMARTPHONE QUERFORMAT (LANDSCAPE): HORIZONTALES 2-SPALTEN-LAYOUT ═══ */}
        <div className="hidden landscape:flex flex-row items-stretch w-full gap-3 h-full">
          {/* Links: ca. 42% der Kartenbreite - Spiel-Vorschaubild inkl. Kategorie-Tag & Favoriten-Herz */}
          <div className="relative w-[42%] shrink-0 flex flex-col justify-between">
            <div
              style={{
                clipPath: 'polygon(1% 3%, 99% 0%, 98% 97%, 0% 100%)',
              }}
              className="relative w-full h-full min-h-[145px] bg-[#0F172A] p-[2.5px] shadow-[0_3px_0_rgba(15,23,42,0.25)]"
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
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />

                {/* Kategorie-Tag links oben im Bild */}
                <div className="absolute top-1.5 left-1.5 z-10">
                  <span
                    style={{
                      backgroundColor: palette.badgeBg,
                      color: palette.badgeText,
                      borderColor: palette.badgeBorder,
                    }}
                    className="font-arcade px-1.5 py-0.5 text-[9px] tracking-wider uppercase border shadow-sm"
                  >
                    {game.category}
                  </span>
                </div>

                {/* Favoriten-Herz rechts oben im Bild */}
                <div className="absolute top-1.5 right-1.5 z-10">
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
                    className="h-7 w-7 p-[1px]"
                  >
                    <Heart className={`h-3.5 w-3.5 ${isFavorite ? 'fill-current' : ''}`} />
                  </CrystalIconButton>
                </div>

                {isLastPlayed && (
                  <span
                    style={{
                      clipPath: 'polygon(0% 8%, 100% 0%, 96% 94%, 3% 100%)',
                    }}
                    className="font-arcade absolute bottom-1 right-1 bg-[#059669] border border-[#6EE7B7] px-1.5 py-0.2 text-[8px] tracking-wider text-white uppercase shadow"
                  >
                    ZULETZT
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Rechts: Spieltitel, darunter Badges (SPIELER & DAUER), ganz unten Buttons (PLAY & TV) */}
          <div className="flex flex-1 min-w-0 flex-col justify-between py-0.5">
            {/* Spieltitel */}
            <div className="w-full">
              <h3 className="font-arcade text-base sm:text-lg font-bold tracking-wider text-[#1E293B] uppercase leading-tight truncate">
                {game.title}
              </h3>
            </div>

            {/* Badges ("SPIELER" und "DAUER") kompakt nebeneinander */}
            <div className="grid grid-cols-2 gap-1.5 w-full my-auto">
              <CrystalReadout
                label="SPIELER"
                value={game.players.toUpperCase()}
                variant="neutral"
                className="w-full min-w-0 text-[11px]"
              />
              <CrystalReadout
                label="DAUER"
                value={game.duration.toUpperCase()}
                variant="gold"
                className="w-full min-w-0 text-[11px]"
              />
            </div>

            {/* Buttons PLAY & TV ganz unten */}
            <div className="flex w-full items-center gap-1.5 pt-0.5">
              <CrystalButton
                size="sm"
                tilt="left"
                variant={game.accent}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect();
                  onPlay(false);
                }}
                className="flex-1 h-8 text-xs font-bold"
              >
                PLAY
              </CrystalButton>

              {game.supportsTv && (
                <div className="group/tv relative inline-flex">
                  <CrystalButton
                    size="sm"
                    tilt="right"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect();
                      onPlay(true);
                    }}
                    title="Auf TV starten"
                    aria-label="Auf TV starten"
                    className="h-8 px-2 text-xs"
                  >
                    <Tv className="h-3.5 w-3.5" />
                    <span>TV</span>
                  </CrystalButton>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ═══ 2. STANDARDFALL (PORTRAIT & DESKTOP): VERTIKALER STACK ═══ */}
        <div className="flex landscape:hidden flex-col items-center w-full gap-1.5 sm:gap-2 xl:gap-2.5">
          {/* 1. OBERE ZEILE: Linksbündiges Kategorie-Tag + Favoriten-Herz-Button rechts */}
          <div className="flex items-center justify-between gap-2 w-full">
            <span
              style={{
                backgroundColor: palette.badgeBg,
                color: palette.badgeText,
                borderColor: palette.badgeBorder,
              }}
              className="font-arcade px-2.5 py-0.5 text-[10px] sm:text-xs tracking-wider uppercase border truncate"
            >
              {game.gameTypeLabel} • {game.category}
            </span>

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
            className="relative w-full h-28 sm:h-36 xl:h-44 bg-[#0F172A] p-[3px] shadow-[0_4px_0_rgba(15,23,42,0.25)]"
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

              {isLastPlayed && (
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

          {/* 3. SPIEL-TITEL & BESCHREIBUNG (max. 2 Zeilen ohne "..." Abschneiden) */}
          <div className="w-full text-center">
            <h3 className="font-arcade text-lg sm:text-2xl tracking-wider text-[#1E293B] uppercase leading-tight truncate w-full">
              {game.title}
            </h3>
            <p className="mt-1 min-h-[2.25rem] text-[11.5px] sm:text-xs leading-snug font-semibold text-[#334155] px-1">
              {game.description}
            </p>
          </div>

          {/* 4. SPIELERZAHL & SPIELDAUER IM KONTRASTREICHEN KRISTALL-READOUT (sauber getrennt ohne Überlappung) */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 w-full mt-0.5">
            <CrystalReadout
              label="SPIELER"
              value={game.players.toUpperCase()}
              variant="neutral"
              className="w-full min-w-0"
            />
            <CrystalReadout
              label="DAUER"
              value={game.duration.toUpperCase()}
              variant="gold"
              className="w-full min-w-0"
            />
          </div>

          {/* 5. UNTERE ABGESCHRÄGTE CRYSTAL-BUTTONS (PLAY & TV MIT HOVER-TOOLTIP) */}
          <div className="mt-1 flex w-full items-center justify-center gap-2">
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
              <div className="group/tv relative inline-flex">
                <CrystalButton
                  size="sm"
                  tilt="right"
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect();
                    onPlay(true);
                  }}
                  title="Auf TV starten"
                  aria-label="Auf TV starten"
                >
                  <Tv className="h-4 w-4" />
                  <span>TV</span>
                </CrystalButton>

                {/* Sichtbarer Comic-Arcade Hover-Tooltip zur klaren Abgrenzung vom "TV CODE"-Button */}
                <div
                  style={{
                    clipPath: 'polygon(0% 8%, 100% 0%, 97% 94%, 3% 100%)',
                  }}
                  className="pointer-events-none absolute -top-9 right-0 z-30 whitespace-nowrap bg-[#0F172A] border-2 border-[#F59E0B] px-2.5 py-1 font-arcade text-[10px] tracking-wider text-[#FDE68A] uppercase opacity-0 scale-95 group-hover/tv:opacity-100 group-hover/tv:scale-100 group-focus-within/tv:opacity-100 transition-all duration-150 shadow-lg"
                >
                  Auf TV starten
                </div>
              </div>
            )}
          </div>
        </div>
      </CrystalPanel>
    </article>
  );
}

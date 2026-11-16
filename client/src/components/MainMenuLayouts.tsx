import { Heart, Play, Tv } from 'lucide-react';
import { type Game } from '../data/games';
import {
  ACCENT_PALETTES,
  CrystalButton,
  CrystalIconButton,
  CrystalPanel,
  CrystalReadout,
} from './CrystalUI';
import { GamePreviewArtwork } from './GamePreviewArtwork';

interface LayoutCommonProps {
  games: Game[];
  activeGame: Game;
  favoriteIds: string[];
  lastPlayedGameId: string | null;
  onSelectGame: (gameId: string) => void;
  onLaunchGame: (game: Game, tvMode: boolean) => void;
  onToggleFavorite: (gameId: string) => void;
}

/**
 * Variante 2: ARCADE GRID
 * Zeigt alle verfügbaren Spiele gleichzeitig in einem klaren Mehrspalten-Raster.
 */
export function ArcadeGridLayout({
  games,
  activeGame,
  favoriteIds,
  lastPlayedGameId,
  onSelectGame,
  onLaunchGame,
  onToggleFavorite,
}: LayoutCommonProps) {
  return (
    <div className="no-scrollbar w-full flex-1 min-h-0 overflow-y-auto px-3 sm:px-1 py-1">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 pb-3">
        {games.map((game) => {
          const isFav = favoriteIds.includes(game.id);
          const isSelected = activeGame.id === game.id;
          const isLastPlayed = lastPlayedGameId === game.id;
          const palette = ACCENT_PALETTES[game.accent];

          return (
            <div
              key={game.id}
              onClick={() => onSelectGame(game.id)}
              className="cursor-pointer transition-transform hover:-translate-y-0.5"
            >
              <CrystalPanel
                accent={game.accent}
                className={`h-full ${isSelected ? 'ring-2 ring-[#FDE68A]/80' : ''}`}
                contentClassName="justify-between gap-2.5 p-3.5 sm:p-4"
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <span
                    style={{
                      backgroundColor: palette.badgeBg,
                      color: palette.badgeText,
                      borderColor: palette.badgeBorder,
                    }}
                    className="font-arcade border px-2 py-0.5 text-[10px] tracking-wider uppercase truncate"
                  >
                    {game.gameTypeLabel} • {game.category}
                  </span>

                  <CrystalIconButton
                    size="sm"
                    tilt="right"
                    variant={isFav ? 'rose' : 'neutral'}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(game.id);
                    }}
                    title={isFav ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
                    aria-label={isFav ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
                  >
                    <Heart className={`h-3.5 w-3.5 ${isFav ? 'fill-current' : ''}`} />
                  </CrystalIconButton>
                </div>

                <div
                  style={{ clipPath: 'polygon(1% 3%, 99% 0%, 98% 97%, 0% 100%)' }}
                  className="relative w-full h-28 sm:h-32 bg-[#0F172A] p-[3px] shadow-[0_3px_0_rgba(15,23,42,0.22)]"
                >
                  <div
                    style={{ clipPath: 'polygon(1% 3%, 99% 0%, 98% 97%, 0% 100%)' }}
                    className="relative h-full w-full overflow-hidden"
                  >
                    <GamePreviewArtwork gameId={game.id} variant="card" className="h-full w-full object-cover" />
                    {isLastPlayed && (
                      <span className="font-arcade absolute bottom-1.5 right-1.5 bg-[#059669] border border-[#ECFDF5] px-1.5 py-0.5 text-[9px] text-white uppercase">
                        ZULETZT
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-center text-center gap-0.5 w-full">
                  <h3 className="font-arcade text-base sm:text-lg tracking-wider text-[#0F172A] uppercase truncate w-full">
                    {game.title}
                  </h3>
                  <p className="text-[11px] sm:text-xs font-medium text-[#475569] line-clamp-2 min-h-[2rem]">
                    {game.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 w-full">
                  <CrystalReadout label="SPIELER" value={game.players.toUpperCase()} variant="neutral" />
                  <CrystalReadout label="DAUER" value={game.duration.toUpperCase()} variant="gold" />
                </div>

                <div className="flex w-full items-center gap-2 pt-0.5">
                  <CrystalButton
                    size="sm"
                    variant={game.accent}
                    tilt="left"
                    fullWidth
                    onClick={(e) => {
                      e.stopPropagation();
                      onLaunchGame(game, false);
                    }}
                    className="h-9 text-xs"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>PLAY</span>
                  </CrystalButton>

                  {game.supportsTv && (
                    <CrystalButton
                      size="sm"
                      variant="secondary"
                      tilt="right"
                      onClick={(e) => {
                        e.stopPropagation();
                        onLaunchGame(game, true);
                      }}
                      title="Im TV-Modus starten"
                      className="h-9 px-3 text-xs shrink-0"
                    >
                      <Tv className="h-3.5 w-3.5" />
                      <span>TV</span>
                    </CrystalButton>
                  )}
                </div>
              </CrystalPanel>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Variante 3: COMMAND CENTER
 * Split-View mit Spiel-Auswahlliste links und großer Hero-Bühne rechts.
 */
export function CommandCenterLayout({
  games,
  activeGame,
  favoriteIds,
  onSelectGame,
  onLaunchGame,
  onToggleFavorite,
}: LayoutCommonProps) {
  const palette = ACCENT_PALETTES[activeGame.accent];
  const isFav = favoriteIds.includes(activeGame.id);

  return (
    <div className="flex flex-1 min-h-0 w-full flex-col md:flex-row gap-3 sm:gap-4 px-3 sm:px-1 py-1">
      {/* Linke Seitenleiste: Kompakte Spiel-Liste */}
      <aside className="no-scrollbar flex md:flex-col w-full md:w-64 lg:w-72 shrink-0 gap-2 overflow-x-auto md:overflow-x-visible md:overflow-y-auto pb-1 md:pb-0">
        {games.map((game, idx) => {
          const selected = game.id === activeGame.id;
          const Icon = game.icon;
          const itemPalette = ACCENT_PALETTES[game.accent];

          return (
            <button
              key={game.id}
              type="button"
              onClick={() => onSelectGame(game.id)}
              style={{ clipPath: 'polygon(1% 3%, 99% 0%, 99% 97%, 1% 100%)' }}
              className={`flex shrink-0 md:w-full items-center gap-2.5 border-[3px] px-3 py-2 text-left transition-all cursor-pointer active:scale-[0.98] ${
                selected
                  ? 'bg-[#4F46E5] border-[#312E81] text-white shadow-[inset_0_2px_0_#A5B4FC,0_3px_0_rgba(15,23,42,0.28)]'
                  : 'bg-[#F8FAFC] hover:bg-[#FFFFFF] border-[#334155] text-[#1E293B] shadow-[inset_0_2px_0_#FFFFFF]'
              }`}
            >
              <div
                style={{ backgroundColor: selected ? '#312E81' : itemPalette.bg }}
                className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-[#0F172A]/40 text-white"
              >
                <Icon className="h-4 w-4 stroke-[2.3]" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-arcade text-xs sm:text-sm uppercase truncate">
                  {idx + 1}. {game.title}
                </span>
                <span
                  className={`font-arcade text-[10px] uppercase truncate ${
                    selected ? 'text-[#C7D2FE]' : 'text-[#64748B]'
                  }`}
                >
                  {game.players} • {game.duration}
                </span>
              </div>
            </button>
          );
        })}
      </aside>

      {/* Rechte Hero-Bühne */}
      <div className="flex flex-1 min-h-0 items-center justify-center">
        <CrystalPanel
          accent={activeGame.accent}
          className="w-full max-w-2xl"
          contentClassName="justify-between gap-3 sm:gap-4 p-4 sm:p-6"
        >
          <div className="flex w-full items-center justify-between gap-2">
            <span
              style={{
                backgroundColor: palette.badgeBg,
                color: palette.badgeText,
                borderColor: palette.badgeBorder,
              }}
              className="font-arcade border px-2.5 py-0.5 text-xs tracking-wider uppercase"
            >
              {activeGame.gameTypeLabel} • {activeGame.category}
            </span>

            <CrystalIconButton
              size="sm"
              tilt="right"
              variant={isFav ? 'rose' : 'neutral'}
              onClick={() => onToggleFavorite(activeGame.id)}
              title={isFav ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
              aria-label={isFav ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
            >
              <Heart className={`h-4 w-4 ${isFav ? 'fill-current' : ''}`} />
            </CrystalIconButton>
          </div>

          <div
            style={{ clipPath: 'polygon(1% 3%, 99% 0%, 98% 97%, 0% 100%)' }}
            className="relative w-full h-36 sm:h-48 bg-[#0F172A] p-[3px] shadow-[0_4px_0_rgba(15,23,42,0.25)]"
          >
            <div
              style={{ clipPath: 'polygon(1% 3%, 99% 0%, 98% 97%, 0% 100%)' }}
              className="relative h-full w-full overflow-hidden"
            >
              <GamePreviewArtwork gameId={activeGame.id} variant="card" className="h-full w-full object-cover" />
            </div>
          </div>

          <div className="flex flex-col items-center text-center gap-1 w-full">
            <h2 className="font-arcade text-xl sm:text-3xl tracking-wider text-[#0F172A] uppercase">
              {activeGame.title}
            </h2>
            <p className="text-xs sm:text-sm font-medium text-[#475569] max-w-lg">
              {activeGame.description}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 w-full">
            <CrystalReadout label="SPIELER" value={activeGame.players.toUpperCase()} variant="neutral" />
            <CrystalReadout label="DAUER" value={activeGame.duration.toUpperCase()} variant="gold" />
          </div>

          <div className="flex w-full items-center gap-3 pt-1">
            <CrystalButton
              size="lg"
              variant={activeGame.accent}
              tilt="left"
              fullWidth
              onClick={() => onLaunchGame(activeGame, false)}
              className="h-11 sm:h-12 text-sm sm:text-base"
            >
              <Play className="h-4 w-4 fill-current" />
              <span>PLAY</span>
            </CrystalButton>

            {activeGame.supportsTv && (
              <CrystalButton
                size="lg"
                variant="secondary"
                tilt="right"
                onClick={() => onLaunchGame(activeGame, true)}
                className="h-11 sm:h-12 px-5 text-sm sm:text-base shrink-0"
              >
                <Tv className="h-4 w-4" />
                <span>TV</span>
              </CrystalButton>
            )}
          </div>
        </CrystalPanel>
      </div>
    </div>
  );
}

/**
 * Variante 4: QUICK-LAUNCH LISTE
 * Kompakte Crystal-Zeilen mit direktem Start auf allen Geräten.
 */
export function QuickLaunchListLayout({
  games,
  favoriteIds,
  onSelectGame,
  onLaunchGame,
  onToggleFavorite,
}: LayoutCommonProps) {
  return (
    <div className="no-scrollbar w-full flex-1 min-h-0 overflow-y-auto px-3 sm:px-1 py-1">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-2.5 sm:gap-3 pb-3">
        {games.map((game) => {
          const isFav = favoriteIds.includes(game.id);
          const palette = ACCENT_PALETTES[game.accent];

          return (
            <div
              key={game.id}
              onClick={() => onSelectGame(game.id)}
              style={{ clipPath: 'polygon(0.5% 3%, 99.5% 0%, 99.5% 97%, 0.5% 100%)' }}
              className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 sm:gap-4 border-[3px] border-[#334155] bg-[#F8FAFC] p-2.5 sm:p-3 shadow-[inset_0_2px_0_#FFFFFF,0_4px_0_rgba(15,23,42,0.2)] transition-transform hover:-translate-y-0.5 cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="relative h-14 w-20 sm:h-16 sm:w-24 shrink-0 overflow-hidden border-2 border-[#0F172A] bg-[#0F172A]">
                  <GamePreviewArtwork gameId={game.id} variant="card" className="h-full w-full object-cover" />
                </div>

                <div className="flex flex-col min-w-0 flex-1 gap-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-arcade text-sm sm:text-lg tracking-wider text-[#0F172A] uppercase truncate">
                      {game.title}
                    </h3>
                    <span
                      style={{
                        backgroundColor: palette.badgeBg,
                        color: palette.badgeText,
                        borderColor: palette.badgeBorder,
                      }}
                      className="font-arcade border px-1.5 py-0.5 text-[9px] sm:text-[10px] uppercase shrink-0"
                    >
                      {game.players} • {game.duration}
                    </span>
                  </div>
                  <p className="hidden sm:block text-xs font-medium text-[#475569] truncate">
                    {game.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
                <CrystalIconButton
                  size="sm"
                  tilt="left"
                  variant={isFav ? 'rose' : 'neutral'}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(game.id);
                  }}
                  title={isFav ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
                  aria-label={isFav ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
                >
                  <Heart className={`h-3.5 w-3.5 ${isFav ? 'fill-current' : ''}`} />
                </CrystalIconButton>

                <CrystalButton
                  size="sm"
                  variant={game.accent}
                  tilt="left"
                  onClick={(e) => {
                    e.stopPropagation();
                    onLaunchGame(game, false);
                  }}
                  className="h-8 sm:h-9 px-3 sm:px-4 text-xs"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>PLAY</span>
                </CrystalButton>

                {game.supportsTv && (
                  <CrystalButton
                    size="sm"
                    variant="secondary"
                    tilt="right"
                    onClick={(e) => {
                      e.stopPropagation();
                      onLaunchGame(game, true);
                    }}
                    className="h-8 sm:h-9 px-2.5 sm:px-3 text-xs"
                  >
                    <Tv className="h-3.5 w-3.5" />
                    <span>TV</span>
                  </CrystalButton>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Variante 5: OPEN STAGE (Offenes Design)
 * Luftiges, rahmenloses Layout direkt über dem Hintergrund – ohne schwere Boxen,
 * mit viel Raum für Artwork, klarer Typografie und schwebender Spielauswahl unten.
 */
export function OpenStageLayout({
  games,
  activeGame,
  favoriteIds,
  onSelectGame,
  onLaunchGame,
  onToggleFavorite,
}: LayoutCommonProps) {
  const palette = ACCENT_PALETTES[activeGame.accent];
  const isFav = favoriteIds.includes(activeGame.id);

  return (
    <div className="flex flex-1 min-h-0 w-full flex-col justify-between gap-4 px-4 sm:px-6 py-2">
      {/* Offene Hauptbühne ohne schwere Box */}
      <div className="my-auto mx-auto flex w-full max-w-5xl flex-col md:flex-row items-center gap-5 sm:gap-8">
        {/* Schwebendes Artwork mit sanftem Akzent-Glow */}
        <div className="relative w-full max-w-[300px] sm:max-w-[360px] md:w-[46%] shrink-0">
          <div
            style={{ backgroundColor: palette.bg }}
            className="pointer-events-none absolute -inset-3 rounded-3xl opacity-30 blur-2xl"
          />
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-white/20 shadow-[0_18px_40px_rgba(0,0,0,0.45)]">
            <GamePreviewArtwork gameId={activeGame.id} variant="card" className="h-full w-full object-cover" />
          </div>
        </div>

        {/* Offene Typografie & klare Aktionen direkt auf dem Hintergrund */}
        <div className="flex flex-1 flex-col items-center md:items-start text-center md:text-left gap-3 min-w-0">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
            <span
              style={{ borderColor: palette.topBorder, color: palette.topBorder }}
              className="font-arcade border bg-white/10 backdrop-blur-xs px-2.5 py-0.5 text-[10px] sm:text-xs tracking-widest uppercase rounded-full"
            >
              {activeGame.gameTypeLabel} • {activeGame.category}
            </span>
            <span className="font-arcade text-[10px] sm:text-xs tracking-wider text-[#94A3B8] uppercase">
              {activeGame.players} • {activeGame.duration}
            </span>
          </div>

          <h2 className="font-arcade text-3xl sm:text-5xl tracking-wider text-white uppercase drop-shadow-[0_3px_0_rgba(15,23,42,0.85)]">
            {activeGame.title}
          </h2>

          <p className="text-sm sm:text-base font-medium text-[#CBD5E1] max-w-lg leading-relaxed">
            {activeGame.description}
          </p>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 pt-1">
            <CrystalButton
              size="lg"
              variant={activeGame.accent}
              tilt="left"
              onClick={() => onLaunchGame(activeGame, false)}
              className="h-11 sm:h-12 px-7 text-sm sm:text-base"
            >
              <Play className="h-4 w-4 fill-current" />
              <span>SPIELEN</span>
            </CrystalButton>

            {activeGame.supportsTv && (
              <CrystalButton
                size="lg"
                variant="secondary"
                tilt="right"
                onClick={() => onLaunchGame(activeGame, true)}
                className="h-11 sm:h-12 px-5 text-sm sm:text-base"
              >
                <Tv className="h-4 w-4" />
                <span>TV</span>
              </CrystalButton>
            )}

            <CrystalIconButton
              size="md"
              tilt="right"
              variant={isFav ? 'rose' : 'neutral'}
              onClick={() => onToggleFavorite(activeGame.id)}
              title={isFav ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
              aria-label={isFav ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
            >
              <Heart className={`h-4 w-4 ${isFav ? 'fill-current' : ''}`} />
            </CrystalIconButton>
          </div>
        </div>
      </div>

      {/* Offene Schnellwechsel-Leiste unten */}
      <div className="no-scrollbar mx-auto flex w-full max-w-4xl items-center justify-start sm:justify-center gap-2.5 overflow-x-auto py-1">
        {games.map((game) => {
          const selected = game.id === activeGame.id;
          const Icon = game.icon;
          const itemPalette = ACCENT_PALETTES[game.accent];

          return (
            <button
              key={game.id}
              type="button"
              onClick={() => onSelectGame(game.id)}
              className={`flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 transition-all cursor-pointer active:scale-95 ${
                selected
                  ? 'border-white/60 bg-white/20 text-white shadow-[0_0_20px_rgba(255,255,255,0.18)] backdrop-blur-xs'
                  : 'border-white/10 bg-white/5 text-[#CBD5E1] hover:bg-white/12 hover:text-white'
              }`}
            >
              <span
                style={{ backgroundColor: itemPalette.bg }}
                className="flex h-6 w-6 items-center justify-center rounded-full text-white"
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className="font-arcade text-xs tracking-wide uppercase whitespace-nowrap">
                {game.title}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Variante 6: SPOTLIGHT DECK
 * Breites Kino-Banner mit integriertem Artwork und schwebendem Icon-Dock darunter.
 */
export function SpotlightDeckLayout({
  games,
  activeGame,
  favoriteIds,
  onSelectGame,
  onLaunchGame,
  onToggleFavorite,
}: LayoutCommonProps) {
  const palette = ACCENT_PALETTES[activeGame.accent];
  const isFav = favoriteIds.includes(activeGame.id);

  return (
    <div className="flex flex-1 min-h-0 w-full flex-col justify-between gap-3 px-3 sm:px-4 py-1">
      <div className="my-auto mx-auto w-full max-w-4xl">
        <div
          style={{ clipPath: 'polygon(0.5% 2%, 99.5% 0%, 99% 98%, 1% 100%)' }}
          className="relative overflow-hidden border-[3px] border-[#334155] bg-[#0F172A] shadow-[0_12px_30px_rgba(0,0,0,0.45)]"
        >
          {/* Integriertes Hintergrund-Artwork rechts */}
          <div className="absolute inset-0 md:left-1/3 opacity-45 md:opacity-75">
            <GamePreviewArtwork gameId={activeGame.id} variant="card" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-[#0F172A] via-[#0F172A]/85 to-transparent" />
          </div>

          <div className="relative z-10 flex flex-col justify-between gap-4 p-5 sm:p-8 min-h-[240px] sm:min-h-[290px]">
            <div className="flex items-center justify-between gap-2">
              <span
                style={{
                  backgroundColor: palette.bg,
                  borderColor: palette.topBorder,
                }}
                className="font-arcade border px-2.5 py-0.5 text-[10px] sm:text-xs text-white uppercase"
              >
                {activeGame.gameTypeLabel} • {activeGame.players} • {activeGame.duration}
              </span>

              <CrystalIconButton
                size="sm"
                tilt="right"
                variant={isFav ? 'rose' : 'neutral'}
                onClick={() => onToggleFavorite(activeGame.id)}
                title={isFav ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
                aria-label={isFav ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
              >
                <Heart className={`h-4 w-4 ${isFav ? 'fill-current' : ''}`} />
              </CrystalIconButton>
            </div>

            <div className="flex flex-col gap-2 max-w-lg">
              <h2 className="font-arcade text-2xl sm:text-4xl tracking-wider text-white uppercase drop-shadow">
                {activeGame.title}
              </h2>
              <p className="text-xs sm:text-sm font-medium text-[#CBD5E1] leading-relaxed">
                {activeGame.description}
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <CrystalButton
                size="md"
                variant={activeGame.accent}
                tilt="left"
                onClick={() => onLaunchGame(activeGame, false)}
                className="h-10 sm:h-11 px-6 text-sm"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>PLAY</span>
              </CrystalButton>

              {activeGame.supportsTv && (
                <CrystalButton
                  size="md"
                  variant="secondary"
                  tilt="right"
                  onClick={() => onLaunchGame(activeGame, true)}
                  className="h-10 sm:h-11 px-4 text-sm"
                >
                  <Tv className="h-4 w-4" />
                  <span>TV</span>
                </CrystalButton>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Schwebendes Mini-Dock */}
      <div className="no-scrollbar mx-auto flex w-full max-w-3xl items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-1">
        {games.map((game) => {
          const selected = game.id === activeGame.id;
          const Icon = game.icon;
          return (
            <CrystalButton
              key={game.id}
              size="sm"
              variant={selected ? game.accent : 'secondary'}
              tilt="left"
              onClick={() => onSelectGame(game.id)}
              className="shrink-0 h-9 px-3 text-xs"
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span>{game.title}</span>
            </CrystalButton>
          );
        })}
      </div>
    </div>
  );
}

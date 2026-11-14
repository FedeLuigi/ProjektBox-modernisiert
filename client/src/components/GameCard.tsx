import { Clock, Heart, Play, Tv, Users } from 'lucide-react';
import { type Game } from '../data/games';
import { ACCENT_PALETTES } from './CrystalUI';
import { GamePreviewArtwork } from './GamePreviewArtwork';

interface GameCardProps {
  game: Game;
  isSelected?: boolean;
  isFavorite: boolean;
  lastPlayedAt?: number;
  onSelect: () => void;
  onPlay: (tvMode?: boolean) => void;
  onToggleFavorite: () => void;
}

export function GameCard({
  game,
  isSelected = false,
  isFavorite,
  lastPlayedAt,
  onSelect,
  onPlay,
  onToggleFavorite,
}: GameCardProps) {
  const Icon = game.icon;
  const palette = ACCENT_PALETTES[game.accent];

  return (
    <article
      onClick={onSelect}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border-2 bg-[#162235]/95 text-[#F8FAFC] transition-all duration-200 cursor-pointer select-none ${
        isSelected
          ? 'border-[#38BDF8] ring-2 ring-[#38BDF8]/30 shadow-[0_14px_32px_rgba(0,0,0,0.45)] -translate-y-0.5'
          : 'border-[#293B56] hover:border-[#475569] hover:-translate-y-0.5 shadow-[0_8px_20px_rgba(0,0,0,0.3)]'
      }`}
    >
      {/* 1. GROSSE AUSSAGEKRÄFTIGE SPIELVORSCHAU */}
      <div className="relative h-44 sm:h-48 w-full overflow-hidden border-b border-[#293B56]">
        <GamePreviewArtwork
          gameId={game.id}
          variant="card"
          className="h-full w-full transition-transform duration-300 group-hover:scale-105"
        />

        {/* Sanfter Verlauf am unteren Rand der Vorschau */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0F172A]/90 via-[#0F172A]/40 to-transparent" />

        {/* Oben links: Spieltyp & Spielerzahl klar hervorgehoben */}
        <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5">
          <span
            style={{
              backgroundColor: palette.bg,
              borderColor: palette.topBorder,
            }}
            className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-bold tracking-wide text-white uppercase shadow-md"
          >
            {game.gameTypeLabel}
          </span>

          <span className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-[#0F172A]/85 px-2.5 py-1 text-xs font-semibold text-[#E2E8F0] backdrop-blur-xs">
            <Users className="h-3.5 w-3.5 text-[#38BDF8]" />
            {game.players}
          </span>
        </div>

        {/* Oben rechts: Favoriten-Herz-Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          title={isFavorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
          aria-label={isFavorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
          className={`absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-xl border transition-all active:scale-90 cursor-pointer ${
            isFavorite
              ? 'border-[#F43F5E] bg-[#F43F5E] text-white shadow-[0_0_12px_rgba(244,63,94,0.5)]'
              : 'border-white/20 bg-[#0F172A]/75 text-[#CBD5E1] hover:bg-[#1E293B] hover:text-white backdrop-blur-xs'
          }`}
        >
          <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
        </button>

        {/* Unten auf der Vorschau: Spieldauer & Zuletzt-Gespielt-Hinweis */}
        <div className="absolute bottom-2.5 inset-x-3 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 rounded-md bg-[#0F172A]/85 px-2 py-0.5 text-xs font-medium text-[#FDE68A] border border-[#F59E0B]/30">
            <Clock className="h-3.5 w-3.5 text-[#FBBF24]" />
            {game.duration}
          </span>

          {lastPlayedAt && (
            <span className="rounded-md bg-[#10B981]/20 border border-[#10B981]/40 px-2 py-0.5 text-[11px] font-semibold text-[#6EE7B7]">
              Zuletzt gespielt
            </span>
          )}
        </div>
      </div>

      {/* 2. KARTEN-INHALT: TITEL, BESCHREIBUNG & DIREKTER SPIELSTART */}
      <div className="flex flex-1 flex-col justify-between gap-3 p-4">
        <div>
          {/* Icon + Titel + Kategorie */}
          <div className="flex items-center gap-3">
            <div
              style={{
                backgroundColor: palette.bg,
                borderColor: palette.topBorder,
              }}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-white shadow-sm"
            >
              <Icon className="h-5 w-5 stroke-[2.2]" />
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="font-arcade text-lg sm:text-xl tracking-wide text-white uppercase truncate">
                {game.title}
              </h3>
              <p className="text-xs font-medium text-[#94A3B8] truncate">
                {game.subtitle} • {game.category}
              </p>
            </div>
          </div>

          {/* Spielbeschreibung auf einen Blick */}
          <p className="mt-2.5 text-xs sm:text-sm leading-relaxed text-[#CBD5E1] line-clamp-2">
            {game.description}
          </p>
        </div>

        {/* 3. AKTIONSZEILE UNTEN */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#293B56]/70">
          {game.supportsTv ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPlay(true);
              }}
              title="Als TV-Party auf großem Bildschirm starten"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#334155] bg-[#1E293B] hover:bg-[#334155] px-3 py-2 text-xs font-semibold text-[#E2E8F0] transition-colors active:scale-95 cursor-pointer"
            >
              <Tv className="h-3.5 w-3.5 text-[#FBBF24]" />
              <span>TV-Modus</span>
            </button>
          ) : (
            <span />
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPlay(false);
            }}
            style={{
              backgroundColor: palette.bg,
              borderColor: palette.topBorder,
            }}
            className="inline-flex flex-1 sm:flex-initial items-center justify-center gap-1.5 rounded-xl border px-4 py-2 text-xs sm:text-sm font-bold text-white uppercase tracking-wider shadow-md hover:brightness-110 transition-all active:scale-95 cursor-pointer"
          >
            <Play className="h-4 w-4 fill-current" />
            <span>Spielen</span>
          </button>
        </div>
      </div>
    </article>
  );
}

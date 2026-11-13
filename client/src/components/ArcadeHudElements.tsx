import { ShoppingCart, Check, Sparkles, Unlock, Volume2, VolumeX, Smartphone, RotateCcw, X, Download } from 'lucide-react';
import { CATEGORIES, type Category, type Game } from '../data/games';

/* ─── 1. GOLDENE MÜNZEN-LEISTE OBEN LINKS (mit geprägter Maskottchen-Münze + "72") ─── */
export function CoinCounterPill({
  coins,
  onClick,
}: {
  coins: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Arcade-Münzen (Tippen für Bonus)"
      className="group relative inline-flex items-center cursor-pointer transition-transform active:scale-95"
    >
      {/* Dunkelblaue Pillen-Basis */}
      <div className="flex h-9 sm:h-11 min-w-[118px] sm:min-w-[148px] items-center justify-center rounded-full bg-[#2B337A] pl-9 sm:pl-11 pr-4 sm:pr-5 shadow-[0_4px_10px_rgba(12,20,58,0.45)] ring-2 ring-[#3C4696]">
        <span className="font-arcade text-lg sm:text-2xl tracking-wide text-white drop-shadow-[0_2px_0_rgba(0,0,0,0.45)]">
          {coins}
        </span>
      </div>

      {/* Überlappende große Goldmünze links */}
      <div className="absolute -left-1.5 sm:-left-2 flex h-11 w-11 sm:h-13 sm:w-13 items-center justify-center rounded-full transition-transform duration-200 group-hover:rotate-6">
        <svg viewBox="0 0 64 64" className="h-full w-full drop-shadow-[0_3px_5px_rgba(0,0,0,0.4)]">
          <defs>
            <linearGradient id="coinGold" x1="10" y1="8" x2="54" y2="56" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FEF08A" />
              <stop offset="45%" stopColor="#FBBF24" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>
          </defs>
          {/* Äußerer dunkler & goldener Münzrand */}
          <circle cx="32" cy="32" r="29" fill="url(#coinGold)" stroke="#78350F" strokeWidth="2.5" />
          <circle cx="32" cy="32" r="23.5" fill="#F59E0B" stroke="#FDE047" strokeWidth="2" />
          {/* Geprägtes freches Original-Maskottchen auf der Münze */}
          {/* Kopffedern / Krone */}
          <path d="M 26 14 L 30 9 L 34 14 L 38 10 L 37 16 Z" fill="#FEF08A" stroke="#92400E" strokeWidth="1.5" />
          {/* Gesicht */}
          <circle cx="32" cy="34" r="14" fill="#FBBF24" stroke="#92400E" strokeWidth="2" />
          {/* Markante Augenbrauen */}
          <path d="M 21 28 L 30 31 M 43 28 L 34 31" stroke="#78350F" strokeWidth="3.2" strokeLinecap="round" />
          {/* Augen */}
          <circle cx="26.5" cy="33" r="2.8" fill="#FFFFFF" />
          <circle cx="37.5" cy="33" r="2.8" fill="#FFFFFF" />
          <circle cx="27" cy="33" r="1.4" fill="#451A03" />
          <circle cx="37" cy="33" r="1.4" fill="#451A03" />
          {/* Schnabel / Grinsen */}
          <path d="M 27 38 L 32 35 L 37 38 L 32 43 Z" fill="#FDE047" stroke="#78350F" strokeWidth="1.8" />
        </svg>
      </div>
    </button>
  );
}

/* ─── 2. ZENTRIERTES SPIEL-LOGO OBEN ("PROJEKT BOX - RELOADED") ─── */
export function ArcadeLogoHeader() {
  return (
    <div className="pointer-events-none flex flex-col items-center justify-center select-none">
      {/* Hauptzeile im dynamischen Comic-Stil */}
      <div className="relative flex items-center gap-1.5 sm:gap-2">
        <span
          className="font-arcade text-xl sm:text-3xl md:text-[34px] leading-none tracking-tight text-white uppercase"
          style={{
            textShadow: '0 3px 0 #1B5A87, 0 5px 10px rgba(0,0,0,0.35)',
            transform: 'rotate(-1.5deg)',
          }}
        >
          PROJEKT
        </span>
        <span
          className="font-arcade text-xl sm:text-3xl md:text-[34px] leading-none tracking-tight text-white uppercase"
          style={{
            textShadow: '0 3px 0 #1B5A87, 0 5px 10px rgba(0,0,0,0.35)',
            transform: 'rotate(1.2deg)',
          }}
        >
          BOX
        </span>
      </div>

      {/* Unterzeile "R E L O A D E D" mit stilisiertem Ei/Kern im O */}
      <div className="mt-0.5 flex items-center justify-center gap-1 sm:gap-1.5 text-[9px] sm:text-[11px] font-black tracking-[0.28em] text-white uppercase drop-shadow-[0_1.5px_0_rgba(18,55,88,0.8)]">
        <span>R</span>
        <span>E</span>
        <span>L</span>
        <span className="inline-block h-2.5 w-2 sm:h-3 sm:w-2.5 rounded-full bg-white ring-1 ring-[#1B5A87] shadow-2xs" />
        <span>A</span>
        <span>D</span>
        <span>E</span>
        <span>D</span>
      </div>
    </div>
  );
}

/* ─── 3. SPIELER-PROFIL & HAMBURGER-MENÜ OBEN RECHTS ("Player 1949" + ≡) ─── */
export function PlayerProfileBar({
  playerName,
  activeCategory,
  onOpenMenu,
}: {
  playerName: string;
  activeCategory: Category;
  onOpenMenu: () => void;
}) {
  return (
    <div className="relative inline-flex items-center">
      {/* Dunkelblaue Profil-Leiste */}
      <div
        onClick={onOpenMenu}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onOpenMenu();
        }}
        className="flex h-9 sm:h-11 items-center rounded-r-full bg-[#2B337A] pl-11 sm:pl-14 pr-11 sm:pr-13 shadow-[0_4px_10px_rgba(12,20,58,0.45)] ring-2 ring-[#3C4696] cursor-pointer"
      >
        <div className="flex flex-col items-start leading-none">
          <span className="font-arcade text-sm sm:text-lg tracking-wide text-white whitespace-nowrap drop-shadow-[0_2px_0_rgba(0,0,0,0.45)]">
            {playerName}
          </span>
          {activeCategory !== 'Alle' && (
            <span className="text-[9px] font-bold uppercase tracking-wider text-[#67E8F9]">
              Filter: {activeCategory}
            </span>
          )}
        </div>
      </div>

      {/* Quadratischer Charakter-Avatar links mit weißem Rahmen (Original Roter Arcade-Held) */}
      <div
        onClick={onOpenMenu}
        className="absolute -left-1 sm:-left-1.5 h-11 w-11 sm:h-13 sm:w-13 overflow-hidden border-2 border-white bg-[#B91C1C] shadow-md cursor-pointer transition-transform hover:scale-105"
      >
        <svg viewBox="0 0 64 64" className="h-full w-full">
          {/* Hintergrund Schattierung */}
          <rect width="64" height="64" fill="#991B1B" />
          <path d="M 0 0 L 64 0 L 45 64 L 0 64 Z" fill="#B91C1C" />
          {/* Roter Arcade-Fuchs / Held */}
          {/* Kopfform */}
          <path
            d="M 10 64 C 10 30, 20 14, 34 14 C 48 14, 56 30, 56 64 Z"
            fill="#DC2626"
            stroke="#450A0A"
            strokeWidth="2.5"
          />
          {/* Haarschopf oben */}
          <path
            d="M 26 15 L 22 5 L 33 12 L 38 4 L 41 15 Z"
            fill="#EF4444"
            stroke="#450A0A"
            strokeWidth="2"
          />
          {/* Heller Bauch/Wangenbereich */}
          <ellipse cx="35" cy="56" rx="14" ry="10" fill="#FECACA" />
          {/* Augen */}
          <ellipse cx="28" cy="36" rx="6.5" ry="6.5" fill="#FFFFFF" stroke="#450A0A" strokeWidth="2" />
          <ellipse cx="42" cy="36" rx="6.5" ry="6.5" fill="#FFFFFF" stroke="#450A0A" strokeWidth="2" />
          <circle cx="30" cy="36.5" r="2.6" fill="#111827" />
          <circle cx="40" cy="36.5" r="2.6" fill="#111827" />
          {/* Markante entschlossene V-Augenbrauen */}
          <path
            d="M 17 26 L 35 33 L 53 26 L 51 21 L 35 28 L 19 21 Z"
            fill="#1F2937"
          />
          {/* Goldener Schnabel / Mund */}
          <path
            d="M 26 44 L 35 39 L 45 44 L 35 52 Z"
            fill="#FBBF24"
            stroke="#450A0A"
            strokeWidth="2"
          />
          <path d="M 28 45 L 43 45" stroke="#450A0A" strokeWidth="2" />
        </svg>
      </div>

      {/* Türkiser runder Hamburger-Menü-Button rechts außen */}
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Menü & Kategorien öffnen"
        className="absolute -right-1 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full border-[3px] border-white bg-gradient-to-b from-[#5BC0BE] to-[#3B8EA5] text-white shadow-[0_4px_10px_rgba(0,0,0,0.35)] transition-transform active:scale-90 cursor-pointer"
      >
        <div className="flex flex-col gap-1">
          <span className="block h-[3px] w-4 sm:w-5 rounded-full bg-white shadow-2xs" />
          <span className="block h-[3px] w-4 sm:w-5 rounded-full bg-white shadow-2xs" />
          <span className="block h-[3px] w-4 sm:w-5 rounded-full bg-white shadow-2xs" />
        </div>
      </button>
    </div>
  );
}

/* ─── 4. LILA RUNDE SEITEN-BUTTONS (Shop oben links & Einstellungen unten links) ─── */
export function PurpleActionCircleButton({
  variant,
  onClick,
  label,
}: {
  variant: 'shop' | 'settings' | 'up';
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="group relative flex h-12 w-12 sm:h-15 sm:w-15 landscape:h-11 landscape:w-11 landscape:sm:h-14 landscape:sm:w-14 items-center justify-center rounded-full border-[3px] border-white bg-gradient-to-b from-[#8574C9] to-[#6554AE] text-white shadow-[0_6px_14px_rgba(18,24,68,0.45)] transition-transform active:scale-90 hover:scale-105 cursor-pointer"
    >
      {/* Oberer Glanz-Reflex */}
      <div className="pointer-events-none absolute top-1 left-2 right-2 h-3.5 rounded-full bg-white/20" />

      {variant === 'shop' && (
        <ShoppingCart className="h-6 w-6 sm:h-7 sm:w-7 stroke-[2.4] text-white drop-shadow-xs" />
      )}

      {variant === 'settings' && (
        /* Zwei ineinandergreifende Zahnräder wie im Referenzbild */
        <svg viewBox="0 0 48 48" className="h-7 w-7 sm:h-8 sm:w-8 fill-white drop-shadow-xs">
          {/* Großes Zahnrad links oben */}
          <path d="M19 8.5l1.4 2.6a7.5 7.5 0 0 1 2.5 1l2.7-1.1 2.1 2.1-1.1 2.7a7.5 7.5 0 0 1 1 2.5l2.6 1.4v3l-2.6 1.4a7.5 7.5 0 0 1-1 2.5l1.1 2.7-2.1 2.1-2.7-1.1a7.5 7.5 0 0 1-2.5 1L19 34h-3l-1.4-2.6a7.5 7.5 0 0 1-2.5-1l-2.7 1.1-2.1-2.1 1.1-2.7a7.5 7.5 0 0 1-1-2.5L4.8 22.8v-3l2.6-1.4a7.5 7.5 0 0 1 1-2.5l-1.1-2.7 2.1-2.1 2.7 1.1a7.5 7.5 0 0 1 2.5-1L16 8.5h3zm-1.5 9.2a3.6 3.6 0 1 0 0 7.2 3.6 3.6 0 0 0 0-7.2z" />
          {/* Kleineres Zahnrad rechts unten */}
          <path d="M34.5 24l1 1.9a5.5 5.5 0 0 1 1.8.8l2-.8 1.5 1.5-.8 2a5.5 5.5 0 0 1 .8 1.8l1.9 1v2.2l-1.9 1a5.5 5.5 0 0 1-.8 1.8l.8 2-1.5 1.5-2-.8a5.5 5.5 0 0 1-1.8.8l-1 1.9h-2.2l-1-1.9a5.5 5.5 0 0 1-1.8-.8l-2 .8-1.5-1.5.8-2a5.5 5.5 0 0 1-.8-1.8l-1.9-1V32l1.9-1a5.5 5.5 0 0 1 .8-1.8l-.8-2 1.5-1.5 2 .8a5.5 5.5 0 0 1 1.8-.8l1-1.9h2.2zm-1.1 6.7a2.6 2.6 0 1 0 0 5.2 2.6 2.6 0 0 0 0-5.2z" />
        </svg>
      )}

      {variant === 'up' && (
        <svg viewBox="0 0 24 24" className="h-5 w-5 sm:h-6 sm:w-6 fill-white">
          <path d="M12 6l-7 9h14l-7-9z" />
        </svg>
      )}
    </button>
  );
}

/* ─── 5. SCHRÄGER "COMING SOON!" PFEIL ÜBER DER INSEL LINKS ─── */
export function ComingSoonBanner({ onClick }: { onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className="relative flex items-center justify-center cursor-pointer select-none transition-transform hover:scale-105 active:scale-95"
    >
      <svg
        viewBox="0 0 230 120"
        className="w-34 sm:w-44 landscape:w-32 landscape:sm:w-42 drop-shadow-[0_6px_12px_rgba(0,0,0,0.25)]"
      >
        {/* Halbtransparenter dunkler Pfeil nach links */}
        <polygon
          points="15,62 68,14 68,38 205,22 215,82 68,85 68,108"
          fill="#102538"
          fillOpacity="0.52"
        />
        <text
          x="114"
          y="62"
          textAnchor="middle"
          fill="#FFFFFF"
          transform="rotate(-9 114 62)"
          className="font-arcade text-[20px] tracking-wide"
        >
          Coming Soon!
        </text>
      </svg>
    </div>
  );
}

/* ─── 6. GRÜNES INSEL-MASKOTTCHEN MIT RUNDER ROTER BRILLE, SPRECHBLASE & "3%" BADGE ─── */
export function IslandMascotWidget({
  quote,
  progressPercent,
  onClickMascot,
}: {
  quote: string;
  progressPercent: number;
  onClickMascot: () => void;
}) {
  return (
    <div
      onClick={onClickMascot}
      title="Tippe auf Prof. Gizmo!"
      className="group relative flex flex-col items-center cursor-pointer select-none"
    >
      {/* Weiße eckige Comic-Sprechblase oben ("Impress me.") */}
      <div className="relative mb-1.5 bg-white px-3.5 py-1.5 sm:px-4 sm:py-2 shadow-[0_4px_10px_rgba(12,20,58,0.3)] transition-transform group-hover:-translate-y-0.5">
        <span className="font-arcade block text-sm sm:text-base landscape:text-xs landscape:sm:text-base tracking-wide text-[#2B337A] whitespace-nowrap">
          {quote}
        </span>
        {/* Sprechblasen-Dreieck unten rechts zum Maskottchen */}
        <div
          className="absolute -bottom-2.5 right-6 h-3 w-4 bg-white"
          style={{ clipPath: 'polygon(0 0, 100% 0, 75% 100%)' }}
        />
      </div>

      {/* Untere Reihe: Oranges Fortschritts-Badge ("3%" + "i") & Grünes Brillen-Maskottchen */}
      <div className="flex items-end gap-1 sm:gap-1.5">
        {/* Oranges Fortschritts-Abzeichen links */}
        <div className="relative mb-1 flex items-center justify-center">
          <svg
            viewBox="0 0 110 72"
            className="w-18 sm:w-22 landscape:w-16 landscape:sm:w-20 drop-shadow-[0_3px_6px_rgba(0,0,0,0.35)]"
          >
            {/* Oranger Plaketten-Körper mit kleinen Füßchen/Ohren-Konturen */}
            <path
              d="M 18 22 C 18 12, 30 8, 55 8 C 82 8, 94 14, 94 28 L 102 28 L 102 44 L 94 44 C 94 56, 82 60, 55 60 C 32 60, 18 55, 18 42 L 8 42 L 8 28 L 18 28 Z"
              fill="#EA6835"
              stroke="#231F20"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            {/* Kleine Füßchen unten */}
            <path d="M 32 60 L 30 67 L 38 60 M 72 60 L 74 67 L 80 60" fill="#EA6835" stroke="#231F20" strokeWidth="2.5" />
            <text
              x="56"
              y="43"
              textAnchor="middle"
              fill="#FFFFFF"
              className="font-arcade text-[24px]"
            >
              {progressPercent}%
            </text>
          </svg>

          {/* Türkises rundes "i" Info-Icon oben links an der Plakette */}
          <div className="absolute -top-1.5 left-1.5 flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full border-2 border-white bg-[#4AA4B5] text-[11px] font-black text-white shadow-xs">
            i
          </div>
        </div>

        {/* Grünes Maskottchen mit roter Brille rechts (Prof. Gizmo) */}
        <div className="animate-mascot-bounce">
          <svg
            viewBox="0 0 110 105"
            className="h-16 w-16 sm:h-21 sm:w-21 landscape:h-15 landscape:w-15 landscape:sm:h-19 landscape:sm:w-19 drop-shadow-[0_5px_8px_rgba(0,0,0,0.4)]"
          >
            {/* Kleine Ohren / Antennen */}
            <ellipse cx="26" cy="24" rx="7" ry="10" transform="rotate(-22 26 24)" fill="#76C945" stroke="#1E293B" strokeWidth="3" />
            <ellipse cx="82" cy="22" rx="7" ry="10" transform="rotate(20 82 22)" fill="#76C945" stroke="#1E293B" strokeWidth="3" />

            {/* Runder grüner Kopf */}
            <ellipse
              cx="55"
              cy="56"
              rx="42"
              ry="38"
              fill="#84D44E"
              stroke="#1E293B"
              strokeWidth="3.2"
            />
            {/* Hellgrüner Glanz auf der Wange */}
            <ellipse cx="55" cy="64" rx="34" ry="26" fill="#9AE65E" />

            {/* Dunkelgrüne Frisur / Blätter-Schopf oben */}
            <path
              d="M 25 32 C 32 16, 58 14, 78 24 C 65 28, 45 28, 25 32 Z"
              fill="#2E7D32"
              stroke="#1E293B"
              strokeWidth="2.5"
            />

            {/* Augen hinter der Brille */}
            <circle cx="38" cy="49" r="8" fill="#FFFFFF" stroke="#1E293B" strokeWidth="2.2" />
            <circle cx="72" cy="49" r="8" fill="#FFFFFF" stroke="#1E293B" strokeWidth="2.2" />
            <circle cx="40" cy="49" r="3.2" fill="#1E293B" />
            <circle cx="70" cy="49" r="3.2" fill="#1E293B" />

            {/* Markante rote Retro-Brille */}
            <rect
              x="18"
              y="34"
              width="36"
              height="27"
              rx="10"
              transform="rotate(-4 36 47)"
              fill="none"
              stroke="#D9463E"
              strokeWidth="5"
            />
            <rect
              x="56"
              y="34"
              width="36"
              height="27"
              rx="10"
              transform="rotate(4 74 47)"
              fill="none"
              stroke="#D9463E"
              strokeWidth="5"
            />
            {/* Brillensteg */}
            <path d="M 52 46 Q 55 43 58 46" stroke="#D9463E" strokeWidth="5" fill="none" />

            {/* Witzige grüne Schnauze / Nase in der Mitte */}
            <ellipse
              cx="55"
              cy="58"
              rx="13"
              ry="9"
              fill="#A3E635"
              stroke="#1E293B"
              strokeWidth="2.5"
            />
            <ellipse cx="51" cy="58" rx="2.2" ry="3.2" fill="#1E5631" />
            <ellipse cx="59" cy="58" rx="2.2" ry="3.2" fill="#1E5631" />

            {/* Breites verschmitztes Lächeln & kleiner Kinnbart */}
            <path
              d="M 40 72 Q 55 84 70 72 Z"
              fill="#1E293B"
            />
            <path d="M 44 73 L 66 73" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
            <path d="M 47 84 Q 55 88 63 84" stroke="#2E7D32" strokeWidth="4" strokeLinecap="round" fill="none" />
          </svg>
        </div>
      </div>
    </div>
  );
}

/* ─── 7. MODAL: EPISODE FREISCHALTEN / DIREKT SPIELEN ─── */
export function UnlockEpisodeModal({
  game,
  coins,
  onClose,
  onUnlockWithCoins,
  onPlayDirectly,
}: {
  game: Game | null;
  coins: number;
  onClose: () => void;
  onUnlockWithCoins: (game: Game) => void;
  onPlayDirectly: (game: Game) => void;
}) {
  if (!game) return null;
  const cost = game.unlockCost ?? 20;
  const canAfford = coins >= cost;
  const title1 = game.episodeLines ? game.episodeLines[0] : game.title;
  const title2 = game.episodeLines ? game.episodeLines[1] : '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-[28px] border-4 border-white bg-gradient-to-b from-[#34408A] to-[#1E255E] p-6 text-center text-white shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-3 -right-3 flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-white bg-[#EF4444] text-white shadow-md transition-transform active:scale-90 cursor-pointer"
        >
          <X className="h-5 w-5 stroke-[3]" />
        </button>

        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-white/40 bg-white/10">
          <Unlock className="h-8 w-8 text-[#FDE047]" />
        </div>

        <p className="text-xs font-bold uppercase tracking-widest text-[#67E8F9]">
          {title1} {title2}
        </p>
        <h3 className="font-arcade mt-1 text-2xl sm:text-3xl tracking-wide text-white uppercase">
          {game.title}
        </h3>
        <p className="mt-2 text-xs sm:text-sm text-white/85 leading-relaxed">
          {game.description}
        </p>

        <div className="mt-5 flex flex-col gap-2.5">
          <button
            type="button"
            disabled={!canAfford}
            onClick={() => onUnlockWithCoins(game)}
            className={`font-arcade flex w-full items-center justify-center gap-2 rounded-full border-[3px] border-white py-3 text-base tracking-wider uppercase shadow-[0_4px_0_rgba(0,0,0,0.35)] transition-transform active:scale-95 cursor-pointer ${
              canAfford
                ? 'bg-gradient-to-b from-[#FDE047] to-[#F59E0B] text-[#1E255E]'
                : 'bg-gray-500/50 text-white/50 cursor-not-allowed'
            }`}
          >
            <span>Freischalten ({cost} Münzen)</span>
          </button>

          <button
            type="button"
            onClick={() => onPlayDirectly(game)}
            className="font-arcade flex w-full items-center justify-center gap-2 rounded-full border-[3px] border-white bg-gradient-to-b from-[#4ADE80] to-[#16A34A] py-3 text-base tracking-wider text-white uppercase shadow-[0_4px_0_#14532D] transition-transform active:scale-95 cursor-pointer"
          >
            <span>Sofort spielen!</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── 8. MODAL: MENÜ, KATEGORIEN, SHOP & EINSTELLUNGEN ─── */
export function ArcadeMenuModal({
  mode,
  onClose,
  category,
  onSelectCategory,
  allUnlocked,
  onToggleAllUnlocked,
  coins,
  onAddBonusCoins,
  soundEnabled,
  onToggleSound,
  hapticsEnabled,
  onToggleHaptics,
  onResetProgress,
  canInstall,
  onInstall,
}: {
  mode: 'menu' | 'shop' | 'settings' | null;
  onClose: () => void;
  category: Category;
  onSelectCategory: (cat: Category) => void;
  allUnlocked: boolean;
  onToggleAllUnlocked: () => void;
  coins: number;
  onAddBonusCoins: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  hapticsEnabled: boolean;
  onToggleHaptics: () => void;
  onResetProgress: () => void;
  canInstall: boolean;
  onInstall: () => void;
}) {
  if (!mode) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-[28px] border-4 border-white bg-gradient-to-b from-[#34408A] to-[#1E255E] p-6 text-white shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
      >
        {/* Schließen-Button oben rechts */}
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-3 -right-3 flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-white bg-[#EF4444] text-white shadow-md transition-transform active:scale-90 cursor-pointer"
        >
          <X className="h-5 w-5 stroke-[3]" />
        </button>

        {mode === 'menu' && (
          <div>
            <h3 className="font-arcade text-center text-2xl sm:text-3xl tracking-wide uppercase">
              Spiel-Menü & Filter
            </h3>
            <p className="mt-1 text-center text-xs text-white/75">
              Wähle eine Spielkategorie oder schalte alle Episoden frei
            </p>

            {/* Kategorie-Auswahl */}
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              {CATEGORIES.map((cat) => {
                const active = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      onSelectCategory(cat);
                      onClose();
                    }}
                    className={`font-arcade flex items-center justify-center gap-2 rounded-2xl border-2 py-3 text-base tracking-wide uppercase transition-transform active:scale-95 cursor-pointer ${
                      active
                        ? 'border-white bg-gradient-to-b from-[#4ADE80] to-[#16A34A] text-white shadow-md'
                        : 'border-white/30 bg-white/10 text-white/85 hover:bg-white/20'
                    }`}
                  >
                    {active && <Check className="h-4 w-4 stroke-[3]" />}
                    <span>{cat}</span>
                  </button>
                );
              })}
            </div>

            {/* Alle Karten entsperren / sperren Umschalter */}
            <div className="mt-4 pt-4 border-t border-white/15 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={onToggleAllUnlocked}
                className="font-arcade flex w-full items-center justify-center gap-2 rounded-full border-[3px] border-white bg-gradient-to-b from-[#5BC0BE] to-[#3B8EA5] py-2.5 text-sm tracking-wider uppercase shadow-md transition-transform active:scale-95 cursor-pointer"
              >
                <Unlock className="h-4 w-4" />
                <span>
                  {allUnlocked
                    ? 'Schlösser wieder anzeigen (Original-Look)'
                    : 'Alle Episoden-Schlösser öffnen'}
                </span>
              </button>

              {canInstall && (
                <button
                  type="button"
                  onClick={onInstall}
                  className="font-arcade flex w-full items-center justify-center gap-2 rounded-full border-[3px] border-white bg-gradient-to-b from-[#FDE047] to-[#F59E0B] py-2.5 text-sm tracking-wider text-[#1E255E] uppercase shadow-md transition-transform active:scale-95 cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  <span>Als App installieren</span>
                </button>
              )}
            </div>
          </div>
        )}

        {mode === 'shop' && (
          <div className="text-center">
            <h3 className="font-arcade text-2xl sm:text-3xl tracking-wide uppercase">
              Insel-Schatzkammer
            </h3>
            <p className="mt-1 text-xs text-white/80">
              Dein Guthaben: <strong className="text-[#FDE047]">{coins} Münzen</strong>
            </p>

            <div className="mt-5 flex flex-col gap-3">
              <button
                type="button"
                onClick={onAddBonusCoins}
                className="font-arcade flex w-full items-center justify-between rounded-2xl border-[3px] border-white bg-gradient-to-r from-[#F59E0B] to-[#D97706] px-5 py-3.5 text-left text-white shadow-md transition-transform active:scale-95 cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <Sparkles className="h-5 w-5 text-[#FEF08A]" />
                  <span>Gratis Münz-Paket</span>
                </span>
                <span className="rounded-full bg-black/25 px-3 py-1 text-sm">+50 🪙</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!allUnlocked) onToggleAllUnlocked();
                  onClose();
                }}
                className="font-arcade flex w-full items-center justify-between rounded-2xl border-[3px] border-white bg-gradient-to-r from-[#8574C9] to-[#6554AE] px-5 py-3.5 text-left text-white shadow-md transition-transform active:scale-95 cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <Unlock className="h-5 w-5 text-[#67E8F9]" />
                  <span>Alle Episoden freischalten</span>
                </span>
                <span className="rounded-full bg-black/25 px-3 py-1 text-sm">GRATIS</span>
              </button>
            </div>
          </div>
        )}

        {mode === 'settings' && (
          <div>
            <h3 className="font-arcade text-center text-2xl sm:text-3xl tracking-wide uppercase">
              Einstellungen
            </h3>

            <div className="mt-5 flex flex-col gap-3">
              <button
                type="button"
                onClick={onToggleSound}
                className="flex w-full items-center justify-between rounded-2xl border-2 border-white/25 bg-white/10 px-4 py-3 font-bold transition-colors hover:bg-white/15 cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  {soundEnabled ? <Volume2 className="h-5 w-5 text-[#4ADE80]" /> : <VolumeX className="h-5 w-5 text-red-400" />}
                  <span>Sound & Effekte</span>
                </span>
                <span className={`font-arcade rounded-full px-3 py-0.5 text-xs ${soundEnabled ? 'bg-[#16A34A] text-white' : 'bg-white/20 text-white/70'}`}>
                  {soundEnabled ? 'EIN' : 'AUS'}
                </span>
              </button>

              <button
                type="button"
                onClick={onToggleHaptics}
                className="flex w-full items-center justify-between rounded-2xl border-2 border-white/25 bg-white/10 px-4 py-3 font-bold transition-colors hover:bg-white/15 cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <Smartphone className="h-5 w-5 text-[#67E8F9]" />
                  <span>Vibration (Haptik)</span>
                </span>
                <span className={`font-arcade rounded-full px-3 py-0.5 text-xs ${hapticsEnabled ? 'bg-[#16A34A] text-white' : 'bg-white/20 text-white/70'}`}>
                  {hapticsEnabled ? 'EIN' : 'AUS'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onResetProgress();
                  onClose();
                }}
                className="flex w-full items-center justify-between rounded-2xl border-2 border-white/25 bg-white/10 px-4 py-3 font-bold text-[#FCA5A5] transition-colors hover:bg-white/15 cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <RotateCcw className="h-5 w-5" />
                  <span>Karten-Schlösser zurücksetzen</span>
                </span>
                <span className="font-arcade rounded-full bg-red-500/30 px-3 py-0.5 text-xs text-white">
                  RESET
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

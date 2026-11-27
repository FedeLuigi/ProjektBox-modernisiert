import { Eraser, Send, Trash2, Undo2, ArrowRight } from 'lucide-react';
import type {
  DrawAndGuessMove,
  DrawAndGuessState,
  Player,
  StrokeSegment,
} from '@projektbox/shared/types';
import studioPaperUrl from '../../../assets/textures/drawandguess/studio_paper_backdrop.jpg';
import { DrawCanvasSurface } from './DrawCanvasSurface';
import { DrawCustomWordModal } from './DrawCustomWordModal';
import { DRAW_COLORS, DRAW_SIZES } from './DrawTvStage';

interface DrawControllerProps {
  gameState: DrawAndGuessState;
  allPlayers: Player[];
  myPlayer: Player;
  isDrawer: boolean;
  timeLeft: number;
  brushColor: string;
  onSelectColor: (c: string) => void;
  brushSize: number;
  onSelectSize: (s: number) => void;
  isEraser: boolean;
  onToggleEraser: (val: boolean) => void;
  guessInput: string;
  onChangeGuess: (val: string) => void;
  onSubmitGuess: () => void;
  onUndo: () => void;
  onClear: () => void;
  onEmitStroke: (seg: StrokeSegment) => void;
  onMove: (move: DrawAndGuessMove) => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  renderedCountRef: React.MutableRefObject<number>;
}

export function DrawController({
  gameState,
  allPlayers,
  myPlayer,
  isDrawer,
  timeLeft,
  brushColor,
  onSelectColor,
  brushSize,
  onSelectSize,
  isEraser,
  onToggleEraser,
  guessInput,
  onChangeGuess,
  onSubmitGuess,
  onUndo,
  onClear,
  onEmitStroke,
  onMove,
  canvasRef,
  renderedCountRef,
}: DrawControllerProps) {
  const myId = myPlayer?.id || '';
  const activePlayers = allPlayers.filter((p) => !p.isTvScreen);
  const drawer = activePlayers.find((p) => p.id === gameState.currentDrawerId);
  const isRoundOver = gameState.roundStatus === 'round_over' || gameState.roundStatus === 'game_over';
  const hasGuessed = gameState.correctGuesserIds.includes(myId);
  const canDraw = isDrawer && gameState.roundStatus === 'drawing';

  if (gameState.roundStatus === 'choosing_word') {
    return (
      <div
        className="relative flex h-full w-full flex-col overflow-hidden bg-[#f5efe4] bg-cover bg-center text-[#1E293B]"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(252,248,242,0.75), rgba(245,237,225,0.88)), url(${studioPaperUrl})`,
        }}
      >
        <DrawCustomWordModal
          isDrawer={isDrawer}
          drawerName={drawer?.name || 'Zeichner'}
          timeLeft={timeLeft}
          onConfirm={(word) => onMove({ type: 'set_word', word })}
        />
      </div>
    );
  }

  const wordLabel =
    isDrawer || isRoundOver
      ? gameState.secretWord || '—'
      : Array.from({ length: Math.max(1, gameState.wordLength || 0) }, () => '_').join(' ');

  return (
    <div
      className="relative flex h-full w-full flex-col justify-between overflow-hidden bg-[#f5efe4] bg-cover bg-center pt-[max(0.45rem,env(safe-area-inset-top))] pr-[max(0.75rem,env(safe-area-inset-right))] pb-[max(0.6rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] text-[#1E293B] select-none"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(252,248,242,0.75), rgba(245,237,225,0.88)), url(${studioPaperUrl})`,
      }}
    >
      <div className="mx-auto flex h-full w-full max-w-5xl flex-col justify-between gap-2">
        {/* Clean Open Header Strip (pl-24 reserves MENÜ zone, uniform height, no ● Name pill) */}
        <header className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-[#B45309]/25 pr-1 pl-24 sm:pl-28">
          <div className="flex h-8 min-w-0 items-center gap-2.5 leading-none">
            <span className="truncate font-serif text-base font-black leading-none tracking-wider text-[#0F172A] sm:text-lg">
              {wordLabel}
            </span>
          </div>

          <div className="flex h-8 shrink-0 items-center gap-2.5 leading-none">
            <span className="text-xs font-bold leading-none tabular-nums text-[#475569]">
              {gameState.scores[myId] ?? 0} Pkt
            </span>
            <span
              className={`font-serif text-lg font-black leading-none tabular-nums ${
                timeLeft <= 10 && gameState.roundStatus === 'drawing'
                  ? 'animate-pulse text-[#DC2626]'
                  : 'text-[#1E3A8A]'
              }`}
            >
              {timeLeft}s
            </span>
          </div>
        </header>

        {/* Main Body: Right-Handed in Landscape (Canvas left, Palette/Guess right) */}
        <div className="flex flex-1 min-h-0 flex-col justify-between gap-2 landscape:grid landscape:grid-cols-[1fr_210px] landscape:items-center landscape:gap-3">
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <div className="w-full max-w-[460px] landscape:max-w-[430px]">
              <DrawCanvasSurface
                round={gameState.round}
                strokes={gameState.strokes}
                isDrawer={isDrawer}
                canDraw={canDraw}
                brushColor={brushColor}
                brushSize={brushSize}
                isEraser={isEraser}
                onEmitStroke={onEmitStroke}
                canvasRef={canvasRef}
                renderedCountRef={renderedCountRef}
              />
            </div>
          </div>

          {/* Right/Bottom Action Area */}
          {isRoundOver ? (
            <div className="flex shrink-0 flex-col items-center justify-center gap-2">
              {gameState.roundStatus === 'round_over' && (
                <button
                  type="button"
                  onClick={() => onMove({ type: 'next_round' })}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-[#14532D] bg-[#16A34A] px-4 py-3 text-base font-black text-white shadow-lg active:translate-y-0.5"
                >
                  <span>Nächste Runde</span>
                  <ArrowRight className="h-5 w-5" />
                </button>
              )}
            </div>
          ) : isDrawer ? (
            <div className="flex shrink-0 flex-col gap-2 landscape:h-full landscape:justify-evenly">
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                {DRAW_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      onToggleEraser(false);
                      onSelectColor(c);
                    }}
                    style={{ backgroundColor: c }}
                    className={`h-7 w-7 rounded-full border-2 border-white shadow transition ${
                      !isEraser && brushColor === c ? 'scale-125 ring-2 ring-[#1E3A8A]' : 'opacity-85'
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center justify-center gap-2">
                {DRAW_SIZES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => onSelectSize(s)}
                    className={`flex h-8 w-8 items-center justify-center rounded-full border ${
                      brushSize === s
                        ? 'border-[#1E3A8A] bg-[#1E3A8A] text-white'
                        : 'border-[#1E293B]/25 text-[#1E293B]'
                    }`}
                  >
                    <span
                      className="rounded-full bg-current"
                      style={{ width: Math.max(4, s * 0.75), height: Math.max(4, s * 0.75) }}
                    />
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => onToggleEraser(!isEraser)}
                  aria-label="Radierer"
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    isEraser ? 'bg-[#1E3A8A] text-white' : 'bg-[#1E293B]/10 text-[#1E293B]'
                  }`}
                >
                  <Eraser className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={onUndo}
                  aria-label="Rückgängig"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1E293B]/10 text-[#1E293B]"
                >
                  <Undo2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={onClear}
                  aria-label="Alles löschen"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600/15 text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex shrink-0 flex-col gap-2 landscape:h-full landscape:justify-between">
              <div className="hidden min-h-0 flex-1 space-y-1 overflow-y-auto text-xs landscape:block">
                {gameState.guesses.slice(-6).map((g) => (
                  <div
                    key={g.id}
                    className={g.isCorrect ? 'font-black text-emerald-700' : 'text-[#475569]'}
                  >
                    <span className="font-bold">{g.playerName}:</span>{' '}
                    {g.isCorrect ? '✓ Erraten!' : g.text}
                  </div>
                ))}
              </div>

              {hasGuessed ? (
                <div className="py-2 text-center font-serif text-base font-black text-emerald-700">
                  ✓ Erraten!
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    onSubmitGuess();
                  }}
                  className="flex items-center gap-2 border-b-2 border-[#1E3A8A]/40 pb-1"
                >
                  <input
                    type="text"
                    value={guessInput}
                    onChange={(e) => onChangeGuess(e.target.value)}
                    placeholder="Wort raten…"
                    className="min-w-0 flex-1 bg-transparent py-1.5 text-base font-bold text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#16A34A] text-white shadow"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

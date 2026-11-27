import { Check, Eraser, Send, Trash2, Undo2, ArrowRight } from 'lucide-react';
import type {
  DrawAndGuessMove,
  DrawAndGuessState,
  Player,
  StrokeSegment,
} from '@projektbox/shared/types';
import { Avatar } from '../../../components/Avatar';
import studioPaperUrl from '../../../assets/textures/drawandguess/studio_paper_backdrop.jpg';
import { DrawCanvasSurface } from './DrawCanvasSurface';
import { DrawCustomWordModal } from './DrawCustomWordModal';

export const DRAW_COLORS = [
  '#0F172A',
  '#DC2626',
  '#EA580C',
  '#EAB308',
  '#16A34A',
  '#0284C7',
  '#7C3AED',
  '#EC4899',
  '#92400E',
  '#64748B',
];

export const DRAW_SIZES = [4, 9, 16];

interface DrawTvStageProps {
  gameState: DrawAndGuessState;
  allPlayers: Player[];
  myPlayer: Player;
  isTvScreen: boolean;
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

export function DrawTvStage({
  gameState,
  allPlayers,
  myPlayer,
  isTvScreen,
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
}: DrawTvStageProps) {
  const activePlayers = allPlayers.filter((p) => !p.isTvScreen);
  const drawer = activePlayers.find((p) => p.id === gameState.currentDrawerId);
  const myId = myPlayer?.id || '';
  const isRoundOver = gameState.roundStatus === 'round_over' || gameState.roundStatus === 'game_over';
  const hasGuessed = gameState.correctGuesserIds.includes(myId);
  const canDraw = !isTvScreen && isDrawer && gameState.roundStatus === 'drawing';

  const wordHint =
    isDrawer || isRoundOver
      ? gameState.secretWord || '—'
      : Array.from({ length: Math.max(1, gameState.wordLength || 0) }, () => '_').join(' ');

  return (
    <div
      className="relative flex h-full w-full flex-col justify-between overflow-y-auto lg:overflow-hidden bg-[#f5efe4] bg-cover bg-center px-5 pt-14 pb-4 text-[#1E293B] select-none sm:px-8 lg:pt-5"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(252,248,242,0.72), rgba(245,237,225,0.84)), url(${studioPaperUrl})`,
      }}
    >
      {gameState.roundStatus === 'choosing_word' ? (
        <DrawCustomWordModal
          isDrawer={!isTvScreen && isDrawer}
          drawerName={drawer?.name || 'Zeichner'}
          timeLeft={timeLeft}
          onConfirm={(word) => onMove({ type: 'set_word', word })}
        />
      ) : (
        <div className="mx-auto flex h-full w-full max-w-[1400px] min-h-0 flex-1 flex-col justify-between gap-3">
          {/* Open Top Header Strip (pl-24 reserves MENÜ zone) */}
          <header className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-[#B45309]/20 pb-2.5 pl-24 lg:pl-28">
            <div className="flex items-center gap-4">
              <div className="leading-tight">
                <div className="text-xs font-bold tracking-widest text-[#B45309] uppercase">
                  Runde {gameState.round}/{gameState.maxRounds} • {gameState.categoryName}
                </div>
                <div className="font-serif text-xl font-black tracking-widest text-[#0F172A] sm:text-2xl">
                  {wordHint}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              {activePlayers.map((p) => {
                const drawing = p.id === gameState.currentDrawerId;
                const guessed = gameState.correctGuesserIds.includes(p.id);
                return (
                  <div key={p.id} className="flex items-center gap-2">
                    <Avatar config={p.avatar} size={30} />
                    <div className="leading-tight">
                      <div className="flex items-center gap-1 text-xs font-bold text-[#0F172A]">
                        <span>{p.name}</span>
                        {drawing && <span className="text-[#B45309]">✎</span>}
                        {guessed && <Check className="h-3.5 w-3.5 text-emerald-600" />}
                      </div>
                      <div className="text-xs font-black tabular-nums text-[#1E3A8A]">
                        {gameState.scores[p.id] ?? 0} Pkt
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="h-6 w-px bg-[#1E293B]/20" />

              <span
                className={`font-serif text-2xl font-black leading-none tabular-nums ${
                  timeLeft <= 10 && gameState.roundStatus === 'drawing'
                    ? 'animate-pulse text-[#DC2626]'
                    : 'text-[#1E3A8A]'
                }`}
              >
                {timeLeft}s
              </span>
            </div>
          </header>

          {/* Main 2-Column Open Studio Stage */}
          <div className="grid flex-1 min-h-0 grid-cols-1 items-center gap-5 lg:grid-cols-[1fr_320px]">
            {/* Left: Crisp 4:3 Drawing Canvas */}
            <div className="flex h-full min-h-0 flex-col items-center justify-center gap-2">
              <div className="w-full max-w-[760px]">
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

              {/* Desktop Solo/Host Drawer Tools */}
              {canDraw && (
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
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
                  <div className="mx-1 h-5 w-px bg-[#1E293B]/20" />
                  {DRAW_SIZES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => onSelectSize(s)}
                      className={`flex h-7 w-7 items-center justify-center rounded-full border transition ${
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
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                      isEraser ? 'bg-[#1E3A8A] text-white' : 'bg-[#1E293B]/10 text-[#1E293B]'
                    }`}
                  >
                    <Eraser className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={onUndo}
                    className="rounded-lg bg-[#1E293B]/10 px-2.5 py-1 text-[#1E293B] hover:bg-[#1E293B]/20"
                  >
                    <Undo2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={onClear}
                    className="rounded-lg bg-red-600/12 px-2.5 py-1 text-red-700 hover:bg-red-600/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Right: Open Guess Feed + Result Action */}
            <div className="flex h-full min-h-0 flex-col justify-between gap-3 border-l border-[#1E293B]/15 pl-4">
              <div className="text-xs font-black tracking-widest text-[#B45309] uppercase">
                Tipps & Verlauf
              </div>

              <div className="flex-1 min-h-0 space-y-1.5 overflow-y-auto pr-1">
                {gameState.guesses.length === 0 ? (
                  <div className="text-sm text-[#64748B]">Noch keine Tipps abgegeben…</div>
                ) : (
                  gameState.guesses.slice(-14).map((g) => (
                    <div
                      key={g.id}
                      className={`flex items-baseline justify-between gap-2 border-b border-[#1E293B]/10 pb-1 text-sm ${
                        g.isCorrect ? 'font-black text-emerald-700' : 'text-[#1E293B]'
                      }`}
                    >
                      <span className="shrink-0 text-xs font-bold text-[#475569]">
                        {g.playerName}:
                      </span>
                      <span className="truncate font-bold">
                        {g.isCorrect ? '✓ Erraten!' : g.text}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {!isTvScreen && !isDrawer && !isRoundOver && !hasGuessed && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    onSubmitGuess();
                  }}
                  className="flex items-center gap-2 border-t border-[#1E293B]/20 pt-2"
                >
                  <input
                    type="text"
                    value={guessInput}
                    onChange={(e) => onChangeGuess(e.target.value)}
                    placeholder="Wort raten…"
                    className="min-w-0 flex-1 border-b-2 border-[#1E3A8A]/35 bg-transparent py-1.5 text-sm font-bold text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#1E3A8A] focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#16A34A] text-white shadow"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              )}

              {!isTvScreen && isRoundOver && gameState.roundStatus === 'round_over' && (
                <button
                  type="button"
                  onClick={() => onMove({ type: 'next_round' })}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-[#14532D] bg-[#16A34A] py-3 text-base font-black text-white shadow-lg transition active:translate-y-0.5"
                >
                  <span>Nächste Runde</span>
                  <ArrowRight className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

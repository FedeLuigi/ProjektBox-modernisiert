import { useEffect, useRef, useState } from 'react';
import {
  Check,
  Eraser,
  Paintbrush,
  Send,
  Sparkles,
  Trash2,
  Trophy,
} from 'lucide-react';
import type { GameRendererProps } from '../types';

export interface StrokeSegment {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  color: string;
  size: number;
}

export interface DrawAndGuessGuess {
  id: string;
  playerId: string;
  playerName: string;
  text: string;
  isCorrect: boolean;
  timestamp: number;
}

export interface DrawAndGuessState {
  gameId: 'draw-and-guess';
  currentDrawerId: string;
  secretWord: string;
  wordHint: string;
  categoryName: string;
  round: number;
  maxRounds: number;
  strokes: StrokeSegment[];
  guesses: DrawAndGuessGuess[];
  scores: Record<string, number>;
  correctGuesserIds: string[];
  roundStatus: 'drawing' | 'round_over' | 'game_over';
  roundWinnerName?: string;
  winnerId?: string | null;
}

const COLORS = [
  '#000000', // Schwarz
  '#E11D48', // Rot
  '#2563EB', // Blau
  '#059669', // Grün
  '#D97706', // Orange
  '#7C3AED', // Violett
  '#DB2777', // Pink
  '#FFFFFF', // Radierer / Weiß
];

const BRUSH_SIZES = [
  { label: 'Fein', size: 2.5 },
  { label: 'Mittel', size: 5 },
  { label: 'Dick', size: 10 },
];

export function DrawAndGuessBoard({
  gameState,
  myPlayer,
  onMove,
  disabled,
}: GameRendererProps<DrawAndGuessState>) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const [currentColor, setCurrentColor] = useState('#000000');
  const [currentSize, setCurrentSize] = useState(5);
  const [guessInput, setGuessInput] = useState('');

  const isDrawer = !myPlayer?.isTvScreen && myPlayer.id === gameState?.currentDrawerId;
  const hasGuessedCorrectly = Boolean(
    myPlayer.id && gameState?.correctGuesserIds?.includes(myPlayer.id)
  );
  const isRoundOver = gameState?.roundStatus === 'round_over';

  // 1. Leinwand bei neuen Strokes synchronisieren
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Hintergrund weiß zeichnen
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    if (!gameState?.strokes || gameState.strokes.length === 0) return;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const stroke of gameState.strokes) {
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      // Strichbreite proportional zur Canvas-Breite skalieren
      ctx.lineWidth = Math.max(1, stroke.size * (width / 320));
      ctx.moveTo(stroke.x0 * width, stroke.y0 * height);
      ctx.lineTo(stroke.x1 * width, stroke.y1 * height);
      ctx.stroke();
    }
  }, [gameState?.strokes]);

  // 2. Zeichnen-Event-Handler (Touch & Pointer)
  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    return {
      x: Math.max(0, Math.min(1, x)),
      y: Math.max(0, Math.min(1, y)),
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawer || disabled || isRoundOver) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    const coords = getCanvasCoords(e);
    lastPointRef.current = coords;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !lastPointRef.current || !isDrawer || disabled || isRoundOver) {
      return;
    }

    const currentCoords = getCanvasCoords(e);
    const stroke: StrokeSegment = {
      x0: lastPointRef.current.x,
      y0: lastPointRef.current.y,
      x1: currentCoords.x,
      y1: currentCoords.y,
      color: currentColor,
      size: currentSize,
    };

    lastPointRef.current = currentCoords;

    // Lokales direktes Zeichnen für latenzfreies Feedback
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.beginPath();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = Math.max(1, stroke.size * (canvas.width / 320));
        ctx.moveTo(stroke.x0 * canvas.width, stroke.y0 * canvas.height);
        ctx.lineTo(stroke.x1 * canvas.width, stroke.y1 * canvas.height);
        ctx.stroke();
      }
    }

    // Stroke über Socket senden
    onMove({ type: 'stroke', stroke });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDrawingRef.current) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
    isDrawingRef.current = false;
    lastPointRef.current = null;
  };

  // 3. Leinwand leeren
  const handleClear = () => {
    if (!isDrawer || disabled) return;
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
    onMove({ type: 'clear' });
  };

  // 4. Wort-Tipp absenden
  const handleGuessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = guessInput.trim();
    if (!text || isDrawer || hasGuessedCorrectly || isRoundOver) return;
    onMove({ type: 'guess', text });
    setGuessInput('');
  };

  // 5. Nächste Runde starten
  const handleNextRound = () => {
    onMove({ type: 'next_round' });
  };

  return (
    <div className="flex flex-col items-center w-full max-w-lg mx-auto select-none">
      {/* ─── KOPFBEREICH: ROLLE & WORT-ANZEIGE ─── */}
      <div className="w-full flex items-center justify-between px-3 py-2 mb-2 rounded-2xl bg-white/[0.06] ring-1 ring-white/10 backdrop-blur-md">
        <div className="flex items-center gap-2">
          {isDrawer ? (
            <div className="flex items-center gap-1.5 text-xs font-black uppercase text-amber-400">
              <Paintbrush className="h-4 w-4" />
              <span>Du zeichnest!</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs font-black uppercase text-purple-400">
              <Sparkles className="h-4 w-4" />
              <span>Rate das Wort</span>
            </div>
          )}
        </div>

        {/* Geheimes Wort für den Zeichner, Buchstaben-Hinweis für Rater */}
        <div className="flex items-center gap-2">
          {isDrawer ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30 font-black text-sm">
              <span>Wort:</span>
              <strong className="underline underline-offset-2">{gameState?.secretWord}</strong>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/30 font-mono font-black text-xs sm:text-sm tracking-wider">
              <span>{gameState?.wordHint || '_ _ _ _'}</span>
            </div>
          )}

          <span className="text-[10px] text-[#8E8E93] hidden sm:inline">
            ({gameState?.categoryName})
          </span>
        </div>
      </div>

      {/* ─── LEINWAND (CANVAS) ─── */}
      <div className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden ring-4 ring-white/20 shadow-2xl bg-white touch-none">
        <canvas
          ref={canvasRef}
          width={400}
          height={300}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`w-full h-full block ${isDrawer ? 'cursor-crosshair' : 'cursor-default'}`}
        />

        {/* Erfolgs-Banner für Rater */}
        {hasGuessedCorrectly && !isDrawer && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500 text-black font-black text-xs shadow-lg animate-bounce">
            <Check className="h-3.5 w-3.5 stroke-[3]" />
            <span>Erraten! +100</span>
          </div>
        )}

        {/* Runden-Ende Overlay */}
        {isRoundOver && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center animate-fade-in z-20">
            <Trophy className="h-10 w-10 text-amber-400 mb-2 animate-bounce" />
            <h3 className="text-xl font-black text-white">Runde beendet!</h3>
            <p className="mt-1 text-xs text-[#AEAEB2]">
              Das gesuchte Wort war: <strong className="text-amber-400 uppercase text-sm">{gameState.secretWord}</strong>
            </p>
            {gameState.roundWinnerName && (
              <p className="mt-1 text-xs text-emerald-400 font-bold">
                🎉 {gameState.roundWinnerName} hat zuerst richtig geraten!
              </p>
            )}

            <button
              type="button"
              onClick={handleNextRound}
              className="mt-4 px-6 py-2.5 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-extrabold text-xs shadow-lg active:scale-95 cursor-pointer"
            >
              Nächste Runde starten ➡️
            </button>
          </div>
        )}
      </div>

      {/* ─── MAL-WERKZEUGE (NUR FÜR ZEICHNER) ─── */}
      {isDrawer && !isRoundOver && (
        <div className="w-full mt-2.5 p-2.5 rounded-2xl bg-white/[0.06] ring-1 ring-white/10 backdrop-blur-md flex flex-col gap-2">
          {/* Farbpalette */}
          <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1">
            <div className="flex items-center gap-1.5">
              {COLORS.map((col) => (
                <button
                  key={col}
                  type="button"
                  onClick={() => setCurrentColor(col)}
                  className={`h-7 w-7 rounded-full transition-transform active:scale-90 cursor-pointer flex items-center justify-center ${
                    currentColor === col
                      ? 'ring-2 ring-white scale-110 shadow-md'
                      : 'ring-1 ring-black/20 hover:scale-105'
                  }`}
                  style={{ backgroundColor: col }}
                >
                  {col === '#FFFFFF' && <Eraser className="h-3.5 w-3.5 text-black" />}
                </button>
              ))}
            </div>

            {/* Pinselgrößen & Löschen */}
            <div className="flex items-center gap-1.5 shrink-0 pl-2 border-l border-white/10">
              {BRUSH_SIZES.map((b) => (
                <button
                  key={b.size}
                  type="button"
                  onClick={() => setCurrentSize(b.size)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    currentSize === b.size
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-white/10 text-[#8E8E93] hover:text-white'
                  }`}
                >
                  {b.label}
                </button>
              ))}

              <button
                type="button"
                onClick={handleClear}
                title="Leinwand leeren"
                className="p-1.5 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 transition-colors active:scale-90 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── RATE-EINGABE (FÜR RATER AUF SMARTPHONE) ─── */}
      {!isDrawer && !myPlayer?.isTvScreen && !isRoundOver && (
        <form onSubmit={handleGuessSubmit} className="w-full mt-2.5 flex items-center gap-2">
          <input
            type="text"
            value={guessInput}
            onChange={(e) => setGuessInput(e.target.value)}
            disabled={hasGuessedCorrectly}
            placeholder={hasGuessedCorrectly ? 'Du hast es bereits erraten! 🎉' : 'Tippe deine Vermutung ein...'}
            className="flex-1 px-4 py-3 rounded-2xl bg-white/[0.08] ring-1 ring-white/15 focus:ring-2 focus:ring-purple-500 outline-none text-white text-xs sm:text-sm placeholder:text-white/30"
          />

          <button
            type="submit"
            disabled={!guessInput.trim() || hasGuessedCorrectly}
            className={`px-5 py-3 rounded-2xl font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-md ${
              guessInput.trim() && !hasGuessedCorrectly
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-purple-500/25'
                : 'bg-white/10 text-white/30 ring-1 ring-white/10 cursor-not-allowed'
            }`}
          >
            <Send className="h-3.5 w-3.5" />
            <span>Raten</span>
          </button>
        </form>
      )}

      {/* ─── LIVE-RATE-FEED (CHAT) ─── */}
      <div className="w-full mt-2.5 max-h-24 overflow-y-auto overscroll-contain flex flex-col gap-1 p-2 rounded-2xl bg-black/40 ring-1 ring-white/10 scrollbar-none">
        {gameState?.guesses && gameState.guesses.length > 0 ? (
          gameState.guesses.slice(0, 8).map((g) => (
            <div
              key={g.id}
              className={`text-[11px] px-2 py-0.5 rounded-lg flex items-center justify-between ${
                g.isCorrect
                  ? 'bg-emerald-500/20 text-emerald-300 font-black ring-1 ring-emerald-500/30'
                  : 'text-[#AEAEB2]'
              }`}
            >
              <span>
                <strong>{g.playerName}:</strong> {g.text}
              </span>
              {g.isCorrect && <span>Richtig! 🎉</span>}
            </div>
          ))
        ) : (
          <span className="text-[10px] text-[#636366] text-center py-1">
            Noch keine Tipps abgegeben. Wer errät das Bild zuerst?
          </span>
        )}
      </div>
    </div>
  );
}

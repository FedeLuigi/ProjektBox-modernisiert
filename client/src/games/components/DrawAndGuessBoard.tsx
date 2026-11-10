import { useEffect, useRef, useState } from 'react';
import {
  Check,
  Clock,
  Eraser,
  Paintbrush,
  Send,
  Sparkles,
  Trash2,
  Trophy,
  Tv,
} from 'lucide-react';
import type { GameRendererProps } from '../types';
import { socketService } from '../../services/socket';

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
  roundDuration?: number;
  roundEndsAt?: number;
  strokes: StrokeSegment[];
  guesses: DrawAndGuessGuess[];
  scores: Record<string, number>;
  correctGuesserIds: string[];
  roundStatus: 'drawing' | 'round_over' | 'game_over';
  roundWinnerName?: string;
  roundEndReason?: 'guessed' | 'time_up';
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
  opponent,
  allPlayers,
  onMove,
  disabled: _disabled,
}: GameRendererProps<DrawAndGuessState>) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const strokeBufferRef = useRef<StrokeSegment[]>([]);
  const flushTimeoutRef = useRef<any>(null);
  const renderedRoundRef = useRef<number | null>(null);
  const renderedCountRef = useRef<number>(0);

  const [currentColor, setCurrentColor] = useState('#000000');
  const [currentSize, setCurrentSize] = useState(5);
  const [guessInput, setGuessInput] = useState('');

  const isTv = Boolean(myPlayer?.isTvScreen);
  const isDrawer = !isTv && myPlayer?.id === gameState?.currentDrawerId;

  const drawerPlayer =
    allPlayers?.find((p) => p.id === gameState?.currentDrawerId) ||
    (isDrawer ? myPlayer : opponent);

  const hasGuessedCorrectly = Boolean(
    myPlayer?.id && gameState?.correctGuesserIds?.includes(myPlayer.id)
  );
  const isRoundOver = gameState?.roundStatus === 'round_over';

  // 1. Runden-Timer (Live-Countdown)
  const [timeLeft, setTimeLeft] = useState(() => {
    if (!gameState?.roundEndsAt) return 60;
    return Math.max(0, Math.ceil((gameState.roundEndsAt - Date.now()) / 1000));
  });

  useEffect(() => {
    if (gameState?.roundStatus !== 'drawing' || !gameState?.roundEndsAt) return;

    const updateTimer = () => {
      const remaining = Math.max(0, Math.ceil((gameState.roundEndsAt! - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        if (isDrawer) {
          onMove({ type: 'time_up' });
        }
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 500);
    return () => clearInterval(interval);
  }, [gameState?.roundEndsAt, gameState?.roundStatus, isDrawer, onMove]);

  // 2. Automatischer Rollen-Wechsel nach Runden-Ende (3 Sekunden Countdown)
  const [transitionCountdown, setTransitionCountdown] = useState(3);
  useEffect(() => {
    if (gameState?.roundStatus !== 'round_over') return;

    setTransitionCountdown(3);
    const timer = setInterval(() => {
      setTransitionCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Nur der aktive Zeichner triggert den Rundenwechsel (verhindert Mehrfachaufrufe)
          if (isDrawer) {
            onMove({ type: 'next_round' });
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState?.roundStatus, isDrawer, onMove]);

  // 3. Live-Strokes vom Socket sofort auf die Leinwand zeichnen (für Fernseher & Zuschauer)
  useEffect(() => {
    const unsubStrokes = socketService.onLiveStrokes(({ strokes }) => {
      if (isDrawer) return; // Zeichner hat bereits lokal gerendert

      const canvas = canvasRef.current;
      if (!canvas || !strokes || strokes.length === 0) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (const stroke of strokes) {
        ctx.beginPath();
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = Math.max(1, stroke.size * (width / 400));
        ctx.moveTo(stroke.x0 * width, stroke.y0 * height);
        ctx.lineTo(stroke.x1 * width, stroke.y1 * height);
        ctx.stroke();
      }
      renderedCountRef.current += strokes.length;
    });

    const unsubClear = socketService.onLiveClear(() => {
      if (isDrawer) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      renderedCountRef.current = 0;
    });

    return () => {
      unsubStrokes();
      unsubClear();
    };
  }, [isDrawer]);

  // 4. Leinwand bei neuem Runden-Start oder Spielstand-Initialisierung abgleichen
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    const currentRound = gameState?.round ?? 1;
    const isRoundChanged = renderedRoundRef.current !== currentRound;

    if (isRoundChanged || !gameState?.strokes || gameState.strokes.length === 0) {
      renderedRoundRef.current = currentRound;
      renderedCountRef.current = 0;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
    }

    if (!gameState?.strokes || gameState.strokes.length === 0) return;

    // Nur Striche nachzeichnen, die noch nicht auf der Leinwand sind
    if (isRoundChanged || renderedCountRef.current < gameState.strokes.length) {
      const startIndex = isRoundChanged ? 0 : renderedCountRef.current;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (let i = startIndex; i < gameState.strokes.length; i++) {
        const stroke = gameState.strokes[i];
        ctx.beginPath();
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = Math.max(1, stroke.size * (width / 400));
        ctx.moveTo(stroke.x0 * width, stroke.y0 * height);
        ctx.lineTo(stroke.x1 * width, stroke.y1 * height);
        ctx.stroke();
      }
      renderedCountRef.current = gameState.strokes.length;
    }
  }, [gameState?.round, gameState?.strokes]);

  // 5. Flushen des Echtzeit-Puffers für geschmeidiges Streamen zum Fernseher
  const flushStrokes = () => {
    if (strokeBufferRef.current.length === 0) return;
    const batch = [...strokeBufferRef.current];
    strokeBufferRef.current = [];
    socketService.emitStrokes(batch);
  };

  // 6. Zeichnen-Event-Handler für den Zeichner (Pointer/Touch)
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
    if (!isDrawer || isRoundOver) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    const coords = getCanvasCoords(e);
    lastPointRef.current = coords;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !lastPointRef.current || !isDrawer || isRoundOver) {
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

    // Direktes lokales Rendern für 0ms latenzfreies Zeichnen auf dem Handy
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.beginPath();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = Math.max(1, stroke.size * (canvas.width / 400));
        ctx.moveTo(stroke.x0 * canvas.width, stroke.y0 * canvas.height);
        ctx.lineTo(stroke.x1 * canvas.width, stroke.y1 * canvas.height);
        ctx.stroke();
      }
    }

    // In Echtzeit puffern und flushen (~35 FPS zum Fernseher)
    strokeBufferRef.current.push(stroke);
    if (!flushTimeoutRef.current) {
      flushTimeoutRef.current = setTimeout(() => {
        flushTimeoutRef.current = null;
        flushStrokes();
      }, 25);
    }
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

    if (flushTimeoutRef.current) {
      clearTimeout(flushTimeoutRef.current);
      flushTimeoutRef.current = null;
    }
    flushStrokes();
  };

  const handleClear = () => {
    if (!isDrawer || isRoundOver) return;
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
    socketService.emitClearCanvas();
    onMove({ type: 'clear' });
  };

  const handleGuessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = guessInput.trim();
    if (!text || isDrawer || hasGuessedCorrectly || isRoundOver) return;
    onMove({ type: 'guess', text });
    setGuessInput('');
  };

  const latestGuess = gameState?.guesses?.[0];

  // ═════════════════════════════════════════════════════════════════════════════
  // A) FERNSEHER-ANSICHT: OPTIMIERTE LEINWAND (PASST SICH PERFEKT AN)
  // ═════════════════════════════════════════════════════════════════════════════
  if (isTv) {
    return (
      <div className="relative w-full aspect-[4/3] max-h-[48vh] sm:max-h-[52vh] rounded-3xl overflow-hidden ring-4 ring-purple-500/30 shadow-[0_0_50px_rgba(168,85,247,0.25)] bg-white mx-auto flex items-center justify-center select-none">
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          className="w-full h-full block cursor-default"
        />

        {/* Runden-Ende Overlay auf Fernseher */}
        {isRoundOver && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in z-20">
            <Trophy className="h-12 w-12 text-amber-400 mb-2 animate-bounce" />
            <h3 className="text-xl sm:text-2xl font-black text-white">Runde beendet!</h3>
            <p className="mt-1 text-xs sm:text-sm text-[#AEAEB2]">
              Das gesuchte Wort war:{' '}
              <strong className="text-amber-400 text-lg uppercase tracking-wider block mt-0.5">
                {gameState.secretWord}
              </strong>
            </p>
            {gameState.roundWinnerName ? (
              <p className="mt-2 text-xs sm:text-sm text-emerald-400 font-extrabold">
                🎉 {gameState.roundWinnerName} hat das Wort erraten! (+100 Punkte)
              </p>
            ) : (
              <p className="mt-2 text-xs sm:text-sm text-amber-300 font-bold">
                ⏱️ Zeit abgelaufen! Niemand hat das Wort erraten.
              </p>
            )}
            <div className="mt-3 inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 text-xs text-purple-300 font-bold ring-1 ring-white/15">
              <span>Rollenwechsel in {transitionCountdown}s...</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // B) SMARTPHONE-ANSICHT: DER ZEICHNER (VOLLE LEINWAND, MAL-WERKZEUGE, KEIN RATEN)
  // ═════════════════════════════════════════════════════════════════════════════
  if (isDrawer) {
    return (
      <div className="flex flex-col items-center w-full max-w-md mx-auto select-none h-full justify-between">
        {/* Kopfzeile: Geheimes Wort & Timer */}
        <div className="w-full flex items-center justify-between px-3.5 py-2 mb-2 rounded-2xl bg-white/[0.07] ring-1 ring-white/15 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs font-black uppercase text-amber-400">
              <Paintbrush className="h-4 w-4" />
              <span>Du zeichnest:</span>
            </div>
            <strong className="text-white text-base font-black underline underline-offset-4 tracking-wide">
              {gameState?.secretWord}
            </strong>
          </div>

          <div
            className={`flex items-center gap-1.5 px-3 py-0.5 rounded-full font-mono font-black text-xs ring-1 ${
              timeLeft <= 10
                ? 'bg-rose-500/30 text-rose-300 ring-rose-500/50 animate-pulse'
                : 'bg-white/10 text-white ring-white/20'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>{timeLeft}s</span>
          </div>
        </div>

        {/* Große Zeichnen-Leinwand (Maximale Höhe auf Smartphone) */}
        <div className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden ring-4 ring-amber-400/40 shadow-2xl bg-white touch-none flex-1 max-h-[380px]">
          <canvas
            ref={canvasRef}
            width={400}
            height={300}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="w-full h-full block cursor-crosshair"
          />

          {/* Toast wenn Mitspieler rät */}
          {latestGuess && (
            <div className="absolute top-2.5 right-2.5 max-w-[220px] truncate px-3 py-1 rounded-full bg-black/75 backdrop-blur-md text-white text-[11px] font-bold ring-1 ring-white/20 animate-fade-in">
              {latestGuess.playerName}: &quot;{latestGuess.text}&quot; {latestGuess.isCorrect ? '✅' : '❌'}
            </div>
          )}

          {/* Runden-Ende Overlay */}
          {isRoundOver && (
            <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center animate-fade-in z-20">
              <Trophy className="h-10 w-10 text-amber-400 mb-2 animate-bounce" />
              <h3 className="text-xl font-black text-white">Runde vorbei!</h3>
              <p className="mt-1 text-xs text-[#AEAEB2]">
                Das Wort war: <strong className="text-amber-400 text-sm uppercase">{gameState.secretWord}</strong>
              </p>
              {gameState.roundWinnerName && (
                <p className="mt-1 text-xs text-emerald-400 font-extrabold">
                  🎉 {gameState.roundWinnerName} hat es erraten!
                </p>
              )}
              <div className="mt-3 text-xs font-bold text-purple-300">
                Rollenwechsel in {transitionCountdown}s... (Du bist gleich Rater!)
              </div>
            </div>
          )}
        </div>

        {/* Mal-Werkzeuge (Kompakt unter der Leinwand) */}
        {!isRoundOver && (
          <div className="w-full mt-2.5 p-2.5 rounded-2xl bg-white/[0.06] ring-1 ring-white/10 backdrop-blur-md flex flex-col gap-2 shrink-0">
            <div className="flex items-center justify-between gap-1">
              {/* Farb-Palette */}
              <div className="flex items-center gap-1.5 overflow-x-auto">
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
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // C) SMARTPHONE-ANSICHT: DER RATER (MALEN AUSGEBLENDET, GROSSES RATE-FELD)
  // ═════════════════════════════════════════════════════════════════════════════
  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto select-none h-full justify-between">
      {/* Kopfzeile: Status & Timer */}
      <div className="w-full flex items-center justify-between px-3.5 py-2 mb-2 rounded-2xl bg-white/[0.07] ring-1 ring-white/15 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-400" />
          <span className="text-xs font-black uppercase text-purple-300">
            Du räts! Kategorie: {gameState?.categoryName}
          </span>
        </div>

        <div
          className={`flex items-center gap-1.5 px-3 py-0.5 rounded-full font-mono font-black text-xs ring-1 ${
            timeLeft <= 10
              ? 'bg-rose-500/30 text-rose-300 ring-rose-500/50 animate-pulse'
              : 'bg-white/10 text-white ring-white/20'
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          <span>{timeLeft}s</span>
        </div>
      </div>

      {/* TV-Zuschauer Karte (Malen ist ausgeblendet; Fernseher zeigt das Bild) */}
      <div className="w-full p-4 rounded-3xl bg-gradient-to-b from-purple-900/25 to-indigo-900/15 ring-2 ring-purple-500/30 backdrop-blur-xl flex flex-col items-center text-center my-auto">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/20 text-purple-300 mb-2 ring-1 ring-purple-500/30 shadow-lg">
          <Tv className="h-6 w-6" />
        </div>

        <h3 className="text-base font-black text-white">Schau auf den Fernseher!</h3>
        <p className="text-xs text-[#AEAEB2] mt-0.5">
          <strong className="text-purple-300">{drawerPlayer?.name || 'Dein Mitspieler'}</strong> malt gerade das Bild.
        </p>

        {/* Buchstaben-Hinweis in Großanzeige */}
        <div className="mt-3 px-5 py-2.5 rounded-2xl bg-white/[0.08] ring-1 ring-white/15 text-center font-mono font-black text-2xl sm:text-3xl tracking-[0.3em] text-purple-300">
          {gameState?.wordHint || '_ _ _ _'}
        </div>

        {hasGuessedCorrectly && (
          <div className="mt-3 flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500 text-black font-black text-xs shadow-lg animate-bounce">
            <Check className="h-4 w-4 stroke-[3]" />
            <span>Du hast es richtig erraten! (+100 Punkte)</span>
          </div>
        )}

        {isRoundOver && (
          <div className="mt-3 text-xs font-bold text-amber-300">
            Das Wort war: <strong className="uppercase">{gameState.secretWord}</strong> • Rollenwechsel in {transitionCountdown}s...
          </div>
        )}
      </div>

      {/* ─── GROSSES RATE-EINGABEFELD (HERO AUF DEM SMARTPHONE) ─── */}
      {!isRoundOver && (
        <form onSubmit={handleGuessSubmit} className="w-full mt-3 flex flex-col gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={guessInput}
              onChange={(e) => setGuessInput(e.target.value)}
              disabled={hasGuessedCorrectly}
              placeholder={
                hasGuessedCorrectly
                  ? 'Du hast es bereits erraten! 🎉'
                  : 'Was wird gemalt? Tippe hier...'
              }
              className="flex-1 px-4 py-3.5 rounded-2xl bg-white/[0.08] ring-2 ring-purple-500/40 focus:ring-purple-400 outline-none text-white text-base placeholder:text-white/30"
            />

            <button
              type="submit"
              disabled={!guessInput.trim() || hasGuessedCorrectly}
              className={`px-5 py-3.5 rounded-2xl font-black text-sm flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-lg ${
                guessInput.trim() && !hasGuessedCorrectly
                  ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 text-white shadow-purple-500/30'
                  : 'bg-white/10 text-white/30 ring-1 ring-white/10 cursor-not-allowed'
              }`}
            >
              <Send className="h-4 w-4" />
              <span>Raten</span>
            </button>
          </div>
        </form>
      )}

      {/* ─── WAS ERRATEN WURDE (LIVE-FEED) ─── */}
      <div className="w-full mt-2.5 max-h-36 overflow-y-auto overscroll-contain flex flex-col gap-1 p-2.5 rounded-2xl bg-black/40 ring-1 ring-white/10 shrink-0">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#8E8E93] px-1">
          Bisherige Tipps ({gameState?.guesses?.length || 0})
        </span>
        {gameState?.guesses && gameState.guesses.length > 0 ? (
          gameState.guesses.slice(0, 8).map((g) => (
            <div
              key={g.id}
              className={`text-xs px-2.5 py-1 rounded-xl flex items-center justify-between ${
                g.isCorrect
                  ? 'bg-emerald-500/25 text-emerald-300 font-black ring-1 ring-emerald-500/40'
                  : 'bg-white/[0.04] text-[#AEAEB2]'
              }`}
            >
              <span>
                <strong>{g.playerName}:</strong> &quot;{g.text}&quot;
              </span>
              <span>{g.isCorrect ? '✅ Richtig (+100)' : '❌'}</span>
            </div>
          ))
        ) : (
          <span className="text-xs text-[#636366] text-center py-2 italic">
            Noch keine Tipps. Tippe oben deine Vermutung ein!
          </span>
        )}
      </div>
    </div>
  );
}

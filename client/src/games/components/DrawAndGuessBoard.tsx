import { useEffect, useRef, useState } from 'react';
import {
  Check,
  Clock,
  Eraser,
  Paintbrush,
  Send,
  Trash2,
  Trophy,
  X,
} from 'lucide-react';
import type { GameRendererProps } from '../types';
import { socketService } from '../../services/socket';
import { BTN_PRIMARY_DISABLED, BTN_PRIMARY_ENABLED } from '../../styles/uiTokens';

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
  isTvMode,
}: GameRendererProps<DrawAndGuessState>) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const prevCanvasElRef = useRef<HTMLCanvasElement | null>(null);
  const canvasStageRef = useRef<HTMLDivElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const strokeBufferRef = useRef<StrokeSegment[]>([]);
  const flushTimeoutRef = useRef<any>(null);
  const renderedRoundRef = useRef<number | null>(null);
  const renderedCountRef = useRef<number>(0);

  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number } | null>(null);
  const [currentColor, setCurrentColor] = useState('#000000');
  const [currentSize, setCurrentSize] = useState(5);
  const [guessInput, setGuessInput] = useState('');
  const [isWrongGuess, setIsWrongGuess] = useState(false);
  const [wrongText, setWrongText] = useState<string | null>(null);
  const guessInputRef = useRef<HTMLInputElement | null>(null);

  const isTv = Boolean(myPlayer?.isTvScreen);
  const isDrawer = !isTv && myPlayer?.id === gameState?.currentDrawerId;
  const needsCanvas = isDrawer || (!isTv && !isTvMode);

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
    const isNewCanvas = prevCanvasElRef.current !== canvas;
    if (isNewCanvas) {
      prevCanvasElRef.current = canvas;
    }
    const isRoundChanged = isNewCanvas || renderedRoundRef.current !== currentRound;

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
  }, [gameState?.round, gameState?.strokes, isDrawer, isTvMode]);

  // 5. Flushen des Echtzeit-Puffers für geschmeidiges Streamen zum Fernseher
  const flushStrokes = () => {
    if (strokeBufferRef.current.length === 0) return;
    const batch = [...strokeBufferRef.current];
    strokeBufferRef.current = [];
    socketService.emitStrokes(batch);
  };

  // 5b. Zeichenfläche im Hoch- und Querformat exakt 4:3 an den verfügbaren Platz anpassen
  useEffect(() => {
    if (!needsCanvas) return;
    const stageEl = canvasStageRef.current;
    if (!stageEl) return;

    let rotateTimer: number | null = null;
    let rafId: number | null = null;

    const measure = () => {
      const target = canvasStageRef.current;
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const usableW = Math.max(120, Math.min(520, Math.floor(rect.width) - 8));
      const usableH = Math.max(90, Math.floor(rect.height) - 8);

      let width = Math.min(usableW, Math.floor(usableH * (4 / 3)));
      let height = Math.floor(width * (3 / 4));
      if (height > usableH) {
        height = usableH;
        width = Math.floor(height * (4 / 3));
      }

      setCanvasSize((prev) =>
        prev && prev.width === width && prev.height === height ? prev : { width, height }
      );
    };

    const scheduleMeasure = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(measure);
    };

    const handleOrientationChange = () => {
      scheduleMeasure();
      if (rotateTimer !== null) window.clearTimeout(rotateTimer);
      rotateTimer = window.setTimeout(scheduleMeasure, 120);
    };

    scheduleMeasure();

    const observer =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => scheduleMeasure())
        : null;
    observer?.observe(stageEl);

    window.addEventListener('resize', scheduleMeasure);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', scheduleMeasure);
      window.removeEventListener('orientationchange', handleOrientationChange);
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (rotateTimer !== null) window.clearTimeout(rotateTimer);
    };
  }, [needsCanvas, isRoundOver]);

  // 6. Zeichnen-Event-Handler für den Zeichner (Pointer/Touch)
  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return lastPointRef.current ?? { x: 0, y: 0 };
    }
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

  const handleGuessSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = guessInput.trim();
    if (!text || isDrawer || hasGuessedCorrectly || isRoundOver) return;
    onMove({ type: 'guess', text });
    setGuessInput('');
    setTimeout(() => {
      guessInputRef.current?.focus();
    }, 50);
  };

  const latestGuess = gameState?.guesses?.[0];

  // Feedback bei falschem Rateversuch
  useEffect(() => {
    if (!latestGuess) return;
    if (latestGuess.playerId === myPlayer?.id && !latestGuess.isCorrect) {
      setIsWrongGuess(true);
      setWrongText(`"${latestGuess.text}" ist leider nicht richtig`);
      const timer = setTimeout(() => {
        setIsWrongGuess(false);
        setWrongText(null);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [latestGuess, myPlayer?.id]);

  // Eingabe bei neuer Runde zurücksetzen
  useEffect(() => {
    setGuessInput('');
    setIsWrongGuess(false);
    setWrongText(null);
  }, [gameState?.round]);

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

        {/* Runden-Ende Overlay auf Fernseher: zentriert, aufgeräumt, auf das Wesentliche reduziert */}
        {isRoundOver && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center animate-fade-in z-20">
            <span className="text-[11px] sm:text-xs font-black uppercase tracking-widest text-[#8E8E93]">
              Gesuchtes Wort
            </span>

            {/* Großes Wort als Highlight (gelb leuchtend) */}
            <div className="text-4xl sm:text-5xl lg:text-6xl font-black uppercase tracking-[0.2em] text-amber-300 drop-shadow-[0_0_35px_rgba(252,211,77,0.7)] animate-pulse my-2">
              {gameState.secretWord}
            </div>

            {/* In einem klaren Satz: wer es erraten hat und wer gezeichnet hat */}
            <p className="mt-1 text-xs sm:text-sm text-zinc-300 font-medium max-w-md leading-relaxed">
              {gameState.roundWinnerName ? (
                <span>
                  🎉 <strong className="text-emerald-400 font-black">{gameState.roundWinnerName}</strong> hat das Wort erraten • Gezeichnet von <strong className="text-white font-black">{drawerPlayer?.name || 'Zeichner'}</strong>
                </span>
              ) : (
                <span>
                  ⏱️ Niemand hat das Wort erraten • Gezeichnet von <strong className="text-white font-black">{drawerPlayer?.name || 'Zeichner'}</strong>
                </span>
              )}
            </p>

            {/* Dezenter Countdown-Balken für die nächste Runde */}
            <div className="mt-6 flex flex-col items-center gap-1.5 w-full max-w-xs">
              <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden ring-1 ring-white/15">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-amber-400 rounded-full transition-all duration-1000 ease-linear"
                  style={{ width: `${Math.max(0, (transitionCountdown / 3) * 100)}%` }}
                />
              </div>
              <span className="text-[11px] font-semibold text-purple-300">
                Nächste Runde in {transitionCountdown}s...
              </span>
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
      <div className="flex flex-col items-center w-full max-w-2xl mx-auto select-none h-full min-h-0 justify-between">
        {/* Schmale Infozeile: Geheimes Wort & Timer */}
        <div className="w-full flex items-center justify-between px-1 pb-1.5 landscape:pb-1 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Paintbrush className="h-4 w-4 text-amber-400 shrink-0" />
            <strong className="text-white text-sm sm:text-base font-black tracking-wide uppercase truncate">
              {gameState?.secretWord}
            </strong>
          </div>

          <div
            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono font-black text-xs ring-1 shrink-0 ${
              timeLeft <= 10
                ? 'bg-rose-500/30 text-rose-300 ring-rose-500/50 animate-pulse'
                : 'bg-white/10 text-white ring-white/15'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>{timeLeft}s</span>
          </div>
        </div>

        {/* Dynamisch skalierende 4:3 Zeichenfläche (passt sich im Hoch- & Querformat an die Höhe an) */}
        <div
          ref={canvasStageRef}
          className="relative flex-1 min-h-0 w-full flex items-center justify-center py-0.5"
        >
          <div
            style={
              canvasSize
                ? { width: `${canvasSize.width}px`, height: `${canvasSize.height}px` }
                : undefined
            }
            className={`relative rounded-2xl sm:rounded-3xl overflow-hidden ring-4 ring-amber-400/40 shadow-2xl bg-white touch-none ${
              canvasSize ? '' : 'w-full max-w-md aspect-[4/3] max-h-full'
            }`}
          >
            <canvas
              ref={canvasRef}
              width={400}
              height={300}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="w-full h-full block touch-none cursor-crosshair"
            />

            {/* Toast wenn Mitspieler rät */}
            {latestGuess && (
              <div className="pointer-events-none absolute top-2.5 right-2.5 max-w-[220px] truncate px-3 py-1 rounded-full bg-black/75 backdrop-blur-md text-white text-[11px] font-bold ring-1 ring-white/20 animate-fade-in">
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
        </div>

        {/* Mal-Werkzeuge (Genug Innenabstand damit der aktive weiße Auswahlrahmen nicht abgeschnitten wird) */}
        {!isRoundOver && (
          <div className="w-full mt-1.5 landscape:mt-1 px-2.5 py-1.5 rounded-2xl bg-white/[0.06] ring-1 ring-white/10 backdrop-blur-md shrink-0 overflow-visible">
            <div className="flex items-center justify-between gap-2">
              {/* Farb-Palette mit vertikalem & horizontalem Schutzabstand für ring-2 + scale-110 */}
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none px-2 py-2">
                {COLORS.map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => setCurrentColor(col)}
                    aria-label={col === '#FFFFFF' ? 'Radierer' : `Farbe ${col}`}
                    className={`h-7 w-7 shrink-0 rounded-full transition-transform active:scale-90 cursor-pointer flex items-center justify-center ${
                      currentColor === col
                        ? 'ring-2 ring-white scale-110 shadow-md'
                        : 'ring-1 ring-black/25 hover:scale-105'
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
  // C) SMARTPHONE-ANSICHT: DER RATER (MIT LIVE-ZEICHNUNG OHNE TV, CLEAN IM TV-MODUS)
  // ═════════════════════════════════════════════════════════════════════════════
  const hintTokens = gameState?.wordHint ? gameState.wordHint.split(' ') : [];
  const targetLength =
    isRoundOver && gameState?.secretWord
      ? gameState.secretWord.length
      : Math.max(hintTokens.length, 1);

  const totalSlots = Math.max(targetLength, guessInput.length);
  const slotIndices = Array.from({ length: totalSlots }, (_, i) => i);

  const slotSizeClass = !isTvMode
    ? totalSlots <= 5
      ? 'w-10 h-12 sm:w-11 sm:h-14 text-xl sm:text-2xl rounded-xl'
      : totalSlots <= 7
      ? 'w-8 h-10 sm:w-10 sm:h-12 text-lg sm:text-xl rounded-xl'
      : 'w-7 h-9 sm:w-8 sm:h-11 text-sm sm:text-base rounded-lg'
    : totalSlots <= 5
    ? 'w-11 h-14 sm:w-13 sm:h-16 text-2xl sm:text-3xl rounded-2xl'
    : totalSlots <= 7
    ? 'w-9 h-12 sm:w-11 sm:h-14 text-xl sm:text-2xl rounded-xl'
    : 'w-7.5 h-10 sm:w-9 sm:h-12 text-base sm:text-lg rounded-lg';

  const recentGuesses = gameState?.guesses?.slice(0, 3) || [];

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto select-none h-full min-h-0 justify-between">
      {/* 1. Schmale Infozeile: Wer malt & Timer */}
      <div className="w-full flex items-center justify-between px-1 pb-1.5 landscape:pb-1 shrink-0">
        <div className="flex items-center gap-2 min-w-0 text-xs">
          <span className="font-bold text-white truncate">
            {drawerPlayer?.name || 'Mitspieler'} malt
          </span>
          {gameState?.categoryName && (
            <span className="text-[#8E8E93] truncate">• {gameState.categoryName}</span>
          )}
        </div>

        <div
          className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono font-black text-xs ring-1 shrink-0 ${
            timeLeft <= 10
              ? 'bg-rose-500/30 text-rose-300 ring-rose-500/50 animate-pulse'
              : 'bg-white/10 text-white ring-white/15'
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          <span>{timeLeft}s</span>
        </div>
      </div>

      {/* 2. OHNE TV-MODUS: Live-Zeichnung direkt über der Eingabe */}
      {!isTvMode && (
        <div
          ref={canvasStageRef}
          className="relative flex-1 min-h-0 w-full flex items-center justify-center py-0.5"
        >
          <div
            style={
              canvasSize
                ? { width: `${canvasSize.width}px`, height: `${canvasSize.height}px` }
                : undefined
            }
            className={`relative rounded-2xl sm:rounded-3xl overflow-hidden ring-2 ring-purple-500/35 shadow-2xl bg-white ${
              canvasSize ? '' : 'w-full max-w-md aspect-[4/3] max-h-full'
            }`}
          >
            <canvas
              ref={canvasRef}
              width={400}
              height={300}
              className="w-full h-full block"
            />

            {isRoundOver && (
              <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center animate-fade-in z-20">
                <Trophy className="h-9 w-9 text-amber-400 mb-1.5 animate-bounce" />
                <span className="text-xs font-semibold text-[#AEAEB2]">Gesuchtes Wort</span>
                <strong className="text-amber-300 text-xl font-black uppercase tracking-wider mt-0.5">
                  {gameState.secretWord}
                </strong>
                <div className="mt-2 text-xs font-bold text-purple-300">
                  Nächste Runde in {transitionCountdown}s...
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. OFFENER EINGABEBEREICH (OHNE KÄSTEN IN KÄSTEN) */}
      <div
        className={`w-full max-w-md flex flex-col items-center text-center shrink-0 ${
          isTvMode ? 'my-auto py-2' : 'pt-2 landscape:pt-1'
        } ${isWrongGuess ? 'screen-shake' : ''}`}
      >
        {hasGuessedCorrectly && (
          <div className="mb-2 flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-500 text-black font-black text-xs shadow-md">
            <Check className="h-3.5 w-3.5 stroke-[3]" />
            <span>Erraten! (+100)</span>
          </div>
        )}

        {isTvMode && isRoundOver && !hasGuessedCorrectly && (
          <div className="mb-2 px-3.5 py-1 rounded-full bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/40 font-bold text-xs">
            Runde vorbei • Weiter in {transitionCountdown}s
          </div>
        )}

        {/* Interaktive Buchstaben-Lücken */}
        <div
          onClick={() => guessInputRef.current?.focus()}
          className="relative flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 py-1 w-full cursor-text"
        >
          <input
            ref={guessInputRef}
            type="text"
            value={guessInput}
            onChange={(e) => {
              const val = e.target.value.replace(/[^a-zA-ZäöüÄÖÜß -]/g, '');
              if (val.length <= Math.max(targetLength + 4, 15)) {
                setGuessInput(val);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleGuessSubmit();
              }
            }}
            disabled={hasGuessedCorrectly || isRoundOver}
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className="absolute inset-0 w-full h-full opacity-0 cursor-text z-10"
            aria-label="Lösungswort eingeben"
          />

          {slotIndices.map((idx) => {
            if (isRoundOver && gameState?.secretWord) {
              const char = gameState.secretWord[idx]?.toUpperCase() || '';
              return (
                <div
                  key={idx}
                  className={`relative flex items-center justify-center font-mono font-black transition-all bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/50 ${slotSizeClass}`}
                >
                  {char}
                </div>
              );
            }

            const typedChar = guessInput[idx]?.toUpperCase() || '';
            const hintChar =
              hintTokens[idx] && hintTokens[idx] !== '_' ? hintTokens[idx].toUpperCase() : '';
            const displayChar = typedChar || hintChar || '';
            const isTyped = Boolean(typedChar);
            const isHintOnly = !isTyped && Boolean(hintChar);
            const isActive =
              idx === Math.min(guessInput.length, totalSlots - 1) && !hasGuessedCorrectly;

            return (
              <div
                key={idx}
                className={`relative flex items-center justify-center font-mono font-black transition-all ${slotSizeClass} ${
                  hasGuessedCorrectly
                    ? 'bg-emerald-500/25 text-emerald-300 ring-2 ring-emerald-400'
                    : isActive
                    ? 'bg-purple-600/30 text-white ring-2 ring-purple-400 scale-105'
                    : isTyped
                    ? 'bg-white/20 text-white ring-1 ring-white/40'
                    : isHintOnly
                    ? 'bg-purple-500/10 text-purple-300/65 ring-1 ring-purple-500/25 border border-dashed border-purple-400/30'
                    : 'bg-white/[0.05] text-white/20 ring-1 ring-white/12'
                }`}
              >
                {displayChar}
                {isActive && !hasGuessedCorrectly && !isRoundOver && (
                  <span className="absolute bottom-1.5 inset-x-2 h-0.5 bg-purple-400 rounded-full animate-pulse" />
                )}
              </div>
            );
          })}
        </div>

        {wrongText && (
          <div className="mt-1 text-xs font-bold text-rose-300 animate-fade-in">
            {wrongText}
          </div>
        )}

        {/* Senden & Löschen */}
        {!isRoundOver && !hasGuessedCorrectly && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleGuessSubmit();
            }}
            className="mt-2 flex items-center justify-center gap-2 w-full max-w-xs relative z-20"
          >
            {guessInput.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setGuessInput('');
                  guessInputRef.current?.focus();
                }}
                aria-label="Eingabe löschen"
                className="h-10 px-3 rounded-full bg-white/10 hover:bg-white/15 text-white/75 hover:text-white text-xs font-bold ring-1 ring-white/10 transition-all active:scale-95 cursor-pointer flex items-center gap-1"
              >
                <X className="h-3.5 w-3.5" />
                <span>Löschen</span>
              </button>
            )}

            <button
              type="submit"
              disabled={!guessInput.trim()}
              className={`flex-1 h-10 px-5 rounded-full font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-95 ${
                guessInput.trim() ? BTN_PRIMARY_ENABLED : BTN_PRIMARY_DISABLED
              }`}
            >
              <Send className="h-3.5 w-3.5" />
              <span>Tipp absenden</span>
            </button>
          </form>
        )}

        {/* Letzte Tipps nur zeigen, wenn vorhanden */}
        {recentGuesses.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5 w-full">
            {recentGuesses.map((g) => (
              <span
                key={g.id}
                className={`text-[11px] px-2.5 py-0.5 rounded-full ring-1 ${
                  g.isCorrect
                    ? 'bg-emerald-500/20 text-emerald-300 ring-emerald-500/35 font-bold'
                    : 'bg-white/[0.05] text-[#AEAEB2] ring-white/10'
                }`}
              >
                {g.text}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check,
  Clock,
  Delete,
  Eraser,
  Paintbrush,
  Send,
  Trash2,
  Undo2,
} from 'lucide-react';
import type { GameRendererProps } from '../types';
import { socketService } from '../../services/socket';
import { BTN_PRIMARY_DISABLED, getGameTheme } from '../../styles/uiTokens';

export interface StrokeSegment {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  color: string;
  size: number;
  strokeId?: number;
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
  '#6B7280', // Grau
  '#FFFFFF', // Weiß / Radierer
  '#8B4513', // Braun
  '#DC2626', // Rot
  '#EA580C', // Orange
  '#EAB308', // Gelb
  '#84CC16', // Hellgrün
  '#16A34A', // Grün
  '#06B6D4', // Hellblau / Cyan
  '#2563EB', // Blau
  '#7C3AED', // Lila / Violett
  '#EC4899', // Pink
  '#FBCFE8', // Rosa / Hautfarbe
];

function renderAllStrokes(
  ctx: CanvasRenderingContext2D,
  strokes: StrokeSegment[],
  width: number,
  height: number
) {
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const stroke of strokes) {
    const isDot = stroke.x0 === stroke.x1 && stroke.y0 === stroke.y1;
    if (isDot) {
      ctx.beginPath();
      ctx.fillStyle = stroke.color;
      const r = Math.max(1, (stroke.size * (width / 400)) / 2);
      ctx.arc(stroke.x0 * width, stroke.y0 * height, r, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = Math.max(1, stroke.size * (width / 400));
      ctx.moveTo(stroke.x0 * width, stroke.y0 * height);
      ctx.lineTo(stroke.x1 * width, stroke.y1 * height);
      ctx.stroke();
    }
  }
}

const BRUSH_SIZES = [
  { label: 'Fein', size: 2.5 },
  { label: 'Mittel', size: 5 },
  { label: 'Dick', size: 10 },
];

const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Z', 'U', 'I', 'O', 'P', 'Ü'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ö', 'Ä'],
  ['Y', 'X', 'C', 'V', 'B', 'N', 'M'],
];

export function DrawAndGuessBoard({
  gameId = 'draw-and-guess',
  gameState,
  myPlayer,
  opponent,
  allPlayers,
  isGameOver,
  onMove,
  disabled: _disabled,
  isTvMode,
}: GameRendererProps<DrawAndGuessState>) {
  const theme = getGameTheme(gameId);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const prevCanvasElRef = useRef<HTMLCanvasElement | null>(null);
  const canvasStageRef = useRef<HTMLDivElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const currentStrokeIdRef = useRef<number>(0);
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
        const isDot = stroke.x0 === stroke.x1 && stroke.y0 === stroke.y1;
        if (isDot) {
          ctx.beginPath();
          ctx.fillStyle = stroke.color;
          const r = Math.max(1, (stroke.size * (width / 400)) / 2);
          ctx.arc(stroke.x0 * width, stroke.y0 * height, r, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.strokeStyle = stroke.color;
          ctx.lineWidth = Math.max(1, stroke.size * (width / 400));
          ctx.moveTo(stroke.x0 * width, stroke.y0 * height);
          ctx.lineTo(stroke.x1 * width, stroke.y1 * height);
          ctx.stroke();
        }
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

    const unsubUndo = socketService.onLiveUndo(({ strokes }) => {
      if (isDrawer) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      renderAllStrokes(ctx, strokes, canvas.width, canvas.height);
      renderedCountRef.current = strokes.length;
    });

    return () => {
      unsubStrokes();
      unsubClear();
      unsubUndo();
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
    const strokes = gameState?.strokes || [];

    if (isRoundChanged || renderedCountRef.current > strokes.length) {
      renderedRoundRef.current = currentRound;
      renderAllStrokes(ctx, strokes, width, height);
      renderedCountRef.current = strokes.length;
      return;
    }

    if (strokes.length === 0) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      renderedCountRef.current = 0;
      return;
    }

    // Nur Striche nachzeichnen, die noch nicht auf der Leinwand sind
    if (renderedCountRef.current < strokes.length) {
      const startIndex = renderedCountRef.current;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (let i = startIndex; i < strokes.length; i++) {
        const stroke = strokes[i];
        const isDot = stroke.x0 === stroke.x1 && stroke.y0 === stroke.y1;
        if (isDot) {
          ctx.beginPath();
          ctx.fillStyle = stroke.color;
          const r = Math.max(1, (stroke.size * (width / 400)) / 2);
          ctx.arc(stroke.x0 * width, stroke.y0 * height, r, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.strokeStyle = stroke.color;
          ctx.lineWidth = Math.max(1, stroke.size * (width / 400));
          ctx.moveTo(stroke.x0 * width, stroke.y0 * height);
          ctx.lineTo(stroke.x1 * width, stroke.y1 * height);
          ctx.stroke();
        }
      }
      renderedCountRef.current = strokes.length;
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

    const strokeId = Date.now() + Math.random();
    currentStrokeIdRef.current = strokeId;

    // Sofort runden Punkt setzen (ermöglicht Tap/Klick ohne Ziehen)
    const dotStroke: StrokeSegment = {
      x0: coords.x,
      y0: coords.y,
      x1: coords.x,
      y1: coords.y,
      color: currentColor,
      size: currentSize,
      strokeId,
    };

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.beginPath();
        ctx.fillStyle = currentColor;
        const r = Math.max(1, (currentSize * (canvas.width / 400)) / 2);
        ctx.arc(coords.x * canvas.width, coords.y * canvas.height, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    strokeBufferRef.current.push(dotStroke);
    if (!flushTimeoutRef.current) {
      flushTimeoutRef.current = setTimeout(() => {
        flushTimeoutRef.current = null;
        flushStrokes();
      }, 25);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !lastPointRef.current || !isDrawer || isRoundOver) {
      return;
    }

    const currentCoords = getCanvasCoords(e);
    if (
      Math.abs(currentCoords.x - lastPointRef.current.x) < 0.001 &&
      Math.abs(currentCoords.y - lastPointRef.current.y) < 0.001
    ) {
      return;
    }

    const stroke: StrokeSegment = {
      x0: lastPointRef.current.x,
      y0: lastPointRef.current.y,
      x1: currentCoords.x,
      y1: currentCoords.y,
      color: currentColor,
      size: currentSize,
      strokeId: currentStrokeIdRef.current,
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

  const handleUndo = () => {
    if (!isDrawer || isRoundOver) return;

    // Laufenden Puffer leeren
    flushStrokes();

    const currentStrokes = gameState?.strokes || [];
    if (currentStrokes.length === 0) return;

    const lastSeg = currentStrokes[currentStrokes.length - 1];
    let remaining: StrokeSegment[] = [];
    if (lastSeg?.strokeId !== undefined) {
      const targetId = lastSeg.strokeId;
      remaining = currentStrokes.filter((s) => s.strokeId !== targetId);
    } else {
      remaining = currentStrokes.slice(0, -1);
    }

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        renderAllStrokes(ctx, remaining, canvas.width, canvas.height);
        renderedCountRef.current = remaining.length;
      }
    }

    socketService.emitUndo();
    onMove({ type: 'undo' });
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
    renderedCountRef.current = 0;
    socketService.emitClearCanvas();
    onMove({ type: 'clear' });
  };

  const hintTokens = gameState?.wordHint ? gameState.wordHint.split(' ') : [];
  const targetLength =
    isRoundOver && gameState?.secretWord
      ? gameState.secretWord.length
      : Math.max(hintTokens.length, 1);

  const handleGuessSubmit = useCallback(() => {
    const text = guessInput.trim();
    if (!text || isDrawer || hasGuessedCorrectly || isRoundOver) return;
    onMove({ type: 'guess', text });
    setGuessInput('');
  }, [guessInput, isDrawer, hasGuessedCorrectly, isRoundOver, onMove]);

  const handleKeyboardChar = useCallback(
    (char: string) => {
      if (isDrawer || hasGuessedCorrectly || isRoundOver) return;
      setGuessInput((prev) => (prev.length < targetLength ? prev + char : prev));
    },
    [isDrawer, hasGuessedCorrectly, isRoundOver, targetLength]
  );

  const handleKeyboardBackspace = useCallback(() => {
    if (isDrawer || hasGuessedCorrectly || isRoundOver) return;
    setGuessInput((prev) => prev.slice(0, -1));
  }, [isDrawer, hasGuessedCorrectly, isRoundOver]);

  // Physische Tastatur am Desktop unterstützen, ohne auf Mobilgeräten die Systemtastatur zu öffnen
  useEffect(() => {
    if (isTv || isDrawer || hasGuessedCorrectly || isRoundOver) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'Backspace') {
        e.preventDefault();
        handleKeyboardBackspace();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleGuessSubmit();
      } else if (/^[a-zA-ZäöüÄÖÜ]$/.test(e.key)) {
        e.preventDefault();
        handleKeyboardChar(e.key.toUpperCase());
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isTv,
    isDrawer,
    hasGuessedCorrectly,
    isRoundOver,
    handleKeyboardBackspace,
    handleKeyboardChar,
    handleGuessSubmit,
  ]);

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
  if (isGameOver) {
    return null;
  }

  if (isTv) {
    return (
      <div className={`relative w-full aspect-[4/3] max-h-[48vh] sm:max-h-[52vh] rounded-3xl overflow-hidden ${theme.tvCanvasRing} bg-white mx-auto flex items-center justify-center select-none`}>
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
            {transitionCountdown > 0 && (
              <div className="mt-6 flex flex-col items-center gap-1.5 w-full max-w-xs">
                <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden ring-1 ring-white/15">
                  <div
                    className={`h-full bg-gradient-to-r ${theme.progressGradient} rounded-full transition-all duration-1000 ease-linear`}
                    style={{ width: `${Math.max(0, (transitionCountdown / 3) * 100)}%` }}
                  />
                </div>
                <span className={`text-[11px] font-semibold ${theme.accentText}`}>
                  Nächste Runde in {transitionCountdown}s...
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // B) SMARTPHONE-ANSICHT: RUNDENENDE-SCREEN (ZENTRIERT, KOMPAKT, EINHEITLICHES DESIGN)
  // ═════════════════════════════════════════════════════════════════════════════
  if (isRoundOver && !isTv) {
    return (
      <div className="my-auto mx-auto flex w-full flex-1 min-h-0 items-center justify-center p-3 animate-fade-in select-none">
        <div className="relative w-full max-w-sm rounded-3xl bg-[#14141E]/95 p-6 text-center ring-1 ring-white/15 shadow-2xl backdrop-blur-2xl flex flex-col items-center gap-4 overflow-hidden">
          {/* Typischer Farb-Glow im einheitlichen App-Design */}
          <div className={`pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full blur-2xl opacity-40 ${theme.ambientTop}`} />
          <div className={`pointer-events-none absolute -bottom-12 -left-12 h-32 w-32 rounded-full blur-2xl opacity-35 ${theme.ambientBottom}`} />

          {/* Kleiner Runden-Status */}
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#8E8E93]">
            Runde beendet
          </span>

          {/* Gesuchtes Wort groß und deutlich */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-3xl sm:text-4xl font-black uppercase tracking-[0.18em] text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-200 to-yellow-400 drop-shadow-[0_0_25px_rgba(252,211,77,0.45)]">
              {gameState?.secretWord}
            </span>
          </div>

          {/* Info, wer es erraten hat – klar und ohne überflüssige Doppel-Texte */}
          <div className="w-full">
            {gameState?.roundWinnerName ? (
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-4 py-2 ring-1 ring-emerald-500/35 text-xs sm:text-sm font-bold text-emerald-300">
                <span>🎉</span>
                <span>
                  <strong className="text-white font-black">{gameState.roundWinnerName}</strong> hat das Wort erraten!
                </span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-4 py-2 ring-1 ring-white/10 text-xs sm:text-sm font-semibold text-zinc-300">
                <span>⏱️</span>
                <span>Niemand hat das Wort erraten</span>
              </div>
            )}
          </div>

          {/* Countdown zur nächsten Runde */}
          {transitionCountdown > 0 && (
            <div className="w-full max-w-xs flex flex-col items-center gap-1.5 pt-1">
              <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden ring-1 ring-white/15">
                <div
                  className={`h-full bg-gradient-to-r ${theme.progressGradient} rounded-full transition-all duration-1000 ease-linear`}
                  style={{ width: `${Math.max(0, (transitionCountdown / 3) * 100)}%` }}
                />
              </div>
              <span className={`text-[11px] font-semibold ${theme.accentText}`}>
                Nächste Runde in {transitionCountdown}s...
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // C) SMARTPHONE-ANSICHT: DER ZEICHNER (HOCHFORMAT GESTAPELT, QUERFORMAT 2-SPALTIG)
  // ═════════════════════════════════════════════════════════════════════════════
  if (isDrawer) {
    return (
      <div
        className="flex flex-col items-center w-full max-w-2xl landscape:max-w-5xl mx-auto select-none h-full min-h-0 justify-between landscape:grid landscape:grid-cols-[minmax(0,1fr)_16.5rem] sm:landscape:grid-cols-[minmax(0,1fr)_18rem] landscape:grid-rows-[auto_1fr] landscape:items-stretch landscape:gap-x-3.5 landscape:gap-y-2"
      >
        {/* Schöne zentrierte Wortanzeige & Timer direkt über der Zeichenfläche */}
        <div className="w-full flex items-center justify-between gap-2 px-1 pb-1 shrink-0 landscape:col-start-1 landscape:row-start-1">
          {/* Pinsel-Icon / Status links */}
          <div className="flex items-center gap-1.5 text-amber-400 w-14 sm:w-16 shrink-0">
            <Paintbrush className={`h-4 w-4 ${theme.accentIcon} shrink-0`} />
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider hidden xs:inline text-white/70">
              Malt
            </span>
          </div>

          {/* Zu malendes Wort: GROSS, VOLLSTÄNDIG LESBAR UND MITTIG */}
          <div className="flex-1 flex flex-col items-center justify-center text-center px-1 min-w-0">
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-[#8E8E93] leading-none mb-0.5">
              Zu malendes Wort
            </span>
            <span className="text-lg sm:text-2xl landscape:text-xl font-black uppercase tracking-wider text-amber-300 drop-shadow-[0_0_15px_rgba(252,211,77,0.35)] break-words max-w-full leading-tight">
              {gameState?.secretWord}
            </span>
          </div>

          {/* Timer sauber rechts */}
          <div className="w-14 sm:w-16 flex justify-end shrink-0">
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono font-black text-xs ring-1 shrink-0 ${
                timeLeft <= 10
                  ? 'bg-rose-500/30 text-rose-300 ring-rose-500/50 animate-pulse'
                  : 'bg-white/10 text-white ring-white/15'
              }`}
            >
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span>{timeLeft}s</span>
            </div>
          </div>
        </div>

        {/* Dynamisch skalierende 4:3 Zeichenfläche (im Querformat links) */}
        <div
          ref={canvasStageRef}
          className="relative flex-1 min-h-0 w-full flex items-center justify-center py-0.5 landscape:col-start-1 landscape:row-start-2 landscape:h-full"
        >
          <div
            style={
              canvasSize
                ? { width: `${canvasSize.width}px`, height: `${canvasSize.height}px` }
                : undefined
            }
            className={`relative rounded-2xl sm:rounded-3xl overflow-hidden ${theme.canvasRing} shadow-2xl bg-white touch-none ${
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
          </div>
        </div>

        {/* Mal-Werkzeuge: Hochkant Leiste unten, Querformat rechte Spalte */}
        <div className="w-full mt-1.5 landscape:mt-0 p-2 sm:p-2.5 landscape:p-3 rounded-3xl bg-white/[0.05] ring-1 ring-white/10 backdrop-blur-md shrink-0 overflow-visible landscape:col-start-2 landscape:row-start-1 landscape:row-span-2 landscape:self-center">
          <div className="flex items-center justify-between gap-3 landscape:flex-col landscape:items-stretch landscape:gap-3.5">
            {/* Farb-Palette mit 14 Farben (mit großzügigem Abstand & Ring-Offset, kein Aneinanderkleben) */}
            <div className="flex items-center gap-2.5 sm:gap-3 overflow-x-auto overscroll-x-contain scrollbar-none px-2 py-2 shrink-0 landscape:grid landscape:grid-cols-7 landscape:gap-2 sm:landscape:gap-2.5 landscape:justify-items-center landscape:overflow-visible landscape:p-1">
              {COLORS.map((col) => {
                const isSelected = currentColor === col;
                return (
                  <button
                    key={col}
                    type="button"
                    onClick={() => setCurrentColor(col)}
                    aria-label={col === '#FFFFFF' ? 'Radierer / Weiß' : `Farbe ${col}`}
                    className={`h-7 w-7 sm:h-7.5 sm:w-7.5 landscape:h-7 landscape:w-7 shrink-0 rounded-full transition-transform active:scale-90 cursor-pointer flex items-center justify-center ${
                      isSelected
                        ? 'ring-2 ring-white ring-offset-2 ring-offset-[#14141E] scale-105 shadow-md z-10'
                        : 'ring-1 ring-white/20 hover:scale-105'
                    }`}
                    style={{ backgroundColor: col }}
                  >
                    {col === '#FFFFFF' && <Eraser className="h-3.5 w-3.5 text-black" />}
                  </button>
                );
              })}
            </div>

            {/* Pinselgrößen, Undo & Löschen */}
            <div className="flex items-center gap-2 shrink-0 pl-2 border-l border-white/10 landscape:pl-0 landscape:border-l-0 landscape:pt-2.5 landscape:border-t landscape:border-white/10 landscape:justify-between">
              <div className="flex items-center gap-1.5">
                {BRUSH_SIZES.map((b) => (
                  <button
                    key={b.size}
                    type="button"
                    onClick={() => setCurrentSize(b.size)}
                    className={`px-2.5 landscape:px-2.5 py-1.5 landscape:py-1 rounded-xl text-[10px] landscape:text-[11px] font-bold transition-all cursor-pointer ${
                      currentSize === b.size
                        ? theme.brushActive
                        : 'bg-white/10 text-[#8E8E93] hover:text-white'
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleUndo}
                  title="Letzten Strich rückgängig machen"
                  aria-label="Rückgängig"
                  className="p-1.5 sm:p-2 landscape:p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors active:scale-90 cursor-pointer"
                >
                  <Undo2 className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={handleClear}
                  title="Leinwand leeren"
                  aria-label="Leinwand löschen"
                  className="p-1.5 sm:p-2 landscape:p-2 rounded-xl bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 transition-colors active:scale-90 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // D) SMARTPHONE-ANSICHT: DER RATER (HOCHFORMAT UNTEREINANDER, QUERFORMAT NEBENEINANDER)
  // ═════════════════════════════════════════════════════════════════════════════
  const totalSlots = Math.max(targetLength, guessInput.length);
  const slotIndices = Array.from({ length: totalSlots }, (_, i) => i);

  const slotSizeClass = !isTvMode
    ? totalSlots <= 5
      ? 'w-10 h-10 sm:w-11 sm:h-12 landscape:w-9 landscape:h-10 text-lg sm:text-2xl landscape:text-base rounded-xl landscape:rounded-lg'
      : totalSlots <= 8
      ? 'w-8 h-9 sm:w-10 sm:h-11 landscape:w-8 landscape:h-9 text-base sm:text-xl landscape:text-sm rounded-xl landscape:rounded-lg'
      : 'w-[26px] h-8 sm:w-8 sm:h-10 landscape:w-7 landscape:h-8 text-sm sm:text-base landscape:text-xs rounded-lg'
    : totalSlots <= 5
    ? 'w-11 h-12 sm:w-13 sm:h-14 landscape:w-10 landscape:h-11 text-xl sm:text-3xl landscape:text-lg rounded-2xl landscape:rounded-xl'
    : totalSlots <= 8
    ? 'w-9 h-10 sm:w-11 sm:h-12 landscape:w-9 landscape:h-10 text-lg sm:text-2xl landscape:text-base rounded-xl landscape:rounded-lg'
    : 'w-[26px] h-9 sm:w-9 sm:h-11 landscape:w-7 landscape:h-9 text-sm sm:text-lg landscape:text-sm rounded-lg';

  const recentGuesses = gameState?.guesses?.slice(0, 3) || [];
  const isRaterTwoColLandscape = !isTvMode && !isRoundOver;

  return (
    <div
      className={`flex flex-col items-center w-full max-w-2xl ${
        isRaterTwoColLandscape
          ? 'landscape:max-w-5xl landscape:grid landscape:grid-cols-[minmax(0,0.92fr)_minmax(18.5rem,1.08fr)] landscape:grid-rows-[auto_1fr] landscape:items-stretch landscape:gap-x-3 landscape:gap-y-1.5'
          : 'landscape:max-w-3xl'
      } mx-auto select-none h-full min-h-0 justify-between`}
    >
      {/* 1. Schmale Infozeile ohne Themen-Anzeige: Wer malt & Timer (bei Rundenende ausgeblendet) */}
      {!isRoundOver && (
        <div
          className={`w-full flex items-center justify-between gap-2 px-1 pb-1 shrink-0 ${
            isRaterTwoColLandscape ? 'landscape:col-start-2 landscape:row-start-1 landscape:pb-0' : ''
          }`}
        >
          <span className="text-xs font-bold text-white truncate">
            {drawerPlayer?.name || 'Mitspieler'} malt
          </span>

          {wrongText && (
            <span className="truncate rounded-full bg-rose-500/20 px-2.5 py-0.5 text-[11px] font-bold text-rose-300 ring-1 ring-rose-500/35 animate-fade-in">
              {wrongText}
            </span>
          )}

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
      )}

      {/* 2. OHNE TV-MODUS: Live-Zeichnung (Hochkant oben, Querformat links volle Höhe) */}
      {!isTvMode && (
        <div
          ref={canvasStageRef}
          className={`relative flex-1 min-h-0 w-full flex items-center justify-center py-0.5 ${
            isRaterTwoColLandscape
              ? 'landscape:col-start-1 landscape:row-start-1 landscape:row-span-2 landscape:h-full'
              : ''
          }`}
        >
          <div
            style={
              canvasSize
                ? { width: `${canvasSize.width}px`, height: `${canvasSize.height}px` }
                : undefined
            }
            className={`relative rounded-2xl sm:rounded-3xl overflow-hidden ${theme.canvasRing} shadow-2xl bg-white ${
              canvasSize ? '' : 'w-full max-w-md aspect-[4/3] max-h-full'
            }`}
          >
            <canvas
              ref={canvasRef}
              width={400}
              height={300}
              className="w-full h-full block"
            />
          </div>
        </div>
      )}

      {/* 3. BUCHSTABEN-PLATZHALTER & TASTATUR (Querformat rechts neben Leinwand oder TV-Modus zentriert) */}
      {!(isRoundOver && !isTvMode) && (
        <div
          className={`w-full max-w-lg flex flex-col items-center text-center shrink-0 ${
            isRaterTwoColLandscape
              ? 'landscape:col-start-2 landscape:row-start-2 landscape:self-center landscape:max-w-none landscape:pt-0'
              : isTvMode
              ? 'my-auto py-1'
              : 'pt-1.5 landscape:pt-1'
          } ${isWrongGuess ? 'screen-shake' : ''}`}
        >
          {hasGuessedCorrectly && (
            <div className="mb-1.5 flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-500 text-black font-black text-xs shadow-md">
              <Check className="h-3.5 w-3.5 stroke-[3]" />
              <span>Erraten! (+100)</span>
            </div>
          )}

          {isTvMode && isRoundOver && !hasGuessedCorrectly && transitionCountdown > 0 && (
            <div className="mb-1.5 px-3.5 py-1 rounded-full bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/40 font-bold text-xs">
              Weiter in {transitionCountdown}s
            </div>
          )}

          {/* Leere Buchstaben-Platzhalter (keine vorab ausgefüllten Hinweise) */}
          <div
            className={`flex flex-wrap items-center justify-center w-full ${
              totalSlots > 8 ? 'gap-1' : 'gap-1.5 sm:gap-2'
            } py-1 landscape:py-1.5`}
          >
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
              const isTyped = Boolean(typedChar);
              const isActive =
                idx === Math.min(guessInput.length, totalSlots - 1) &&
                !hasGuessedCorrectly &&
                !isRoundOver;

              return (
                <div
                  key={idx}
                  className={`relative flex items-center justify-center font-mono font-black transition-all ${slotSizeClass} ${
                    hasGuessedCorrectly
                      ? 'bg-emerald-500/25 text-emerald-300 ring-2 ring-emerald-400'
                      : isActive
                      ? theme.slotActive
                      : isTyped
                      ? 'bg-white/20 text-white ring-1 ring-white/40'
                      : 'bg-white/[0.05] text-white/20 ring-1 ring-white/12'
                  }`}
                >
                  {typedChar}
                  {isActive && (
                    <span className={`absolute bottom-1 inset-x-1.5 h-0.5 ${theme.slotBar} rounded-full animate-pulse`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Letzte Tipps nur bei TV-Modus oder als super schmale Chipzeile wenn vorhanden */}
          {recentGuesses.length > 0 && !isRoundOver && (
            <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5 w-full landscape:hidden">
              {recentGuesses.map((g) => (
                <span
                  key={g.id}
                  className={`text-[10px] px-2 py-0.5 rounded-full ring-1 ${
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

          {/* Moderne In-App QWERTZ-Tastatur im ProjektBox Dark-Glass-Design */}
          {!isRoundOver && !hasGuessedCorrectly && (
            <div
              role="group"
              aria-label="In-App Tastatur"
              className="mt-1.5 landscape:mt-2 flex w-full flex-col gap-1.5 px-1 pb-1"
            >
              {KEYBOARD_ROWS.map((row, rowIdx) => (
                <div key={rowIdx} className="flex w-full items-center gap-1">
                  {row.map((letter) => (
                    <button
                      key={letter}
                      type="button"
                      onClick={() => handleKeyboardChar(letter)}
                      className={`flex-1 min-w-0 h-10 sm:h-11 landscape:h-9 sm:landscape:h-10 rounded-xl landscape:rounded-lg bg-[#1A1A24]/95 hover:bg-[#252534] ${theme.keyActive} active:scale-95 text-white text-sm sm:text-base landscape:text-xs sm:landscape:text-sm font-bold ring-1 ring-white/[0.1] shadow-xs transition-all cursor-pointer touch-manipulation flex items-center justify-center`}
                    >
                      {letter}
                    </button>
                  ))}

                  {rowIdx === 2 && (
                    <>
                      <button
                        type="button"
                        onClick={handleKeyboardBackspace}
                        aria-label="Buchstabe löschen"
                        className="flex-[1.6] min-w-0 h-10 sm:h-11 landscape:h-9 sm:landscape:h-10 rounded-xl landscape:rounded-lg bg-white/[0.11] hover:bg-white/[0.18] active:scale-95 text-white/90 ring-1 ring-white/15 transition-all cursor-pointer touch-manipulation flex items-center justify-center"
                      >
                        <Delete className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={handleGuessSubmit}
                        disabled={!guessInput.trim()}
                        aria-label="Tipp absenden"
                        className={`flex-[2.4] min-w-0 h-10 sm:h-11 landscape:h-9 sm:landscape:h-10 rounded-xl landscape:rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all active:scale-95 touch-manipulation ${
                          guessInput.trim() ? theme.primaryBtn : BTN_PRIMARY_DISABLED
                        }`}
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span>OK</span>
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

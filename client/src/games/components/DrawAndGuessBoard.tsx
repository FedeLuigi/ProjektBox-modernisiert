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
import { OpenButton } from '../../components/OpenSubpageUI';
import {
  playErrorSound,
  playMoveSound,
  playWinSound,
  triggerHapticFeedback,
} from '../../utils/soundEffects';

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
  { label: 'FEIN', size: 2.5 },
  { label: 'MITTEL', size: 5 },
  { label: 'DICK', size: 10 },
];

const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Z', 'U', 'I', 'O', 'P', 'Ü'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ö', 'Ä'],
  ['Y', 'X', 'C', 'V', 'B', 'N', 'M'],
];

export function DrawAndGuessBoard({
  gameId: _gameId = 'draw-and-guess',
  gameState,
  myPlayer,
  opponent,
  allPlayers,
  isGameOver,
  onMove,
  disabled: _disabled,
  isTvMode,
}: GameRendererProps<DrawAndGuessState>) {
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

  const [timeLeft, setTimeLeft] = useState(() => {
    if (!gameState?.roundEndsAt) return 60;
    return Math.max(0, Math.ceil((gameState.roundEndsAt - Date.now()) / 1000));
  });

  useEffect(() => {
    if (gameState?.roundStatus !== 'drawing' || !gameState?.roundEndsAt) return;

    let sentTimeUp = false;
    const updateTimer = () => {
      const remaining = Math.max(0, Math.ceil((gameState.roundEndsAt! - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0 && !sentTimeUp && !isTv) {
        sentTimeUp = true;
        onMove({ type: 'time_up' });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 500);
    return () => clearInterval(interval);
  }, [gameState?.roundEndsAt, gameState?.roundStatus, isTv, onMove]);

  const [transitionCountdown, setTransitionCountdown] = useState(3);
  useEffect(() => {
    if (gameState?.roundStatus !== 'round_over') return;

    let sentNextRound = false;
    setTransitionCountdown(3);
    const timer = setInterval(() => {
      setTransitionCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (!sentNextRound && !isTv) {
            sentNextRound = true;
            onMove({ type: 'next_round' });
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState?.roundStatus, isTv, onMove]);

  useEffect(() => {
    const unsubStrokes = socketService.onLiveStrokes(({ strokes }) => {
      if (isDrawer) return;

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

  const flushStrokes = () => {
    if (strokeBufferRef.current.length === 0) return;
    const batch = [...strokeBufferRef.current];
    strokeBufferRef.current = [];
    socketService.emitStrokes(batch);
  };

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
      const usableW = Math.max(120, Math.min(1040, Math.floor(rect.width) - 8));
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
  }, [needsCanvas, isRoundOver, isDrawer]);

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
      playMoveSound();
      setGuessInput((prev) => (prev.length < targetLength ? prev + char : prev));
    },
    [isDrawer, hasGuessedCorrectly, isRoundOver, targetLength]
  );

  const handleKeyboardBackspace = useCallback(() => {
    if (isDrawer || hasGuessedCorrectly || isRoundOver) return;
    playMoveSound();
    setGuessInput((prev) => prev.slice(0, -1));
  }, [isDrawer, hasGuessedCorrectly, isRoundOver]);

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

  useEffect(() => {
    if (!latestGuess) return;
    if (latestGuess.playerId === myPlayer?.id) {
      if (latestGuess.isCorrect) {
        playWinSound();
        triggerHapticFeedback([18, 35, 25]);
      } else {
        playErrorSound();
        triggerHapticFeedback(25);
        setIsWrongGuess(true);
        setWrongText(`"${latestGuess.text}" ist falsch`);
        const timer = setTimeout(() => {
          setIsWrongGuess(false);
          setWrongText(null);
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [latestGuess, myPlayer?.id]);

  useEffect(() => {
    setGuessInput('');
    setIsWrongGuess(false);
    setWrongText(null);
  }, [gameState?.round]);

  if (isGameOver) {
    return null;
  }

  // A) FERNSEHER-ANSICHT
  if (isTv) {
    return (
      <div className="relative w-full aspect-[4/3] max-h-[48vh] sm:max-h-[52vh] overflow-hidden rounded-2xl border border-white/20 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.45)] mx-auto flex items-center justify-center select-none">
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          className="w-full h-full block cursor-default"
        />

        {isRoundOver && (
          <div className="absolute inset-0 bg-[#0F172A]/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center animate-fade-in z-20">
            <div className="border-b-2 border-[#F59E0B] px-2 pb-0.5">
              <span className="text-xs font-arcade uppercase tracking-widest text-[#FDE68A]">
                GESUCHTES WORT
              </span>
            </div>

            <div className="text-4xl sm:text-5xl lg:text-6xl font-arcade uppercase tracking-[0.16em] text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.45)] my-3">
              {gameState.secretWord}
            </div>

            <p className="mt-1 text-xs sm:text-sm font-arcade uppercase text-[#CBD5E1] max-w-md leading-relaxed">
              {gameState.roundWinnerName ? (
                <span>
                  {gameState.roundWinnerName} HAT ES ERRATEN • GEZEICHNET VON {drawerPlayer?.name || 'SPIELER'}
                </span>
              ) : (
                <span>
                  ZEIT ABGELAUFEN • GEZEICHNET VON {drawerPlayer?.name || 'SPIELER'}
                </span>
              )}
            </p>

            {transitionCountdown > 0 && (
              <div className="mt-5 flex flex-col items-center gap-1.5 w-full max-w-xs">
                <div className="w-full h-2 rounded-full bg-white/15 overflow-hidden">
                  <div
                    className="h-full bg-[#F59E0B] transition-all duration-1000 ease-linear"
                    style={{ width: `${Math.max(0, (transitionCountdown / 3) * 100)}%` }}
                  />
                </div>
                <span className="text-[11px] font-arcade uppercase text-[#94A3B8]">
                  NÄCHSTE RUNDE IN {transitionCountdown}S...
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // B) SMARTPHONE-ANSICHT: RUNDENENDE-SCREEN IM OFFENE-BÜHNE-STIL
  if (isRoundOver && !isTv) {
    return (
      <div className="my-auto mx-auto flex w-full flex-1 min-h-0 items-center justify-center p-3 sm:p-4 animate-fade-in select-none">
        <div className="w-full max-w-sm sm:max-w-md rounded-2xl border border-white/15 bg-[#0F172A]/85 p-6 text-center backdrop-blur-xl shadow-[0_24px_60px_rgba(0,0,0,0.5)] flex flex-col items-center gap-4">
          <div className="border-b-2 border-[#F59E0B] px-3 pb-0.5">
            <span className="font-arcade text-lg tracking-wider text-white uppercase">
              RUNDE <span className="text-[#FBBF24]">BEENDET</span>
            </span>
          </div>

          <span className="text-2xl sm:text-3xl font-arcade uppercase tracking-[0.14em] text-[#FDE68A] rounded-xl bg-white/[0.06] border border-white/15 px-5 py-2">
            {gameState?.secretWord}
          </span>

          <div className="w-full">
            {gameState?.roundWinnerName ? (
              <div className="inline-flex items-center gap-2 rounded-lg bg-[#10B981]/20 border border-[#34D399]/50 px-4 py-1.5 text-xs sm:text-sm font-arcade uppercase text-[#6EE7B7]">
                <span>{gameState.roundWinnerName} HAT ES ERRATEN!</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 rounded-lg bg-white/[0.06] border border-white/15 px-4 py-1.5 text-xs sm:text-sm font-arcade uppercase text-[#CBD5E1]">
                <span>NIEMAND HAT ES ERRATEN</span>
              </div>
            )}
          </div>

          {transitionCountdown > 0 && (
            <div className="w-full max-w-xs flex flex-col items-center gap-1.5 pt-1">
              <div className="w-full h-2 rounded-full bg-white/15 overflow-hidden">
                <div
                  className="h-full bg-[#F59E0B] transition-all duration-1000 ease-linear"
                  style={{ width: `${Math.max(0, (transitionCountdown / 3) * 100)}%` }}
                />
              </div>
              <span className="text-xs font-arcade uppercase text-[#94A3B8]">
                NÄCHSTE RUNDE IN {transitionCountdown}S...
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // C) SPIELER-ANSICHT: DER ZEICHNER (Offenes Design, 2-spaltig auf Tablet/Desktop & Landscape)
  if (isDrawer) {
    return (
      <div className="game-drawer-layout flex flex-col w-full h-full min-h-0 justify-between gap-2 sm:gap-3 md:grid md:grid-cols-[minmax(0,1fr)_18rem] lg:grid-cols-[minmax(0,1fr)_20rem] md:items-center md:gap-6 lg:gap-8 select-none">
        {/* Linke Spalte: Offene Wortanzeige + 4:3 Zeichenfläche */}
        <div className="flex flex-1 flex-col min-h-0 min-w-0 w-full h-full justify-between gap-2 sm:gap-3">
          <div className="w-full flex items-center justify-between gap-3 shrink-0 px-1">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="hidden xs:flex items-center gap-1.5 border-b-2 border-[#F59E0B] pb-0.5 shrink-0">
                <Paintbrush className="h-3.5 w-3.5 text-[#FBBF24]" />
                <span className="text-[11px] font-arcade uppercase tracking-wider text-[#FDE68A]">
                  ZEICHNE
                </span>
              </div>
              <span className="text-base sm:text-xl lg:text-2xl font-arcade uppercase tracking-wider text-white truncate drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)]">
                {gameState?.secretWord}
              </span>
            </div>

            <div
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-1 font-arcade text-xs sm:text-sm shrink-0 transition-colors ${
                timeLeft <= 10
                  ? 'border-[#FDA4AF]/60 bg-[#E11D48] text-white animate-pulse shadow-[0_0_16px_rgba(225,29,72,0.45)]'
                  : 'border-white/15 bg-white/[0.06] text-[#FDE68A] backdrop-blur-md'
              }`}
            >
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span>{timeLeft}S</span>
            </div>
          </div>

          <div
            ref={canvasStageRef}
            className="relative flex-1 min-h-0 min-w-0 w-full flex items-center justify-center"
          >
            <div
              style={
                canvasSize
                  ? { width: `${canvasSize.width}px`, height: `${canvasSize.height}px` }
                  : undefined
              }
              className={`relative overflow-hidden rounded-2xl border border-white/20 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.45)] touch-none ${
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

              {latestGuess && (
                <div className="pointer-events-none absolute top-2.5 right-2.5 max-w-[230px] truncate rounded-xl border border-white/20 bg-[#0F172A]/85 px-3 py-1 text-white text-[11px] font-arcade uppercase backdrop-blur-md animate-fade-in">
                  {latestGuess.playerName}: &quot;{latestGuess.text}&quot; {latestGuess.isCorrect ? '✓' : '✕'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Rechte Spalte / Unteres Dock: Mal-Werkzeuge im offenen Glas-Design */}
        <div className="game-tool-dock w-full shrink-0 rounded-2xl border border-white/15 bg-white/[0.04] p-2.5 sm:p-4 backdrop-blur-md">
          <div className="game-tool-title hidden md:flex items-center justify-between mb-3">
            <div className="border-b-2 border-[#F59E0B] pb-0.5">
              <span className="font-arcade text-xs tracking-wider text-white uppercase">
                WERKZEUGE
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 sm:gap-3">
            <div className="game-color-grid flex items-center gap-2 overflow-x-auto overscroll-x-contain scrollbar-none px-0.5 py-1 md:grid md:grid-cols-5 md:gap-2.5 md:justify-items-center md:overflow-visible">
              {COLORS.map((col) => {
                const isSelected = currentColor === col;
                return (
                  <button
                    key={col}
                    type="button"
                    onClick={() => setCurrentColor(col)}
                    aria-label={col === '#FFFFFF' ? 'Radierer / Weiß' : `Farbe ${col}`}
                    className={`game-color-btn h-7 w-7 sm:h-8 sm:w-8 shrink-0 rounded-full transition-transform active:scale-90 cursor-pointer flex items-center justify-center border-2 ${
                      isSelected
                        ? 'border-white ring-2 ring-[#F59E0B] scale-110 shadow-[0_0_12px_rgba(245,158,11,0.55)] z-10'
                        : 'border-white/25 hover:scale-105'
                    }`}
                    style={{ backgroundColor: col }}
                  >
                    {col === '#FFFFFF' && <Eraser className="h-3.5 w-3.5 text-[#334155]" />}
                  </button>
                );
              })}
            </div>

            <div className="game-tool-actions flex items-center justify-between gap-2 border-t border-white/15 pt-2.5 md:flex-col md:items-stretch md:gap-3">
              <div className="grid grid-cols-3 gap-1.5 flex-1 md:flex-none">
                {BRUSH_SIZES.map((b) => (
                  <button
                    key={b.size}
                    type="button"
                    onClick={() => setCurrentSize(b.size)}
                    className={`rounded-xl border px-2 py-1.5 text-[10px] sm:text-[11px] font-arcade uppercase transition-all cursor-pointer active:scale-95 ${
                      currentSize === b.size
                        ? 'border-[#F59E0B]/70 bg-[#F59E0B]/20 text-[#FDE68A]'
                        : 'border-white/15 bg-white/[0.04] text-white/80 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>

              <div className="game-tool-btn-row flex items-center gap-1.5 md:grid md:grid-cols-2">
                <OpenButton
                  size="sm"
                  variant="secondary"
                  onClick={handleUndo}
                  title="Rückgängig"
                  aria-label="Rückgängig"
                  className="md:w-full"
                >
                  <Undo2 className="h-4 w-4 shrink-0" />
                  <span className="hidden md:inline landscape:hidden">ZURÜCK</span>
                </OpenButton>

                <OpenButton
                  size="sm"
                  variant="rose"
                  onClick={handleClear}
                  title="Leinwand leeren"
                  aria-label="Leinwand löschen"
                  className="md:w-full"
                >
                  <Trash2 className="h-4 w-4 shrink-0" />
                  <span className="hidden md:inline landscape:hidden">LEEREN</span>
                </OpenButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // D) SPIELER-ANSICHT: DER RATER (Offenes Design, 2-spaltig auf Tablet/Desktop & Landscape)
  const totalSlots = Math.max(targetLength, guessInput.length);
  const slotIndices = Array.from({ length: totalSlots }, (_, i) => i);

  const slotSizeClass = !isTvMode
    ? totalSlots <= 5
      ? 'w-10 h-11 sm:w-12 sm:h-13 landscape:w-9 landscape:h-10 text-lg sm:text-2xl landscape:text-base'
      : totalSlots <= 8
      ? 'w-8 h-10 sm:w-10 sm:h-11 landscape:w-8 landscape:h-9 text-base sm:text-xl landscape:text-sm'
      : 'w-7 h-9 sm:w-8 sm:h-10 landscape:w-7 landscape:h-8 text-sm sm:text-base landscape:text-xs'
    : totalSlots <= 5
    ? 'w-11 h-12 sm:w-13 sm:h-14 landscape:w-10 landscape:h-11 text-xl sm:text-3xl landscape:text-lg'
    : totalSlots <= 8
    ? 'w-9 h-10 sm:w-11 sm:h-12 landscape:w-9 landscape:h-10 text-lg sm:text-2xl landscape:text-base'
    : 'w-7 h-9 sm:w-9 sm:h-11 landscape:w-7 landscape:h-9 text-sm sm:text-lg landscape:text-sm';

  const recentGuesses = gameState?.guesses?.slice(0, 3) || [];
  const isRaterTwoCol = !isTvMode && !isRoundOver;

  const statusBar = !isRoundOver ? (
    <div
      className={`w-full flex items-center justify-between gap-2 shrink-0 ${
        isRaterTwoCol
          ? 'border-b border-white/12 pb-2.5 landscape:pb-1.5 mb-1 landscape:mb-0.5'
          : 'px-1'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <div className="border-b-2 border-[#F59E0B] pb-0.5 min-w-0">
          <span className="block truncate text-xs sm:text-sm landscape:text-xs font-arcade uppercase tracking-wider text-white">
            {drawerPlayer?.name || 'SPIELER'}{' '}
            <span className="text-[#FBBF24]">ZEICHNET</span>
          </span>
        </div>
      </div>

      <div
        className={`flex items-center gap-1.5 rounded-xl border px-3 py-1 landscape:px-2.5 landscape:py-0.5 font-arcade text-xs sm:text-sm landscape:text-xs shrink-0 transition-colors ${
          timeLeft <= 10
            ? 'border-[#FDA4AF]/60 bg-[#E11D48] text-white animate-pulse shadow-[0_0_16px_rgba(225,29,72,0.45)]'
            : 'border-white/15 bg-white/[0.06] text-[#FDE68A] backdrop-blur-md'
        }`}
      >
        <Clock className="h-3.5 w-3.5 shrink-0" />
        <span>{timeLeft}S</span>
      </div>
    </div>
  ) : null;

  return (
    <div
      className={`flex flex-col w-full h-full min-h-0 justify-between gap-2 sm:gap-3 select-none ${
        isRaterTwoCol
          ? 'game-rater-layout md:grid md:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.9fr)] lg:grid-cols-[minmax(0,1.25fr)_minmax(24rem,0.9fr)] md:items-center md:gap-6 lg:gap-10'
          : 'max-w-xl mx-auto items-center'
      }`}
    >
      {/* Linke Spalte: Im Hochformat Statuszeile oben + Leinwand; im Quermodus nur große Leinwand */}
      {!isTvMode ? (
        <div className="flex flex-1 flex-col min-h-0 min-w-0 w-full h-full justify-between gap-2 sm:gap-3">
          {isRaterTwoCol && (
            <div className="md:hidden landscape:hidden">{statusBar}</div>
          )}

          <div
            ref={canvasStageRef}
            className="relative flex-1 min-h-0 min-w-0 w-full flex items-center justify-center"
          >
            <div
              style={
                canvasSize
                  ? { width: `${canvasSize.width}px`, height: `${canvasSize.height}px` }
                  : undefined
              }
              className={`relative overflow-hidden rounded-2xl border border-white/20 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.45)] ${
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
        </div>
      ) : (
        statusBar
      )}

      {/* Rechte Spalte (bzw. unterer Ratebereich): Im Quermodus Name + Zeit über Buchstabenfeldern & Tastatur */}
      {!(isRoundOver && !isTvMode) && (
        <div
          className={`w-full flex flex-col items-center text-center shrink-0 min-w-0 ${
            isRaterTwoCol
              ? 'md:justify-center md:gap-2.5 landscape:justify-center landscape:gap-1.5'
              : isTvMode
              ? 'my-auto py-2'
              : ''
          } ${isWrongGuess ? 'screen-shake' : ''}`}
        >
          {isRaterTwoCol && (
            <div className="hidden md:block landscape:block w-full">{statusBar}</div>
          )}
          {wrongText && (
            <div className="mb-2 rounded-xl border border-[#FDA4AF]/40 bg-[#E11D48]/25 px-3 py-1 text-[11px] font-arcade uppercase text-[#FECDD3] animate-fade-in">
              {wrongText}
            </div>
          )}

          {hasGuessedCorrectly && (
            <div className="mb-2 flex items-center gap-1.5 rounded-xl border border-[#34D399]/50 bg-[#10B981]/20 px-4 py-1.5 text-[#6EE7B7] font-arcade uppercase text-xs">
              <Check className="h-3.5 w-3.5 stroke-[3]" />
              <span>ERRATEN! (+100)</span>
            </div>
          )}

          {isTvMode && isRoundOver && !hasGuessedCorrectly && transitionCountdown > 0 && (
            <div className="mb-2 rounded-xl border border-white/15 bg-white/[0.06] px-3.5 py-1 text-white font-arcade uppercase text-xs">
              NÄCHSTE RUNDE IN {transitionCountdown}S
            </div>
          )}

          {/* Buchstaben-Platzhalter im offenen Glas-Design */}
          <div
            className={`game-word-slots flex flex-wrap items-center justify-center w-full ${
              totalSlots > 8 ? 'gap-1' : 'gap-1.5 sm:gap-2'
            } py-1`}
          >
            {slotIndices.map((idx) => {
              if (isRoundOver && gameState?.secretWord) {
                const char = gameState.secretWord[idx]?.toUpperCase() || '';
                return (
                  <div
                    key={idx}
                    className={`game-word-slot relative flex items-center justify-center rounded-xl font-arcade bg-[#10B981]/25 text-[#6EE7B7] border border-[#34D399]/60 ${slotSizeClass}`}
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
                  className={`game-word-slot relative flex items-center justify-center rounded-xl font-arcade transition-all border ${slotSizeClass} ${
                    hasGuessedCorrectly
                      ? 'bg-[#10B981]/25 text-[#6EE7B7] border-[#34D399]/60'
                      : isActive
                      ? 'bg-white/[0.14] text-white border-[#F59E0B] shadow-[0_0_16px_rgba(245,158,11,0.28)]'
                      : isTyped
                      ? 'bg-white text-[#0F172A] border-white/80 shadow-[0_4px_14px_rgba(0,0,0,0.25)]'
                      : 'bg-white/[0.05] text-white/40 border-white/15'
                  }`}
                >
                  {typedChar}
                  {isActive && (
                    <span className="absolute bottom-1.5 inset-x-2 h-0.5 rounded-full bg-[#F59E0B] animate-pulse" />
                  )}
                </div>
              );
            })}
          </div>

          {recentGuesses.length > 0 && !isRoundOver && (
            <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1.5 w-full landscape:hidden">
              {recentGuesses.map((g) => (
                <span
                  key={g.id}
                  className={`rounded-lg border px-2 py-0.5 text-[10px] font-arcade uppercase ${
                    g.isCorrect
                      ? 'bg-[#10B981]/20 text-[#6EE7B7] border-[#34D399]/50'
                      : 'bg-white/[0.05] text-[#CBD5E1] border-white/15'
                  }`}
                >
                  {g.text}
                </span>
              ))}
            </div>
          )}

          {/* In-App QWERTZ-Tastatur im offenen Glas-Design */}
          {!isRoundOver && !hasGuessedCorrectly && (
            <div
              role="group"
              aria-label="In-App Tastatur"
              className="game-keyboard mt-2 sm:mt-3 flex w-full flex-col gap-1.5"
            >
              {KEYBOARD_ROWS.map((row, rowIdx) => (
                <div key={rowIdx} className="flex w-full items-center gap-1 sm:gap-1.5">
                  {row.map((letter) => (
                    <button
                      key={letter}
                      type="button"
                      data-no-click-sound="true"
                      onClick={() => handleKeyboardChar(letter)}
                      className="game-key-btn flex-1 min-w-0 h-10 sm:h-11 md:h-12 rounded-lg sm:rounded-xl border border-white/15 bg-white/[0.08] hover:bg-white/[0.16] active:bg-[#F59E0B] active:text-[#0F172A] active:scale-95 text-white text-sm sm:text-base font-arcade transition-all cursor-pointer touch-manipulation flex items-center justify-center"
                    >
                      {letter}
                    </button>
                  ))}

                  {rowIdx === 2 && (
                    <>
                      <button
                        type="button"
                        data-no-click-sound="true"
                        onClick={handleKeyboardBackspace}
                        aria-label="Buchstabe löschen"
                        className="game-key-btn flex-[1.6] min-w-0 h-10 sm:h-11 md:h-12 rounded-lg sm:rounded-xl border border-white/15 bg-white/[0.04] hover:bg-white/[0.12] active:scale-95 text-white/90 transition-all cursor-pointer touch-manipulation flex items-center justify-center"
                      >
                        <Delete className="h-4 w-4 landscape:h-3.5 landscape:w-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={handleGuessSubmit}
                        disabled={!guessInput.trim()}
                        aria-label="Tipp absenden"
                        className={`game-key-btn flex-[2.4] min-w-0 h-10 sm:h-11 md:h-12 rounded-lg sm:rounded-xl font-arcade uppercase text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all active:scale-95 touch-manipulation ${
                          guessInput.trim()
                            ? 'border border-[#6EE7B7]/40 bg-[#10B981] text-white hover:bg-[#059669] shadow-[0_6px_20px_rgba(16,185,129,0.28)] cursor-pointer'
                            : 'border border-white/10 bg-white/[0.04] text-white/35 cursor-not-allowed'
                        }`}
                      >
                        <Send className="h-3.5 w-3.5 landscape:h-3 landscape:w-3" />
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

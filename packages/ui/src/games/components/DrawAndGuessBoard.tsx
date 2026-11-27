import { useCallback, useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import type {
  DrawAndGuessGuess,
  DrawAndGuessMove,
  DrawAndGuessState,
  StrokeSegment,
} from '@projektbox/shared/types';
import type { GameRendererProps } from '../types';
import { socketService } from '../../services/socket';
import {
  playErrorSound,
  playMoveSound,
  playWinSound,
  triggerHapticFeedback,
} from '../../utils/soundEffects';
import { renderAllStrokes } from './drawandguess/DrawCanvasSurface';
import { DRAW_COLORS, DrawTvStage } from './drawandguess/DrawTvStage';
import { DrawController } from './drawandguess/DrawController';

export type { StrokeSegment, DrawAndGuessGuess, DrawAndGuessState };

export function DrawAndGuessBoard({
  gameState,
  myPlayer,
  allPlayers,
  onMove,
  disabled,
}: GameRendererProps<DrawAndGuessState, DrawAndGuessMove>) {
  const isTvScreen = Boolean(myPlayer?.isTvScreen);
  const myId = myPlayer?.id || '';
  const isDrawer = !isTvScreen && gameState?.currentDrawerId === myId;
  const roundStatus = gameState?.roundStatus ?? 'drawing';
  const round = gameState?.round ?? 1;
  const endsAt =
    roundStatus === 'choosing_word' ? gameState?.chooseWordEndsAt : gameState?.roundEndsAt;

  const [brushColor, setBrushColor] = useState(DRAW_COLORS[0]);
  const [brushSize, setBrushSize] = useState(9);
  const [isEraser, setIsEraser] = useState(false);
  const [guessInput, setGuessInput] = useState('');
  const [isCompactViewport, setIsCompactViewport] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 1023px), (max-height: 540px)').matches;
  });
  const [timeLeft, setTimeLeft] = useState(() =>
    endsAt ? Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)) : 0
  );

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderedCountRef = useRef(0);
  const sentTriggerRef = useRef<{ key: string; sentAt: number } | null>(null);
  const prevStatusRef = useRef<string>(roundStatus);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 1023px), (max-height: 540px)');
    const onChange = () => setIsCompactViewport(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Authoritative round timer sync (triggered by active client, TV stays passive spectator)
  useEffect(() => {
    if (!endsAt) return;
    const key = `${round}:${roundStatus}:${endsAt}`;

    const syncTimer = () => {
      const now = Date.now();
      const remainingMs = endsAt - now;
      setTimeLeft(Math.max(0, Math.ceil(remainingMs / 1000)));

      const prev = sentTriggerRef.current;
      const canSend = !prev || prev.key !== key || now - prev.sentAt >= 1500;
      if (!isTvScreen && !disabled && remainingMs <= 0 && canSend) {
        if (roundStatus === 'choosing_word' || roundStatus === 'drawing') {
          sentTriggerRef.current = { key, sentAt: now };
          onMove({ type: 'time_up' });
        }
      }
    };

    const init = setTimeout(syncTimer, 0);
    const interval = setInterval(syncTimer, 250);
    return () => {
      clearTimeout(init);
      clearInterval(interval);
    };
  }, [round, roundStatus, endsAt, isTvScreen, disabled, onMove]);

  // Celebration audio & confetti
  useEffect(() => {
    if (prevStatusRef.current === roundStatus) return;
    prevStatusRef.current = roundStatus;
    if (roundStatus === 'round_over' || roundStatus === 'game_over') {
      if (gameState?.roundEndReason === 'guessed' || roundStatus === 'game_over') {
        playWinSound();
        triggerHapticFeedback([30, 20, 45]);
        if (roundStatus === 'game_over') {
          confetti({ particleCount: 55, spread: 70, origin: { y: 0.65 } });
        }
      }
    }
  }, [roundStatus, gameState?.roundEndReason]);

  const handleEmitStroke = useCallback(
    (stroke: StrokeSegment) => {
      if (disabled || !isDrawer || roundStatus !== 'drawing') return;
      onMove({ type: 'stroke', stroke });
    },
    [disabled, isDrawer, roundStatus, onMove]
  );

  const handleUndo = useCallback(() => {
    if (disabled || !isDrawer || roundStatus !== 'drawing' || !gameState) return;
    const strokes = gameState.strokes || [];
    if (strokes.length === 0) return;
    const lastId = strokes[strokes.length - 1]?.strokeId;
    const remaining =
      lastId !== undefined ? strokes.filter((s) => s.strokeId !== lastId) : strokes.slice(0, -1);

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
  }, [disabled, isDrawer, roundStatus, gameState, onMove]);

  const handleClear = useCallback(() => {
    if (disabled || !isDrawer || roundStatus !== 'drawing') return;
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
  }, [disabled, isDrawer, roundStatus, onMove]);

  const handleSubmitGuess = useCallback(() => {
    const text = guessInput.trim();
    if (disabled || !text || isDrawer || roundStatus !== 'drawing') return;
    if (gameState?.correctGuesserIds?.includes(myId)) {
      playErrorSound();
      return;
    }
    playMoveSound();
    setGuessInput('');
    onMove({ type: 'guess', text });
  }, [disabled, guessInput, isDrawer, roundStatus, gameState?.correctGuesserIds, myId, onMove]);

  if (!gameState) {
    return null;
  }

  const useTvStage =
    isTvScreen || (!isCompactViewport && (myPlayer?.isHost || allPlayers.length <= 1));

  if (useTvStage) {
    return (
      <DrawTvStage
        gameState={gameState}
        allPlayers={allPlayers}
        myPlayer={myPlayer}
        isTvScreen={isTvScreen}
        isDrawer={isDrawer}
        timeLeft={timeLeft}
        brushColor={brushColor}
        onSelectColor={setBrushColor}
        brushSize={brushSize}
        onSelectSize={setBrushSize}
        isEraser={isEraser}
        onToggleEraser={setIsEraser}
        guessInput={guessInput}
        onChangeGuess={setGuessInput}
        onSubmitGuess={handleSubmitGuess}
        onUndo={handleUndo}
        onClear={handleClear}
        onEmitStroke={handleEmitStroke}
        onMove={onMove}
        canvasRef={canvasRef}
        renderedCountRef={renderedCountRef}
      />
    );
  }

  return (
    <DrawController
      gameState={gameState}
      allPlayers={allPlayers}
      myPlayer={myPlayer}
      isDrawer={isDrawer}
      timeLeft={timeLeft}
      brushColor={brushColor}
      onSelectColor={setBrushColor}
      brushSize={brushSize}
      onSelectSize={setBrushSize}
      isEraser={isEraser}
      onToggleEraser={setIsEraser}
      guessInput={guessInput}
      onChangeGuess={setGuessInput}
      onSubmitGuess={handleSubmitGuess}
      onUndo={handleUndo}
      onClear={handleClear}
      onEmitStroke={handleEmitStroke}
      onMove={onMove}
      canvasRef={canvasRef}
      renderedCountRef={renderedCountRef}
    />
  );
}

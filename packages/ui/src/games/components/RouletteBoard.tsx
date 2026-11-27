import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import confetti from 'canvas-confetti';
import type {
  RouletteColor,
  RouletteMove,
  RouletteSpinOutcome,
  RouletteState,
} from '@projektbox/shared/types';
import type { GameRendererProps } from '../types';
import {
  playErrorSound,
  playMoveSound,
  playWinSound,
  triggerHapticFeedback,
} from '../../utils/soundEffects';
import { RouletteTvStage } from './roulette/RouletteTvStage';
import { RouletteController } from './roulette/RouletteController';
import { CHIP_DENOMINATIONS, formatChipAmount, getChipStyle } from './roulette/RouletteTable';
import { rouletteAudio } from './roulette/rouletteAudio';

export type { RouletteColor, RouletteSpinOutcome, RouletteState };

interface DragChipState {
  mode: 'tray' | 'placed';
  fromBetKey?: string;
  value?: number | 'all';
  amount: number;
  label: string;
  bg: string;
  rim: string;
  text: string;
}

function findBetKeyAtPoint(clientX: number, clientY: number): string | null {
  if (typeof document === 'undefined') return null;
  const el = document.elementFromPoint(clientX, clientY);
  return el?.closest<HTMLElement>('[data-bet-key]')?.dataset.betKey ?? null;
}

function isInsideRouletteTable(clientX: number, clientY: number): boolean {
  if (typeof document === 'undefined') return false;
  const el = document.elementFromPoint(clientX, clientY);
  return el?.closest('[data-roulette-table="true"]') !== null;
}

export function RouletteBoard({
  gameState,
  myPlayer,
  allPlayers,
  onMove,
  disabled,
}: GameRendererProps<RouletteState, RouletteMove>) {
  const isTvScreen = Boolean(myPlayer?.isTvScreen);
  const myId = myPlayer?.id || '';
  const phase = gameState?.phase ?? 'betting';
  const round = gameState?.round ?? 1;
  const phaseEndsAt = gameState?.phaseEndsAt;

  const [selectedChip, setSelectedChip] = useState<number | 'all'>(25);
  const [hoveredBetKey, setHoveredBetKey] = useState<string | null>(null);
  const [dragChip, setDragChip] = useState<DragChipState | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragHoverBetKey, setDragHoverBetKey] = useState<string | null>(null);
  const [dragOutsideTable, setDragOutsideTable] = useState(false);

  const [isCompactViewport, setIsCompactViewport] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 1023px), (max-height: 540px)').matches;
  });
  const [timeLeft, setTimeLeft] = useState(() =>
    phaseEndsAt ? Math.max(0, Math.ceil((phaseEndsAt - Date.now()) / 1000)) : 0
  );

  const sentPhaseTriggerRef = useRef<{ phaseKey: string; sentAt: number } | null>(null);
  const lastOutcomeRoundRef = useRef<number | null>(null);
  const dragCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 1023px), (max-height: 540px)');
    const onChange = () => setIsCompactViewport(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    return () => {
      dragCleanupRef.current?.();
    };
  }, []);

  // Authoritative phase timer sync (triggered by active client, TV stays passive spectator)
  useEffect(() => {
    if (!phaseEndsAt) return;
    const phaseKey = `${round}:${phase}:${phaseEndsAt}`;

    const syncTimer = () => {
      const now = Date.now();
      const remainingMs = phaseEndsAt - now;
      setTimeLeft(Math.max(0, Math.ceil(remainingMs / 1000)));

      const prevTrigger = sentPhaseTriggerRef.current;
      const canSendTrigger =
        !prevTrigger || prevTrigger.phaseKey !== phaseKey || now - prevTrigger.sentAt >= 1500;

      if (!isTvScreen && !disabled && remainingMs <= 0 && canSendTrigger) {
        if (phase === 'betting') {
          sentPhaseTriggerRef.current = { phaseKey, sentAt: now };
          onMove({ type: 'time_up' });
        } else if (phase === 'spinning' && remainingMs <= -120) {
          sentPhaseTriggerRef.current = { phaseKey, sentAt: now };
          onMove({ type: 'finish_spin' });
        } else if (phase === 'result') {
          sentPhaseTriggerRef.current = { phaseKey, sentAt: now };
          onMove({ type: 'time_up' });
        }
      }
    };

    const initTimer = setTimeout(syncTimer, 0);
    const timer = setInterval(syncTimer, 250);
    return () => {
      clearTimeout(initTimer);
      clearInterval(timer);
    };
  }, [phase, round, phaseEndsAt, isTvScreen, disabled, onMove]);

  // Celebration sound + confetti on win
  useEffect(() => {
    if (phase !== 'result' || !gameState?.lastOutcome) return;
    const outcome = gameState.lastOutcome;
    if (lastOutcomeRoundRef.current === outcome.round) return;
    lastOutcomeRoundRef.current = outcome.round;

    const myProfit = myId ? (outcome.netProfit[myId] ?? 0) : 0;
    const anyWinner = Object.values(outcome.netProfit).some((p) => p > 0);
    if (myProfit > 0 || (isTvScreen && anyWinner)) {
      playWinSound();
      triggerHapticFeedback([30, 20, 50]);
      confetti({ particleCount: 55, spread: 70, origin: { y: 0.65 } });
    }
  }, [phase, gameState?.lastOutcome, myId, isTvScreen]);

  const isLocked = Boolean(gameState?.lockedPlayerIds?.includes(myId));
  const isBettingOpen = !isTvScreen && !disabled && phase === 'betting' && !isLocked;

  const handlePlaceBet = useCallback(
    (betKey: string, overrideAmount?: number) => {
      if (!isBettingOpen || !gameState) return;
      const myBalance = gameState.balances[myId] ?? gameState.startingBalance;
      const rawAmount =
        overrideAmount ?? (selectedChip === 'all' ? myBalance : Math.min(selectedChip, myBalance));
      const amount = Math.min(rawAmount, myBalance);
      if (amount <= 0) {
        playErrorSound();
        return;
      }
      playMoveSound();
      rouletteAudio.playChipPlace();
      triggerHapticFeedback(15);
      onMove({ type: 'place_bet', betKey, amount });
    },
    [isBettingOpen, gameState, myId, selectedChip, onMove]
  );

  const handleRemoveBet = useCallback(
    (betKey: string) => {
      if (!isBettingOpen) return;
      playMoveSound();
      triggerHapticFeedback(12);
      onMove({ type: 'remove_bet', betKey });
    },
    [isBettingOpen, onMove]
  );

  const startPointerDrag = useCallback(
    (
      e: ReactPointerEvent,
      initialDrag: DragChipState,
      onClickFallback: () => void
    ) => {
      if (!isBettingOpen) return;
      dragCleanupRef.current?.();

      const startX = e.clientX;
      const startY = e.clientY;
      let dragging = false;

      const handleMove = (ev: PointerEvent) => {
        const dist = Math.hypot(ev.clientX - startX, ev.clientY - startY);
        if (!dragging && dist >= 8) {
          dragging = true;
          setDragChip(initialDrag);
          triggerHapticFeedback(10);
        }
        if (dragging) {
          setDragPos({ x: ev.clientX, y: ev.clientY });
          setDragHoverBetKey(findBetKeyAtPoint(ev.clientX, ev.clientY));
          setDragOutsideTable(
            initialDrag.mode === 'placed' && !isInsideRouletteTable(ev.clientX, ev.clientY)
          );
        }
      };

      const finishDrag = (ev: PointerEvent) => {
        cleanup();
        if (!dragging) {
          onClickFallback();
          return;
        }
        const targetBetKey = findBetKeyAtPoint(ev.clientX, ev.clientY);
        if (initialDrag.mode === 'tray') {
          if (targetBetKey) {
            handlePlaceBet(targetBetKey, initialDrag.amount);
          }
        } else if (initialDrag.mode === 'placed' && initialDrag.fromBetKey) {
          if (targetBetKey && targetBetKey !== initialDrag.fromBetKey) {
            playMoveSound();
            rouletteAudio.playChipPlace();
            triggerHapticFeedback(15);
            onMove({
              type: 'move_bet',
              fromBetKey: initialDrag.fromBetKey,
              toBetKey: targetBetKey,
            });
          } else if (!isInsideRouletteTable(ev.clientX, ev.clientY)) {
            handleRemoveBet(initialDrag.fromBetKey);
          }
        }
      };

      const cleanup = () => {
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', finishDrag);
        window.removeEventListener('pointercancel', finishDrag);
        setDragChip(null);
        setDragHoverBetKey(null);
        setDragOutsideTable(false);
        dragCleanupRef.current = null;
      };

      dragCleanupRef.current = cleanup;
      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', finishDrag);
      window.addEventListener('pointercancel', finishDrag);
    },
    [isBettingOpen, handlePlaceBet, handleRemoveBet, onMove]
  );

  const handleTrayChipPointerDown = useCallback(
    (value: number | 'all', e: ReactPointerEvent) => {
      if (!isBettingOpen || !gameState) return;
      const myBalance = gameState.balances[myId] ?? gameState.startingBalance;
      const amount = value === 'all' ? myBalance : Math.min(value, myBalance);
      const spec = CHIP_DENOMINATIONS.find((c) => c.value === value) ?? CHIP_DENOMINATIONS[0];
      startPointerDrag(
        e,
        {
          mode: 'tray',
          value,
          amount,
          label: value === 'all' ? 'MAX' : formatChipAmount(amount),
          bg: spec.bg,
          rim: spec.rim,
          text: spec.text,
        },
        () => setSelectedChip(value)
      );
    },
    [isBettingOpen, gameState, myId, startPointerDrag]
  );

  const handlePlacedChipPointerDown = useCallback(
    (betKey: string, amount: number, e: ReactPointerEvent) => {
      if (!isBettingOpen) return;
      const spec = getChipStyle(amount);
      startPointerDrag(
        e,
        {
          mode: 'placed',
          fromBetKey: betKey,
          amount,
          label: formatChipAmount(amount),
          bg: spec.bg,
          rim: spec.rim,
          text: spec.text,
        },
        () => handleRemoveBet(betKey)
      );
    },
    [isBettingOpen, startPointerDrag, handleRemoveBet]
  );

  if (!gameState) {
    return null;
  }

  const activeHighlight = dragHoverBetKey ?? hoveredBetKey;
  const useTvStage =
    isTvScreen || (!isCompactViewport && (myPlayer?.isHost || allPlayers.length <= 1));

  return (
    <>
      {useTvStage ? (
        <RouletteTvStage
          gameState={gameState}
          allPlayers={allPlayers}
          myPlayer={myPlayer}
          isTvScreen={isTvScreen}
          isBettingOpen={isBettingOpen}
          isLocked={isLocked}
          timeLeft={timeLeft}
          selectedChip={selectedChip}
          onSelectChip={setSelectedChip}
          onTrayChipPointerDown={handleTrayChipPointerDown}
          onPlacedChipPointerDown={handlePlacedChipPointerDown}
          highlightedBetKey={activeHighlight}
          onHoverBet={setHoveredBetKey}
          onPlaceBet={(betKey) => handlePlaceBet(betKey)}
          onRemoveBet={handleRemoveBet}
          onMove={onMove}
        />
      ) : (
        <RouletteController
          gameState={gameState}
          allPlayers={allPlayers}
          myPlayer={myPlayer}
          isBettingOpen={isBettingOpen}
          isLocked={isLocked}
          timeLeft={timeLeft}
          selectedChip={selectedChip}
          onSelectChip={setSelectedChip}
          onTrayChipPointerDown={handleTrayChipPointerDown}
          onPlacedChipPointerDown={handlePlacedChipPointerDown}
          highlightedBetKey={activeHighlight}
          onPlaceBet={(betKey) => handlePlaceBet(betKey)}
          onRemoveBet={handleRemoveBet}
          onMove={onMove}
        />
      )}

      {/* Floating Drag Ghost Chip */}
      {dragChip &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            style={{
              left: dragPos.x,
              top: dragPos.y,
              backgroundColor: dragOutsideTable ? '#991B1B' : dragChip.bg,
              borderColor: dragOutsideTable ? '#FCA5A5' : dragChip.rim,
              color: dragOutsideTable ? '#FFFFFF' : dragChip.text,
            }}
            className="pointer-events-none fixed z-[9999] flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[3px] border-dashed text-xs font-black shadow-[0_12px_28px_rgba(0,0,0,0.8)]"
          >
            {dragOutsideTable ? '✕' : dragChip.label}
          </div>,
          document.body
        )}
    </>
  );
}

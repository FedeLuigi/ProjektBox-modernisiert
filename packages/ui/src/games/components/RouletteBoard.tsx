import { useCallback, useEffect, useRef, useState } from 'react';
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

export type { RouletteColor, RouletteSpinOutcome, RouletteState };

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
  const [isCompactViewport, setIsCompactViewport] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 1023px), (max-height: 540px)').matches;
  });
  const [timeLeft, setTimeLeft] = useState(() =>
    phaseEndsAt ? Math.max(0, Math.ceil((phaseEndsAt - Date.now()) / 1000)) : 0
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 1023px), (max-height: 540px)');
    const onChange = () => setIsCompactViewport(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const sentPhaseTriggerRef = useRef<{ phaseKey: string; sentAt: number } | null>(null);
  const lastOutcomeRoundRef = useRef<number | null>(null);

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
    (betKey: string) => {
      if (!isBettingOpen || !gameState) return;
      const myBalance = gameState.balances[myId] ?? gameState.startingBalance;
      const amount = selectedChip === 'all' ? myBalance : Math.min(selectedChip, myBalance);
      if (amount <= 0) {
        playErrorSound();
        return;
      }
      playMoveSound();
      triggerHapticFeedback(15);
      onMove({ type: 'place_bet', betKey, amount });
    },
    [isBettingOpen, gameState, myId, selectedChip, onMove]
  );

  const handleRemoveBet = useCallback(
    (betKey: string) => {
      if (!isBettingOpen) return;
      playMoveSound();
      onMove({ type: 'remove_bet', betKey });
    },
    [isBettingOpen, onMove]
  );

  if (!gameState) {
    return null;
  }

  // Large TV Screen OR Desktop Host/Solo uses the full 2-column Casino Stage;
  // Compact / Smartphone viewports (even as Host or Solo) always use the responsive Controller.
  if (isTvScreen || (!isCompactViewport && (myPlayer?.isHost || allPlayers.length <= 1))) {
    return (
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
        highlightedBetKey={hoveredBetKey}
        onHoverBet={setHoveredBetKey}
        onPlaceBet={handlePlaceBet}
        onRemoveBet={handleRemoveBet}
        onMove={onMove}
      />
    );
  }

  // Smartphone Player Controller
  return (
    <RouletteController
      gameState={gameState}
      allPlayers={allPlayers}
      myPlayer={myPlayer}
      isBettingOpen={isBettingOpen}
      isLocked={isLocked}
      timeLeft={timeLeft}
      selectedChip={selectedChip}
      onSelectChip={setSelectedChip}
      highlightedBetKey={hoveredBetKey}
      onPlaceBet={handlePlaceBet}
      onRemoveBet={handleRemoveBet}
      onMove={onMove}
    />
  );
}

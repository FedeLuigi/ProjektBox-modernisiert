import { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import type {
  EvaluatedAnswer,
  StadtLandFlussMove,
  StadtLandFlussState,
  StadtLandFlussTheme,
} from '@projektbox/shared/types';
import type { GameRendererProps } from '../types';
import { playMoveSound, playWinSound, triggerHapticFeedback } from '../../utils/soundEffects';
import { SlfTvStage } from './stadtlandfluss/SlfTvStage';
import { SlfController } from './stadtlandfluss/SlfController';

export type { EvaluatedAnswer, StadtLandFlussState, StadtLandFlussTheme };

export function StadtLandFlussBoard({
  gameState,
  myPlayer,
  allPlayers,
  onMove,
  disabled,
}: GameRendererProps<StadtLandFlussState, StadtLandFlussMove>) {
  const isTvScreen = Boolean(myPlayer?.isTvScreen);
  const myId = myPlayer?.id || '';
  const phase = gameState?.phase ?? 'writing';
  const round = gameState?.round ?? 1;
  const phaseEndsAt = gameState?.phaseEndsAt;

  const [isCompactViewport, setIsCompactViewport] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 1023px), (max-height: 540px)').matches;
  });
  const [timeLeft, setTimeLeft] = useState(() =>
    phaseEndsAt ? Math.max(0, Math.ceil((phaseEndsAt - Date.now()) / 1000)) : 0
  );

  const sentTriggerRef = useRef<{ key: string; sentAt: number } | null>(null);
  const prevPhaseRef = useRef<string>(phase);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 1023px), (max-height: 540px)');
    const onChange = () => setIsCompactViewport(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Authoritative phase timer sync (triggered by active client, TV stays passive spectator)
  useEffect(() => {
    if (!phaseEndsAt) return;
    const key = `${round}:${phase}:${phaseEndsAt}`;

    const syncTimer = () => {
      const now = Date.now();
      const remainingMs = phaseEndsAt - now;
      setTimeLeft(Math.max(0, Math.ceil(remainingMs / 1000)));

      const prev = sentTriggerRef.current;
      const canSend = !prev || prev.key !== key || now - prev.sentAt >= 1500;
      if (!isTvScreen && !disabled && remainingMs <= 0 && canSend) {
        if (phase === 'choosing_categories' || phase === 'writing' || phase === 'review') {
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
  }, [phase, round, phaseEndsAt, isTvScreen, disabled, onMove]);

  // Audio & confetti feedback on phase transitions
  useEffect(() => {
    if (prevPhaseRef.current === phase) return;
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = phase;

    if (phase === 'round_over' || phase === 'game_over') {
      const roundScore = gameState?.roundScores?.[myId] ?? 0;
      if (roundScore >= 40 || phase === 'game_over') {
        playWinSound();
        triggerHapticFeedback([30, 20, 45]);
        if (phase === 'game_over') {
          confetti({ particleCount: 55, spread: 70, origin: { y: 0.65 } });
        }
      } else {
        playMoveSound();
      }
    } else if (prev === 'choosing_categories' && phase === 'writing') {
      playMoveSound();
    }
  }, [phase, gameState?.roundScores, myId]);

  if (!gameState) {
    return null;
  }

  const useTvStage =
    isTvScreen || (!isCompactViewport && (myPlayer?.isHost || allPlayers.length <= 1));

  if (useTvStage) {
    return (
      <SlfTvStage
        gameState={gameState}
        allPlayers={allPlayers}
        myPlayer={myPlayer}
        isTvScreen={isTvScreen}
        timeLeft={timeLeft}
        onMove={onMove}
      />
    );
  }

  return (
    <SlfController
      gameState={gameState}
      allPlayers={allPlayers}
      myPlayer={myPlayer}
      timeLeft={timeLeft}
      onMove={onMove}
    />
  );
}

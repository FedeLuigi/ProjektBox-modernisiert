import type { GoldMinerMove, GoldMinerState } from '@projektbox/shared/types';
import type { GameRendererProps } from '../types';
import { GoldMinerArena } from './goldminer/GoldMinerArena';
import { GoldMinerController } from './goldminer/GoldMinerController';

export function GoldMinerBoard({
  gameState,
  myPlayer,
  allPlayers,
  isGameOver,
  isTvMode,
  onMove,
}: GameRendererProps<GoldMinerState, GoldMinerMove>) {
  const isTvDevice = Boolean(myPlayer?.isTvScreen);

  // 1. TV-Bildschirm: Zeigt die komplette Gold-Miner-Welt und empfängt Smartphone-Inputs
  if (isTvDevice) {
    return (
      <GoldMinerArena
        players={allPlayers}
        mode={gameState?.mode || 'coop'}
        sessionKey={String(gameState?.startedAt ?? 'tv')}
        isGameOver={isGameOver}
        onFinish={(payload) => {
          onMove({
            type: 'goldminer_finish',
            ...payload,
          });
        }}
      />
    );
  }

  // 2. Smartphone-Spieler in TV-Lobby oder Nicht-Host in Smartphone-Lobby: Touch-Controller
  if (isTvMode || !myPlayer?.isHost) {
    return <GoldMinerController myPlayerId={myPlayer.id} myPlayer={myPlayer} />;
  }

  // 3. Solo / Host in reiner Smartphone-Lobby: Spielt direkt auf dem Bildschirm
  return (
    <GoldMinerArena
      players={allPlayers}
      mode={gameState?.mode || 'coop'}
      sessionKey={String(gameState?.startedAt ?? 'solo')}
      isGameOver={isGameOver}
      localPlayerId={myPlayer.id}
      onFinish={(payload) => {
        onMove({
          type: 'goldminer_finish',
          ...payload,
        });
      }}
    />
  );
}

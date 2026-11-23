import type { ZombieSurvivalMove, ZombieSurvivalState } from '@projektbox/shared/types';
import type { GameRendererProps } from '../types';
import { Zombie3DArena } from './zombie/Zombie3DArena';
import { ZombieController } from './zombie/ZombieController';

export function ZombieSurvivalBoard({
  gameState,
  myPlayer,
  allPlayers,
  isGameOver,
  isTvMode,
  onMove,
}: GameRendererProps<ZombieSurvivalState, ZombieSurvivalMove>) {
  const isTvDevice = Boolean(myPlayer?.isTvScreen);

  // 1. TV-Bildschirm: Zeigt die 3D-Arena im Vollbild und empfängt Inputs aller Smartphones
  if (isTvDevice) {
    return (
      <Zombie3DArena
        players={allPlayers}
        difficulty={gameState?.difficulty || 'normal'}
        isGameOver={isGameOver}
        onFinish={(payload) => {
          onMove({
            type: 'zombie_finish',
            ...payload,
          });
        }}
      />
    );
  }

  // 2. Jeder Smartphone-Teilnehmer in einer TV-Lobby ODER Nicht-Host in einer Smartphone-Lobby
  //    erhält den vollständigen Dual-Stick-Controller + Live-HUD
  if (isTvMode || !myPlayer?.isHost) {
    return <ZombieController myPlayerId={myPlayer.id} />;
  }

  // 3. Host in einer reinen Smartphone-Lobby (ohne TV): 3D-Arena + eigene Touch-Steuerung
  return (
    <Zombie3DArena
      players={allPlayers}
      difficulty={gameState?.difficulty || 'normal'}
      isGameOver={isGameOver}
      localPlayerId={myPlayer.id}
      onFinish={(payload) => {
        onMove({
          type: 'zombie_finish',
          ...payload,
        });
      }}
    />
  );
}

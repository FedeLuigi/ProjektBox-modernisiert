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

  if (isTvMode) {
    return <ZombieController myPlayerId={myPlayer.id} />;
  }

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

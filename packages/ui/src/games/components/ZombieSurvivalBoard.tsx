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
  const isTv = Boolean(isTvMode || myPlayer?.isTvScreen);

  if (isTv) {
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

  return <ZombieController myPlayerId={myPlayer.id} />;
}

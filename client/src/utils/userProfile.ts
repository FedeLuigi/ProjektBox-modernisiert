import { useEffect, useState } from 'react';
import { type AvatarConfig, DEFAULT_AVATAR } from '../components/Avatar';
import { generateUniquePlayerName } from './nameGenerator';

export interface UserProfile {
  id: string; // Eindeutige Nutzer-ID (z. B. usr_m3k9_x8y1)
  name: string; // Anzeigename (z. B. CyberDragon#4812)
  avatar: AvatarConfig;
}

export const STORAGE_KEYS = {
  USER_ID: 'projektbox_user_id',
  PLAYER_NAME: 'projektbox_player_name',
  PLAYER_AVATAR: 'projektbox_player_avatar',
  SOCKET_URL: 'projektbox_socket_url',
  SOUND_ENABLED: 'projektbox_sound_enabled',
  VIBRATION_ENABLED: 'projektbox_vibration_enabled',
  FAVORITE_GAMES: 'projektbox_favorite_games',
  RECENT_GAMES: 'projektbox_recent_games',
} as const;

export interface RecentGameEntry {
  gameId: string;
  playedAt: number;
}

export function getFavoriteGameIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FAVORITE_GAMES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function saveFavoriteGameIds(ids: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.FAVORITE_GAMES, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

export function getRecentGames(): RecentGameEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RECENT_GAMES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item) => item && typeof item.gameId === 'string' && typeof item.playedAt === 'number'
    );
  } catch {
    return [];
  }
}

export function recordGamePlayed(gameId: string): RecentGameEntry[] {
  const current = getRecentGames().filter((entry) => entry.gameId !== gameId);
  const updated: RecentGameEntry[] = [
    { gameId, playedAt: Date.now() },
    ...current,
  ].slice(0, 10);
  try {
    localStorage.setItem(STORAGE_KEYS.RECENT_GAMES, JSON.stringify(updated));
  } catch {
    // ignore
  }
  return updated;
}

export function generateUserId(): string {
  const rand = Math.random().toString(36).substring(2, 8);
  const time = Date.now().toString(36).slice(-5);
  return `usr_${time}_${rand}`;
}

export function validatePlayerName(rawName: string): {
  valid: boolean;
  error?: string;
  cleaned: string;
} {
  const cleaned = rawName.trim().replace(/[\r\n\t]/g, ' ');
  if (cleaned.length < 2) {
    return {
      valid: false,
      error: 'Name muss mindestens 2 Zeichen lang sein.',
      cleaned,
    };
  }
  if (cleaned.length > 20) {
    return {
      valid: false,
      error: 'Name darf maximal 20 Zeichen lang sein.',
      cleaned: cleaned.slice(0, 20),
    };
  }
  return { valid: true, cleaned };
}

type ProfileListener = (profile: UserProfile) => void;
const listeners = new Set<ProfileListener>();

export function subscribeUserProfile(listener: ProfileListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners(profile: UserProfile) {
  for (const listener of listeners) {
    try {
      listener(profile);
    } catch {
      // ignore
    }
  }
}

export function getUserProfile(): UserProfile {
  try {
    let id = localStorage.getItem(STORAGE_KEYS.USER_ID);
    if (!id) {
      id = generateUserId();
      localStorage.setItem(STORAGE_KEYS.USER_ID, id);
    }

    let name = localStorage.getItem(STORAGE_KEYS.PLAYER_NAME);
    if (!name || name === 'Spieler 1') {
      name = generateUniquePlayerName();
      localStorage.setItem(STORAGE_KEYS.PLAYER_NAME, name);
    }

    let avatar = DEFAULT_AVATAR;
    const rawAvatar = localStorage.getItem(STORAGE_KEYS.PLAYER_AVATAR);
    if (rawAvatar) {
      try {
        avatar = { ...DEFAULT_AVATAR, ...JSON.parse(rawAvatar) };
      } catch {
        avatar = DEFAULT_AVATAR;
      }
    } else {
      localStorage.setItem(STORAGE_KEYS.PLAYER_AVATAR, JSON.stringify(avatar));
    }

    return { id, name, avatar };
  } catch {
    return {
      id: generateUserId(),
      name: generateUniquePlayerName(),
      avatar: DEFAULT_AVATAR,
    };
  }
}

export function saveUserProfile(updates: Partial<UserProfile>): UserProfile {
  const current = getUserProfile();
  const updated: UserProfile = { ...current, ...updates };

  try {
    if (updates.id) localStorage.setItem(STORAGE_KEYS.USER_ID, updated.id);
    if (updates.name) localStorage.setItem(STORAGE_KEYS.PLAYER_NAME, updated.name);
    if (updates.avatar) {
      localStorage.setItem(STORAGE_KEYS.PLAYER_AVATAR, JSON.stringify(updated.avatar));
    }
  } catch {
    // LocalStorage fallback
  }

  notifyListeners(updated);
  return updated;
}

/**
 * Reaktiver Hook für das aktuelle Spielerprofil über alle Komponenten hinweg.
 */
export function useUserProfile(): UserProfile {
  const [profile, setProfile] = useState<UserProfile>(getUserProfile);

  useEffect(() => {
    return subscribeUserProfile(setProfile);
  }, []);

  return profile;
}

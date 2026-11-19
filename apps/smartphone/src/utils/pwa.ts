import { useSyncExternalStore } from 'react';
import { registerSW } from 'virtual:pwa-register';

const RELOAD_COOLDOWN_KEY = 'projektbox_sw_reload_at';
const RELOAD_COOLDOWN_MS = 15_000;

let initialized = false;
let hasUpdateAvailable = false;
let updateRunner: ((reloadPage?: boolean) => Promise<void>) | null = null;
let reloadRequestedByUser = false;
let hasReloadedThisLoad = false;

const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): boolean {
  return hasUpdateAvailable;
}

function getServerSnapshot(): boolean {
  return false;
}

function notifyListeners() {
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      // ignore
    }
  }
}

function canReloadSafelyNow(): boolean {
  if (hasReloadedThisLoad) return false;
  try {
    const last = Number(sessionStorage.getItem(RELOAD_COOLDOWN_KEY) || '0');
    if (last > 0 && Date.now() - last < RELOAD_COOLDOWN_MS) {
      return false;
    }
  } catch {
    // ignore storage access issues
  }
  return true;
}

function markReloadTimestamp() {
  hasReloadedThisLoad = true;
  try {
    sessionStorage.setItem(RELOAD_COOLDOWN_KEY, String(Date.now()));
  } catch {
    // ignore
  }
}

/**
 * Registriert den Service Worker erst nach abgeschlossenem Seiten-Load und ohne
 * automatische Reloads während der Startanimation oder laufenden Lobbys.
 */
export function initPwaRegistration(): void {
  if (initialized || typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }
  initialized = true;

  updateRunner = registerSW({
    immediate: false,
    onNeedRefresh() {
      hasUpdateAvailable = true;
      notifyListeners();
    },
    onNeedReload() {
      // Niemals ungefragt während Boot/Splash oder mehrfach direkt hintereinander neu laden
      if (!reloadRequestedByUser || !canReloadSafelyNow()) return;
      markReloadTimestamp();
      window.location.reload();
    },
  });
}

/**
 * Aktiviert ein wartendes PWA-Update gezielt nach Nutzeraktion.
 */
export async function applyPwaUpdate(): Promise<void> {
  if (!updateRunner) return;
  reloadRequestedByUser = true;
  try {
    await updateRunner(true);
  } catch {
    reloadRequestedByUser = false;
  }
}

/**
 * React-Hook zum Erkennen und Auslösen eines verfügbaren PWA-Updates.
 */
export function usePwaUpdate(): { hasUpdate: boolean; applyUpdate: () => Promise<void> } {
  const hasUpdate = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { hasUpdate, applyUpdate: applyPwaUpdate };
}

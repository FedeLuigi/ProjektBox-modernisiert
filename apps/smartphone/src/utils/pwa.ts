import { useSyncExternalStore } from 'react';
import { registerSW } from 'virtual:pwa-register';

const RELOAD_COOLDOWN_KEY = 'projektbox_sw_reload_at';
const RELOAD_COOLDOWN_MS = 3_000;

let initialized = false;
let hasUpdateAvailable = false;
let updateRunner: ((reloadPage?: boolean) => Promise<void>) | null = null;
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

  const triggerSafeReload = () => {
    if (!canReloadSafelyNow()) return;
    markReloadTimestamp();
    window.location.reload();
  };

  navigator.serviceWorker.addEventListener('controllerchange', triggerSafeReload);

  updateRunner = registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      const checkUpdate = () => {
        registration.update().catch(() => {});
      };
      checkUpdate();
      window.addEventListener('focus', checkUpdate);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          checkUpdate();
        }
      });
      window.setInterval(checkUpdate, 60_000);
    },
    onNeedRefresh() {
      hasUpdateAvailable = true;
      notifyListeners();
      if (canReloadSafelyNow()) {
        markReloadTimestamp();
        void updateRunner?.(true);
      }
    },
    onNeedReload() {
      triggerSafeReload();
    },
  });
}

/**
 * Aktiviert ein wartendes PWA-Update gezielt nach Nutzeraktion.
 */
export async function applyPwaUpdate(): Promise<void> {
  if (!updateRunner) return;
  try {
    await updateRunner(true);
  } catch {
    // ignore
  }
}

/**
 * React-Hook zum Erkennen und Auslösen eines verfügbaren PWA-Updates.
 */
export function usePwaUpdate(): { hasUpdate: boolean; applyUpdate: () => Promise<void> } {
  const hasUpdate = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { hasUpdate, applyUpdate: applyPwaUpdate };
}

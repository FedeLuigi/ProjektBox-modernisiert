import { useEffect } from 'react';

type Direction = 'up' | 'down' | 'left' | 'right';

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex="0"]:not([aria-disabled="true"])',
  '[data-tv-focusable="true"]:not([aria-disabled="true"])',
].join(', ');

function getTopActiveScope(): HTMLElement {
  const dialogs = Array.from(
    document.querySelectorAll<HTMLElement>('[role="dialog"], [data-tv-scope="modal"]')
  ).filter((el) => !el.closest('[inert]') && !el.closest('[aria-hidden="true"]'));

  if (dialogs.length > 0) {
    return dialogs[dialogs.length - 1];
  }
  return document.body;
}

function isElementVisiblyFocusable(el: HTMLElement): boolean {
  if (el.closest('[inert]') || el.closest('[aria-hidden="true"]')) return false;
  if ((el as HTMLButtonElement).disabled) return false;
  if (el.getAttribute('aria-disabled') === 'true') return false;
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden' || style.pointerEvents === 'none') {
    return false;
  }
  const rect = el.getBoundingClientRect();
  return rect.width >= 4 && rect.height >= 4;
}

function getFocusableElements(scope: HTMLElement): HTMLElement[] {
  return Array.from(scope.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    isElementVisiblyFocusable
  );
}

function syncTvFocusAttribute(target: HTMLElement | null) {
  for (const prev of document.querySelectorAll<HTMLElement>('[data-tv-focused="true"]')) {
    if (prev !== target) {
      prev.removeAttribute('data-tv-focused');
    }
  }
  if (target) {
    target.setAttribute('data-tv-focused', 'true');
  }
}

function focusElement(el: HTMLElement) {
  el.focus({ preventScroll: true });
  el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  syncTvFocusAttribute(el);
}

function pickSpatialNext(
  current: HTMLElement,
  candidates: HTMLElement[],
  dir: Direction
): HTMLElement | null {
  const curRect = current.getBoundingClientRect();
  const curCx = curRect.left + curRect.width / 2;
  const curCy = curRect.top + curRect.height / 2;

  let best: HTMLElement | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const cand of candidates) {
    if (cand === current) continue;
    const rect = cand.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const dx = cx - curCx;
    const dy = cy - curCy;

    let primary = 0;
    let secondary = 0;

    if (dir === 'right') {
      if (dx <= 6) continue;
      primary = dx;
      secondary = Math.abs(dy);
    } else if (dir === 'left') {
      if (dx >= -6) continue;
      primary = -dx;
      secondary = Math.abs(dy);
    } else if (dir === 'down') {
      if (dy <= 6) continue;
      primary = dy;
      secondary = Math.abs(dx);
    } else {
      if (dy >= -6) continue;
      primary = -dy;
      secondary = Math.abs(dx);
    }

    // Bevorzugt ausgerichtete Elemente in derselben Spalte bzw. Zeile
    const score = primary + secondary * 2.6;
    if (score < bestScore) {
      bestScore = score;
      best = cand;
    }
  }

  return best;
}

function isBackKey(e: KeyboardEvent): boolean {
  if (
    e.key === 'Escape' ||
    e.key === 'GoBack' ||
    e.key === 'BrowserBack' ||
    e.keyCode === 27 ||
    e.keyCode === 10009 || // Samsung Tizen Return
    e.keyCode === 461 // LG webOS Back
  ) {
    return true;
  }
  if (e.key === 'Backspace' || e.keyCode === 8) {
    const active = document.activeElement;
    return !(active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement);
  }
  return false;
}

function getArrowDirection(e: KeyboardEvent): Direction | null {
  switch (e.key) {
    case 'ArrowUp':
    case 'Up':
      return 'up';
    case 'ArrowDown':
    case 'Down':
      return 'down';
    case 'ArrowLeft':
    case 'Left':
      return 'left';
    case 'ArrowRight':
    case 'Right':
      return 'right';
    default:
      break;
  }

  switch (e.keyCode) {
    case 38:
    case 19: // Android TV DPAD_UP
      return 'up';
    case 40:
    case 20: // Android TV DPAD_DOWN
      return 'down';
    case 37:
    case 21: // Android TV DPAD_LEFT
      return 'left';
    case 39:
    case 22: // Android TV DPAD_RIGHT
      return 'right';
    default:
      return null;
  }
}

function isSelectKey(e: KeyboardEvent): boolean {
  return (
    e.key === 'Enter' ||
    e.key === 'Select' ||
    e.key === 'Accept' ||
    e.key === 'MediaSelect' ||
    e.keyCode === 13 ||
    e.keyCode === 23 // Android TV DPAD_CENTER
  );
}

/**
 * Globale TV-Fernbedienungssteuerung (Pfeiltasten, OK/Enter, Zurück/Escape)
 * mit räumlicher Fokus-Navigation über alle aktiven Menüs, Lobbys & Modals.
 */
export function useTvRemoteNavigation(options: {
  enabled: boolean;
  scopeKey: string;
  onBack?: () => void;
}) {
  const { enabled, scopeKey, onBack } = options;

  // Bei Bildschirm- oder Modal-Wechsel automatisch das erste sinnvolle TV-Element fokussieren
  useEffect(() => {
    if (!enabled) return;
    const timer = window.setTimeout(() => {
      const scope = getTopActiveScope();
      const focusables = getFocusableElements(scope);
      if (focusables.length === 0) return;

      const active = document.activeElement as HTMLElement | null;
      if (active && focusables.includes(active)) {
        syncTvFocusAttribute(active);
        return;
      }

      const preferred =
        focusables.find((el) => el.dataset.tvAutofocus === 'true') || focusables[0];
      focusElement(preferred);
    }, 60);

    return () => window.clearTimeout(timer);
  }, [enabled, scopeKey]);

  useEffect(() => {
    if (!enabled) return;

    const handleFocusIn = (e: FocusEvent) => {
      if (e.target instanceof HTMLElement && isElementVisiblyFocusable(e.target)) {
        syncTvFocusAttribute(e.target);
      }
    };

    const handleMouseOver = (e: MouseEvent) => {
      if (!(e.target instanceof Element)) return;
      const scope = getTopActiveScope();
      const target = e.target.closest<HTMLElement>(FOCUSABLE_SELECTOR);
      if (target && scope.contains(target) && isElementVisiblyFocusable(target)) {
        syncTvFocusAttribute(target);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement | null;
      const isTextInput =
        active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement;

      if (isBackKey(e)) {
        if (isTextInput && (e.key === 'Escape' || e.keyCode === 27)) {
          active.blur();
          return;
        }
        e.preventDefault();
        onBack?.();
        return;
      }

      const dir = getArrowDirection(e);
      if (dir) {
        if (isTextInput && (dir === 'left' || dir === 'right')) {
          return;
        }

        e.preventDefault();
        const scope = getTopActiveScope();
        const candidates = getFocusableElements(scope);
        if (candidates.length === 0) return;

        const currentFocused =
          active && candidates.includes(active)
            ? active
            : candidates.find((el) => el.dataset.tvFocused === 'true') || null;

        if (!currentFocused) {
          focusElement(
            candidates.find((el) => el.dataset.tvAutofocus === 'true') || candidates[0]
          );
          return;
        }

        const next = pickSpatialNext(currentFocused, candidates, dir);
        if (next) {
          focusElement(next);
        }
        return;
      }

      if (isSelectKey(e) && active) {
        if (isTextInput) {
          if (e.key === 'Enter' || e.keyCode === 13) return;
        }
        // Native buttons/links klicken bei Enter selbst; bei D-Pad Select oder Custom-Cards manuell auslösen
        const isNativeClickable =
          active.tagName === 'BUTTON' || active.tagName === 'A';
        if (!isNativeClickable || (e.key !== 'Enter' && e.keyCode !== 13)) {
          e.preventDefault();
          active.click();
        }
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('mouseover', handleMouseOver, { passive: true });
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('mouseover', handleMouseOver);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, onBack]);
}

import QRCode from 'qrcode';
import { STORAGE_KEYS } from './userProfile';

let cachedServerOrigin: string | null = null;

// Server-Info asynchron abrufen (meldet Render.com URL oder lokale Netzwerk-IP)
if (typeof window !== 'undefined') {
  fetch('/api/server-info')
    .then((r) => r.json())
    .then((data) => {
      if (data?.renderUrl) {
        cachedServerOrigin = data.renderUrl;
      } else if (
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') &&
        data?.localIps &&
        data.localIps.length > 0
      ) {
        const port = window.location.port ? `:${window.location.port}` : '';
        cachedServerOrigin = `http://${data.localIps[0]}${port}`;
      }
    })
    .catch(() => {
      // Offline oder stiller Fehler
    });
}

/**
 * Erzeugt einen sauberen, gut scannbaren QR-Code auf einem Canvas-Element
 */
export async function renderQrCodeToCanvas(
  canvas: HTMLCanvasElement,
  text: string,
  size = 280
): Promise<void> {
  await QRCode.toCanvas(canvas, text, {
    width: size,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'M',
  });
  // Inline-Styles entfernen, damit CSS / Tailwind-Klassen die Dimensionen responsiv steuern
  canvas.style.removeProperty('width');
  canvas.style.removeProperty('height');
}

/**
 * Baut den vollständigen Beitritts-Link für die aktuelle Domain & Lobby
 */
export function getLobbyJoinUrl(code: string): string {
  const cleanCode = code.toUpperCase();

  // 1. Manuell hinterlegte Server-URL
  try {
    const customSocket = localStorage.getItem(STORAGE_KEYS.SOCKET_URL);
    if (customSocket && customSocket.startsWith('http')) {
      const url = new URL(customSocket);
      return `${url.origin}/?join=${cleanCode}`;
    }
  } catch {
    // ignore
  }

  // 2. Build-Zeit Umgebungsvariable (z. B. VITE_PUBLIC_URL)
  const envUrl = import.meta.env.VITE_PUBLIC_URL || import.meta.env.VITE_APP_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.startsWith('http')) {
    return `${envUrl.replace(/\/$/, '')}/?join=${cleanCode}`;
  }

  // 3. Vom Backend ermittelte Render-URL oder LAN-IP
  if (cachedServerOrigin) {
    return `${cachedServerOrigin.replace(/\/$/, '')}/?join=${cleanCode}`;
  }

  // 4. Standard Browser-Origin
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/?join=${cleanCode}`;
}

/**
 * Extrahiert den 4-6-stelligen Lobby-Code aus einem gescannten QR-Text oder URL
 */
export function parseLobbyCode(rawText: string): string | null {
  if (!rawText) return null;
  const trimmed = rawText.trim();

  // 1. URL prüfen
  try {
    const url = new URL(trimmed);
    const joinParam = url.searchParams.get('join') || url.searchParams.get('code');
    if (joinParam && /^[A-Z0-9]{4,6}$/i.test(joinParam)) {
      return joinParam.toUpperCase();
    }

    const pathMatch = url.pathname.match(/\/join\/([A-Za-z0-9]{4,6})/);
    if (pathMatch) return pathMatch[1].toUpperCase();

    const hashMatch = url.hash.match(/join=([A-Za-z0-9]{4,6})/i);
    if (hashMatch) return hashMatch[1].toUpperCase();
  } catch {
    // Kein valider URL-String, weiter mit Regex
  }

  // 2. Query/Fragment ohne Schema (z. B. "?join=ABCDE" oder "#join=ABCDE")
  const paramMatch = trimmed.match(/[?&#]join=([A-Za-z0-9]{4,6})/i);
  if (paramMatch) return paramMatch[1].toUpperCase();

  // 3. Reiner 4-6 stelliger alphanumerischer Code
  if (/^[A-Za-z0-9]{4,6}$/.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  return null;
}

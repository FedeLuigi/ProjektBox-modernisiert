import QRCode from 'qrcode';
import { STORAGE_KEYS } from './userProfile';

let cachedRenderUrl: string | null = null;
let cachedLocalLanOrigin: string | null = null;
let cachedSmartphoneUrl: string | null = null;

function resolveServerInfoBaseUrl(): string {
  if (typeof window === 'undefined') return '';
  try {
    const custom = localStorage.getItem(STORAGE_KEYS.SOCKET_URL);
    if (custom && custom.trim()) return custom.trim().replace(/\/+$/, '');
  } catch {
    // ignore storage failures
  }
  const envApi = import.meta.env.VITE_API_URL || import.meta.env.VITE_SOCKET_URL;
  if (envApi && typeof envApi === 'string' && envApi.trim()) {
    return envApi.trim().replace(/\/+$/, '');
  }
  return '';
}

function mapLocalPortToSmartphonePort(port: string): string {
  // Im lokalen Monorepo-Dev läuft TV typischerweise auf 5174 und Smartphone auf 5173
  if (port === '5174') return '5173';
  return port;
}

if (typeof window !== 'undefined') {
  const apiBase = resolveServerInfoBaseUrl();
  fetch(`${apiBase}/api/server-info`)
    .then((r) => r.json())
    .then((data) => {
      if (data?.smartphoneUrl) {
        cachedSmartphoneUrl = String(data.smartphoneUrl);
      }
      if (data?.renderUrl) {
        cachedRenderUrl = String(data.renderUrl);
      } else if (
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') &&
        Array.isArray(data?.localIps) &&
        data.localIps.length > 0
      ) {
        const mappedPort = mapLocalPortToSmartphonePort(window.location.port || '');
        const portSuffix = mappedPort ? `:${mappedPort}` : '';
        cachedLocalLanOrigin = `http://${data.localIps[0]}${portSuffix}`;
      }
    })
    .catch(() => {
      // Offline oder stiller Fehler
    });
}

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
  canvas.style.removeProperty('width');
  canvas.style.removeProperty('height');
}

/**
 * Baut den vollständigen Smartphone-Beitritts-Link für die übergebene Lobby.
 * Bevorzugt explizite Smartphone-URL (VITE_SMARTPHONE_URL oder Server-Konfiguration),
 * damit TV-QR-Codes Smartphones direkt zur Smartphone-App leiten.
 */
export function getLobbyJoinUrl(code: string): string {
  const cleanCode = code.toUpperCase();

  // 1. Explizite Smartphone-URL aus Build-Umgebungsvariable (Render Static Site)
  const smartphoneEnvUrl = import.meta.env.VITE_SMARTPHONE_URL;
  if (smartphoneEnvUrl && typeof smartphoneEnvUrl === 'string' && smartphoneEnvUrl.startsWith('http')) {
    return `${smartphoneEnvUrl.replace(/\/$/, '')}/?join=${cleanCode}`;
  }

  // 2. Vom Backend gemeldete SMARTPHONE_ORIGIN
  if (cachedSmartphoneUrl && cachedSmartphoneUrl.startsWith('http')) {
    return `${cachedSmartphoneUrl.replace(/\/$/, '')}/?join=${cleanCode}`;
  }

  // 3. Allgemeine Public-URL Umgebungsvariablen
  const envUrl = import.meta.env.VITE_PUBLIC_URL || import.meta.env.VITE_APP_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.startsWith('http')) {
    return `${envUrl.replace(/\/$/, '')}/?join=${cleanCode}`;
  }

  // 4. Lokale LAN-IP (für Smartphones im selben WLAN, inkl. Port-Mapping 5174 -> 5173)
  if (cachedLocalLanOrigin) {
    return `${cachedLocalLanOrigin.replace(/\/$/, '')}/?join=${cleanCode}`;
  }

  // 5. Fallback Render-/Origin-URL (mit lokalem Dev-Port-Mapping 5174 -> 5173 falls zutreffend)
  if (typeof window !== 'undefined') {
    if (window.location.port === '5174') {
      return `${window.location.protocol}//${window.location.hostname}:5173/?join=${cleanCode}`;
    }
    if (cachedRenderUrl) {
      return `${cachedRenderUrl.replace(/\/$/, '')}/?join=${cleanCode}`;
    }
    return `${window.location.origin}/?join=${cleanCode}`;
  }

  return `/?join=${cleanCode}`;
}

export function parseLobbyCode(rawText: string): string | null {
  if (!rawText) return null;
  const trimmed = rawText.trim();

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

  const paramMatch = trimmed.match(/[?&#]join=([A-Za-z0-9]{4,6})/i);
  if (paramMatch) return paramMatch[1].toUpperCase();

  if (/^[A-Za-z0-9]{4,6}$/.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  return null;
}

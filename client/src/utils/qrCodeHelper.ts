import QRCode from 'qrcode';

/**
 * Erzeugt einen sauberen, gut scannbaren QR-Code auf einem Canvas-Element
 */
export async function renderQrCodeToCanvas(
  canvas: HTMLCanvasElement,
  text: string,
  size = 280
): Promise<void> {
  return QRCode.toCanvas(canvas, text, {
    width: size,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'M',
  });
}

/**
 * Baut den vollständigen Beitritts-Link für die aktuelle Domain & Lobby
 */
export function getLobbyJoinUrl(code: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/?join=${code.toUpperCase()}`;
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

  // 3. Reiner 4-6 stelliger Alphanumerischer Code (Groß-/Kleinschreibung)
  if (/^[A-Za-z0-9]{4,6}$/.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  return null;
}

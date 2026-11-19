/**
 * Normalisiert eine konfigurierte Backend-Basis-URL (z. B. VITE_API_URL / VITE_SOCKET_URL).
 * Entfernt abschließende Slashes sowie ein versehentlich angehängtes "/api"-Suffix,
 * damit Endpoint-Pfade wie "/api/session" niemals zu "/api/api/session" verdoppelt werden.
 */
export function normalizeBackendBaseUrl(raw?: string | null): string {
  if (!raw) return '';
  let normalized = raw.trim().replace(/\/+$/, '');
  while (/\/api$/i.test(normalized)) {
    normalized = normalized.replace(/\/api$/i, '').replace(/\/+$/, '');
  }
  return normalized;
}

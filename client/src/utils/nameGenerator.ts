// ─── Generator für einzigartige Spielernamen ───
// Kombination aus 32 Adjektiven x 32 Nomen x 9000 Zahlen = über 9,2 Millionen Kombinationen!

const ADJECTIVES = [
  'Cyber', 'Neon', 'Quantum', 'Shadow', 'Hyper', 'Cosmic', 'Turbo', 'Pixel',
  'Astro', 'Vortex', 'Phantom', 'Nexus', 'Ultra', 'Apex', 'Omega', 'Solar',
  'Lunar', 'Echo', 'Titan', 'Rogue', 'Blaze', 'Frost', 'Thunder', 'Zero',
  'Sonic', 'Mystic', 'Iron', 'Nova', 'Storm', 'Laser', 'Retro', 'Alpha'
];

const NOUNS = [
  'Phoenix', 'Falcon', 'Viper', 'Ninja', 'Racer', 'Wolf', 'Dragon', 'Hunter',
  'Ghost', 'Knight', 'Spectre', 'Striker', 'Pilot', 'Raven', 'Titan', 'Drifter',
  'Samurai', 'Comet', 'Gamer', 'Cyborg', 'Beast', 'Fox', 'Hawk', 'Spark',
  'Shadow', 'Rebel', 'Sniper', 'Captain', 'Maverick', 'Wizard', 'Glitch'
];

export function generateUniquePlayerName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${adj}${noun}#${num}`;
}

// ─── Generator für einfache, freundliche Lobbynamen ───
const SIMPLE_LOBBY_NAMES = [
  'Spielrunde',
  'Wohnzimmer',
  'Sofa-Runde',
  'Spieleabend',
  'Freundesrunde',
  'Partyraum',
  'Heimspiel',
  'Spielzimmer',
  'Treffpunkt',
  'Blitzrunde',
  'Couch-Runde',
  'Lounge',
];

const SIMPLE_TV_LOBBY_NAMES = [
  'TV-Runde',
  'Wohnzimmer',
  'Heimkino',
  'Sofa-Runde',
  'Spieleabend',
  'Partyraum',
];

export function generateSimpleLobbyName(isTvMode = false, excludeName?: string): string {
  const pool = isTvMode ? SIMPLE_TV_LOBBY_NAMES : SIMPLE_LOBBY_NAMES;
  const candidates = excludeName ? pool.filter((n) => n !== excludeName) : pool;
  const activePool = candidates.length > 0 ? candidates : pool;
  return activePool[Math.floor(Math.random() * activePool.length)];
}

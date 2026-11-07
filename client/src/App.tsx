import { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight, ChevronRight, Gamepad2, Grid2X2, Search, Sparkles,
  Brain, Zap, Puzzle, Clock3, Plus, Download, WifiOff
} from 'lucide-react';

type Category = 'Alle' | 'Strategie' | 'Denken' | 'Arcade';

type Game = {
  id: string;
  title: string;
  description: string;
  category: Exclude<Category, 'Alle'>;
  players: string;
  duration: string;
  icon: typeof Brain;
  tone: string;
  status: 'Bereit' | 'In Arbeit';
  featured?: boolean;
};

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const games: Game[] = [
  {
    id: 'memory',
    title: 'Memory',
    description: 'Finde die passenden Paare und trainiere dein Gedächtnis.',
    category: 'Denken',
    players: '1 Spieler',
    duration: '5–10 Min.',
    icon: Brain,
    tone: 'peach',
    status: 'In Arbeit',
    featured: true,
  },
  {
    id: 'connect',
    title: 'Vier gewinnt',
    description: 'Denke voraus und bringe vier Steine in eine Reihe.',
    category: 'Strategie',
    players: '2 Spieler',
    duration: '5 Min.',
    icon: Grid2X2,
    tone: 'lavender',
    status: 'In Arbeit',
  },
  {
    id: 'reaction',
    title: 'Reaktions-Test',
    description: 'Wie schnell kannst du reagieren? Stelle dich der Challenge.',
    category: 'Arcade',
    players: '1 Spieler',
    duration: '2 Min.',
    icon: Zap,
    tone: 'mint',
    status: 'In Arbeit',
  },
  {
    id: 'tic-tac-toe',
    title: 'Tic Tac Toe',
    description: 'Ein Klassiker. Einfach zu lernen, schwer zu meistern.',
    category: 'Strategie',
    players: '2 Spieler',
    duration: '3 Min.',
    icon: Puzzle,
    tone: 'blue',
    status: 'In Arbeit',
  },
];

const categories: Category[] = ['Alle', 'Strategie', 'Denken', 'Arcade'];

export function App() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category>('Alle');
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const filteredGames = useMemo(() => games.filter((game) => {
    const matchesCategory = category === 'Alle' || game.category === category;
    const search = query.trim().toLocaleLowerCase('de');
    const matchesSearch = !search || `${game.title} ${game.description} ${game.category}`.toLocaleLowerCase('de').includes(search);
    return matchesCategory && matchesSearch;
  }), [category, query]);

  const featured = games.find((game) => game.featured)!;

  return (
    <div className="min-h-screen">
      {isOffline && (
        <div style={{
          background: 'var(--surface-alt)',
          borderBottom: '1px solid var(--border)',
          padding: '8px 16px',
          fontSize: '12px',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}>
          <WifiOff size={14} />
          <span>Offline-Modus aktiv – gecachte Inhalte und Spiele bleiben verfügbar.</span>
        </div>
      )}

      <header className="site-header">
        <a className="brand" href="#" aria-label="ProjektBox Startseite">
          <span className="brand-mark"><Gamepad2 size={21} strokeWidth={2.2} /></span>
          <span>projekt<span className="brand-light">box</span></span>
        </a>
        <nav className="header-nav" aria-label="Hauptnavigation">
          <a className="nav-active" href="#entdecken">Entdecken</a>
          <a href="#sammlung">Meine Sammlung</a>
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {deferredPrompt && !isInstalled && (
            <button
              onClick={handleInstallClick}
              className="header-action"
              style={{
                background: 'var(--brand)',
                color: 'var(--bg)',
                borderColor: 'var(--brand)',
                cursor: 'pointer'
              }}
              title="ProjektBox als App auf deinem Gerät installieren"
            >
              <Download size={15} /> App installieren
            </button>
          )}
          <a className="header-action" href="#entdecken">Spiele entdecken <ArrowUpRight size={16} /></a>
        </div>
      </header>

      <main className="page-shell">
        <section className="intro-section">
          <div className="intro-copy">
            <div className="eyebrow"><span className="eyebrow-dot" /> DEIN SPIELPLATZ</div>
            <h1>Ein bisschen spielen.<br /><span>Vieles entdecken.</span></h1>
            <p className="intro-text">Willkommen in deiner ProjektBox. Entdecke kleine Spiele, probiere Neues aus und finde deinen nächsten Lieblingszeitvertreib.</p>
            <a className="primary-link" href="#entdecken">Spiele entdecken <ChevronRight size={17} /></a>
          </div>
          <div className="intro-art" aria-hidden="true">
            <div className="art-orbit orbit-one" />
            <div className="art-orbit orbit-two" />
            <div className="art-spark spark-one">✳</div>
            <div className="art-spark spark-two">✦</div>
            <div className="art-card art-card-back"><span>✳</span></div>
            <div className="art-card art-card-front"><Gamepad2 size={72} strokeWidth={1.25} /></div>
            <div className="art-pill"><Sparkles size={14} /> PLAY YOUR WAY</div>
          </div>
        </section>

        <section className="featured-section" aria-label="Empfehlung">
          <div className="featured-copy">
            <div className="featured-label"><Sparkles size={14} /> IM FOKUS</div>
            <h2>{featured.title}</h2>
            <p>{featured.description}</p>
            <button className="featured-button" onClick={() => setSelectedGame(featured)}>
              Spiel ansehen <ArrowUpRight size={16} />
            </button>
          </div>
          <div className="featured-visual" aria-hidden="true">
            <div className="memory-tile tile-a">✦</div>
            <div className="memory-tile tile-b">●</div>
            <div className="memory-tile tile-c">✿</div>
            <div className="memory-tile tile-d">?</div>
            <div className="memory-tile tile-e">●</div>
          </div>
          <span className="featured-index">01 / 04</span>
        </section>

        <section id="entdecken" className="catalog-section">
          <div className="section-heading">
            <div>
              <div className="eyebrow">DIE SPIELEBIBLIOTHEK</div>
              <h2>Was möchtest du spielen?</h2>
              <p className="section-subtitle">Kleine Spiele, grosse Abwechslung.</p>
            </div>
            <div className="game-count"><span>{filteredGames.length.toString().padStart(2, '0')}</span> SPIELE</div>
          </div>

          <div className="catalog-toolbar">
            <div className="filter-tabs" role="group" aria-label="Spiele nach Kategorie filtern">
              {categories.map((item) => (
                <button key={item} className={category === item ? 'filter-tab active' : 'filter-tab'} onClick={() => setCategory(item)}>{item}</button>
              ))}
            </div>
            <label className="search-box">
              <Search size={17} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Spiel suchen ..." aria-label="Spiel suchen" />
              <kbd>⌘ K</kbd>
            </label>
          </div>

          <div id="sammlung" className="game-grid">
            {filteredGames.map((game, index) => {
              const Icon = game.icon;
              return (
                <article className="game-card" key={game.id}>
                  <button className="game-card-button" onClick={() => setSelectedGame(game)} aria-label={`${game.title} ansehen`}>
                    <div className={`game-art ${game.tone}`}>
                      <span className="art-number">{String(index + 1).padStart(2, '0')}</span>
                      <div className="game-art-icon"><Icon size={43} strokeWidth={1.45} /></div>
                      <span className="art-arrow"><ArrowUpRight size={17} /></span>
                      {game.id === 'connect' && <div className="connect-dots"><i /><i /><i /><i /><i /><i /></div>}
                      {game.id === 'reaction' && <div className="reaction-lines"><i /><i /><i /></div>}
                      {game.id === 'tic-tac-toe' && <div className="tic-symbols"><b>×</b><b>○</b><b>×</b></div>}
                    </div>
                    <div className="game-card-content">
                      <div className="game-card-meta"><span>{game.category}</span><span className="status-dot" /> <span>{game.status}</span></div>
                      <h3>{game.title}</h3>
                      <p>{game.description}</p>
                      <div className="game-card-footer"><span><Gamepad2 size={14} /> {game.players}</span><span><Clock3 size={14} /> {game.duration}</span></div>
                    </div>
                  </button>
                </article>
              );
            })}
          </div>
          {filteredGames.length === 0 && (
            <div className="empty-state"><Search size={25} /><h3>Nichts gefunden</h3><p>Versuche einen anderen Suchbegriff oder wähle eine andere Kategorie.</p><button onClick={() => { setQuery(''); setCategory('Alle'); }}>Filter zurücksetzen</button></div>
          )}
        </section>

        <section className="coming-soon">
          <div className="coming-icon"><Plus size={22} /></div>
          <div><h3>Hier ist noch Platz für mehr.</h3><p>Die Spielesammlung wächst mit jedem neuen Projekt.</p></div>
          <span>MORE TO COME</span>
        </section>
      </main>

      <footer className="site-footer">
        <a className="brand footer-brand" href="#"><span className="brand-mark"><Gamepad2 size={18} /></span><span>projekt<span className="brand-light">box</span></span></a>
        <span>Ein Ort für kleine Spielideen.</span>
        <span>© 2026 ProjektBox</span>
      </footer>

      {selectedGame && (
        <div className="modal-backdrop" role="presentation" onClick={() => setSelectedGame(null)}>
          <section className="game-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedGame(null)} aria-label="Schliessen">×</button>
            <div className={`modal-art ${selectedGame.tone}`}><selectedGame.icon size={52} strokeWidth={1.4} /></div>
            <div className="eyebrow">{selectedGame.category} · {selectedGame.players}</div>
            <h2 id="modal-title">{selectedGame.title}</h2>
            <p>{selectedGame.description}</p>
            <div className="modal-note"><Clock3 size={16} /> Dieses Spiel ist als nächstes für die ProjektBox vorgesehen.</div>
            <button className="featured-button modal-button" onClick={() => setSelectedGame(null)}>Alles klar</button>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;

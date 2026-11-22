export function renderDashboardHtml(initialData: unknown): string {
  const initialJson = JSON.stringify(initialData).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html lang="de" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ProjektBox | Server Dashboard</title>
  <style>
    :root {
      --bg: #080A0F;
      --sidebar-bg: #07090D;
      --surface: #0D1017;
      --surface-hover: #131722;
      --border: rgba(255, 255, 255, 0.08);
      --border-strong: rgba(255, 255, 255, 0.14);
      --text: #F8FAFC;
      --text-muted: #8B949E;
      --text-dim: #64748B;
      --blue: #3B82F6;
      --blue-strong: #2563EB;
      --emerald: #34D399;
      --amber: #FBBF24;
      --rose: #FB7185;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }

    .app-shell {
      display: flex;
      min-height: 100vh;
    }

    /* ─── SIDEBAR ─── */
    .sidebar {
      width: 236px;
      flex-shrink: 0;
      background: var(--sidebar-bg);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      padding: 22px 14px;
      position: sticky;
      top: 0;
      height: 100vh;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 4px 10px 24px;
      font-weight: 700;
      font-size: 1.05rem;
      letter-spacing: -0.01em;
      color: var(--text);
    }

    .brand-icon {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      background: rgba(59, 130, 246, 0.14);
      border: 1px solid rgba(59, 130, 246, 0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #60A5FA;
    }

    .nav-section-label {
      font-size: 0.68rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      color: var(--text-dim);
      text-transform: uppercase;
      padding: 12px 12px 6px;
    }

    .nav-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 9px 12px;
      border-radius: 9px;
      border: 1px solid transparent;
      background: transparent;
      color: var(--text-muted);
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      text-align: left;
      text-decoration: none;
      transition: all 0.15s ease;
    }

    .nav-item:hover {
      background: rgba(255, 255, 255, 0.04);
      color: var(--text);
    }

    .nav-item.active {
      background: linear-gradient(90deg, #3B82F6, #2563EB);
      color: #FFFFFF;
      box-shadow: 0 6px 20px rgba(37, 99, 235, 0.28);
    }

    .nav-item svg {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
      opacity: 0.85;
    }

    .sidebar-footer {
      margin-top: auto;
      padding-top: 14px;
      border-top: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    /* ─── MAIN CONTENT ─── */
    .main {
      flex: 1;
      min-width: 0;
      padding: 26px 30px 42px;
      max-width: 1440px;
    }

    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
      margin-bottom: 22px;
    }

    .page-title {
      font-size: 1.45rem;
      font-weight: 650;
      letter-spacing: -0.02em;
      color: var(--text);
    }

    .topbar-right {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .topbar-subtitle {
      font-size: 0.85rem;
      color: var(--text-muted);
    }

    .live-pill {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 6px 12px;
      border-radius: 999px;
      border: 1px solid var(--border-strong);
      background: var(--surface);
      color: var(--text-muted);
      font-size: 0.78rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .live-pill:hover {
      border-color: rgba(59, 130, 246, 0.45);
      color: var(--text);
    }

    .live-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--emerald);
      box-shadow: 0 0 8px var(--emerald);
    }

    .live-dot.paused {
      background: var(--amber);
      box-shadow: none;
    }

    /* ─── KPI ROW ─── */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 16px;
      margin-bottom: 18px;
    }

    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 18px 20px;
      transition: border-color 0.15s ease;
    }

    .card:hover {
      border-color: var(--border-strong);
    }

    .kpi-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .kpi-label {
      font-size: 0.8rem;
      font-weight: 500;
      color: var(--text-muted);
    }

    .kpi-icon {
      color: var(--text-dim);
      width: 16px;
      height: 16px;
    }

    .kpi-value {
      font-size: 1.85rem;
      font-weight: 700;
      letter-spacing: -0.025em;
      color: var(--text);
      line-height: 1.15;
      margin-bottom: 6px;
    }

    .kpi-sub {
      font-size: 0.76rem;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .trend-up { color: var(--emerald); font-weight: 500; }
    .trend-warn { color: var(--amber); font-weight: 500; }
    .trend-bad { color: var(--rose); font-weight: 500; }

    /* ─── MIDDLE SPLIT ─── */
    .mid-grid {
      display: grid;
      grid-template-columns: minmax(0, 2fr) minmax(260px, 1fr);
      gap: 16px;
      margin-bottom: 18px;
    }

    .card-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 16px;
    }

    .card-title {
      font-size: 0.98rem;
      font-weight: 600;
      color: var(--text);
    }

    .card-subtitle {
      font-size: 0.78rem;
      color: var(--text-muted);
      margin-top: 2px;
    }

    .accent-badge {
      font-size: 0.76rem;
      font-weight: 500;
      color: #60A5FA;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      white-space: nowrap;
    }

    /* ─── SVG CHART ─── */
    .chart-wrap {
      width: 100%;
      height: 220px;
      position: relative;
    }

    .chart-svg {
      width: 100%;
      height: 100%;
      overflow: visible;
    }

    /* ─── DISTRIBUTION BARS ─── */
    .dist-list {
      display: flex;
      flex-direction: column;
      gap: 18px;
      margin-top: 6px;
    }

    .dist-row-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.82rem;
      margin-bottom: 7px;
    }

    .dist-name { color: var(--text); font-weight: 500; }
    .dist-val { color: var(--text-muted); font-variant-numeric: tabular-nums; }

    .bar-track {
      width: 100%;
      height: 6px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.08);
      overflow: hidden;
    }

    .bar-fill {
      height: 100%;
      border-radius: 999px;
      background: linear-gradient(90deg, #2563EB, #60A5FA);
      transition: width 0.35s ease;
    }

    .bar-fill.subtle {
      background: linear-gradient(90deg, #4F46E5, #818CF8);
    }

    /* ─── TABLE ─── */
    .table-wrap {
      width: 100%;
      overflow-x: auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    th {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--text-muted);
      padding: 10px 12px;
      border-bottom: 1px solid var(--border);
    }

    td {
      padding: 13px 12px;
      font-size: 0.84rem;
      color: var(--text);
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      vertical-align: middle;
    }

    tr:last-child td { border-bottom: none; }
    tr:hover td { background: rgba(255, 255, 255, 0.02); }

    .cell-main { font-weight: 500; color: var(--text); }
    .cell-sub { font-size: 0.75rem; color: var(--text-muted); }

    .status-chip {
      display: inline-flex;
      align-items: center;
      padding: 3px 10px;
      border-radius: 999px;
      font-size: 0.72rem;
      font-weight: 500;
      border: 1px solid var(--border-strong);
      background: rgba(255, 255, 255, 0.04);
      color: var(--text);
    }

    .status-chip.online {
      border-color: rgba(52, 211, 153, 0.35);
      color: #6EE7B7;
      background: rgba(16, 185, 129, 0.1);
    }

    .status-chip.waiting {
      border-color: rgba(251, 191, 36, 0.35);
      color: #FDE68A;
      background: rgba(245, 158, 11, 0.1);
    }

    .btn-ghost {
      padding: 5px 10px;
      border-radius: 7px;
      border: 1px solid var(--border-strong);
      background: transparent;
      color: var(--text-muted);
      font-size: 0.75rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-ghost:hover {
      border-color: rgba(251, 113, 133, 0.5);
      color: #FECDD3;
      background: rgba(225, 29, 72, 0.15);
    }

    .empty-box {
      padding: 34px 16px;
      text-align: center;
      color: var(--text-muted);
      font-size: 0.85rem;
    }

    /* ─── SECONDARY PANELS ─── */
    .two-col {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
    }

    .kv-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      font-size: 0.83rem;
      gap: 12px;
    }

    .kv-row:last-child { border-bottom: none; }
    .kv-key { color: var(--text-muted); }
    .kv-val { color: var(--text); font-weight: 500; text-align: right; word-break: break-all; }
    .kv-val a { color: #60A5FA; text-decoration: none; }
    .kv-val a:hover { text-decoration: underline; }

    .games-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
      gap: 14px;
    }

    .game-tile {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 14px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
    }

    .view-panel { display: none; }
    .view-panel.active { display: block; }

    #toast {
      position: fixed;
      bottom: 22px;
      right: 22px;
      background: #131722;
      border: 1px solid rgba(59, 130, 246, 0.45);
      color: var(--text);
      padding: 10px 16px;
      border-radius: 10px;
      font-size: 0.83rem;
      font-weight: 500;
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.55);
      opacity: 0;
      transform: translateY(12px);
      pointer-events: none;
      transition: all 0.2s ease;
      z-index: 100;
    }

    #toast.show { opacity: 1; transform: translateY(0); }

    @media (max-width: 1100px) {
      .kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .mid-grid, .two-col { grid-template-columns: 1fr; }
    }

    @media (max-width: 780px) {
      .app-shell { flex-direction: column; }
      .sidebar {
        width: 100%;
        height: auto;
        position: static;
        border-right: none;
        border-bottom: 1px solid var(--border);
        padding: 14px 16px;
      }
      .nav-list { flex-direction: row; flex-wrap: wrap; }
      .nav-item { width: auto; }
      .sidebar-footer { display: none; }
      .main { padding: 18px 16px 32px; }
      .kpi-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="app-shell">
    <!-- ─── SIDEBAR ─── -->
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <rect x="2" y="6" width="20" height="12" rx="4" />
            <path d="M6 12h4M8 10v4M15 11h.01M18 13h.01" stroke-linecap="round" />
          </svg>
        </div>
        <span>ProjektBox</span>
      </div>

      <div class="nav-section-label">CORE</div>
      <nav class="nav-list">
        <button type="button" class="nav-item active" data-view="overview" onclick="switchView('overview')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
          <span>Dashboard</span>
        </button>
        <button type="button" class="nav-item" data-view="games" onclick="switchView('games')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="3"/><path d="M6 12h4M8 10v4"/></svg>
          <span>Spiele</span>
        </button>
        <button type="button" class="nav-item" data-view="lobbies" onclick="switchView('lobbies')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          <span>Lobbys &amp; Spieler</span>
        </button>
        <button type="button" class="nav-item" data-view="system" onclick="switchView('system')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="M18 17V9M13 17V5M8 17v-3"/></svg>
          <span>System &amp; API</span>
        </button>
      </nav>

      <div class="nav-section-label" style="margin-top: 14px;">SYSTEM</div>
      <div class="nav-list">
        <button type="button" class="nav-item" onclick="fetchLiveStats(true)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><polyline points="21 3 21 9 15 9"/></svg>
          <span>Aktualisieren</span>
        </button>
        <button type="button" class="nav-item" onclick="triggerCleanup()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>
          <span>Bereinigen</span>
        </button>
      </div>

      <div class="sidebar-footer" id="sidebar-links"></div>
    </aside>

    <!-- ─── MAIN ─── -->
    <main class="main">
      <div class="topbar">
        <h1 class="page-title" id="page-title">Dashboard Overview</h1>
        <div class="topbar-right">
          <span class="topbar-subtitle">Überwache Lobbys, Spieler und Server-Status.</span>
          <button type="button" class="live-pill" id="live-toggle-btn" onclick="toggleAutoRefresh()">
            <span class="live-dot" id="live-dot"></span>
            <span id="live-text">Online • Live (3s)</span>
          </button>
        </div>
      </div>

      <!-- ─── OVERVIEW VIEW ─── -->
      <section class="view-panel active" id="view-overview">
        <div class="kpi-grid">
          <div class="card">
            <div class="kpi-header">
              <span class="kpi-label">Aktive Lobbys</span>
              <svg class="kpi-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="3"/><path d="M6 12h4M8 10v4"/></svg>
            </div>
            <div class="kpi-value" id="kpi-lobbies">0</div>
            <div class="kpi-sub" id="kpi-lobbies-sub">0 Warteraum • 0 Im Spiel</div>
          </div>

          <div class="card">
            <div class="kpi-header">
              <span class="kpi-label">Verbundene Spieler</span>
              <svg class="kpi-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
            </div>
            <div class="kpi-value" id="kpi-players">0</div>
            <div class="kpi-sub" id="kpi-players-sub">0 Spieler • 0 TV • 0 Bots</div>
          </div>

          <div class="card">
            <div class="kpi-header">
              <span class="kpi-label">WebSockets</span>
              <svg class="kpi-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
            </div>
            <div class="kpi-value" id="kpi-sockets">0</div>
            <div class="kpi-sub">Aktive Socket.io Clients</div>
          </div>

          <div class="card">
            <div class="kpi-header">
              <span class="kpi-label">Server &amp; RAM</span>
              <svg class="kpi-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            </div>
            <div class="kpi-value" id="kpi-ram">0 MB</div>
            <div class="kpi-sub" id="kpi-db-sub"><span class="trend-up">PostgreSQL aktiv</span></div>
          </div>
        </div>

        <div class="mid-grid">
          <div class="card">
            <div class="card-head">
              <div>
                <div class="card-title">Server &amp; Spieler-Aktivität</div>
                <div class="card-subtitle">Live-Verlauf von Sockets, Spielern &amp; Heap-Auslastung</div>
              </div>
              <span class="accent-badge" id="chart-badge">↗ Live-Telemetrie</span>
            </div>
            <div class="chart-wrap">
              <svg class="chart-svg" id="activity-chart" viewBox="0 0 640 210" preserveAspectRatio="none"></svg>
            </div>
          </div>

          <div class="card">
            <div class="card-head">
              <div>
                <div class="card-title">Plattform-Verteilung</div>
                <div class="card-subtitle">Geräte &amp; Speicher im Überblick</div>
              </div>
            </div>
            <div class="dist-list" id="dist-list"></div>
          </div>
        </div>

        <div class="card">
          <div class="card-head">
            <div>
              <div class="card-title">Aktive Lobbys &amp; Räume</div>
              <div class="card-subtitle">Neueste Spielräume auf dem Server</div>
            </div>
            <span class="status-chip" id="lobbies-count-chip">0 Räume</span>
          </div>
          <div class="table-wrap" id="overview-lobbies-table"></div>
        </div>
      </section>

      <!-- ─── GAMES VIEW ─── -->
      <section class="view-panel" id="view-games">
        <div class="card">
          <div class="card-head">
            <div>
              <div class="card-title">Registrierte Multiplayer-Spiele</div>
              <div class="card-subtitle">Alle auf dem Backend geladenen Spielmodule</div>
            </div>
          </div>
          <div class="games-grid" id="games-grid"></div>
        </div>
      </section>

      <!-- ─── LOBBIES & PLAYERS VIEW ─── -->
      <section class="view-panel" id="view-lobbies">
        <div class="card">
          <div class="card-head">
            <div>
              <div class="card-title">Alle Lobbys &amp; Spieler</div>
              <div class="card-subtitle">Live-Übersicht inklusive Mitspieler und Verwaltung</div>
            </div>
            <button type="button" class="btn-ghost" onclick="triggerCleanup()">Abgelaufene bereinigen</button>
          </div>
          <div class="table-wrap" id="full-lobbies-table"></div>
        </div>
      </section>

      <!-- ─── SYSTEM & API VIEW ─── -->
      <section class="view-panel" id="view-system">
        <div class="two-col">
          <div class="card">
            <div class="card-head">
              <div>
                <div class="card-title">Server &amp; System-Umgebung</div>
                <div class="card-subtitle">Laufzeit, CPU &amp; Datenbank</div>
              </div>
            </div>
            <div id="system-kv"></div>
          </div>

          <div class="card">
            <div class="card-head">
              <div>
                <div class="card-title">Netzwerk &amp; REST-Endpunkte</div>
                <div class="card-subtitle">Origins &amp; API-Pfade</div>
              </div>
            </div>
            <div id="network-kv"></div>
          </div>
        </div>
      </section>
    </main>
  </div>

  <div id="toast"></div>

  <script>
    let currentData = ${initialJson};
    let autoRefreshActive = true;
    let pollTimer = null;
    const historyPoints = [];

    function pushHistory(data) {
      const now = new Date();
      const label = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      historyPoints.push({
        label,
        sockets: data.server.sockets.activeClients,
        players: data.stats.totalPlayers,
        heapPct: data.server.memory.heapPercent
      });
      if (historyPoints.length > 14) historyPoints.shift();
    }

    function switchView(view) {
      document.querySelectorAll('.nav-item[data-view]').forEach((el) => {
        el.classList.toggle('active', el.dataset.view === view);
      });
      document.querySelectorAll('.view-panel').forEach((el) => {
        el.classList.toggle('active', el.id === 'view-' + view);
      });
      const titles = {
        overview: 'Dashboard Overview',
        games: 'Registrierte Spiele',
        lobbies: 'Lobbys & Spieler',
        system: 'System & API'
      };
      document.getElementById('page-title').innerText = titles[view] || 'Dashboard Overview';
    }

    function showToast(msg) {
      const el = document.getElementById('toast');
      el.innerText = msg;
      el.classList.add('show');
      setTimeout(() => el.classList.remove('show'), 2600);
    }

    function toggleAutoRefresh() {
      autoRefreshActive = !autoRefreshActive;
      const dot = document.getElementById('live-dot');
      const txt = document.getElementById('live-text');
      if (autoRefreshActive) {
        dot.classList.remove('paused');
        txt.innerText = 'Online • Live (3s)';
        schedulePoll();
      } else {
        dot.classList.add('paused');
        txt.innerText = 'Pausiert';
        clearTimeout(pollTimer);
      }
    }

    function schedulePoll() {
      clearTimeout(pollTimer);
      if (!autoRefreshActive) return;
      pollTimer = setTimeout(() => fetchLiveStats(false), 3000);
    }

    async function fetchLiveStats(manual) {
      try {
        const res = await fetch('/dashboard/data');
        if (res.ok) {
          currentData = await res.json();
          pushHistory(currentData);
          renderData(currentData);
          if (manual) showToast('Dashboard aktualisiert');
        }
      } catch (err) {
        console.error('Fehler beim Laden der Dashboard-Daten:', err);
      } finally {
        if (autoRefreshActive) schedulePoll();
      }
    }

    async function triggerCleanup() {
      try {
        const res = await fetch('/dashboard/cleanup', { method: 'POST' });
        const json = await res.json();
        showToast(json.message || 'Bereinigt');
        fetchLiveStats(false);
      } catch (e) {
        showToast('Fehler bei der Bereinigung');
      }
    }

    async function closeLobby(lobbyId) {
      if (!confirm('Möchtest du diese Lobby wirklich schließen?')) return;
      try {
        const res = await fetch('/dashboard/close-lobby', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lobbyId })
        });
        const json = await res.json();
        showToast(json.message || 'Lobby geschlossen');
        fetchLiveStats(false);
      } catch (e) {
        showToast('Fehler beim Schließen der Lobby');
      }
    }

    function buildSmoothPath(coords) {
      if (coords.length === 0) return '';
      if (coords.length === 1) return 'M ' + coords[0].x + ' ' + coords[0].y;
      let d = 'M ' + coords[0].x.toFixed(1) + ' ' + coords[0].y.toFixed(1);
      for (let i = 0; i < coords.length - 1; i++) {
        const p0 = coords[i];
        const p1 = coords[i + 1];
        const cx = ((p0.x + p1.x) / 2).toFixed(1);
        d += ' C ' + cx + ' ' + p0.y.toFixed(1) + ', ' + cx + ' ' + p1.y.toFixed(1) + ', ' + p1.x.toFixed(1) + ' ' + p1.y.toFixed(1);
      }
      return d;
    }

    function renderActivityChart() {
      const svg = document.getElementById('activity-chart');
      const pts = historyPoints.length >= 2 ? historyPoints : [historyPoints[0], historyPoints[0]];
      const W = 640, H = 210, padL = 34, padR = 14, padT = 12, padB = 26;
      const plotW = W - padL - padR;
      const plotH = H - padT - padB;

      const maxVal = Math.max(10, ...pts.map((p) => Math.max(p.heapPct, p.sockets * 5, p.players * 5)));
      const yMax = Math.ceil(maxVal / 25) * 25;

      let gridHtml = '';
      for (let i = 0; i <= 4; i++) {
        const val = Math.round((yMax / 4) * i);
        const y = padT + plotH - (plotH * i) / 4;
        gridHtml += '<line x1="' + padL + '" y1="' + y + '" x2="' + (W - padR) + '" y2="' + y + '" stroke="rgba(255,255,255,0.07)" stroke-dasharray="3 4" />';
        gridHtml += '<text x="' + (padL - 8) + '" y="' + (y + 4) + '" fill="#64748B" font-size="10" text-anchor="end">' + val + '</text>';
      }

      const toCoords = (selector) => pts.map((p, idx) => {
        const x = padL + (plotW * idx) / Math.max(1, pts.length - 1);
        const y = padT + plotH - (Math.min(yMax, selector(p)) / yMax) * plotH;
        return { x, y };
      });

      const heapCoords = toCoords((p) => p.heapPct);
      const sockCoords = toCoords((p) => p.sockets * 5);
      const heapLine = buildSmoothPath(heapCoords);
      const sockLine = buildSmoothPath(sockCoords);
      const heapArea = heapLine + ' L ' + heapCoords[heapCoords.length - 1].x.toFixed(1) + ' ' + (padT + plotH) + ' L ' + heapCoords[0].x.toFixed(1) + ' ' + (padT + plotH) + ' Z';

      let xLabels = '';
      const step = Math.max(1, Math.floor(pts.length / 5));
      pts.forEach((p, idx) => {
        if (idx === 0 || idx === pts.length - 1 || idx % step === 0) {
          const x = padL + (plotW * idx) / Math.max(1, pts.length - 1);
          xLabels += '<text x="' + x.toFixed(1) + '" y="' + (H - 6) + '" fill="#64748B" font-size="10" text-anchor="middle">' + escapeHtml(p.label.slice(0, 5)) + '</text>';
        }
      });

      svg.innerHTML =
        '<defs>' +
          '<linearGradient id="areaBlue" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0%" stop-color="#3B82F6" stop-opacity="0.32" />' +
            '<stop offset="100%" stop-color="#3B82F6" stop-opacity="0.01" />' +
          '</linearGradient>' +
        '</defs>' +
        gridHtml +
        xLabels +
        '<path d="' + heapArea + '" fill="url(#areaBlue)" />' +
        '<path d="' + heapLine + '" fill="none" stroke="#3B82F6" stroke-width="2" />' +
        '<path d="' + sockLine + '" fill="none" stroke="#60A5FA" stroke-width="1.6" stroke-opacity="0.8" />';
    }

    function renderDistribution(data) {
      const total = Math.max(1, data.stats.totalPlayers);
      const tvScreens = Math.max(0, data.stats.totalPlayers - data.stats.humanPlayers - data.stats.botPlayers);
      const rows = [
        { name: 'Smartphones', pct: data.stats.totalPlayers ? Math.round((data.stats.humanPlayers / total) * 100) : 0, count: data.stats.humanPlayers },
        { name: 'TV-Screens', pct: data.stats.totalPlayers ? Math.round((tvScreens / total) * 100) : 0, count: tvScreens },
        { name: 'Bots', pct: data.stats.totalPlayers ? Math.round((data.stats.botPlayers / total) * 100) : 0, count: data.stats.botPlayers },
        { name: 'RAM Heap', pct: data.server.memory.heapPercent, count: data.server.memory.heapUsedMB + ' MB', subtle: true }
      ];

      document.getElementById('dist-list').innerHTML = rows.map((r) =>
        '<div>' +
          '<div class="dist-row-head">' +
            '<span class="dist-name">' + escapeHtml(r.name) + '</span>' +
            '<span class="dist-val">' + r.pct + '% (' + escapeHtml(String(r.count)) + ')</span>' +
          '</div>' +
          '<div class="bar-track"><div class="bar-fill ' + (r.subtle ? 'subtle' : '') + '" style="width:' + Math.min(100, r.pct) + '%"></div></div>' +
        '</div>'
      ).join('');
    }

    function renderLobbiesTable(lobbies) {
      if (!lobbies.length) {
        return '<div class="empty-box">Keine aktiven Lobbys vorhanden. Starte ein Spiel über die TV- oder Smartphone-App, um Live-Räume zu sehen.</div>';
      }
      return '<table>' +
        '<thead><tr><th>Raum</th><th>Spiel</th><th>Modus</th><th>Spieler</th><th>Status</th><th style="text-align:right">Aktion</th></tr></thead>' +
        '<tbody>' +
        lobbies.map((l) => {
          const statusCls = l.status === 'in_progress' || l.status === 'starting' ? 'online' : 'waiting';
          const statusLabel = l.status === 'in_progress' ? 'Im Spiel' : l.status === 'paused' ? 'Pausiert' : 'Warteraum';
          const modeLabel = (l.isTvMode ? 'TV Screen' : 'Standard') + (l.isSimulated ? ' • Sim' : '');
          return '<tr>' +
            '<td><div class="cell-main">' + escapeHtml(l.code) + '</div><div class="cell-sub">' + escapeHtml(l.ageFormatted) + '</div></td>' +
            '<td><div class="cell-main">' + escapeHtml(l.gameTitle) + '</div></td>' +
            '<td>' + escapeHtml(modeLabel) + '</td>' +
            '<td>' + l.activePlayersCount + ' / ' + l.maxPlayers + '</td>' +
            '<td><span class="status-chip ' + statusCls + '">' + statusLabel + '</span></td>' +
            '<td style="text-align:right"><button type="button" class="btn-ghost" onclick="closeLobby(\\'' + escapeHtml(l.id) + '\\')">Schließen</button></td>' +
          '</tr>';
        }).join('') +
        '</tbody></table>';
    }

    function renderData(data) {
      document.getElementById('kpi-lobbies').innerText = data.stats.totalLobbies;
      document.getElementById('kpi-lobbies-sub').innerText =
        data.stats.waitingLobbies + ' Warteraum • ' + data.stats.inGameLobbies + ' Im Spiel';

      document.getElementById('kpi-players').innerText = data.stats.totalPlayers;
      const tvScreens = Math.max(0, data.stats.totalPlayers - data.stats.humanPlayers - data.stats.botPlayers);
      document.getElementById('kpi-players-sub').innerText =
        data.stats.humanPlayers + ' Spieler • ' + tvScreens + ' TV • ' + data.stats.botPlayers + ' Bots';

      document.getElementById('kpi-sockets').innerText = data.server.sockets.activeClients;
      document.getElementById('kpi-ram').innerText = data.server.memory.heapUsedMB + ' MB';

      const dbSub = document.getElementById('kpi-db-sub');
      if (!data.server.database.configured) {
        dbSub.innerHTML = '<span class="trend-warn">In-Memory</span> • ' + data.server.memory.heapPercent + '% Heap';
      } else if (data.server.database.connected) {
        dbSub.innerHTML = '<span class="trend-up">PostgreSQL aktiv</span> • ' + data.server.memory.heapPercent + '% Heap';
      } else {
        dbSub.innerHTML = '<span class="trend-bad">DB getrennt</span> • ' + data.server.memory.heapPercent + '% Heap';
      }

      document.getElementById('chart-badge').innerText = '↗ Uptime ' + data.server.uptimeFormatted;
      document.getElementById('lobbies-count-chip').innerText = data.lobbies.length + (data.lobbies.length === 1 ? ' Raum' : ' Räume');

      renderActivityChart();
      renderDistribution(data);

      const tableHtml = renderLobbiesTable(data.lobbies);
      document.getElementById('overview-lobbies-table').innerHTML = tableHtml;
      document.getElementById('full-lobbies-table').innerHTML = tableHtml;

      document.getElementById('games-grid').innerHTML = data.registeredGames.map((g) =>
        '<div class="game-tile">' +
          '<div><div class="cell-main">' + escapeHtml(g.title) + '</div><div class="cell-sub">' + escapeHtml(g.id) + '</div></div>' +
          '<span class="status-chip online">' + g.minPlayers + '–' + g.maxPlayers + ' Sp.</span>' +
        '</div>'
      ).join('');

      document.getElementById('system-kv').innerHTML = [
        ['Uptime', data.server.uptimeFormatted],
        ['Node.js', data.server.nodeVersion],
        ['Plattform', data.server.platform + ' (' + data.server.arch + ')'],
        ['CPUs', data.server.cpusCount + 'x ' + data.server.cpuModel],
        ['RAM RSS', data.server.memory.rssMB + ' MB'],
        ['Datenbank', data.server.database.connected ? 'Neon PostgreSQL Verbunden' : data.server.database.configured ? 'Getrennt' : 'In-Memory']
      ].map(([k, v]) => '<div class="kv-row"><span class="kv-key">' + k + '</span><span class="kv-val">' + escapeHtml(String(v)) + '</span></div>').join('');

      document.getElementById('network-kv').innerHTML = [
        ['Port', data.server.network.port],
        ['Hosting', data.server.network.isRender ? 'Render Cloud' : 'Lokal'],
        ['TV Origin', data.server.network.tvOrigin || '–'],
        ['Smartphone Origin', data.server.network.smartphoneOrigin || '–'],
        ['Healthcheck', '<a href="/healthz" target="_blank">/healthz</a>'],
        ['JSON API', '<a href="/api/dashboard" target="_blank">/api/dashboard</a>']
      ].map(([k, v]) => '<div class="kv-row"><span class="kv-key">' + k + '</span><span class="kv-val">' + (String(v).startsWith('<a ') ? v : escapeHtml(String(v))) + '</span></div>').join('');

      const footerLinks = [];
      if (data.server.network.tvOrigin) {
        footerLinks.push('<a class="nav-item" href="' + escapeHtml(data.server.network.tvOrigin) + '" target="_blank"><span>TV App öffnen</span></a>');
      }
      if (data.server.network.smartphoneOrigin) {
        footerLinks.push('<a class="nav-item" href="' + escapeHtml(data.server.network.smartphoneOrigin) + '" target="_blank"><span>Smartphone App</span></a>');
      }
      document.getElementById('sidebar-links').innerHTML = footerLinks.join('');
    }

    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    pushHistory(currentData);
    renderData(currentData);
    schedulePoll();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister());
      }).catch(() => {});
    }
  </script>
</body>
</html>`;
}

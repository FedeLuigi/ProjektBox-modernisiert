export function IslandBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0">
      {/* ─── Basis Ozean-Verlauf ─── */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 38% 42%, #55B7E6 0%, #3894CB 48%, #266DA8 100%)',
        }}
      />

      {/* ─── Vektor-Weltkarte: Breiten-/Längengrade, Vulkan-Insel & Turm-Insel ─── */}
      <svg
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Wasser-Lagunen Verläufe */}
          <radialGradient id="lagoonLeft" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#A6F4EA" stopOpacity="0.95" />
            <stop offset="65%" stopColor="#56C9D8" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#3894CB" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="lagoonRight" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#A6F4EA" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#52C5D6" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#3894CB" stopOpacity="0" />
          </radialGradient>

          <linearGradient id="volcanoSlope" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#A97C6A" />
            <stop offset="55%" stopColor="#8A5E4D" />
            <stop offset="100%" stopColor="#694538" />
          </linearGradient>

          <linearGradient id="islandGrass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#9BE14E" />
            <stop offset="100%" stopColor="#46A542" />
          </linearGradient>

          <linearGradient id="darkCliff" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#433A7D" />
            <stop offset="100%" stopColor="#262052" />
          </linearGradient>
        </defs>

        {/* ─── Subtile Nautische Karten-Linien & konzentrische Ringe (wie im Original) ─── */}
        <g stroke="#8BD5F5" strokeOpacity="0.22" strokeWidth="2" fill="none">
          <circle cx="430" cy="430" r="290" />
          <circle cx="430" cy="430" r="410" />
          <circle cx="430" cy="430" r="560" />
          <circle cx="430" cy="430" r="740" />
          <circle cx="980" cy="270" r="240" />
          <circle cx="980" cy="270" r="350" />
          {/* Geschwungene Breiten-/Längengradlinien */}
          <path d="M -100 720 Q 520 830 1700 650" strokeWidth="2.5" />
          <path d="M -100 180 Q 650 260 1700 130" strokeWidth="1.8" />
          <path d="M 260 -50 Q 190 450 310 950" strokeWidth="1.8" />
          <path d="M 1420 -50 Q 1340 450 1480 950" strokeWidth="1.8" />
        </g>

        {/* Kleine Wellen & Vögel im Hintergrund */}
        <g stroke="#9BE0FA" strokeOpacity="0.45" strokeWidth="3" strokeLinecap="round" fill="none">
          <path d="M 560 165 q 8 -7 16 0 q 8 -7 16 0" />
          <path d="M 620 142 q 6 -5 12 0 q 6 -5 12 0" />
          <path d="M 830 145 q 7 -6 14 0 q 7 -6 14 0" />
          <path d="M 75 680 q 14 -6 28 0" />
          <path d="M 480 655 q 16 -6 32 0" />
        </g>

        {/* ═══════════════════════════════════════════════════════════════════
            INSEL 2 (MITTE-OBEN / RECHTS): TURM- & FESTUNGS-INSEL HINTER DEN KARTEN
            ═══════════════════════════════════════════════════════════════════ */}
        <g transform="translate(760, 45)">
          {/* Äußere türkise Lagunen-Ringe */}
          <ellipse cx="235" cy="240" rx="220" ry="110" fill="url(#lagoonRight)" />
          <ellipse
            cx="235"
            cy="235"
            rx="175"
            ry="78"
            fill="#6EE2E0"
            fillOpacity="0.45"
            stroke="#B6FAF6"
            strokeWidth="3"
            strokeOpacity="0.6"
          />

          {/* Sandstrand */}
          <path
            d="M 95 235 C 95 190, 165 170, 245 170 C 325 170, 385 195, 385 235 C 385 268, 320 285, 235 285 C 150 285, 95 265, 95 235 Z"
            fill="#F9E5AE"
          />

          {/* Grüne Insel-Hügel */}
          <path
            d="M 118 228 C 125 175, 185 152, 245 155 C 310 158, 355 182, 365 228 C 330 252, 160 252, 118 228 Z"
            fill="url(#islandGrass)"
          />

          {/* Geschwungener Pfad */}
          <path
            d="M 225 265 Q 245 230 232 195"
            stroke="#F4D799"
            strokeWidth="18"
            strokeLinecap="round"
            fill="none"
          />

          {/* Goldener Arcade-Observatoriums-Turm (neben dem Logo) */}
          <g transform="translate(195, 15)">
            {/* Turm-Basis */}
            <rect x="20" y="95" width="44" height="75" rx="6" fill="#E8DFD1" />
            <rect x="25" y="102" width="34" height="65" rx="4" fill="#D5C7B4" />
            {/* Türkise Turm-Ringe */}
            <rect x="14" y="88" width="56" height="12" rx="6" fill="#4BA3B5" />
            <rect x="17" y="62" width="50" height="28" rx="6" fill="#F4EBD9" />
            <rect x="12" y="55" width="60" height="10" rx="5" fill="#4BA3B5" />
            {/* Goldene Kuppel / Dach */}
            <path d="M 10 56 Q 42 15 74 56 Z" fill="#E5B94C" />
            <ellipse cx="42" cy="24" rx="14" ry="8" fill="#F7D56E" />
            <circle cx="42" cy="11" r="6" fill="#FDE047" />
            {/* Kleine bunte Party-Ballons rechts am Turm */}
            <line x1="72" y1="68" x2="92" y2="42" stroke="#ffffff" strokeWidth="1.5" />
            <circle cx="92" cy="40" r="6" fill="#F43F5E" />
            <circle cx="101" cy="48" r="5" fill="#FACC15" />
            <circle cx="85" cy="50" r="5" fill="#38BDF8" />
          </g>

          {/* Kleine Bäume & Büsche auf Insel 2 */}
          <circle cx="155" cy="205" r="18" fill="#3B943B" />
          <circle cx="172" cy="198" r="22" fill="#68C347" />
          <circle cx="315" cy="202" r="20" fill="#45A141" />
          <circle cx="295" cy="212" r="15" fill="#7CD34E" />
        </g>

        {/* ═══════════════════════════════════════════════════════════════════
            INSEL 1 (LINKS): GROSSE TROra-VULKAN-INSEL MIT LAGUNE & STRAND
            ═══════════════════════════════════════════════════════════════════ */}
        <g transform="translate(20, 65)">
          {/* Äußere flache Lagune & Wellenringe */}
          <ellipse cx="385" cy="365" rx="345" ry="155" fill="url(#lagoonLeft)" />
          <ellipse
            cx="385"
            cy="365"
            rx="315"
            ry="135"
            fill="none"
            stroke="#9CF2EE"
            strokeOpacity="0.55"
            strokeWidth="3.5"
          />
          <ellipse
            cx="385"
            cy="360"
            rx="275"
            ry="112"
            fill="#7CE8E2"
            fillOpacity="0.65"
          />

          {/* Türkise Bucht-Einschnitte */}
          <path
            d="M 140 355 C 140 290, 255 255, 395 255 C 535 255, 625 295, 625 355 C 625 415, 515 448, 375 448 C 235 448, 140 412, 140 355 Z"
            fill="#9BF4EC"
          />

          {/* Goldgelber Sandstrand */}
          <path
            d="M 168 348 C 175 292, 265 268, 392 268 C 512 268, 595 298, 598 348 C 602 395, 505 426, 378 426 C 245 426, 162 398, 168 348 Z"
            fill="#FCE8B2"
          />

          {/* Grüne Dschungel-Hügel der Hauptinsel */}
          <path
            d="M 190 335 C 205 268, 290 235, 395 240 C 495 245, 565 280, 575 335 C 540 375, 465 392, 375 390 C 280 388, 215 365, 190 335 Z"
            fill="url(#islandGrass)"
          />
          {/* Zweite hellgrüne Hügel-Schicht */}
          <ellipse cx="425" cy="318" rx="125" ry="52" fill="#85D849" />
          <ellipse cx="295" cy="332" rx="95" ry="42" fill="#5BB944" />

          {/* Großer Cartoon-Vulkan / Tafelberg in der Inselmitte */}
          <g transform="translate(275, 45)">
            {/* Vulkan-Körper */}
            <path
              d="M 18 235 L 58 62 C 62 48, 132 48, 136 62 L 182 235 C 140 252, 55 252, 18 235 Z"
              fill="url(#volcanoSlope)"
            />
            {/* Schattierte rechte Flanke & Felsrillen */}
            <path
              d="M 102 52 L 136 62 L 182 235 L 118 244 L 102 52 Z"
              fill="#6E493B"
              fillOpacity="0.65"
            />
            <path
              d="M 78 90 L 62 215 M 112 95 L 128 218"
              stroke="#5A3A2E"
              strokeWidth="4"
              strokeLinecap="round"
              strokeOpacity="0.45"
            />

            {/* Fluffiger weißer Wolkenkranz um den Vulkangipfel (mit Drift-Animation) */}
            <g className="animate-cloud-drift">
              <path
                d="M 38 92 C 22 92, 18 74, 34 68 C 38 52, 65 48, 78 58 C 95 45, 128 48, 138 64 C 158 64, 162 88, 140 92 Z"
                fill="#FFFFFF"
                fillOpacity="0.95"
              />
              <ellipse cx="148" cy="112" rx="38" ry="11" fill="#FFFFFF" fillOpacity="0.88" />
              <ellipse cx="28" cy="128" rx="34" ry="9" fill="#FFFFFF" fillOpacity="0.82" />
            </g>
          </g>

          {/* Geschwungener Sandpfad über die Insel */}
          <path
            d="M 415 395 C 390 365, 445 340, 418 310 C 395 288, 365 280, 368 258"
            stroke="#F6DC9E"
            strokeWidth="16"
            strokeLinecap="round"
            fill="none"
          />

          {/* Tropische Palmen & Dschungelbäume links und rechts */}
          {/* Palme 1 (links) */}
          <g transform="translate(215, 225)">
            <path d="M 22 75 Q 14 42 8 18" stroke="#785140" strokeWidth="6" strokeLinecap="round" fill="none" />
            <path d="M 8 18 Q -12 12 -18 26" stroke="#2D7A4D" strokeWidth="6" strokeLinecap="round" fill="none" />
            <path d="M 8 18 Q -6 -2 -16 4" stroke="#3B965B" strokeWidth="6" strokeLinecap="round" fill="none" />
            <path d="M 8 18 Q 16 -4 28 6" stroke="#47AD66" strokeWidth="6" strokeLinecap="round" fill="none" />
            <path d="M 8 18 Q 22 14 26 26" stroke="#2D7A4D" strokeWidth="6" strokeLinecap="round" fill="none" />
          </g>

          {/* Palme 2 (weiter links am Strand) */}
          <g transform="translate(175, 255) scale(0.85)">
            <path d="M 18 70 Q 12 40 16 15" stroke="#785140" strokeWidth="6" strokeLinecap="round" fill="none" />
            <path d="M 16 15 Q -6 8 -12 22" stroke="#2D7A4D" strokeWidth="6" strokeLinecap="round" fill="none" />
            <path d="M 16 15 Q 6 -4 -6 2" stroke="#3B965B" strokeWidth="6" strokeLinecap="round" fill="none" />
            <path d="M 16 15 Q 28 -2 36 10" stroke="#47AD66" strokeWidth="6" strokeLinecap="round" fill="none" />
          </g>

          {/* Palme 3 (rechts am Vulkanfuß) */}
          <g transform="translate(465, 205) scale(0.95)">
            <path d="M 12 75 Q 20 42 26 16" stroke="#785140" strokeWidth="6" strokeLinecap="round" fill="none" />
            <path d="M 26 16 Q 6 8 0 22" stroke="#2D7A4D" strokeWidth="6" strokeLinecap="round" fill="none" />
            <path d="M 26 16 Q 18 -4 6 4" stroke="#3B965B" strokeWidth="6" strokeLinecap="round" fill="none" />
            <path d="M 26 16 Q 38 -2 48 10" stroke="#47AD66" strokeWidth="6" strokeLinecap="round" fill="none" />
            <path d="M 26 16 Q 42 14 44 26" stroke="#2D7A4D" strokeWidth="6" strokeLinecap="round" fill="none" />
          </g>

          {/* Üppige Baumkronen & kleine Strandsteine */}
          <circle cx="268" cy="295" r="22" fill="#2F8046" />
          <circle cx="288" cy="285" r="26" fill="#49A848" />
          <circle cx="312" cy="302" r="18" fill="#7BD44B" />
          <circle cx="485" cy="308" r="20" fill="#3B943F" />
          <circle cx="510" cy="318" r="16" fill="#68C347" />
          <ellipse cx="295" cy="395" rx="14" ry="8" fill="#5D768B" />
          <ellipse cx="455" cy="378" rx="10" ry="6" fill="#6E879C" />
        </g>

        {/* ═══════════════════════════════════════════════════════════════════
            VORDERGRUND LINKS UNTEN: ZACKIGE DUNKELVIOLETTE FELS-SILHOUETTE
            (genau hinter dem Maskottchen & der "Impress me." Sprechblase)
            ═══════════════════════════════════════════════════════════════════ */}
        <g transform="translate(95, 395)">
          <path
            d="M 12 295 L 48 145 L 62 162 L 88 68 L 118 135 L 138 112 L 195 235 L 222 195 L 265 295 L 185 335 L 55 328 Z"
            fill="url(#darkCliff)"
          />
          <path
            d="M 88 68 L 118 135 L 102 295 L 48 295 L 62 162 Z"
            fill="#504692"
            fillOpacity="0.45"
          />
        </g>

        {/* Sanfte Wellen-Schicht ganz unten über die gesamte Breite */}
        <path
          d="M 0 835 Q 380 790 780 840 T 1600 825 L 1600 900 L 0 900 Z"
          fill="#22669E"
          fillOpacity="0.55"
        />
      </svg>
    </div>
  );
}

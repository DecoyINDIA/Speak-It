import fs from 'fs';
import path from 'path';

const OUT_ROOT = path.resolve('d:/XOLVER/SpeakIt/.github/assets/readme');
for (const sub of ['hero', 'motion', 'specimens', 'architecture']) {
  fs.mkdirSync(path.join(OUT_ROOT, sub), { recursive: true });
}

// Exact computed tokens from src/renderer/shared/theme.css & bar.css
const THEMES = {
  dark: {
    canvas: '#090a09',
    surface: '#121311',
    surface2: '#1b1c1a',
    surface3: '#242623',
    line: '#262825',
    lineStrong: '#3b3e3a',
    ink: '#f2f4f1',
    ink2: '#c2c5c1',
    muted: '#969994',
    accent: '#b7f652',
    accentInk: '#0e1a01',
    accentText: '#b7f652',
    accentSoft: 'rgba(184, 248, 85, 0.12)',
    accentBorder: 'rgba(183, 246, 82, 0.36)',
    danger: '#ff645f',
    dangerBg: 'rgba(255, 100, 95, 0.08)',
    dangerBorder: 'rgba(255, 100, 95, 0.30)',
    warn: '#f7b83d',
    warnBg: 'rgba(247, 184, 61, 0.08)',
    warnBorder: 'rgba(247, 184, 61, 0.36)',
    cyan: '#5ce1e6',
    cyanBg: 'rgba(92, 225, 230, 0.08)',
    cyanBorder: 'rgba(92, 225, 230, 0.30)',
    okBg: 'rgba(183, 246, 82, 0.07)',
    okBorder: 'rgba(183, 246, 82, 0.28)',
    pillBg: '#0e100e',
    pillBorder: '#2c2f2b',
    pillInk: '#f0f2f0',
    pillMuted: '#9ca09b',
    pillBtnBg: '#1c1e1b',
    waveOpacity: 0.35,
  },
  light: {
    canvas: '#ecedeb',
    surface: '#fdfefd',
    surface2: '#f1f2f0',
    surface3: '#e5e7e4',
    line: '#dddfdc',
    lineStrong: '#c2c5c1',
    ink: '#151714',
    ink2: '#3b3e3a',
    muted: '#616460',
    accent: '#aff03c',
    accentInk: '#0e1a01',
    accentText: '#397500',
    accentSoft: 'rgba(174, 240, 62, 0.24)',
    accentBorder: 'rgba(57, 117, 0, 0.32)',
    danger: '#cc2827',
    dangerBg: 'rgba(204, 40, 39, 0.06)',
    dangerBorder: 'rgba(204, 40, 39, 0.25)',
    warn: '#ad6800',
    warnBg: 'rgba(173, 104, 0, 0.07)',
    warnBorder: 'rgba(173, 104, 0, 0.30)',
    cyan: '#0b7285',
    cyanBg: 'rgba(11, 114, 133, 0.07)',
    cyanBorder: 'rgba(11, 114, 133, 0.28)',
    okBg: 'rgba(57, 117, 0, 0.06)',
    okBorder: 'rgba(57, 117, 0, 0.28)',
    // The Floating Bar is ALWAYS dark charcoal per bar.css!
    pillBg: '#0e100e',
    pillBorder: '#2c2f2b',
    pillInk: '#f0f2f0',
    pillMuted: '#9ca09b',
    pillBtnBg: '#1c1e1b',
    waveOpacity: 0.45,
  },
};

const FONT_UI = "-apple-system, BlinkMacSystemFont, 'Segoe UI Variable', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const FONT_MONO = "'Cascadia Mono', 'Cascadia Code', Consolas, ui-monospace, monospace";

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function logoMark(x, y, size, t) {
  const rx = Math.round(size * 0.27);
  const s = (size * 0.62) / 24;
  const ox = x + (size - 24 * s) / 2;
  const oy = y + (size - 24 * s) / 2;
  return `
  <g>
    <rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${rx}" fill="${t.accent}" />
    <g transform="translate(${ox.toFixed(2)}, ${oy.toFixed(2)}) scale(${s.toFixed(4)})" stroke="${t.accentInk}" stroke-width="2.3" stroke-linecap="round" fill="none">
      <line x1="2" y1="10" x2="2" y2="14" />
      <line x1="6" y1="6" x2="6" y2="17" />
      <line x1="10" y1="3" x2="10" y2="21" />
      <line x1="14" y1="8" x2="14" y2="15" />
      <line x1="18" y1="5" x2="18" y2="18" />
      <line x1="22" y1="10" x2="22" y2="13" />
    </g>
  </g>`;
}

function meterSvg(x, y, t, animated = true) {
  const heights = [6, 12, 9, 17, 13, 18, 10, 14, 7];
  const durations = [0.72, 0.88, 0.64, 0.94, 0.78, 0.84, 0.68, 0.90, 0.74];
  const delays = [0, 0.08, 0.18, 0.04, 0.14, 0.22, 0.10, 0.16, 0.24];
  const cy = y + 9;
  return heights
    .map((h, i) => {
      const bx = x + i * 5;
      const by = cy - h / 2;
      const cls = animated ? `class="eq eq-${i + 1}" style="animation-duration:${durations[i]}s;animation-delay:${delays[i]}s;"` : '';
      return `<rect ${cls} x="${bx}" y="${by.toFixed(1)}" width="3" height="${h}" rx="1.5" fill="#b7f652" />`;
    })
    .join('\n      ');
}

function cancelBtn(cx, cy, t) {
  return `
    <g>
      <circle cx="${cx}" cy="${cy}" r="11" fill="${t.pillBtnBg}" />
      <path d="M ${cx - 3.5} ${cy - 3.5} L ${cx + 3.5} ${cy + 3.5} M ${cx + 3.5} ${cy - 3.5} L ${cx - 3.5} ${cy + 3.5}" stroke="${t.pillMuted}" stroke-width="1.6" stroke-linecap="round" />
    </g>`;
}

// =========================================================================
// 1. SIGNATURE HERO (960 x 440)
// =========================================================================
function buildHero(mode) {
  const t = THEMES[mode];
  const isDark = mode === 'dark';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 440" width="100%" height="100%">
  <defs>
    <radialGradient id="hero-rad-${mode}" cx="50%" cy="62%" r="55%">
      <stop offset="0%" stop-color="${t.accent}" stop-opacity="${isDark ? 0.10 : 0.16}" />
      <stop offset="100%" stop-color="${t.canvas}" stop-opacity="0" />
    </radialGradient>
    <filter id="pill-shadow-${mode}" x="-15%" y="-25%" width="130%" height="170%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="${isDark ? 0.55 : 0.22}" />
    </filter>
  </defs>

  <style>
    .eq { transform-box: fill-box; transform-origin: center; animation-name: eq-scale; animation-timing-function: ease-in-out; animation-iteration-count: infinite; }
    @keyframes eq-scale { 0%, 100% { transform: scaleY(0.45); } 50% { transform: scaleY(1.12); } }
    .live-dot { transform-box: fill-box; transform-origin: center; animation: pulse-live 1.7s ease-in-out infinite; }
    @keyframes pulse-live { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.32); opacity: 0.78; } }
    .wave-flow-1 { stroke-dasharray: 10 8; animation: dash-flow 3.6s linear infinite; }
    .wave-flow-2 { stroke-dasharray: 6 10; animation: dash-flow 5.0s linear infinite; }
    @keyframes dash-flow { to { stroke-dashoffset: -72; } }
    .caret { animation: blink 1.1s steps(1, end) infinite; }
    @keyframes blink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
  </style>

  <!-- Outer Frame -->
  <rect x="0.5" y="0.5" width="959" height="439" rx="16" fill="${t.canvas}" stroke="${t.line}" />
  <rect x="1" y="1" width="958" height="438" rx="15.5" fill="url(#hero-rad-${mode})" />

  <!-- Top Bar Identity -->
  ${logoMark(44, 34, 28, t)}
  <text x="84" y="54" font-family="${FONT_UI}" font-size="18" font-weight="700" fill="${t.ink}" letter-spacing="-0.02em">SpeakIt</text>
  <rect x="160" y="38" width="90" height="20" rx="10" fill="${t.surface}" stroke="${t.line}" />
  <text x="205" y="51.5" text-anchor="middle" font-family="${FONT_MONO}" font-size="10.5" font-weight="600" fill="${t.muted}">0.9.0-beta.1</text>

  <text x="916" y="52" text-anchor="end" font-family="${FONT_MONO}" font-size="11" font-weight="500" fill="${t.muted}" letter-spacing="0.04em">WINDOWS 10 / 11  ·  MIT LICENSE  ·  ZERO TELEMETRY</text>
  <line x1="44" y1="80" x2="916" y2="80" stroke="${t.line}" />

  <!-- Editorial Headline -->
  <text x="44" y="130" font-family="${FONT_UI}" font-size="38" font-weight="700" fill="${t.ink}" letter-spacing="-0.035em">Voice typing that sounds like you.</text>
  <text x="44" y="160" font-family="${FONT_UI}" font-size="15.5" font-weight="400" fill="${t.muted}">Understands Hinglish, clears conversational disfluencies, and pastes clean text at your cursor.</text>

  <!-- Kinetic Instrument Stage -->
  <rect x="44" y="192" width="872" height="208" rx="14" fill="${t.surface}" stroke="${t.line}" />

  <!-- Left: Acoustic Input Waveform Track -->
  <text x="72" y="224" font-family="${FONT_MONO}" font-size="10.5" font-weight="600" fill="${t.muted}" letter-spacing="0.06em">01 · SPOKEN INPUT (HINGLISH + FILLERS)</text>
  <rect x="72" y="238" width="268" height="106" rx="10" fill="${t.surface2}" stroke="${t.line}" />
  <!-- Gentle Harmonic Waves inside Left Well -->
  <path class="wave-flow-1" d="M 88 262 C 110 246, 130 278, 154 262 S 198 246, 222 262 S 266 278, 290 262 S 314 252, 324 262" fill="none" stroke="${t.accentText}" stroke-opacity="${t.waveOpacity}" stroke-width="1.6" />
  <path class="wave-flow-2" d="M 88 264 C 112 276, 134 250, 158 264 S 202 276, 226 264 S 270 250, 294 264 S 314 270, 324 264" fill="none" stroke="${t.muted}" stroke-opacity="0.35" stroke-width="1.2" />

  <text x="88" y="294" font-family="${FONT_UI}" font-size="12.5" fill="${t.ink2}">
    <tspan x="88" dy="0">“Arre Sunita, </tspan><tspan fill="${t.danger}">um</tspan><tspan>, meeting Monday</tspan>
    <tspan x="88" dy="19"><tspan fill="${t.warn}">no wait</tspan> Tuesday ko finalize hai”</tspan>
  </text>
  <text x="88" y="334" font-family="${FONT_MONO}" font-size="10" fill="${t.muted}">16 kHz Opus WebM · ~40 KB / 10s</text>

  <!-- Conduit Left -> Center -->
  <line x1="340" y1="291" x2="378" y2="291" stroke="${t.lineStrong}" stroke-width="1.5" />
  <circle cx="340" cy="291" r="3" fill="${t.accentText}" />

  <!-- Center Protagonist: Exact SpeakIt Floating Bar (Always Charcoal!) -->
  <g filter="url(#pill-shadow-${mode})">
    <rect x="378" y="269" width="204" height="44" rx="22" fill="${t.pillBg}" stroke="${t.pillBorder}" stroke-width="1.2" />
    <circle class="live-dot" cx="400" cy="291" r="4.5" fill="#b7f652" />
    <text x="413" y="295.5" font-family="${FONT_UI}" font-size="13.5" font-weight="600" fill="${t.pillInk}">Listening</text>
    ${meterSvg(488, 282, t, true)}
    ${cancelBtn(562, 291, t)}
  </g>

  <!-- Keycap prompt centered below Floating Bar -->
  <rect x="424" y="328" width="46" height="22" rx="5" fill="${t.surface2}" stroke="${t.lineStrong}" />
  <text x="447" y="342.5" text-anchor="middle" font-family="${FONT_MONO}" font-size="10.5" font-weight="600" fill="${t.ink2}">Ctrl</text>
  <text x="480" y="342.5" text-anchor="middle" font-family="${FONT_UI}" font-size="12" fill="${t.muted}">+</text>
  <rect x="490" y="328" width="46" height="22" rx="5" fill="${t.surface2}" stroke="${t.lineStrong}" />
  <text x="513" y="342.5" text-anchor="middle" font-family="${FONT_MONO}" font-size="10.5" font-weight="600" fill="${t.ink2}">Win</text>

  <!-- Conduit Center -> Right -->
  <line x1="582" y1="291" x2="620" y2="291" stroke="${t.lineStrong}" stroke-width="1.5" />
  <circle cx="620" cy="291" r="3" fill="${t.accentText}" />

  <!-- Right: Formatted Output Inserted at Cursor -->
  <text x="620" y="224" font-family="${FONT_MONO}" font-size="10.5" font-weight="600" fill="${t.accentText}" letter-spacing="0.06em">02 · CLEANED &amp; INSERTED AT CURSOR</text>
  <rect x="620" y="238" width="268" height="106" rx="10" fill="${t.okBg}" stroke="${t.okBorder}" />
  <text x="636" y="272" font-family="${FONT_UI}" font-size="14" font-weight="600" fill="${t.ink}">
    <tspan x="636" dy="0">Sunita, meeting Tuesday ko</tspan>
    <tspan x="636" dy="22">finalize hai.</tspan>
  </text>
  <rect class="caret" x="711" y="280" width="2.2" height="17" rx="1" fill="${t.accentText}" />
  <text x="636" y="334" font-family="${FONT_MONO}" font-size="9.5" font-weight="600" fill="${t.accentText}">✓ Inserted via SendInput · clipboard ok</text>

  <!-- Bottom Evidence Strip inside Stage -->
  <line x1="72" y1="364" x2="888" y2="364" stroke="${t.line}" />
  <text x="72" y="384" font-family="${FONT_MONO}" font-size="10.5" fill="${t.muted}">CLOUD STT (GROQ): <tspan fill="${t.ink2}" font-weight="600">~480–650 ms p50</tspan></text>
  <text x="366" y="384" font-family="${FONT_MONO}" font-size="10.5" fill="${t.muted}">LOCAL ENGINE: <tspan fill="${t.ink2}" font-weight="600">whisper.cpp (0 KB egress)</tspan></text>
  <text x="888" y="384" text-anchor="end" font-family="${FONT_MONO}" font-size="10.5" fill="${t.muted}">SHIELD: <tspan fill="${t.ink2}" font-weight="600">UIAutomation isPassword</tspan></text>
</svg>`;
}

// =========================================================================
// 2. FLOATING BAR STATES & STATE MACHINE (960 x 380)
// =========================================================================
function buildStates(mode) {
  const t = THEMES[mode];
  const isDark = mode === 'dark';

  const card = (x, y, num, title, trigger, pillSvg, note) => `
  <g transform="translate(${x}, ${y})">
    <rect width="424" height="106" rx="10" fill="${t.surface}" stroke="${t.line}" />
    <text x="18" y="25" font-family="${FONT_MONO}" font-size="10.5" font-weight="600" fill="${t.accentText}" letter-spacing="0.05em">${num} · ${esc(title)}</text>
    <text x="406" y="25" text-anchor="end" font-family="${FONT_MONO}" font-size="10" fill="${t.muted}">${esc(trigger)}</text>
    <g transform="translate(18, 38)">${pillSvg}</g>
    <text x="18" y="94" font-family="${FONT_UI}" font-size="11" fill="${t.muted}">${esc(note)}</text>
  </g>`;

  // Exact Bar state components (all centered transform-box: fill-box!)
  const pIdle = `
    <rect width="234" height="38" rx="19" fill="${t.pillBg}" stroke="${t.pillBorder}" />
    <g transform="translate(16, 11)" stroke="${t.pillMuted}" stroke-width="1.75" fill="none" stroke-linecap="round">
      <rect x="4" y="1" width="6" height="9" rx="3" />
      <path d="M1.5 7.5a5.5 5.5 0 0 0 11 0" />
      <line x1="7" y1="13" x2="7" y2="15.5" />
    </g>
    <text x="38" y="23.5" font-family="${FONT_UI}" font-size="12.5" font-weight="600" fill="${t.pillMuted}">Hold Ctrl + Win to dictate</text>`;

  const pListen = `
    <rect width="204" height="38" rx="19" fill="${t.pillBg}" stroke="${t.pillBorder}" />
    <circle class="live-dot" cx="20" cy="19" r="4" fill="#b7f652" />
    <text x="32" y="23.5" font-family="${FONT_UI}" font-size="13" font-weight="600" fill="${t.pillInk}">Listening</text>
    ${meterSvg(106, 10, t, true)}
    ${cancelBtn(184, 19, t)}`;

  const pLocked = `
    <rect width="286" height="38" rx="19" fill="${t.pillBg}" stroke="${t.pillBorder}" />
    <circle class="live-dot" cx="20" cy="19" r="4" fill="#b7f652" />
    <text x="32" y="23.5" font-family="${FONT_UI}" font-size="13" font-weight="600" fill="${t.pillInk}">Hands-free</text>
    ${meterSvg(120, 10, t, true)}
    ${cancelBtn(192, 19, t)}
    <rect x="210" y="6" width="68" height="26" rx="13" fill="#b7f652" />
    <rect x="223" y="14.5" width="9" height="9" rx="1.5" fill="#0e1a01" />
    <text x="238" y="23" font-family="${FONT_UI}" font-size="12" font-weight="700" fill="#0e1a01">Stop</text>`;

  const pProc = `
    <rect width="224" height="38" rx="19" fill="${t.pillBg}" stroke="${t.pillBorder}" />
    <circle class="spinner" cx="21" cy="19" r="6.5" fill="none" stroke="#b7f652" stroke-width="2" stroke-dasharray="28 14" stroke-linecap="round" />
    <text x="36" y="23.5" font-family="${FONT_UI}" font-size="12.5" font-weight="600" fill="${t.pillInk}">Processing dictation…</text>
    ${cancelBtn(204, 19, t)}`;

  const pDone = `
    <rect width="128" height="38" rx="19" fill="${t.pillBg}" stroke="${t.pillBorder}" />
    <circle cx="22" cy="19" r="9" fill="#b7f652" />
    <path d="M17.5 19 L20.8 22.3 L26.8 16" fill="none" stroke="#0e1a01" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" />
    <text x="39" y="23.5" font-family="${FONT_UI}" font-size="13" font-weight="600" fill="${t.pillInk}">Inserted</text>
    <rect x="140" y="0" width="184" height="38" rx="19" fill="${t.pillBg}" stroke="${t.pillBorder}" />
    <rect x="154" y="12" width="10" height="13" rx="2" fill="none" stroke="#b7f652" stroke-width="1.6" />
    <path d="M157 12V10h4v2" stroke="#b7f652" stroke-width="1.6" fill="none" />
    <text x="172" y="23.5" font-family="${FONT_UI}" font-size="12" font-weight="600" fill="${t.pillInk}">Copied — press Ctrl+V</text>`;

  const pBlocked = `
    <rect width="268" height="38" rx="19" fill="${t.pillBg}" stroke="${t.warnBorder}" />
    <path d="M22 11 L15 14 V19 C15 23 18 26 22 27.5 C26 26 29 23 29 19 V14 Z" fill="none" stroke="#f7b83d" stroke-width="1.6" />
    <line x1="22" y1="16" x2="22" y2="20" stroke="#f7b83d" stroke-width="1.6" stroke-linecap="round" />
    <circle cx="22" cy="23" r="1" fill="#f7b83d" />
    <text x="37" y="23.5" font-family="${FONT_UI}" font-size="12" font-weight="600" fill="${t.pillInk}">Not pasted into a password field</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 448" width="100%" height="100%">
  <style>
    .eq { transform-box: fill-box; transform-origin: center; animation-name: eq-scale; animation-timing-function: ease-in-out; animation-iteration-count: infinite; }
    @keyframes eq-scale { 0%, 100% { transform: scaleY(0.45); } 50% { transform: scaleY(1.12); } }
    .live-dot { transform-box: fill-box; transform-origin: center; animation: pulse-live 1.7s ease-in-out infinite; }
    @keyframes pulse-live { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.3); opacity: 0.78; } }
    .spinner { transform-box: fill-box; transform-origin: center; animation: spin-cw 0.85s linear infinite; }
    @keyframes spin-cw { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  </style>

  <rect x="0.5" y="0.5" width="959" height="447" rx="16" fill="${t.canvas}" stroke="${t.line}" />

  <text x="44" y="42" font-family="${FONT_MONO}" font-size="11" font-weight="600" fill="${t.accentText}" letter-spacing="0.06em">FLOATING BAR INTERFACE  ·  BAR.TSX</text>
  <text x="44" y="68" font-family="${FONT_UI}" font-size="22" font-weight="700" fill="${t.ink}" letter-spacing="-0.025em">Seven Deterministic States, Always Readable Over Any App</text>

  ${card(44, 92, '01', 'IDLE / STANDBY', 'state: IDLE', pIdle, 'Centered 12px above active taskbar; ignores mouse clicks until hovered.')}
  ${card(492, 92, '02', 'LISTENING (PUSH-TO-TALK)', 'Hold Ctrl + Win', pListen, '9-bar meter scales live with RMS microphone capture; 200ms abort guard.')}
  ${card(44, 212, '03', 'HANDS-FREE LOCKED', 'Double-tap < 300ms', pLocked, 'Continues capture without holding keys up to a 6-minute safety cap.')}
  ${card(492, 212, '04', 'PROCESSING PIPELINE', 'state: PROCESSING', pProc, 'Streams 16 kHz Opus/WAV through Groq, Gemini, or local Whisper.')}
  ${card(44, 332, '05', 'INSERTED / COPIED FALLBACK', 'Win32 SendInput', pDone, 'Verifies foreground HWND matches capture window; else saves to clipboard.')}
  ${card(492, 332, '06', 'PASSWORD FIELD SHIELD', 'status: blocked', pBlocked, 'Bar blocks paste and warns when focus is flagged as a password input.')}
</svg>`;
}

// =========================================================================
// 3. EDITORIAL BENCHMARK SPECIMEN (960 x 430)
// =========================================================================
function buildSpecimen(mode) {
  const t = THEMES[mode];

  const row = (y, tag, spokenLines, winhLines, speakitLines, badge) => {
    const tspan = (lines, x) =>
      lines.map((l, i) => `<tspan x="${x}" dy="${i === 0 ? 0 : 17}">${esc(l)}</tspan>`).join('');
    return `
    <g transform="translate(44, ${y})">
      <rect width="872" height="92" rx="10" fill="${t.surface}" stroke="${t.line}" />

      <!-- Col 1: Spoken -->
      <text x="18" y="22" font-family="${FONT_MONO}" font-size="9.5" font-weight="600" fill="${t.muted}" letter-spacing="0.05em">${esc(tag)}</text>
      <text x="18" y="42" font-family="${FONT_UI}" font-size="12.5" fill="${t.ink2}">${tspan(spokenLines, 18)}</text>

      <!-- Col 2: Win+H -->
      <rect x="296" y="10" width="272" height="72" rx="7" fill="${t.dangerBg}" stroke="${t.dangerBorder}" />
      <text x="310" y="28" font-family="${FONT_UI}" font-size="12" fill="${t.danger}">${tspan(winhLines, 310)}</text>

      <!-- Col 3: SpeakIt -->
      <rect x="582" y="10" width="276" height="72" rx="7" fill="${t.okBg}" stroke="${t.okBorder}" />
      <text x="596" y="28" font-family="${FONT_UI}" font-size="12.5" font-weight="600" fill="${t.ink}">${tspan(speakitLines, 596)}</text>
      <text x="846" y="73" text-anchor="end" font-family="${FONT_MONO}" font-size="9.5" font-weight="600" fill="${t.accentText}">✓ ${esc(badge)}</text>
    </g>`;
  };

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 444" width="100%" height="100%">
  <rect x="0.5" y="0.5" width="959" height="443" rx="16" fill="${t.canvas}" stroke="${t.line}" />

  <text x="44" y="42" font-family="${FONT_MONO}" font-size="11" font-weight="600" fill="${t.accentText}" letter-spacing="0.06em">EVIDENCE SPECIMEN  ·  DOCS/COMPARISON_WIN_H.MD &amp; GOLDEN_50_CASES.JSONL</text>
  <text x="44" y="68" font-family="${FONT_UI}" font-size="22" font-weight="700" fill="${t.ink}" letter-spacing="-0.025em">Built for Hinglish, Self-Corrections, and Technical Vocabulary</text>

  <!-- Column Headers -->
  <text x="62" y="106" font-family="${FONT_MONO}" font-size="10.5" font-weight="600" fill="${t.muted}" letter-spacing="0.06em">SPOKEN UTTERANCE</text>
  <text x="340" y="106" font-family="${FONT_MONO}" font-size="10.5" font-weight="600" fill="${t.danger}" letter-spacing="0.06em">WINDOWS VOICE TYPING (WIN+H)</text>
  <text x="626" y="106" font-family="${FONT_MONO}" font-size="10.5" font-weight="600" fill="${t.accentText}" letter-spacing="0.06em">SPEAKIT CLEANED OUTPUT</text>

  ${row(
    118,
    '01 · HINGLISH CODE-SWITCHING',
    ['“Arre Sunita deliverable ready hai,', 'hum Tuesday meeting mein', 'finalize kar lenge.”'],
    ['“are Sunita deliver able ready hi', 'home Tuesday meeting main', 'finalize kar language”'],
    ['“Sunita, deliverable ready hai;', 'hum Tuesday meeting mein', 'finalize kar lenge.”'],
    'Bilingual syntax preserved'
  )}

  ${row(
    222,
    '02 · VOCAL SELF-CORRECTION',
    ['“we will meet on Monday', 'no wait Tuesday morning at 10”'],
    ['“we will meet on Monday no wait', 'Tuesday morning at 10”'],
    ['“We will meet on Tuesday', 'morning at 10.”'],
    'False start pruned'
  )}

  ${row(
    326,
    '03 · CODE & SECURITY TOKENS',
    ['“uh like we need to migrate', 'safeStorage DPAPI module in index.ts”'],
    ['“uh like we need to migrate safe', 'storage DPA PI module in index dot t s”'],
    ['“We need to migrate safeStorage', 'DPAPI module in index.ts.”'],
    'camelCase & .ts kept'
  )}
</svg>`;
}

// =========================================================================
// 4. SYSTEM ARCHITECTURE & TRUST BOUNDARY BLUEPRINT (960 x 440)
// =========================================================================
function buildArchitecture(mode) {
  const t = THEMES[mode];

  const card = (x, y, w, h, title, sub, strokeCol = t.line) => `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${t.surface2}" stroke="${strokeCol}" />
    <text x="${x + 12}" y="${y + 20}" font-family="${FONT_UI}" font-size="12" font-weight="600" fill="${t.ink}">${esc(title)}</text>
    <text x="${x + 12}" y="${y + 37}" font-family="${FONT_MONO}" font-size="10" fill="${t.muted}">${esc(sub)}</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 448" width="100%" height="100%">
  <style>
    .bus-flow { stroke-dasharray: 5 5; animation: bus-move 2.2s linear infinite; }
    @keyframes bus-move { to { stroke-dashoffset: -40; } }
  </style>

  <rect x="0.5" y="0.5" width="959" height="447" rx="16" fill="${t.canvas}" stroke="${t.line}" />

  <text x="44" y="42" font-family="${FONT_MONO}" font-size="11" font-weight="600" fill="${t.accentText}" letter-spacing="0.06em">SYSTEM ARCHITECTURE  ·  THREE-PROCESS ISOLATION</text>
  <text x="44" y="68" font-family="${FONT_UI}" font-size="22" font-weight="700" fill="${t.ink}" letter-spacing="-0.025em">Process Boundaries, Security Guards &amp; Fallback Chain</text>

  <!-- Orthogonal IPC / Provider Conduit Buses between Columns (no overlap!) -->
  <line class="bus-flow" x1="312" y1="242" x2="348" y2="242" stroke="${t.accentText}" stroke-width="1.8" />
  <line class="bus-flow" x1="628" y1="242" x2="664" y2="242" stroke="${t.accentText}" stroke-width="1.8" />

  <!-- IPC Badges centered strictly inside gaps (312..348 is 36px, so put badge cleanly or span gap with clean pill) -->
  <rect x="304" y="226" width="52" height="32" rx="6" fill="${t.surface}" stroke="${t.accentBorder}" />
  <text x="330" y="240" text-anchor="middle" font-family="${FONT_MONO}" font-size="8.5" font-weight="700" fill="${t.accentText}">JSON</text>
  <text x="330" y="251" text-anchor="middle" font-family="${FONT_MONO}" font-size="8" fill="${t.muted}">STDIN</text>

  <rect x="616" y="226" width="60" height="32" rx="6" fill="${t.surface}" stroke="${t.accentBorder}" />
  <text x="646" y="240" text-anchor="middle" font-family="${FONT_MONO}" font-size="8.5" font-weight="700" fill="${t.accentText}">CHAIN</text>
  <text x="646" y="251" text-anchor="middle" font-family="${FONT_MONO}" font-size="8" fill="${t.muted}">POLICY</text>

  <!-- TIER 1: NATIVE HELPER (x=44, w=264 -> ends at 308) -->
  <rect x="44" y="96" width="264" height="316" rx="12" fill="${t.surface}" stroke="${t.line}" />
  <circle cx="62" cy="118" r="4" fill="${t.accentText}" />
  <text x="74" y="122" font-family="${FONT_MONO}" font-size="11" font-weight="700" fill="${t.ink}">NATIVE HELPER (.NET 4.8)</text>
  <text x="62" y="140" font-family="${FONT_MONO}" font-size="10" fill="${t.muted}">SpeakItHelper.exe · .NET 4.8</text>

  ${card(58, 156, 236, 50, 'Global Hotkey Hook', 'WH_KEYBOARD_LL (no keylogging)')}
  ${card(58, 216, 236, 50, 'Focus & Password Guard', 'expectHwnd & isPassword check', t.warnBorder)}
  ${card(58, 276, 236, 50, 'Unicode Keystroke Inject', 'Win32 SendInput paste engine')}
  ${card(58, 336, 236, 50, 'Clipboard Preservation', 'Snapshot & restore after paste')}

  <!-- TIER 2: ELECTRON MAIN (x=352, w=272 -> ends at 624) -->
  <rect x="352" y="96" width="272" height="316" rx="12" fill="${t.surface}" stroke="${t.line}" />
  <circle cx="370" cy="118" r="4" fill="${t.accentText}" />
  <text x="382" y="122" font-family="${FONT_MONO}" font-size="11" font-weight="700" fill="${t.ink}">ELECTRON MAIN PROCESS</text>
  <text x="370" y="140" font-family="${FONT_MONO}" font-size="10" fill="${t.muted}">src/main/ · Context-isolated IPC</text>

  ${card(366, 156, 244, 50, '13-State Dictation Machine', 'IDLE → RECORDING → CLEAN → DONE')}
  ${card(366, 216, 244, 50, 'DPAPI Secret Store', 'Electron safeStorage encryption', t.cyanBorder)}
  ${card(366, 276, 244, 50, 'SQLite + FTS5 Search', 'better-sqlite3 local DB')}
  ${card(366, 336, 244, 50, 'Enterprise Registry Policy', 'HKLM\\Policies\\SpeakIt')}

  <!-- TIER 3: AI INFERENCE CHAIN (x=668, w=248 -> ends at 916) -->
  <rect x="668" y="96" width="248" height="316" rx="12" fill="${t.surface}" stroke="${t.line}" />
  <circle cx="686" cy="118" r="4" fill="${t.accentText}" />
  <text x="698" y="122" font-family="${FONT_MONO}" font-size="11" font-weight="700" fill="${t.ink}">PROVIDER FALLBACK CHAIN</text>
  <text x="686" y="140" font-family="${FONT_MONO}" font-size="10" fill="${t.muted}">Ordered failover &amp; offline switch</text>

  <rect x="682" y="156" width="220" height="72" rx="8" fill="${t.okBg}" stroke="${t.okBorder}" />
  <text x="694" y="176" font-family="${FONT_UI}" font-size="12" font-weight="700" fill="${t.accentText}">1. Groq LPU (Primary)</text>
  <text x="694" y="194" font-family="${FONT_MONO}" font-size="9.5" fill="${t.ink2}">whisper-large-v3-turbo (~480–650ms)</text>
  <text x="694" y="210" font-family="${FONT_MONO}" font-size="9.5" fill="${t.muted}">llama-3.3-70b-versatile cleanup</text>

  <rect x="682" y="238" width="220" height="60" rx="8" fill="${t.surface2}" stroke="${t.line}" />
  <text x="694" y="258" font-family="${FONT_UI}" font-size="12" font-weight="600" fill="${t.ink}">2. Gemini / Custom OpenAI</text>
  <text x="694" y="276" font-family="${FONT_MONO}" font-size="9.5" fill="${t.muted}">gemini-2.5-flash automatic failover</text>

  <rect x="682" y="308" width="220" height="88" rx="8" fill="${t.cyanBg}" stroke="${t.cyanBorder}" />
  <text x="694" y="328" font-family="${FONT_UI}" font-size="12" font-weight="700" fill="${t.cyan}">3. whisper.cpp (Offline)</text>
  <text x="694" y="346" font-family="${FONT_MONO}" font-size="9.5" fill="${t.ink2}">whisper-server.exe on 127.0.0.1</text>
  <text x="694" y="362" font-family="${FONT_MONO}" font-size="9.5" fill="${t.muted}">0.3s–3.8s CPU · 0 KB network egress</text>
  <text x="694" y="378" font-family="${FONT_MONO}" font-size="9" fill="${t.muted}">Enforced when OfflineOnly=1</text>
</svg>`;
}

const files = [
  ['hero/speakit-hero-dark.svg', buildHero('dark')],
  ['hero/speakit-hero-light.svg', buildHero('light')],
  ['motion/speakit-states-dark.svg', buildStates('dark')],
  ['motion/speakit-states-light.svg', buildStates('light')],
  ['specimens/speakit-specimen-dark.svg', buildSpecimen('dark')],
  ['specimens/speakit-specimen-light.svg', buildSpecimen('light')],
  ['architecture/speakit-architecture-dark.svg', buildArchitecture('dark')],
  ['architecture/speakit-architecture-light.svg', buildArchitecture('light')],
];

for (const [rel, content] of files) {
  const full = path.join(OUT_ROOT, rel);
  fs.writeFileSync(full, content, 'utf8');
  console.log(`Wrote ${rel} (${Buffer.byteLength(content)} bytes)`);
}

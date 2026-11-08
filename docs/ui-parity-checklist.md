# SpeakIt UI Parity & Verification Checklist (v1.0)

This checklist verifies layout parity, page completeness, and brand identity independence per PLAN.md §3.2, §10, and §15 M5.

---

## 1. Frame and Window Shell (§10.2)

- [x] **Frameless Shell:** Warm stone neutral frame (`--frame:#E9EBE6`) with inset content panel (`--panel:#FAFBF8`).
- [x] **Top Bar:** Left product identity dot and title (`SpeakIt`), right theme toggle, settings icon, and window controls (minimize, maximize, close-to-tray).
- [x] **Dimensions:** Default 1180×760, minimum 960×640.
- [x] **Hide on Close:** Closing window minimizes directly to Windows system tray without exiting the application process.

---

## 2. Left Icon Rail (§10.2)

- [x] **Navigation Items:** Home (🏠), Dictionary (📖), Snippets (⚡), Style (🎨).
- [x] **Bottom Pinned Items:** Settings (⚙️), Help (❓).
- [x] **Width & Hover States:** ~60px wide, tooltips, subtle active border and background indicator.
- [x] **Deferred Pages:** Insights, Transforms, Scratchpad, and Notetaker deferred to v1.1 per Q8 decision.

---

## 3. Pages Verification (§10.3)

### Home Page
- [x] **Greeting:** Dynamic time-of-day greeting ("Good morning / afternoon / evening").
- [x] **Dismissible Dark Hero Card:** Dark panel with serif headline ("Make SpeakIt sound like *you*"), action button linking to Style.
- [x] **Stats Card:** 3 key metrics in large display serif numbers: Total Words, Average Speed (wpm), Day Streak (🔥).
- [x] **History Feed:** Grouped by Today / Yesterday / Date.
- [x] **Row Actions:** Hover copy button, delete button, words count, timestamp.
- [x] **Search:** FTS5 full-text search input filtering history in real time.
- [x] **Empty State:** Friendly guidance ("Hold Ctrl + Win to dictate anywhere").

### Custom Dictionary Page
- [x] **Header Action:** + Add Term button.
- [x] **Inline Form:** Term input and optional "Sounds Like" pronunciation mapping.
- [x] **Dismissible Banner:** Helpful explanation for names and acronyms.
- [x] **Search:** Filters terms and sounds-like entries.
- [x] **Delete Action:** Per-term delete button.

### Snippets Page
- [x] **Trigger Expansion Model:** Displays `trigger → expansion`.
- [x] **Multiline Editor:** Supports multiline expansions (links, templates, bios).
- [x] **Search & Delete:** Quick search filter and remove actions.

### Style Page
- [x] **Category Tabs:** Personal Messages, Work & Team, Email, Other Apps.
- [x] **Tone Cards:** Formal, Casual, Very Casual with before/after sample comparisons.
- [x] **Custom Persona Field:** Textarea for custom instructions per category.
- [x] **Instant Save:** Automatic persistence to SQLite `styles` table.

### Settings Modal (§10.6)
- [x] **Navigation Sections:** General, System, AI Providers, Data & Privacy, About.
- [x] **Hotkey Display:** Shows active hotkey (`Ctrl + Win`).
- [x] **Provider Management:** Masked API key inputs for Groq and Gemini with DPAPI secure storage.
- [x] **Data Privacy Controls:** History retention selector, keep audio toggle, context awareness toggle (defaults to OFF).

---

## 4. SpeakIt Bar (§10.4)

- [x] **Positioning:** Placed at bottom center of the display containing the active foreground window, 12px above work area.
- [x] **States:** Listening (9 animated level bars + red dot), Locked (hands-free with ✕ and ■ buttons), Processing (spinner/shimmer), Done (✓), Copied only, Blocked password.
- [x] **Click-Through:** Mouse clicks pass through transparent regions directly into background apps.

---

## 5. Brand Identity & Legal Independence (ADR-12)

- [x] **Zero Wispr Assets:** No proprietary SVGs, icons, binary fonts, or copied CSS bundles.
- [x] **Distinct Color Palette:** Stone neutrals (`#E9EBE6`, `#FAFBF8`), amber brand accent (`#F0A12E`), and custom contrast tokens meeting WCAG AA.
- [x] **No "Flow" Wording:** The terms "Flow" and "Flow Bar" are strictly absent. Named "SpeakIt" and "SpeakIt Bar".
- [x] **Disclaimer Displayed:** Clear notice in About modal and Help page: *"SpeakIt is an independent open-source project and is not affiliated with Wispr or Wispr Flow."*

# VoiceDraft — End-to-End Planning Document
### AI Voice Writing Assistant (Desktop-First MVP)

*Working name "VoiceDraft" is a placeholder. This is a planning document only — no code, no implementation.*

**Core concept:** Not a transcription app. An AI writing layer that uses voice as input.
**Core experience:** User speaks messy thoughts → app transcribes → AI cleans and formats → polished text appears wherever the user is working.

---

## 1. Product Requirements Document (PRD)

### 1.1 Product Vision
Let anyone write 3–4x faster by speaking naturally. The app turns rambling speech into clean, context-appropriate writing and inserts it directly into whatever app the user is working in — email, Slack, IDE, browser, notes.

### 1.2 Target Users
- Founders, operators, and managers who write dozens of emails/messages daily
- Developers writing PR descriptions, commit messages, docs, and standup updates
- Content creators and freelancers drafting long-form text
- Indian professionals who think in Hinglish but must write in polished English
- People with RSI, typing fatigue, or accessibility needs

### 1.3 User Problems
- Typing is slow; thinking is fast. The gap kills momentum.
- Raw dictation output is messy: filler words, false starts, no punctuation, wrong formatting.
- Existing OS dictation (Windows/macOS built-in) transcribes literally and doesn't clean or adapt tone.
- Switching to a separate app to dictate, clean, copy, and paste breaks flow.
- Indian-accent and Hinglish speech is poorly handled by most dictation tools.

### 1.4 Core Value Proposition
**"Speak messy, paste polished — anywhere."**
One hotkey. Speak in any app. Get clean, tone-appropriate writing inserted at your cursor in under ~3 seconds after you stop speaking.

### 1.5 User Personas

**Persona A — "Arjun", Startup Founder (32, Bengaluru)**
- Writes 50+ emails/Slack messages a day, hates typing long updates
- Wants investor emails to sound professional even when he speaks casually
- Pays for tools that save time; price-sensitive up to ~₹800–1000/month

**Persona B — "Priya", Senior Engineer (29, Hyderabad)**
- Writes PR descriptions, Jira comments, design docs
- Wants a "developer mode" that preserves technical terms and code identifiers
- Cares about privacy — company code context must not leak

**Persona C — "Rahul", Freelance Consultant (38, Pune)**
- Thinks in Hinglish, delivers in formal English to international clients
- Wants translation/formalization on the fly
- Needs low-cost pricing; ₹2000+/month tools are out of reach

### 1.6 Main User Journeys
1. **Quick reply:** User is in Gmail → holds hotkey → speaks reply → releases → polished email text appears at cursor.
2. **Long draft:** User opens Notes → dictates a rambling brain-dump → app produces structured, formatted notes.
3. **Command edit:** User selects a paragraph → invokes command mode → says "make this shorter and more professional" → text is rewritten in place.
4. **Personalization:** App mis-transcribes a product name → user adds it to personal dictionary → never wrong again.
5. **Hitting the limit:** Free user exhausts weekly words → sees clear upgrade prompt → upgrades in 2 clicks.

### 1.7 Feature List (Full)
| Feature | Category |
|---|---|
| Global hotkey recording (push-to-talk + toggle) | Capture |
| Floating recording indicator | Capture |
| Streaming speech-to-text | Transcription |
| AI cleanup and rewriting | Writing layer |
| Context modes (default, email, chat, notes, developer, social) | Writing layer |
| Personal dictionary | Personalization |
| Snippets / reusable phrases | Personalization |
| Command mode (shorten, rewrite, professionalize, bullets, translate) | Writing layer |
| Clipboard + auto-paste at cursor | Insertion |
| Dictation history (user-controlled) | Utility |
| Usage tracking + limits | Business |
| Privacy mode (no retention) | Trust |
| Subscription / Pro plan | Business |
| Hinglish → English support | Differentiation |

### 1.8 MVP Scope (Must ship in v1)
- Global hotkey (push-to-talk) + floating indicator
- Speech-to-text (cloud STT)
- AI cleanup (single default mode + email + chat modes)
- Auto-paste into active app (with clipboard fallback)
- Personal dictionary (basic)
- Local dictation history (last 50, deletable)
- Anonymous-light onboarding → email sign-in
- Free tier with word limit + basic usage tracking
- Windows first (or macOS first — pick one; see §11)

### 1.9 Non-MVP Scope (Explicitly deferred)
- Command mode on selected text
- Snippets
- Translation and full Hinglish tuning (basic accent robustness only in MVP)
- Notes / developer / social modes
- Payments (MVP can launch free-only with limits enforced but no checkout)
- Mobile apps, browser extension
- Team/enterprise features, SSO, admin console
- Offline/on-device STT
- Custom voice commands, macros

### 1.10 Success Metrics
| Metric | Target (first 90 days post-launch) |
|---|---|
| Activation: first successful dictation-to-paste | ≥ 60% of installs |
| Day-7 retention | ≥ 30% |
| Median dictations/day per active user | ≥ 8 |
| End-to-end latency (stop speaking → text pasted) | ≤ 3s p50, ≤ 6s p95 |
| Transcription+cleanup satisfaction ("kept without edit") | ≥ 70% of outputs |
| Free → Pro conversion (once payments live) | ≥ 3–5% |

### 1.11 Monetization Model
- **Free:** ~2,000 words/week, default + email modes, dictionary capped at 25 words.
- **Pro (India-first pricing):** ₹399–499/month or ₹3,999/year — unlimited words, all modes, command mode, snippets, priority processing.
- **Pro (International):** $12–15/month.
- **Teams (later):** per-seat, admin controls, shared snippets, enterprise privacy mode.
- Rationale: usage-based costs (STT + LLM) are per-word, so word limits align cost with revenue.

### 1.12 Risks and Assumptions
**Assumptions**
- Users will trust a hotkey mic app if privacy signaling is strong.
- Cloud latency of ~2–3s is acceptable for the value delivered.
- Cleanup quality (not raw transcription accuracy) is the retention driver.

**Risks**
- OS-level trust friction: mic + accessibility permissions scare users → mitigated by careful onboarding.
- Per-user inference cost may exceed free-tier economics → strict limits, cheap STT tier.
- Auto-paste is fragile across apps (Electron apps, terminals, secure fields) → clipboard fallback always available.
- Big players (OS vendors, Wispr Flow itself) improving fast → differentiate on India pricing, Hinglish, snippets.

---

## 2. Technical Requirements Document (TRD)

### 2.1 Recommended Architecture
- **Thin desktop client + cloud processing.** Desktop app handles capture, hotkeys, UI, and paste. All heavy work (STT + LLM cleanup) happens server-side behind one backend API.
- Desktop → Backend over HTTPS/WSS. Backend orchestrates STT provider and LLM provider, applies user dictionary/snippets/mode prompt, returns final text.
- Keep the client dumb: easier updates, provider swaps without app releases.

### 2.2 Desktop App Approach
- **Options:** Electron (fastest to build, heavy), Tauri (light, Rust core, good for native hooks), fully native (Swift/WinUI — slowest to ship).
- **Recommendation:** Tauri if the team has any Rust comfort; otherwise Electron for speed. Both support global hotkeys, tray apps, and clipboard control. Native OS APIs needed for: global hotkey, mic capture, simulated paste (accessibility APIs), active-window detection (for context modes later).
- Ship as auto-updating tray app; no dock/taskbar window during normal use.

### 2.3 Backend Requirements
- Single API service (monolith is fine for MVP): auth, session orchestration, STT proxying, LLM cleanup, usage metering, dictionary/snippets CRUD.
- Async job or streaming pipeline for audio → text; WebSocket or chunked HTTP for streaming partials.
- Stateless app servers; state in DB + cache (Redis) for rate limits and live sessions.

### 2.4 Database Requirements
- Managed Postgres (relational fits users/subscriptions/usage well).
- Redis for rate limiting, session tokens, live usage counters.
- No audio stored in DB — audio is transient (see §9).

### 2.5 Authentication Requirements
- Email magic link + Google OAuth. No passwords in MVP.
- Device-bound refresh tokens; short-lived access tokens.
- One account, multiple devices allowed (cap at 3 in free tier).

### 2.6 Speech-to-Text System
- **MVP:** managed streaming STT API (e.g., Deepgram/AssemblyAI/Whisper-based hosted) chosen on: Indian-accent accuracy, streaming latency, per-minute cost, custom vocabulary support (needed for personal dictionary boosting).
- Stream audio chunks as user speaks; final transcript ready near-instantly on release.
- Custom vocabulary/boosting fed from the user's personal dictionary per request.
- **Later:** evaluate on-device STT for privacy mode and offline.

### 2.7 AI Rewriting System
- LLM call with: raw transcript + mode prompt + dictionary terms + (later) app context + user style hints.
- Small/fast model for default cleanup; larger model only for command mode/complex rewrites. Route by task.
- Strict output contract: return only the final text, no commentary. Deterministic-ish settings (low temperature).
- Guardrail: if LLM fails or times out, return lightly-punctuated raw transcript rather than nothing.

### 2.8 Clipboard and Auto-Paste Behavior
- Default: save current clipboard → place generated text on clipboard → simulate paste keystroke into active app → restore prior clipboard after short delay.
- Fallback: if paste simulation is blocked (secure fields, elevated apps), keep text on clipboard and notify "Copied — press Ctrl/Cmd+V".
- Never auto-paste into password fields (detect secure input where OS allows).

### 2.9 Privacy and Data Handling
- Audio processed in memory / transient storage only; deleted immediately after transcription (hard cap: minutes, not days).
- Text history stored only if user opts in (on by default locally, cloud sync off by default).
- Privacy mode: nothing persisted, ever, for that dictation.
- No training on user data without explicit opt-in. Full details in §9.

### 2.10 Subscription and Usage Limit Logic
- Meter by output words (aligns with user value) counted server-side.
- Redis counter per user per rolling week; hard block + upgrade prompt at limit; soft warning at 80%.
- Plan entitlements resolved server-side on every request (never trust client).
- Payments (Phase 3): Razorpay for India + Stripe internationally; webhook-driven entitlement updates.

### 2.11 Scalability Considerations
- Stateless API behind load balancer; horizontal scale.
- STT/LLM are the bottlenecks and are external — main scaling work is connection management (many concurrent audio streams) and cost control.
- Queue burst traffic for non-realtime tasks (history sync, analytics).
- Multi-region later; start single region close to users (India region if India-first).

### 2.12 Security Requirements
- TLS everywhere; tokens in OS keychain, not plaintext files.
- Encrypt PII at rest; encrypt text history at rest (per-user key envelope if feasible).
- Rate limiting + abuse detection (audio flooding).
- Signed auto-updates for the desktop app.
- Least-privilege service accounts; audit logs for admin/data access.

### 2.13 Platform Limitations
- **macOS:** paste simulation requires Accessibility permission; mic requires explicit consent; notarization required.
- **Windows:** UAC/elevated apps block simulated input; some apps (games, RDP) capture hotkeys; SmartScreen reputation for new installers.
- **Both:** global hotkey conflicts with other apps; secure input fields block paste; per-app quirks (terminals treat paste differently). Clipboard fallback is the universal safety net.
- **Linux:** deferred (Wayland makes global hotkeys/paste painful).

---
## 3. Feature Specification

Priority key: **M** = Must-have, **S** = Should-have, **C** = Could-have.

### 3.1 Global Hotkey Recording — **M**
**User story:** As a user, I press and hold a hotkey in any app, speak, and release to get text — without switching windows.
**Functional requirements**
- Default hotkey (e.g., hold `Fn`/`Right-Ctrl` style key or configurable combo); user-configurable in settings.
- Two modes: push-to-talk (hold) and toggle (tap to start/stop).
- Works system-wide regardless of focused app; app runs in tray.
- Audible/visual start cue within 150ms of keypress.
**Edge cases**
- Hotkey conflicts with another app → detect registration failure, prompt to rebind.
- Very short press (<300ms) → treat as accidental, discard.
- Hotkey pressed while previous dictation still processing → queue or reject with indicator feedback.
- Mic unavailable/in use by another app → clear error state on indicator.
**Acceptance criteria**
- From any of 10 common apps (browser, Gmail, Slack, VS Code, Word, Notepad, WhatsApp Web, Terminal, Notion, Outlook), hold-speak-release produces pasted text.
- Recording starts ≤150ms after keypress; no audio clipped at start.
- Rebinding the hotkey takes effect without restart.

### 3.2 Floating Recording Indicator — **M**
**User story:** As a user, I always know when the mic is live so I trust the app.
**Functional requirements**
- Small always-on-top pill/orb appears while recording; shows live audio level.
- States: listening → processing → done/error.
- Click indicator to cancel recording (discard audio).
- Position configurable (bottom-center default); never steals focus.
**Edge cases**
- Multi-monitor: appear on the display with the active window.
- Fullscreen apps/games: fall back to sound cue if overlay suppressed.
- Indicator must disappear reliably — a stuck "listening" state is a trust killer.
**Acceptance criteria**
- Indicator visible within 150ms of recording start, gone ≤1s after paste/cancel.
- Never takes keyboard focus from the target app.
- Cancel discards audio and nothing is sent.

### 3.3 Speech-to-Text Transcription — **M**
**User story:** As a user, my speech is transcribed accurately, including names and technical terms I use often.
**Functional requirements**
- Streaming transcription while speaking; final transcript ≤1.5s after release.
- Personal dictionary terms boosted in recognition.
- Handles Indian English accents; tolerates Hinglish (transcribe faithfully; cleanup layer handles language).
- Auto punctuation baseline from STT (LLM refines).
**Edge cases**
- Silence/no speech → "Didn't catch that" state, nothing pasted.
- Very long dictation (>3 min) → chunked processing; enforce max (e.g., 5 min) with warning.
- Heavy background noise → best effort + low-confidence flag.
- Network drop mid-stream → retry final chunk; on failure show error, keep audio (in memory) for one retry.
**Acceptance criteria**
- Word error rate materially better than OS-native dictation on an internal Indian-English test set.
- Dictionary terms correctly transcribed ≥90% of occurrences.
- p95 transcript-final latency ≤2.5s after release.

### 3.4 AI Cleanup and Rewriting — **M**
**User story:** As a user, my rambling speech becomes clean, well-formatted writing — not a literal transcript.
**Functional requirements**
- Remove fillers ("um", "like", "you know"), false starts, self-corrections ("send it Monday — no wait, Tuesday" → Tuesday).
- Fix grammar, punctuation, casing; sensible paragraphs.
- Respect verbal formatting commands: "new line", "new paragraph", "bullet point".
- Preserve meaning, names, numbers; never invent content.
- Apply active context mode's tone/format.
**Edge cases**
- User dictates something intentionally informal → default mode keeps register light, not corporate.
- Mixed Hinglish input → output in English by default (configurable later).
- Profanity/sensitive content → transcribe/clean faithfully; do not moralize or block (it's the user's own writing).
- LLM timeout → fall back to punctuated raw transcript with subtle "raw" badge.
**Acceptance criteria**
- ≥70% of outputs accepted without manual edit (measured via edit telemetry, opt-in).
- Zero fabricated facts/names in QA test suite.
- Cleanup adds ≤1.5s p50 on top of transcription.

### 3.5 Context Modes — **M (default, email, chat) / S (notes, developer, social)**
**User story:** As a user, the same speech becomes an email, a Slack message, or notes depending on where I am or what I choose.
**Functional requirements**
- Modes: default, email (greeting/sign-off aware, formal), chat (short, casual, no salutations), notes (structured, headings/bullets), developer (preserve code terms, backtick identifiers, imperative commit style), social (punchy, hashtags optional).
- Manual mode switch from tray/indicator; remember last used.
- Later (S): auto-detect mode from active app (Gmail→email, Slack→chat, VS Code→developer).
**Edge cases**
- Auto-detect wrong → one-click override; manual choice wins for the session.
- Unknown app → default mode.
- Developer mode must not "fix" intentional lowercase identifiers or rewrite code tokens.
**Acceptance criteria**
- Same test utterance produces distinctly appropriate outputs per mode (rubric-based QA).
- Mode switch takes ≤2 clicks from tray.

### 3.6 Personal Dictionary — **M (basic)**
**User story:** As a user, I teach the app my product names, colleague names, and jargon once, and it never gets them wrong again.
**Functional requirements**
- Add/edit/delete terms; optional "sounds like" hint and casing rule (e.g., "RestAssured", "Omnissa").
- Terms boost STT recognition and are enforced in LLM cleanup (exact casing).
- Free cap 25 terms; Pro unlimited. Synced to account.
- Quick-add: right-click a word in history → "Add to dictionary".
**Edge cases**
- Conflicting terms ("Jon" vs "John") → most recently added wins; show conflict warning.
- Emoji/symbol entries → allowed in replacement, not in spoken form.
- Very long list → cap prompt injection (top N by usage frequency).
**Acceptance criteria**
- New term correctly used in the very next dictation.
- Dictionary syncs across devices ≤10s.

### 3.7 Snippets and Reusable Phrases — **S**
**User story:** As a user, I say "insert my intro" and my saved paragraph appears, personalized.
**Functional requirements**
- Create named snippets (title + body, optional placeholders like {name}).
- Trigger by voice ("insert snippet meeting follow-up") or from tray picker.
- Placeholders filled from dictation context when spoken ("insert intro for Rakesh").
**Edge cases**
- Similar snippet names → fuzzy match with confirmation if confidence low.
- Placeholder unfilled → leave visible {placeholder} rather than guessing.
**Acceptance criteria**
- Voice trigger success ≥90% for distinct snippet names.
- Snippet inserted with correct placeholder substitution in QA cases.

### 3.8 Command Mode — **S**
**User story:** As a user, I select existing text and speak an instruction ("make this half the length, professional tone") to rewrite it in place.
**Functional requirements**
- Separate hotkey; captures currently selected text (via clipboard copy simulation).
- Supported commands: shorten, expand, rewrite, professionalize, casualize, bullet points, fix grammar, translate (English↔Hindi first).
- Free-form instructions allowed; result replaces selection (paste) with clipboard fallback.
- Undo path: original text kept on clipboard history within app for one step.
**Edge cases**
- No text selected → treat spoken input as normal dictation with the instruction applied to itself? No — show "select text first" hint.
- Selection copy blocked by app → ask user to copy manually, then proceed.
- Huge selection (>5k words) → warn and truncate or refuse.
**Acceptance criteria**
- 8/8 canonical commands produce correct transformation in QA rubric.
- Original text recoverable in one action after replacement.

### 3.9 Clipboard and Auto-Paste — **M**
**User story:** As a user, polished text just appears at my cursor; I never manually copy-paste.
**Functional requirements**
- Auto-paste at cursor in active app via simulated paste; preserve and restore prior clipboard.
- Per-app disable list (user can exclude apps).
- Global setting: auto-paste ON (default) or copy-only.
- Notification on fallback: "Copied to clipboard".
**Edge cases**
- Focus changed during processing → paste into *original* target if possible; else copy-only + notify.
- Secure/password fields → never paste; copy-only.
- Clipboard managers interfering with restore → restore best-effort, document limitation.
- Terminal apps where Ctrl+V ≠ paste → per-app paste keystroke map (Ctrl+Shift+V etc.).
**Acceptance criteria**
- Correct paste in the 10-app matrix (see 3.1) ≥95% of attempts.
- Prior clipboard restored in ≥99% of successful pastes.
- Zero pastes into detected secure fields in QA.

### 3.10 Usage Tracking — **M**
**User story:** As a user, I can see how much I've used and how close I am to my limit; as the business, we meter cost fairly.
**Functional requirements**
- Count output words per dictation server-side; weekly rolling window for free tier.
- Tray shows remaining words; warning at 80%; block + upgrade prompt at 100%.
- Personal stats: words dictated, time saved estimate, streak (light gamification).
**Edge cases**
- Clock/timezone issues → all windows computed server-side in UTC.
- Failed dictation (error) → not counted.
- Offline/queued events → reconcile on reconnect; never double-count (idempotency keys).
**Acceptance criteria**
- Server and client counters never diverge by >1 dictation.
- Limit enforcement cannot be bypassed by client tampering.

### 3.11 Privacy Mode — **M**
**User story:** As a user, I can dictate sensitive content knowing nothing is stored anywhere.
**Functional requirements**
- Toggle from tray/indicator (and per-app auto-trigger later, e.g., password managers).
- In privacy mode: no history entry, no cloud text retention, audio discarded immediately post-transcription, excluded from analytics beyond anonymous word count for metering.
- Clear visual state on indicator (e.g., different color).
**Edge cases**
- Metering still required → count words only, store no content.
- User forgets it's on → indicator state must be unmistakable; auto-off option after N minutes.
**Acceptance criteria**
- Verified: no content row written anywhere (DB, logs, analytics) for privacy-mode dictations.
- Word count still metered correctly.

---

## 4. UX Flow Document

Each flow is deliberately short: steps only.

**4.1 First-time onboarding**
Install → launch → 3-screen intro (what it does, hotkey, privacy promise) → sign in (Google/magic link) → mic permission → accessibility/paste permission (with why) → interactive test: "Hold the key and say hello" → success paste into onboarding text box → done, app minimizes to tray.

**4.2 Microphone permission**
Prompt appears in onboarding with plain-language explanation → OS dialog → if denied: screen with exact re-enable steps per OS + "Open Settings" button → app remains usable only after grant; state clearly shown in tray.

**4.3 Starting dictation**
User holds hotkey in any app → indicator appears with level meter + subtle start sound → user speaks.

**4.4 Stopping dictation**
User releases hotkey (or taps again in toggle mode) → indicator switches to "processing" spinner → text pasted → indicator shows brief ✓ then disappears. Cancel: click indicator or press Esc → discard.

**4.5 Reviewing generated text**
Default: text pastes directly (speed-first). Optional "review before paste" setting: small card near indicator shows output with Paste / Copy / Retry / Discard → Enter pastes. History window (from tray) lists recent dictations with copy/delete.

**4.6 Auto-pasting into another app**
Processing completes → app confirms original target window still focused → simulated paste → clipboard restored → toast only on fallback ("Copied — press Ctrl+V").

**4.7 Adding personal dictionary words**
Tray → Dictionary → Add → enter term (+ optional sounds-like, casing) → Save → toast "Will be used from your next dictation". Quick path: history entry → right-click misheard word → "Add correction to dictionary".

**4.8 Creating snippets**
Tray → Snippets → New → title + body (+ placeholders) → Save → usage hint shown ("Say: insert snippet <title>").

**4.9 Using command mode**
User selects text in any app → presses command hotkey → indicator in "command" color → speaks instruction → release → selection replaced with rewritten text → "Undo" available via indicator for 10s.

**4.10 Hitting usage limits**
At 80%: passive tray badge + one toast "80% of weekly words used". At 100%: dictation attempt → indicator shows lock icon → card: words reset date + "Upgrade to Pro" button → dictation blocked but command "copy raw transcript" NOT offered (hard limit keeps economics honest).

**4.11 Upgrading to Pro**
Upgrade button → in-app checkout page (Razorpay/Stripe) → payment → entitlement updates via webhook → app unlocks within seconds → success toast "Pro active — unlimited words".

---

## 5. MVP Roadmap

### Phase 1 — Core Desktop MVP (the wedge)
**Features:** hotkey capture, indicator, streaming STT, AI cleanup (default/email/chat modes), auto-paste + clipboard fallback, basic dictionary, local history, sign-in, free-tier metering (soft — logged, not yet blocking), one OS platform.
**Dependencies:** STT provider selection, LLM provider selection, OS permission flows.
**Complexity:** High (native integration is the hard part, not the AI).
**Risks:** paste reliability across apps; permission drop-off in onboarding; latency budget.
**Definition of done:** 10-app paste matrix ≥95%; p50 end-to-end ≤3s; 50 beta users with D7 ≥30%; crash-free sessions ≥99%.

### Phase 2 — Personalization and Command Mode
**Features:** command mode, snippets, notes/developer/social modes, auto mode detection by active app, dictionary sync + quick-add, review-before-paste option, Hinglish→English polish pass.
**Dependencies:** Phase 1 telemetry (which apps, which failure modes); selection-capture reliability work.
**Complexity:** Medium.
**Risks:** command-mode selection capture is flaky in some apps; scope creep in modes.
**Definition of done:** command mode QA rubric passes; snippet voice-trigger ≥90%; mode auto-detect correct ≥85% on top 10 apps.

### Phase 3 — Payments and Usage Limits
**Features:** hard free-tier enforcement, Pro plan, Razorpay (India) + Stripe (intl), plan management UI, dunning/failed-payment handling, referral credits (optional).
**Dependencies:** stable metering from Phase 1; legal/ToS/pricing finalized.
**Complexity:** Medium (webhooks + entitlement edge cases).
**Risks:** conversion below cost floor; payment-webhook race conditions.
**Definition of done:** end-to-end purchase→unlock ≤60s; zero known entitlement-bypass paths; refund/cancel flows tested.

### Phase 4 — Mobile Expansion
**Features:** iOS/Android app with custom keyboard extension (dictate into any app), shared account/dictionary/snippets, mobile-appropriate limits.
**Dependencies:** backend already multi-client; keyboard-extension feasibility spike.
**Complexity:** High (mobile keyboards are their own product).
**Risks:** iOS keyboard restrictions (mic access requires "full access" trust hurdle); duplicate effort vs. desktop polish.
**Definition of done:** dictate-to-paste works in top 10 mobile apps; cross-device sync ≤10s; store approvals cleared.

### Phase 5 — Team and Enterprise
**Features:** team workspaces, shared snippets/dictionary, centralized billing, admin console, enterprise privacy mode (zero retention org-wide, regional processing), SSO/SAML, audit logs export, DPA paperwork.
**Dependencies:** Phase 3 billing; §9 privacy program matured.
**Complexity:** High.
**Risks:** enterprise sales cycle length; compliance overhead before revenue justifies it.
**Definition of done:** 3 design-partner teams live; SSO + admin controls pass a security review; DPA template signed by first customer.

---
## 6. System Design Overview (High-Level, No Code)

### 6.1 Frontend (Desktop Client) Components
- **Tray/Menu app shell** — settings, mode switcher, dictionary, snippets, history, usage meter, upgrade entry point.
- **Hotkey listener** — global key registration, push-to-talk/toggle logic.
- **Audio capture module** — mic stream, level metering, chunking for upload.
- **Floating indicator** — always-on-top state widget (listening/processing/done/error/privacy).
- **Insertion module** — clipboard save/replace/restore + simulated paste + secure-field guard.
- **Local store** — encrypted local history, cached settings, offline queue for usage events.
- **Auth module** — token storage in OS keychain, refresh handling.

### 6.2 Backend Services (logical, single deployable in MVP)
- **API Gateway / App service** — auth, request routing, entitlement checks.
- **Dictation Orchestrator** — receives audio stream, calls STT, assembles transcript, calls Cleanup, returns final text.
- **Cleanup Service (LLM adapter)** — prompt assembly (mode + dictionary + instruction), model routing (small vs large), output validation.
- **Personalization Service** — dictionary + snippets CRUD and retrieval for prompt injection.
- **Metering Service** — word counting, limit checks (Redis), usage records.
- **Billing Service** — plan catalog, checkout session creation, webhook processing, entitlements.
- **Account Service** — profile, devices, settings sync, deletion requests.

### 6.3 Database Entities (summary; detail in §7)
Users, Sessions/Devices, Dictations (metadata ± optional text), PersonalDictionary, Snippets, UsageRecords, Subscriptions, Plans, Settings, AuditLogs, DeletionRequests.

### 6.4 External APIs
- Streaming STT provider (with custom-vocabulary support)
- LLM provider (two tiers: fast-small, capable-large)
- Razorpay (India payments), Stripe (international)
- Email service (magic links, receipts)
- Crash/error reporting + privacy-respecting product analytics

### 6.5 Data Flow (happy path)
Hotkey down → client streams mic audio chunks over WSS to Orchestrator → Orchestrator streams to STT (with dictionary boost) → hotkey up → STT finalizes transcript → Cleanup Service builds prompt (mode + dictionary + transcript) → LLM returns cleaned text → Metering counts words + checks limit → final text returned to client → client pastes at cursor → (if history on) text metadata saved; audio already discarded.

### 6.6 Audio Processing Flow
Capture (16kHz mono) → optional local noise gate → chunked streaming upload → server holds chunks in memory/ephemeral buffer only → forwarded to STT → on transcript finalization, buffers zeroed/deleted → nothing written to durable storage → deletion event logged (no content).

### 6.7 Text Cleanup Flow
Transcript in → normalize (whitespace, obvious ASR artifacts) → assemble prompt: system rules (never invent, output text only) + mode template + top-N dictionary terms + user instruction (command mode) → route model by task size → validate output (non-empty, length sanity, no meta-commentary) → fallback to punctuated transcript on failure → out.

### 6.8 Privacy Flow
Every request tagged with privacy flag → if ON: skip history write, skip content analytics, force zero-retention headers/flags on STT+LLM provider calls where supported, meter word-count only → deletion request path: user triggers → account queued → all rows purged + provider deletion API calls + confirmation email + audit entry.

### 6.9 Payment Flow
Client "Upgrade" → backend creates checkout session (Razorpay/Stripe by region) → user pays in provider-hosted page → provider webhook → Billing verifies signature → Subscription row updated → entitlement cache invalidated → client polls/receives push → features unlock. Cancel/failed-renewal: webhook → grace period → downgrade to free limits.

---

## 7. Database Planning (Entities, Not Schema)

**Users**
- Purpose: account identity.
- Fields: id, email, name, auth_provider, region, created_at, status.
- Relationships: 1→N Devices, Dictations, Dictionary, Snippets, UsageRecords, Subscriptions, Settings.
- Retention: until deletion request; then purge within 30 days.

**Sessions / Devices**
- Purpose: auth tokens and device registry (multi-device cap).
- Fields: id, user_id, device_name, platform, refresh_token_hash, last_seen_at.
- Relationships: N→1 Users.
- Retention: rolling; revoked tokens purged after 30 days.

**Dictations**
- Purpose: history + quality telemetry. Metadata always; text only if history enabled.
- Fields: id, user_id, mode, word_count, latency_ms, status, privacy_flag, created_at, text (nullable, encrypted), app_context (nullable).
- Relationships: N→1 Users; 1→1 UsageRecord.
- Retention: text — user-controlled (default 90 days, deletable anytime); privacy-mode rows store no text ever; metadata 12 months for metrics.

**PersonalDictionary**
- Purpose: recognition boosting + casing enforcement.
- Fields: id, user_id, term, sounds_like, casing_rule, usage_count, created_at.
- Relationships: N→1 Users.
- Retention: until user deletes / account deletion.

**Snippets**
- Purpose: reusable phrases with placeholders.
- Fields: id, user_id, title, body, placeholders, usage_count, created_at.
- Relationships: N→1 Users; later N→1 Team.
- Retention: until user deletes / account deletion.

**UsageRecords**
- Purpose: metering + billing evidence.
- Fields: id, user_id, dictation_id, word_count, feature (dictation/command), idempotency_key, created_at.
- Relationships: N→1 Users.
- Retention: 24 months (billing disputes), content-free.

**Subscriptions**
- Purpose: plan state per user.
- Fields: id, user_id, plan_id, provider (razorpay/stripe), provider_sub_id, status, current_period_end, cancel_at.
- Relationships: N→1 Users, N→1 Plans.
- Retention: financial records per statutory requirements (7 years typical), content-free.

**Plans**
- Purpose: plan catalog + entitlements.
- Fields: id, name, price, currency, word_limit, dictionary_limit, features_json, active.
- Relationships: 1→N Subscriptions.
- Retention: permanent (versioned).

**Settings**
- Purpose: synced preferences.
- Fields: user_id, hotkey_config, default_mode, auto_paste, review_before_paste, history_enabled, privacy_defaults, excluded_apps.
- Relationships: 1→1 Users.
- Retention: until account deletion.

**AuditLogs** (admin/data-access events) — retained 24 months, append-only.
**DeletionRequests** — request + completion proof; retained as compliance evidence (content-free).

---

## 8. API Planning (High-Level, No Code)

All endpoints require a valid access token unless noted. Common errors everywhere: 401 (bad/expired token), 429 (rate limit), 500.

**GET /me — Authenticated user profile**
- Purpose: bootstrap client — profile, plan, entitlements, settings.
- Request: none.
- Response: user info, plan, remaining words, settings blob.
- Errors: 401.

**POST /dictations/start — Start dictation session**
- Purpose: create a dictation session; returns streaming endpoint/token; pre-checks limits.
- Request: mode, privacy_flag, device_id.
- Response: session_id, WSS upload URL/token.
- Errors: 402/limit_exceeded, 403 (device cap), 401.

**WSS /dictations/{id}/audio — Upload audio**
- Purpose: stream audio chunks during recording.
- Request: binary chunks + end-of-stream marker.
- Response: interim transcript events (optional), ack of finalization.
- Errors: session_expired, audio_too_long, connection_dropped (client retries final chunk once).

**GET /dictations/{id}/result — Get transcription/cleanup result**
- Purpose: fetch final cleaned text (or poll if WSS closed early).
- Request: session id in path.
- Response: final_text, raw_transcript (optional), word_count, latency, fallback_flag.
- Errors: 404 (unknown/expired), 409 (still processing), 422 (no speech detected).

**POST /rewrite — Rewrite text (command mode)**
- Purpose: transform provided text per instruction.
- Request: text, instruction, mode, privacy_flag.
- Response: rewritten_text, word_count.
- Errors: 402 (limit), 413 (text too large), 422 (empty text).

**POST /dictionary — Save dictionary word** (plus GET/DELETE)
- Purpose: manage personal terms.
- Request: term, sounds_like?, casing_rule?.
- Response: saved entry.
- Errors: 409 (duplicate), 402 (free cap reached), 422 (invalid term).

**POST /snippets — Save snippet** (plus GET/DELETE)
- Purpose: manage reusable phrases.
- Request: title, body, placeholders?.
- Response: saved snippet.
- Errors: 409 (duplicate title), 422 (validation).

**POST /usage/events — Track usage**
- Purpose: client-side event reconciliation (paste success/failure, edits) — content-free.
- Request: event_type, dictation_id, idempotency_key.
- Response: ack.
- Errors: 409 (duplicate key ignored — success), 422.

**GET /subscription — Check subscription status**
- Purpose: current plan, period end, remaining quota.
- Request: none.
- Response: plan, status, remaining_words, resets_at.
- Errors: 401.

**POST /subscription/checkout — Upgrade plan**
- Purpose: create provider checkout session.
- Request: plan_id, provider hint (by region).
- Response: checkout_url.
- Errors: 409 (already subscribed), 422 (unknown plan), 502 (provider down).

*(Internal, not client-facing: POST /webhooks/razorpay, /webhooks/stripe — signature-verified entitlement updates.)*

---

## 9. Privacy and Compliance Plan

**Principles:** collect the minimum, keep it briefly, make deletion real, never surprise the user.

- **Microphone permission handling:** request only during onboarding with plain-language justification; never record outside explicit hotkey activation; mic access state always visible in tray; one-click "revoke guide" if user wants out.
- **Clear recording indicator:** hardware-truthful — indicator shown whenever audio is captured, no exceptions, not disableable. Start/stop sound cues on by default.
- **Audio deletion policy:** audio is transient. Held in memory/ephemeral buffers only for transcription; deleted immediately on transcript finalization; contractual zero-retention (or minimal) configuration with STT provider; deletion is default, not a setting.
- **Text retention policy:** cleaned text stored only in user-visible history; default 90-day auto-expiry (configurable: 7/30/90/forever/off); server logs never contain dictation content.
- **User-controlled history:** view, search, delete single items, delete all, or disable history entirely — from the app, instantly effective.
- **Sensitive data handling:** privacy mode (zero retention per dictation); never paste into detected secure fields; planned auto-privacy for known sensitive apps (password managers, banking); no content-based advertising or profiling, ever.
- **Encryption:** TLS 1.2+ in transit; AES-256 at rest for text history and PII; tokens in OS keychain; per-user envelope encryption for history as a hardening step.
- **Audit logs:** all admin/data access to user data logged (who, what, when, why) and retained 24 months; users can request their access log.
- **Enterprise privacy mode (Phase 5):** org-wide zero retention, no content telemetry, regional processing (India data residency option), DPA + subprocessor list published.
- **GDPR-style deletion:** in-app "Delete my account & data" → full purge (DB + backups on cycle + provider deletion calls) within 30 days → email confirmation; export ("give me my data") supported alongside.
- **Indian user privacy expectations (DPDP Act alignment):** clear consent notices in plain English (Hindi translation later); purpose limitation; India-region hosting option; grievance officer contact published; breach notification process; no dark patterns in consent.
- **No training on user content** without separate, explicit, revocable opt-in — stated in one sentence on the privacy page, not buried.

---

## 10. Competitive Differentiation (vs. Wispr Flow — category level only)

Wispr Flow validated the category: hotkey voice input + AI cleanup + universal paste, polished UX, US-centric pricing (~$12–15/mo tier). We don't copy brand, UI, name, or UX patterns — we compete on positioning:

- **India-first pricing:** ₹399–499/mo with Razorpay/UPI. US-dollar pricing excludes most Indian professionals; a well-priced local plan wins that market almost uncontested.
- **Hinglish support:** first-class handling of code-switched Hindi-English speech → polished English output. This is a real daily behavior for tens of millions of professionals and a weak spot for US-trained pipelines.
- **Founder/operator productivity focus:** ship built-in templates for the messages Indian operators actually send — investor updates, client follow-ups, Naukri/LinkedIn outreach, standup notes — rather than generic dictation.
- **Lightweight desktop-first experience:** small tray app, fast cold start, low RAM target; no account wall before first magic moment (let users try before sign-up if feasible).
- **Privacy-first positioning:** zero audio retention by default, visible indicator, privacy mode, India data-residency roadmap — stated loudly and verifiably, aimed at enterprise-wary Indian IT users.
- **Better templates and reusable snippets:** snippets with placeholders + voice triggers as a headline feature (not buried), effectively "text expansion powered by voice" — a wedge Wispr under-plays.

---

## 11. Final Build Recommendation

**Build first (Phase 1, ~6–8 weeks of focused work):**
The wedge is *hotkey → speak → polished paste* on **one OS**. Pick **Windows first** if targeting Indian professionals broadly (dominant OS share in India), macOS first only if the initial beta audience is startup founders. Ship: hotkey capture, indicator, streaming STT, cleanup with 3 modes (default/email/chat), auto-paste with clipboard fallback, basic dictionary, local history, sign-in, soft metering.

**Do NOT build first:**
Payments, mobile, command mode, snippets, auto mode detection, teams, offline STT, browser extension, second OS. Every one of these is real work that doesn't test the core hypothesis: *will people replace typing with this?*

**Best MVP scope:** exactly §1.8. If forced to cut further, cut dictionary before cutting paste reliability — insertion quality is the product.

**Best tech stack options (choose per team skill):**
- Desktop: **Tauri** (preferred: light, native hooks) or **Electron** (fastest if team is pure JS).
- Backend: one service — **Node/TypeScript (Fastify/Nest)** or **Python (FastAPI)**; Postgres + Redis; deployed on a managed platform (Render/Railway/Fly or AWS-lite) in an India-adjacent region.
- STT: managed streaming API selected by a 1-week bake-off on Indian-English audio (custom vocabulary support is a hard requirement).
- LLM: fast small model for cleanup, larger model reserved for command mode; provider-agnostic adapter from day one.
- Payments (Phase 3): Razorpay + Stripe.

**Biggest technical risks:**
1. **Paste reliability across apps/OS quirks** — this, not AI, is where the product dies. Budget dedicated time for the 10-app matrix.
2. **Latency budget** (≤3s p50 end-to-end) — streaming STT + small cleanup model, measured from day one.
3. **Permission friction** (mic + accessibility) — onboarding drop-off can kill activation before quality is ever judged.
4. **Inference cost per free user** — enforce limits early even if payments come later.

**Biggest product risks:**
1. Habit formation — users forget the hotkey exists. Mitigate with gentle nudges and a visible tray meter.
2. Cleanup that changes meaning even once destroys trust — "never invent" is the top prompt rule and QA gate.
3. Competing with free OS dictation — the pitch must always be *writing quality*, not transcription.
4. Wispr Flow or an OS vendor shipping India pricing/Hinglish before we establish the niche.

**Suggested next step after planning:**
Run a **2-week technical spike**, not a build: (1) STT bake-off on 50 Indian-English/Hinglish samples, (2) paste-reliability prototype across the 10-app matrix on Windows, (3) latency measurement of the full loop with a small LLM. If all three pass thresholds, commit to Phase 1; recruit 20 beta users (founders/SDETs in your network) before writing production code.

---
*End of planning document.*

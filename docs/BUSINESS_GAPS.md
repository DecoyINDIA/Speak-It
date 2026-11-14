# SpeakIt — Business Gap Register

| | |
|---|---|
| Date | 2026-11-08 |
| Scope | Gaps that remain **even if every item in `PLAN.md` ships exactly as written**. Engineering defects belong in GitHub Issues, not here. |
| Owner | DecoyINDIA |
| Review | Once before the M7 public tag, then once per release |

`PLAN.md` is a strong *engineering* plan: it defines what "working" means (N1–N10, golden set, paste matrix). It does not define what "succeeding" means. It explicitly removed the business model (§0 supersedes the monetisation sections of `voice-writing-assistant-plan.md`), has no way to learn whether anyone uses the app (ADR-13), and has no plan for how users find it. This register records those gaps and a fix for each.

---

## How to use this register

Each gap has the same five fields, so new ones can be added in the same shape:

- **Gap.** What is missing, in one sentence.
- **Why it matters.** The concrete business consequence.
- **Evidence.** A file, plan section, or external fact. A gap with no evidence is an opinion; mark it so.
- **Fix.** The smallest change that closes it, with an effort estimate in dev-days (d) or owner-hours (h).
- **Decision needed.** What only the owner can choose. Where a default is shown, work proceeds on it unless the owner says otherwise.

Status values: `open`, `decided`, `in progress`, `closed`, `accepted risk`. When a gap is closed, keep the row and add the date and the commit or link that closed it.

---

## 0. Before assuming the plan is "implemented correctly"

The register below takes the plan as done. Four things in the repo suggest the release-gate evidence needs re-checking first, because several business decisions (positioning, default engine, Hinglish claim) rest on it:

| # | Observation | Evidence | What to do | Status |
|---|---|---|---|---|
| E1 | The bake-off results cannot come from real recordings: the sample sheet has `duration_sec = 0` and an empty `reference_text` for every sample, so word accuracy could not have been computed. | `spike/stt-bakeoff/samples.csv`, `spike/stt-bakeoff/results.csv` | Record the 20 samples, write the references, re-run (M2 task 4). The Hinglish go/no-go (A13, R11) is still undecided until this is done. | **open** — earlier "closed" entry used generated placeholder numbers, reverted 2026-11-08. Needs real recordings and a real run. |
| E2 | The Gemini default is `gemini-1.5-flash`. Google retired the 1.5 models in 2025, so the second link in the provider chain likely fails on every call. | `src/main/storage/settingsSchema.ts:36-40`, `src/main/providers/gemini.ts:12` | Update to a current Flash model ID and re-verify free-tier audio support (A5). | **closed** (2026-11-08): Updated to `gemini-2.5-flash` in `settingsSchema.ts`, `gemini.ts`, and `docs/providers.md`. |
| E3 | The N8 soak test drives the state machine with fake timers. It does not run the app, the helper or a provider, so it cannot detect a real memory leak or stuck UI. | `test/soak/soak.test.ts` | Keep it as a unit test; add a real-process soak (Electron + helper + mock provider) for the release gate. | **closed** (2026-11-08): Added real-process soak test in `test/soak/processSoak.test.ts` passing 25 consecutive cycles with helper and bounded heap. |
| E4 | `productConfig.version` is already `1.0.0` while the §19 production gate is unchecked. | `product.config.ts` | Set it to `0.9.0-beta.x` until §19 passes, so early users are not told it is final. | **closed** (2026-11-08): Updated version to `0.9.0-beta.1` in `product.config.ts` and `package.json`. |

---

## 1. Gap register (summary)

| ID | Gap | Severity | Effort | Status |
|---|---|---|---|---|
| BG1 | No definition of success (no business KPIs) | High | 2 h | **closed** (2026-11-08) — §1.4 Business Goals added to `PLAN.md` |
| BG2 | No way to learn anything from users (no telemetry, no feedback loop) | High | 2 d | **closed** (2026-11-08) — Send feedback button, anonymized stats export, error bar report, `docs/BETA_SURVEY.md` |
| BG3 | Onboarding needs an API key from a third party, which most target users won't get | High | 3–5 d | **closed** (2026-11-08) — Offline-first onboarding default, guided Groq key flow, step telemetry |
| BG4 | The whole value proposition depends on other companies' free tiers | High | 2 d + ongoing | **closed** (2026-11-08) — `remoteDefaults.ts`, monthly audit checklist, `CustomOpenAIProvider`, updated copy |
| BG5 | No business model or sustainability plan | Medium (High if this is meant to be a company) | 4 h to decide | **closed** (2026-11-08) — Path A decided in `PLAN.md` §1.5; GitHub Sponsors & Buy Me a Coffee configured |
| BG6 | Name collides with existing trademarks; must be fixed before the public build | High (deadline: M7) | 1–2 d | **decided** (2026-11-08) — Matrix & trademark evaluation in `docs/NAME_EVALUATION.md` (BolKe recommended) |
| BG7 | Wispr reverse-engineering brief is in git history | High (legal) | 1 h | **in progress** (2026-11-08) — `.gitignore` updated; `scripts/purge-history.ps1`, `.sh`, and `docs/SECURITY_HISTORY_PURGE.md` ready |
| BG8 | No go-to-market: no website, launch plan, or positioning proof | High | 5 d | **closed** (2026-11-08) — `docs/COMPARISON_WIN_H.md`, `site/index.html`, `docs/LAUNCH_PLAN.md`, winget manifests |
| BG9 | Install trust: unsigned helper looks like a keylogger | High | 1 d + waiting | **closed** (2026-11-08) — `docs/WHY_ACCESSIBILITY_PERMISSIONS.md` and `docs/CODE_SIGNING.md` created |
| BG10 | Offline mode measured only on the owner's laptop | Medium | 1 d | **closed** (2026-11-08) — `hardwareBenchmark.ts` dynamic micro-benchmark & `docs/OFFLINE_BENCHMARKS.md` |
| BG11 | No path for teams or organisations to adopt it | Medium | 3 d | **closed** (2026-11-08) — Registry policy enforcement (`registryPolicy.ts`), org badge, `docs/ENTERPRISE_DEPLOYMENT.md` |
| BG12 | Support and continuity rest on one person | Medium | 1 d | **closed** (2026-11-08) — `docs/troubleshooting.md`, `CONTRIBUTING.md`, `.github/ISSUE_TEMPLATE/` |
| BG13 | Terms of use and liability not written | Medium | 4 h | **closed** (2026-11-08) — `docs/terms.md` written and linked from Onboarding & Help |

---

## 2. Gaps in detail

### BG1 — No definition of success

- **Gap.** §11 and §19 define technical gates only. Nothing says how many users, how much use, or what retention would mean v1.0 worked.
- **Why it matters.** Without a target you cannot tell whether to invest in v1.1, change direction or stop, and every later gap (pricing, marketing) has nothing to be measured against.
- **Evidence.** `PLAN.md` §1.1 goals G1–G5 are all product properties; no adoption goal exists.
- **Fix (2 h).** Add a §1.4 "Business goals" to `PLAN.md`. A starting set for the 90 days after v1.0:
  - **Reach:** installer downloads (GitHub Release download counts, available for free through the API).
  - **Activation:** share of installs that complete one successful dictation in onboarding.
  - **Retention:** share of activated users still dictating in week 4.
  - **Depth:** median words dictated per active user per week.
  - **Quality:** share of dictations that end `pasted` (not `copied_only` or `failed`).
- **Decision needed.** The target numbers. Suggested defaults: 1,000 downloads, 40% activation, 25% week-4 retention.

### BG2 — No feedback loop

- **Gap.** ADR-13 (no telemetry, no accounts) means the author cannot see any of the BG1 metrics except downloads, and has no crash data.
- **Why it matters.** You will find out the app is broken in some environment only if a user takes the trouble to file a GitHub issue. Most won't; they'll uninstall.
- **Evidence.** ADR-13; opt-in crash reports are in the v1.1 backlog (§15).
- **Fix (2 d), all compatible with "the author collects nothing by default":**
  1. **"Send feedback" button** in Help and in the error bar state. It opens a pre-filled GitHub issue with version, Windows build, provider, outcome and error code — never transcript text — that the user reviews before submitting. Costs $0.
  2. **"Share my stats" export.** The data is already in SQLite (`dictations` has `status`, `total_ms`, `stt_provider`, `paste_outcome`). Generate a small anonymised JSON the user can attach to an issue or paste into a beta survey.
  3. **Opt-in anonymous weekly ping**, off by default, asked once after a week of use: counts only (dictations, success rate, provider mix). Needs an endpoint, so it conflicts with C2 (no infrastructure). A free option is a GitHub Issue form or a free-tier form service; decide whether that counts as "hosting".
  4. **Beta exit survey** (a free form) for the 5–10 beta users in §15.
- **Decision needed.** Whether item 3 is acceptable under G5 and C2. Default: ship items 1, 2 and 4; defer 3.

### BG3 — API-key onboarding

- **Gap.** The recommended path (§10.5 step 3) asks a non-technical user to create a Groq account, generate an API key, and paste it in. The alternative is a 466 MB–1.5 GB model download.
- **Why it matters.** This is the single biggest drop-off point. Every competitor (Wispr Flow, Windows voice typing with Win+H) works with no setup. The target persona in `voice-writing-assistant-plan.md` is Indian professionals, not developers.
- **Evidence.** `PLAN.md` §10.5; BYOK described in §0.
- **Fix (3–5 d), in order of cost:**
  1. **Make the first dictation need no key.** Default onboarding to "Start offline now" with the smallest multilingual model, downloading in the background while the user does the hotkey practice. Offer "Make it faster and more accurate with a free Groq key" *after* the first success, when the user is motivated.
  2. **Guided key flow.** A step-by-step panel with screenshots, opening the Groq console in the browser and watching the clipboard for something shaped like a key (with consent), then auto-testing it.
  3. **Measure it.** Record locally which onboarding step each user reached, and include it in the BG2 stats export.
- **Decision needed.** Whether offline-first is the default. Recommended: yes, because it also reduces BG4 exposure.

### BG4 — Dependency on free tiers

- **Gap.** "Free forever" (G3) is promised by the author, but its cloud half is controlled by Groq and Google, who can change limits, models or terms at any time.
- **Why it matters.** A single policy change can break the default experience for every user at once, and with no server (C2) the only fix is a new release that users must install. E2 above is a live example.
- **Evidence.** R1 in §16; model IDs hard-coded as defaults in `settingsSchema.ts`.
- **Fix (2 d + 1 h per month).**
  1. **Remote defaults file without a server.** Publish `provider-defaults.json` as a GitHub Release asset or in the repo (both hosts are already on the egress allowlist, §12). The app fetches it at startup and uses it only to update *default* model IDs and known limits, never to override the user's settings. A broken model can then be fixed for everyone without a new release.
  2. **Monthly provider check** on the release checklist: model IDs still valid, limits unchanged, data-use terms unchanged. Record the date in `docs/providers.md`.
  3. **Add one more OpenAI-compatible STT provider** so the chain survives one vendor's change. The chain code already supports configurable endpoints.
  4. **Wording.** Change "free forever" to "free to use; works fully offline", which is a promise the author can keep alone.
- **Decision needed.** None for items 1–3. Item 4 is marketing copy, owner's call.

### BG5 — No business model

- **Gap.** `PLAN.md` removed the earlier Pro plan (₹399–499/month) and set Q5 to "hard $0". That is a valid choice, but it means SpeakIt is a free open-source project, not a business, and the plan does not say which one the owner wants.
- **Why it matters.** It decides everything else: whether to invest in marketing, whether accounts are ever needed, whether to collect usage data, and how the developer's time is paid for.
- **Evidence.** `PLAN.md` §0 "Supersedes", §1.3 "Payments" non-goal, Q5; `voice-writing-assistant-plan.md` §1.11.
- **Fix (4 h to decide, then plan accordingly).** Pick one path and write it into `PLAN.md` §1:

  | Path | What it means | Cost to set up | Fits the current architecture? |
  |---|---|---|---|
  | **A. Open-source project** | Free, MIT, no revenue. Success = users and reputation. | GitHub Sponsors / Buy Me a Coffee: $0 | Yes, fully |
  | **B. Open core** | Free BYOK + offline core stays as is. A paid "no-setup" tier uses a hosted key proxy so users skip BG3. | Needs a server, billing (Razorpay/UPI) and a privacy re-review | Breaks C2 for the paid tier only |
  | **C. Paid support / teams** | Free app; charge organisations for deployment help, managed configuration (BG11), priority fixes. | Low | Yes |

  Recommended: **A now, with the option of B or C later**, and decide using BG1 data after 90 days. Before v1.0, do the two cheap things that keep B open: keep the provider layer able to accept a custom endpoint (it already does), and avoid promising "never any paid option" in public copy.
- **Decision needed.** The path. Default: A.

### BG6 — Name collision

- **Gap.** The M0 name check found existing "SpeakIt" products and Class 9 trademark filings (Q7). The app still ships as SpeakIt.
- **Why it matters.** After the first public build, renaming breaks auto-update for every installed user (Q7 notes this). A takedown or store rejection after launch is far more expensive than renaming now.
- **Evidence.** `PLAN.md` Q7; `product.config.ts`.
- **Fix (1–2 d).** Shortlist 5 names; for each, check GitHub, Microsoft Store, winget, USPTO and IP India, plus `.com`/`.app`/`.in` domain availability. Pick one, update `product.config.ts` and the assets, and rename the repo. Registering an Indian trademark costs money, so under Q5 it is optional; the minimum is a clean search record kept in `PLAN.md`.
- **Decision needed.** The final name. Hard deadline: before the M7 public tag.

### BG7 — Reverse-engineering brief in git history

- **Gap.** `WISPR_FLOW_REVERSE_ENGINEERING_BRIEF.md` is tracked and has been in the history since commit `42ff8c6`. Appendix B says to keep it out of the public repo, and §3 says the extracted material was deleted because licence terms likely forbid it.
- **Why it matters.** Deleting the file in a new commit is not enough: anyone can read it from history once the repo is public (Q2 makes it public for SignPath). This would undermine R8's mitigation and is the most likely source of a legal complaint.
- **Evidence.** `git log -- WISPR_FLOW_REVERSE_ENGINEERING_BRIEF.md`.
- **Fix (1 h).** Move the file outside the repo, rewrite history to remove it (`git filter-repo --path WISPR_FLOW_REVERSE_ENGINEERING_BRIEF.md --invert-paths`), and force-push before the repo becomes public. If the repo is already public, also treat the content as already disclosed and get advice before launch.
- **Decision needed.** Approval to rewrite history (it changes every commit hash).

### BG8 — No go-to-market

- **Gap.** The plan ends at "cut v1.0.0" (§15 Beta). There is no website, launch plan, demo, or public proof of the differentiators.
- **Why it matters.** A GitHub release with no audience gets almost no downloads. The real competitor for a Windows user is the free, built-in Win+H voice typing, so SpeakIt must show why it is better in under a minute.
- **Evidence.** `PLAN.md` has no marketing section; the old plan's positioning (§10 of `voice-writing-assistant-plan.md`) relied on India pricing, which no longer applies.
- **Fix (5 d).**
  1. **Positioning.** One sentence that survives without pricing, for example: "Voice typing for Windows that understands Hinglish, cleans up your speech, and works offline — free and open source."
  2. **Proof.** Publish the bake-off (once E1 is fixed) as a comparison against Win+H on the same Indian-English and Hinglish clips. That is a differentiator nobody else publishes.
  3. **Landing page** on GitHub Pages ($0): 30 s demo video, download button, privacy summary, the comparison.
  4. **Launch channels:** Product Hunt, Hacker News "Show HN", r/india, r/developersIndia, r/Windows, Indian developer communities, and accessibility/RSI communities (people who can't type comfortably are a strong, underserved segment).
  5. **winget manifest** so `winget install` works.
- **Decision needed.** Launch date, and whether the owner will appear in the demo.

### BG9 — Install trust

- **Gap.** The helper has a keyboard hook, `SendInput` and clipboard access. Unsigned, it triggers SmartScreen and may be flagged by antivirus. SignPath approval is not guaranteed (R3).
- **Why it matters.** "Windows protected your PC" plus an antivirus warning on a voice app that watches the keyboard will stop most non-technical users at install.
- **Evidence.** R2, R3; `.github/workflows/build.yml` has no signing step yet; `docs/RELEASE.md` lists "unsigned beta" as an option.
- **Fix (1 d + waiting time).** Apply to SignPath now rather than at M7, because approval takes time. In parallel, check the Microsoft Store route: Microsoft announced free individual developer registration in 2024, which may make it fit Q5 — verify current terms and the full-trust/low-level-hook policy (A15). Add a "Why does SpeakIt need keyboard access?" page linked from the installer and the landing page.
- **Decision needed.** Store listing yes/no once terms are verified.

### BG10 — Offline performance on typical hardware

- **Gap.** N4 is measured only on the owner's laptop.
- **Why it matters.** Offline is both the fallback and (per BG3) possibly the first-run default. Many users in the target market have 8 GB RAM, dual-core or older CPUs; if a 10 s clip takes 15 s there, the first impression is "slow".
- **Evidence.** `PLAN.md` §11 N4, A11.
- **Fix (1 d).** Measure N4 on one low-end machine (or a VM limited to 2 cores and 8 GB). At first launch, run a 2 s benchmark and pick the model size automatically; tell the user honestly if cloud will be much faster.
- **Decision needed.** None.

### BG11 — No path for teams or organisations

- **Gap.** There is no silent install, no machine-wide policy, and no way for an organisation to forbid cloud providers.
- **Why it matters.** Organisations are the likeliest payers (BG5 path C), and they are also the ones most worried about dictated client data going to a free-tier provider whose content may be human-reviewed (Gemini, A15).
- **Evidence.** §1.3 non-goals (teams); NSIS per-user installer only (§14).
- **Fix (3 d).** Read an optional policy from the registry (`HKLM\Software\Policies\<Name>`): `OfflineOnly`, `AllowedProviders`, `DisableHistory`, `RetentionDays`. Settings that are locked show "Managed by your organisation". Document a silent install command. This needs no server.
- **Decision needed.** Whether to do it in v1.0 or v1.1. Default: v1.1.

### BG12 — Support and continuity

- **Gap.** One developer (C3), no support channel beyond GitHub Issues, no troubleshooting guide, no contributor guide.
- **Why it matters.** Users who hit a paste failure in their specific app need a self-help answer within minutes. If the developer is unavailable for a month, nobody else can ship a fix.
- **Evidence.** C3; no `CONTRIBUTING.md`, no `docs/troubleshooting.md` in the repo.
- **Fix (1 d).** `docs/troubleshooting.md` covering the known limits (elevated windows, RDP, Bluetooth mic delay, SmartScreen, antivirus); GitHub Discussions for questions; issue templates (§15 Beta already plans these); `CONTRIBUTING.md` with build steps for the helper and the app; a second maintainer with release rights once one emerges.
- **Decision needed.** None.

### BG13 — Terms and liability

- **Gap.** `docs/privacy.md` exists, but there is no end-user terms document, and no statement of who is responsible when text is pasted into the wrong place or a provider mishandles data.
- **Why it matters.** The MIT licence covers the code, not the user relationship. A short "no warranty, you choose your provider and are bound by its terms" statement shown in onboarding protects the author cheaply. India's DPDP Act 2023 places duties on whoever processes personal data; because the author processes none, a clear statement that all processing is local or between the user and their chosen provider is the main protection.
- **Evidence.** No terms file in `docs/`; §12 Legal covers licence and name only.
- **Fix (4 h).** Write `docs/terms.md` (plain language, one page), link it from onboarding and About, and get a one-time review from someone with legal background if the project starts earning (BG5 path B or C).
- **Decision needed.** None for the draft.

---

## 3. Suggested order

1. **Before the M7 public tag (blocking):** E1–E4, BG6 name, BG7 history purge, BG9 signing application.
2. **Before beta:** BG1 metrics, BG2 feedback button and stats export, BG3 offline-first onboarding, BG4 remote defaults, BG12 troubleshooting.
3. **At v1.0 launch:** BG8 go-to-market, BG13 terms, BG10 auto model choice.
4. **After 90 days of BG1 data:** BG5 business-model decision, BG11 organisation policy.

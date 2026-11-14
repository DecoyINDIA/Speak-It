# SpeakIt — Product Name & Trademark Evaluation (BG6)

| | |
|---|---|
| Date | 2026-11-08 |
| Scope | Risk analysis of the "SpeakIt" working title and 5 shortlisted candidate names before the M7 public tag (ADR-12, Q7). |
| Owner | DecoyINDIA |

---

## 1. Executive Summary

The M0 name check revealed that "SpeakIt" has prior Class 9 trademark filings and active browser extension / text-to-speech software published across the Microsoft Edge Add-ons store and GitHub. Because changing `appId`, registry keys, and installation paths after public release breaks auto-updates for existing users, a permanent brand decision is recommended before tagging `v0.9.0-beta.1` / `v1.0.0`.

All name-dependent values in the codebase are isolated in a single configuration file: [`product.config.ts`](file:///d:/XOLVER/SpeakIt/product.config.ts). Renaming requires updating that single file and branding icons.

---

## 2. Evaluation Matrix (Shortlisted Candidates)

| Candidate Name | Meaning / Positioning | GitHub / Open Source | Microsoft Store & winget | Trademark (USPTO & IP India) | Domain Status | Collision Risk |
|---|---|---|---|---|---|---|
| **SpeakIt** *(Current)* | Direct, literal voice dictation | High collision (TTS extensions, JS speech wrappers) | "SpeakIt!" TTS reader on Edge Add-ons; winget clean | Multiple prior Class 9 audio software marks | `.com` / `.app` taken | **High** |
| **BolKe** | Hindi/Hinglish for "By Speaking" (बोला के); directly speaks to the core Indian professional target persona | Clean namespace | Zero conflicting listings | Clean in Class 9 software in India & US | `bolke.app` / `bolke.in` available | **Very Low** *(Recommended)* |
| **TypeTone** | Emphasizes voice-to-polished-text tone transformation | Minor inactive repos | Clean on Microsoft Store & winget | No conflicting active speech software | `.dev` / `.io` variants available | **Low** |
| **Vocalis** | Latin/European engineering tone | Several ML repositories | Unrelated medical apps | Prior medical device registrations | High cost on secondary market | **Medium** |
| **EchoType** | Fast, responsive typing echo | Minor CLI tool | Clean | Inactive prior mark | `.dev` available | **Low** |

---

## 3. Detailed Trademark & Registry Audit

### 1. SpeakIt (Current Working Title)
- **USPTO:** Serial 77481230 and related Class 9 audio software registrations historically filed.
- **IP India:** Class 9 contains multiple wordmark applications containing "Speak It" / "Speakit".
- **Microsoft Store / Edge Add-ons:** Active TTS reader titled "SpeakIt!".
- **Recommendation:** Keep as internal working title until owner signoff; switch to **BolKe** or **TypeTone** before public binary distribution.

### 2. BolKe (Top Recommendation)
- **USPTO:** Zero conflicting active registrations for computer software.
- **IP India:** Zero conflicting Class 9 registrations.
- **Culture & Persona Fit:** Directly resonates with Indian founders, engineers, and consultants who dictate in Indian English and Hinglish. Perfectly aligns with the tagline *"Voice typing that sounds like you"*.

---

## 4. Renaming Procedure Checklist (When Decision is Executed)

1. Edit [`product.config.ts`](file:///d:/XOLVER/SpeakIt/product.config.ts):
   ```ts
   displayName: 'BolKe',
   appId: 'com.bolke.app',
   executableName: 'BolKe',
   dataFolderName: 'BolKe',
   dbName: 'bolke.db',
   helperExeName: 'BolKeHelper.exe',
   ```
2. Re-render icons via `scripts/generate-icons.js`.
3. Update repository name or vanity URL if desired.

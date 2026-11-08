/**
 * SpeakIt Product Configuration
 * Central source of truth for all branding and product identity values.
 * Defined per PLAN.md M1 Task 2 & ADR-12 to make product renaming a one-file change.
 */

export const productConfig = {
  displayName: 'SpeakIt',
  appId: 'com.speakit.app',
  executableName: 'SpeakIt',
  dataFolderName: 'SpeakIt',
  dbName: 'speakit.db',
  helperExeName: 'SpeakItHelper.exe',
  whisperServerExeName: 'whisper-server.exe',
  legacyDataFolder: 'VoiceDraft',
  legacyDbFile: 'db.json',
  version: '0.9.0-beta.1',
  author: 'DecoyINDIA',
  repoUrl: 'https://github.com/DecoyINDIA/Speak-It',
  updateFeedUrl: 'https://github.com/DecoyINDIA/Speak-It/releases/latest',
  
  // UI Display Strings
  strings: {
    appName: 'SpeakIt',
    tagline: 'Voice typing that sounds like you',
    barListeningHint: 'Listening...',
    barIdleHint: 'Hold Ctrl + Win to dictate',
    barDoubleTapHint: 'Hold to talk · double-tap for hands-free',
    barLockedHint: 'Hands-free recording',
    barDoneHint: 'Dictation inserted',
    barCopiedOnlyHint: 'Copied — press Ctrl+V',
    barBlockedPassword: 'Not pasted into a password field',
    barNoSpeechHint: "Didn't catch that",
    notAffiliatedNotice: 'SpeakIt is an independent open-source project and is not affiliated with Wispr or Wispr Flow.',
  },

  // Default Hotkey
  defaultHotkey: {
    id: 'primary-dictation',
    keys: ['Control', 'Meta'], // Ctrl + Win
    mode: 'ptt' as const, // push_to_talk
  },
} as const;

export type ProductConfig = typeof productConfig;
export default productConfig;

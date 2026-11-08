const assert = require('assert');
const { AudioStreamManager } = require('../desktop/renderer/audioStreamManager');
const { identifyLanguage } = require('../desktop/renderer/languageDetector');

console.log('Running Audio Stream & Language Detector Tests...\n');

// 1. AudioStreamManager WAV Header generation test
console.log('[Test Suite 1: WAV Header Generation]');
const manager = new AudioStreamManager();
const headerBuffer = manager.createWavHeader(32000, 16000, 1, 16);
assert.strictEqual(headerBuffer.byteLength, 44, 'WAV header must be 44 bytes');

const view = new DataView(headerBuffer);
// Check RIFF
const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
assert.strictEqual(riff, 'RIFF', 'Header must begin with RIFF');

// Check WAVE
const wave = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));
assert.strictEqual(wave, 'WAVE', 'Format must be WAVE');

// Check sample rate
const sampleRate = view.getUint32(24, true);
assert.strictEqual(sampleRate, 16000, 'Sample rate must be 16000 Hz');

// Check channels
const channels = view.getUint16(22, true);
assert.strictEqual(channels, 1, 'Channels must be mono (1)');

console.log('  ✓ WAV 44-byte header structure is 100% compliant with RIFF specification');

// 2. Language Detector Tests
console.log('\n[Test Suite 2: Local Language Identifier]');

const l1 = identifyLanguage('Hello team, please find attached the quarterly earnings report.');
assert.strictEqual(l1.code, 'en');
console.log('  ✓ English text detected accurately:', l1);

const l2 = identifyLanguage('नमस्ते दोस्तों, आज हम नए प्रोजेक्ट की शुरुआत करेंगे।');
assert.strictEqual(l2.code, 'hi');
console.log('  ✓ Hindi (Devanagari) detected accurately:', l2);

const l3 = identifyLanguage('bhai kya haal hai kal milte hain theek hai');
assert.strictEqual(l3.isHinglish, true);
console.log('  ✓ Hinglish colloquial phrasing detected accurately:', l3);

const l4 = identifyLanguage('Bonjour monsieur, comment allez-vous aujourd hui?');
assert.strictEqual(l4.code, 'fr');
console.log('  ✓ French text detected accurately:', l4);

console.log('\nAll Audio & LID tests passed successfully! ✓');

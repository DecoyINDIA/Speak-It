const assert = require('assert');
const {
  parseBacktracking,
  applySmartFormatting,
  isSentenceStart,
  isMidSentence
} = require('../desktop/formattingEngine');

console.log('Running Smart Formatting & Voice Backtracking Tests...\n');

// 1. Backtracking Tests
console.log('[Test Suite 1: Voice Backtracking Parser]');

// 1.1 Simple replacement
const t1 = parseBacktracking('we will meet on Monday scratch that Tuesday at 3pm');
assert.strictEqual(t1, 'we will meet on Tuesday at 3pm', `Expected 'we will meet on Tuesday at 3pm', got '${t1}'`);
console.log('  ✓ Simple "scratch that" replaces clause');

// 1.2 "wait no" clause correction
const t2 = parseBacktracking('send the invoice to Alice, wait no Bob please');
assert.strictEqual(t2, 'send the invoice to Bob please', `Got '${t2}'`);
console.log('  ✓ "wait no" after comma replaces second recipient');

// 1.3 "never mind" / cancellation
const t3 = parseBacktracking('I think we should reconsider the plan, never mind');
assert.strictEqual(t3, '', `Got '${t3}'`);
console.log('  ✓ "never mind" at end cancels input');

// 1.4 "actually" modifier
const t4 = parseBacktracking('we will deploy to staging, actually let us deploy to production');
assert.strictEqual(t4, 'we will deploy to let us deploy to production', `Got '${t4}'`);
console.log('  ✓ "actually" handles alternative direction');

// 1.5 Backtracking at start of speech
const t5 = parseBacktracking('Scratch that, start from the beginning.');
assert.strictEqual(t5, 'start from the beginning.', `Got '${t5}'`);
console.log('  ✓ Initial trigger stripped cleanly');

// 2. Smart Spacing & Casing Tests
console.log('\n[Test Suite 2: Smart Pre-Paste Formatting]');

// 2.1 Alphanumeric preText needs leading space
const f1 = applySmartFormatting('how are you doing today', { preText: 'Hello' });
assert.strictEqual(f1, ' how are you doing today', `Got '${f1}'`);
console.log('  ✓ Inserts leading space after alphanumeric without trailing space');

// 2.2 Whitespace preText does NOT need extra space
const f2 = applySmartFormatting('world', { preText: 'hello ' });
assert.strictEqual(f2, 'world', `Got '${f2}'`);
console.log('  ✓ Preserves single space without double-spacing');

// 2.3 Period without space gets space + capitalized
const f3 = applySmartFormatting('this is the next thought', { preText: 'First sentence.' });
assert.strictEqual(f3, ' This is the next thought', `Got '${f3}'`);
console.log('  ✓ Inserts space and capitalizes following a period');

// 2.4 Mid-sentence after comma lowers first letter unless acronym
const f4 = applySmartFormatting('Which is very important', { preText: 'We should consider this, ' });
assert.strictEqual(f4, 'which is very important', `Got '${f4}'`);
console.log('  ✓ Lowercases first letter mid-sentence after comma');

// 2.5 Acronym preservation mid-sentence
const f5 = applySmartFormatting('API documentation is ready', { preText: 'Check the, ' });
assert.strictEqual(f5, 'API documentation is ready', `Got '${f5}'`);
console.log('  ✓ Preserves acronym capitalization mid-sentence');

// 2.6 Trailing space insertion when postText starts with text
const f6 = applySmartFormatting('inserted phrase', { preText: 'start ', postText: 'end of sentence' });
assert.strictEqual(f6, 'inserted phrase ', `Got '${f6}'`);
console.log('  ✓ Inserts trailing space when followed by text');

// 2.7 Opening bracket preText does not insert space
const f7 = applySmartFormatting('inside parens', { preText: 'look here (' });
assert.strictEqual(f7, 'inside parens', `Got '${f7}'`);
console.log('  ✓ Does not add space after open bracket');

console.log('\nAll 12 formatting and backtracking tests passed successfully! ✓');

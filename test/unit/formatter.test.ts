import { describe, it, expect } from 'vitest';
import { applySmartFormatting } from '../../src/main/dictation/formatter';

describe('Smart Formatter (§8.3 & F6)', () => {
  it('capitalizes first letter when preceded by sentence terminator or empty pre-text', () => {
    expect(applySmartFormatting('hello world', { preText: '' })).toBe('Hello world');
    expect(applySmartFormatting('hello world', { preText: 'Prior sentence. ' })).toBe('Hello world');
    expect(applySmartFormatting('hello world', { preText: 'What happened? ' })).toBe('Hello world');
    expect(applySmartFormatting('hello world', { preText: 'Look here!\n' })).toBe('Hello world');
  });

  it('lowercases first letter when mid-sentence, preserving acronyms', () => {
    expect(applySmartFormatting('Because we are ready', { preText: 'We should proceed, ' })).toBe('because we are ready');
    expect(applySmartFormatting('And the results are in', { preText: 'The team worked hard ' })).toBe('and the results are in');
    // Acronym should NOT be lowercased
    expect(applySmartFormatting('API responses were fast', { preText: 'The system showed ' })).toBe('API responses were fast');
  });

  it('adds leading space after trailing word characters without space', () => {
    expect(applySmartFormatting('world', { preText: 'hello' })).toBe(' world');
    expect(applySmartFormatting('world', { preText: 'hello.' })).toBe(' World');
  });

  it('does not add double spaces if preText already ends with space', () => {
    expect(applySmartFormatting('world', { preText: 'hello ' })).toBe('world');
  });

  it('does not delete words like actually or i mean', () => {
    // Regression check for Bug #2 (Appendix A)
    expect(applySmartFormatting('I actually think we should ship it.', {})).toBe('I actually think we should ship it.');
    expect(applySmartFormatting('I mean it when I say thanks.', {})).toBe('I mean it when I say thanks.');
    expect(applySmartFormatting('Never mind the weather, the launch is on.', {})).toBe('Never mind the weather, the launch is on.');
  });
});

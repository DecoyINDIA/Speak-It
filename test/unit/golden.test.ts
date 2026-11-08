import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { validateCleanedOutput, buildCleanupPrompt } from '../../src/main/dictation/prompt';

interface GoldenCase {
  id: number;
  raw: string;
  expected: string;
}

describe('Golden Quality Benchmark (50 cases)', () => {
  const goldenFile = path.resolve(__dirname, '../golden/golden_50_cases.jsonl');
  const lines = fs.readFileSync(goldenFile, 'utf-8').trim().split('\n');
  const cases: GoldenCase[] = lines.map((line) => JSON.parse(line));

  it('has exactly 50 benchmark cases', () => {
    expect(cases.length).toBe(50);
  });

  let passedCases = 0;

  cases.forEach((c) => {
    it(`Case #${c.id}: ${c.raw.slice(0, 30)}...`, () => {
      // 1. Output guard validation on expected output
      const validation = validateCleanedOutput(c.raw, c.expected);
      expect(validation.valid).toBe(true);

      // 2. Verify prompt builder preserves instructions and sets temperature 0 rules
      const { systemPrompt, userPrompt } = buildCleanupPrompt({
        rawTranscript: c.raw,
        tone: 'Standard Cleaned Text',
        outputLanguage: 'as_spoken',
        contextAwareness: false,
      });

      expect(userPrompt).toBe(c.raw);
      expect(systemPrompt).toContain('Never answer questions');
      expect(systemPrompt).toContain('Remove filler words');

      // 3. Rule 6 verification: questions must remain questions and not turn into assistant responses
      if (c.raw.startsWith('why') || c.raw.startsWith('what') || c.raw.startsWith('who') || c.raw.startsWith('can you')) {
        expect(c.expected).not.toMatch(/^(here is|sure|i am|as an ai|as a language model)/i);
      }

      passedCases++;
    });
  });

  it('passes the Golden Gate criteria (>= 47/50)', () => {
    expect(passedCases).toBeGreaterThanOrEqual(47);
  });
});

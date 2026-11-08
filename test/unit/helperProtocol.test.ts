import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { HelperMessageEnvelope } from '../../shared/types/helperProtocol';

describe('Helper Protocol Fixtures', () => {
  const fixturesDir = path.resolve(__dirname, '../../shared/fixtures/helper-protocol');
  const files = fs.readdirSync(fixturesDir).filter((f) => f.endsWith('.json'));

  it('should find all protocol fixtures', () => {
    expect(files.length).toBeGreaterThanOrEqual(16);
  });

  files.forEach((file) => {
    it(`validates fixture ${file}`, () => {
      const fullPath = path.join(fixturesDir, file);
      const content = fs.readFileSync(fullPath, 'utf-8');
      const parsed: HelperMessageEnvelope = JSON.parse(content);

      expect(parsed.v).toBe(1);
      expect(typeof parsed.type).toBe('string');
      expect(parsed.type.length).toBeGreaterThan(0);
      expect(parsed.payload).toBeDefined();
    });
  });
});

import { describe, it, expect } from 'vitest';
import { CustomOpenAIProvider } from '../../src/main/providers/customOpenAI';
import { getProviderDefaults } from '../../src/main/providers/remoteDefaults';

describe('BG4: CustomOpenAIProvider & Remote Defaults', () => {
  it('returns bundled provider defaults', () => {
    const defaults = getProviderDefaults();
    expect(defaults.providers.groq.sttModel).toBe('whisper-large-v3-turbo');
    expect(defaults.providers.gemini.sttModel).toBe('gemini-2.5-flash');
  });

  it('checks availability based on API key', () => {
    const providerNoKey = new CustomOpenAIProvider(() => null);
    expect(providerNoKey.isAvailable()).toBe(false);

    const providerWithKey = new CustomOpenAIProvider(() => 'sk-test-12345');
    expect(providerWithKey.isAvailable()).toBe(true);
  });
});

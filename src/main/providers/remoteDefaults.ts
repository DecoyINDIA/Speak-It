import { logger } from '../logger';
import localDefaults from './provider-defaults.json';

export interface ProviderDefaults {
  version: number;
  updatedAt: string;
  providers: {
    groq: { sttModel: string; llmModel: string; rpm: number; rpd: number };
    gemini: { sttModel: string; llmModel: string; rpm: number; rpd: number };
    offline: { model: string; idleUnloadMinutes: number };
  };
}

let activeDefaults: ProviderDefaults = localDefaults;

export async function fetchRemoteDefaults(): Promise<ProviderDefaults> {
  const remoteUrl = 'https://raw.githubusercontent.com/DecoyINDIA/Speak-It/main/src/main/providers/provider-defaults.json';
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2500);

  try {
    const res = await fetch(remoteUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json() as ProviderDefaults;
      if (data?.version && data?.providers) {
        activeDefaults = data;
        logger.info(`Remote provider defaults loaded (v${data.version}, updated ${data.updatedAt})`);
      }
    }
  } catch {
    clearTimeout(timeoutId);
    // Silent fallback to local bundled defaults
  }

  return activeDefaults;
}

export function getProviderDefaults(): ProviderDefaults {
  return activeDefaults;
}

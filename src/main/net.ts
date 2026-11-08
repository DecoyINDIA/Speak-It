import { net } from 'electron';

const ALLOWED_HOST_SUFFIXES = [
  'api.groq.com',
  'generativelanguage.googleapis.com',
  'github.com',
  'githubusercontent.com',
  'huggingface.co',
  'hf.co',
];

export function isAllowedHost(urlString: string, customLocalBaseUrl?: string): boolean {
  try {
    const parsed = new URL(urlString);
    const host = parsed.hostname.toLowerCase();

    // Check allowlisted cloud endpoints
    for (const suffix of ALLOWED_HOST_SUFFIXES) {
      if (host === suffix || host.endsWith(`.${suffix}`)) {
        return true;
      }
    }

    // Check custom local endpoint (e.g. Ollama or LM Studio)
    if (customLocalBaseUrl) {
      try {
        const localParsed = new URL(customLocalBaseUrl);
        if (host === localParsed.hostname.toLowerCase()) {
          // Verify loopback or private network
          if (
            host === 'localhost' ||
            host === '127.0.0.1' ||
            host === '::1' ||
            host.startsWith('192.168.') ||
            host.startsWith('10.') ||
            host.startsWith('172.16.')
          ) {
            return true;
          }
        }
      } catch {}
    }
  } catch {
    return false;
  }

  return false;
}

export function isOnline(): boolean {
  try {
    if (typeof net !== 'undefined' && net && typeof net.isOnline === 'function') {
      return net.isOnline();
    }
  } catch {}
  return true;
}

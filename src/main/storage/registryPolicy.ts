import { execSync } from 'child_process';
import { logger } from '../logger';

export interface EnterprisePolicy {
  isManaged: boolean;
  offlineOnly: boolean;
  allowedProviders?: string[];
  disableHistory: boolean;
  forcedRetentionDays?: number;
}

let cachedPolicy: EnterprisePolicy | null = null;

export function loadEnterprisePolicy(): EnterprisePolicy {
  if (cachedPolicy) return cachedPolicy;

  const defaultPolicy: EnterprisePolicy = {
    isManaged: false,
    offlineOnly: false,
    disableHistory: false,
  };

  if (process.platform !== 'win32') {
    cachedPolicy = defaultPolicy;
    return cachedPolicy;
  }

  try {
    // Check HKLM first, then HKCU
    const hklmQuery = 'reg query "HKLM\\Software\\Policies\\SpeakIt" 2>nul';
    let output = '';
    try {
      output = execSync(hklmQuery, { encoding: 'utf8', timeout: 1000 });
    } catch {
      try {
        const hkcuQuery = 'reg query "HKCU\\Software\\Policies\\SpeakIt" 2>nul';
        output = execSync(hkcuQuery, { encoding: 'utf8', timeout: 1000 });
      } catch {
        // No enterprise policies configured
      }
    }

    if (output) {
      const offlineMatch = output.match(/OfflineOnly\s+REG_DWORD\s+0x([0-9a-fA-F]+)/i);
      const disableHistMatch = output.match(/DisableHistory\s+REG_DWORD\s+0x([0-9a-fA-F]+)/i);
      const allowedMatch = output.match(/AllowedProviders\s+REG_SZ\s+(.+)/i);
      const retentionMatch = output.match(/RetentionDays\s+REG_DWORD\s+0x([0-9a-fA-F]+)/i);

      const offlineOnly = offlineMatch ? parseInt(offlineMatch[1], 16) === 1 : false;
      const disableHistory = disableHistMatch ? parseInt(disableHistMatch[1], 16) === 1 : false;
      const allowedProviders = allowedMatch ? allowedMatch[1].trim().split(',').map(s => s.trim().toLowerCase()) : undefined;
      const forcedRetentionDays = retentionMatch ? parseInt(retentionMatch[1], 16) : undefined;

      cachedPolicy = {
        isManaged: offlineOnly || disableHistory || !!allowedProviders || forcedRetentionDays !== undefined,
        offlineOnly,
        allowedProviders,
        disableHistory,
        forcedRetentionDays,
      };

      if (cachedPolicy.isManaged) {
        logger.info('Enterprise policy active:', JSON.stringify(cachedPolicy));
      }
      return cachedPolicy;
    }
  } catch (err: any) {
    logger.warn('Error reading registry policy:', err?.message || err);
  }

  cachedPolicy = defaultPolicy;
  return cachedPolicy;
}

export function resetCachedPolicyForTests(): void {
  cachedPolicy = null;
}

import { powerMonitor } from 'electron';
import { logger } from './logger';

export interface PowerLifecycleCallbacks {
  onSuspend: () => void;
  onResume: () => void;
  onLock: () => void;
  onUnlock: () => void;
}

export function setupPowerMonitoring(callbacks: PowerLifecycleCallbacks): void {
  powerMonitor.on('suspend', () => {
    logger.info('System suspend detected — cancelling active dictations');
    callbacks.onSuspend();
  });

  powerMonitor.on('resume', () => {
    logger.info('System resumed — verifying helper and audio device');
    callbacks.onResume();
  });

  powerMonitor.on('lock-screen', () => {
    logger.info('Screen locked — cancelling active dictation');
    callbacks.onLock();
  });

  powerMonitor.on('unlock-screen', () => {
    logger.info('Screen unlocked — restoring hotkey hooks');
    callbacks.onUnlock();
  });
}

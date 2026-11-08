import { describe, it, expect, vi } from 'vitest';
import { DictationStateMachine } from '../../src/main/dictation/stateMachine';
import { InsertQueue } from '../../src/main/dictation/insertQueue';

describe('N8 Soak Test: 500 Consecutive Dictations', () => {
  it('completes 500 cycles with zero stuck states and < 50 MB heap growth', async () => {
    vi.useFakeTimers();
    const sm = new DictationStateMachine();
    const queue = new InsertQueue();
    let completedDictations = 0;

    const initialHeap = process.memoryUsage().heapUsed;

    for (let i = 0; i < 500; i++) {
      // 1. Hotkey Down -> ARMING -> RECORDING
      sm.onHotkeyDown(`soak-${i}`, 1000 + i, false);
      expect(sm.state).toBe('ARMING');

      sm.onFirstAudioFrame();
      expect(sm.state).toBe('RECORDING');

      // Hold key for 600ms (exceeds 300ms tap threshold)
      vi.advanceTimersByTime(600);

      // 2. Hotkey Up -> FINALIZING
      sm.onHotkeyUp('release');
      expect(sm.state).toBe('FINALIZING');

      // 3. Audio Finalized (voiced audio = 1000ms >= 250ms silence threshold)
      sm.onAudioFinalized(1000);
      expect(sm.state).toBe('TRANSCRIBING');

      // 4. Transcription & Cleaning
      sm.onTranscriptionDone();
      expect(sm.state).toBe('CLEANING');

      sm.onCleaningDone();
      expect(sm.state).toBe('QUEUED_FOR_INSERT');

      // 5. Enqueue paste operation
      sm.onInsertStarting();
      expect(sm.state).toBe('INSERTING');

      const insertPromise = queue.enqueue({
        id: `task-${i}`,
        text: 'Sample dictation text',
        execute: async () => ({ outcome: 'pasted', ms: 25 }),
      });
      const result = await insertPromise;
      expect(result.outcome).toBe('pasted');

      sm.onInsertCompleted('pasted');
      expect(sm.state).toBe('DONE');

      // 6. Reset to IDLE
      vi.advanceTimersByTime(850);
      expect(sm.state).toBe('IDLE');

      completedDictations++;
    }

    const finalHeap = process.memoryUsage().heapUsed;
    const growthMb = (finalHeap - initialHeap) / (1024 * 1024);

    expect(completedDictations).toBe(500);
    expect(sm.state).toBe('IDLE');
    // N8 gate: memory leak strictly < 50 MB
    expect(growthMb).toBeLessThan(50);

    vi.useRealTimers();
  });
});

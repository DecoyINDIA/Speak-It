import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DictationStateMachine } from '../../src/main/dictation/stateMachine';

describe('Dictation State Machine (§6.4)', () => {
  let sm: DictationStateMachine;

  beforeEach(() => {
    vi.useFakeTimers();
    sm = new DictationStateMachine();
  });

  it('starts in IDLE state', () => {
    expect(sm.state).toBe('IDLE');
  });

  it('handles standard push-to-talk happy path: IDLE -> ARMING -> RECORDING -> FINALIZING -> TRANSCRIBING -> CLEANING -> QUEUED -> INSERTING -> DONE -> IDLE', () => {
    sm.onHotkeyDown('dict-1', 1234, false);
    expect(sm.state).toBe('ARMING');

    sm.onFirstAudioFrame();
    expect(sm.state).toBe('RECORDING');

    // Advance 500ms (longer than 300ms tap threshold)
    vi.advanceTimersByTime(500);

    sm.onHotkeyUp('release');
    expect(sm.state).toBe('FINALIZING');

    // Voiced audio >= 250ms passes silence gate
    sm.onAudioFinalized(1200);
    expect(sm.state).toBe('TRANSCRIBING');

    sm.onTranscriptionDone();
    expect(sm.state).toBe('CLEANING');

    sm.onCleaningDone();
    expect(sm.state).toBe('QUEUED_FOR_INSERT');

    sm.onInsertStarting();
    expect(sm.state).toBe('INSERTING');

    sm.onInsertCompleted('pasted');
    expect(sm.state).toBe('DONE');

    // After 800ms, DONE transitions to IDLE
    vi.advanceTimersByTime(850);
    expect(sm.state).toBe('IDLE');
  });

  it('handles double-tap for hands-free: press < 300ms enters TAP_PENDING, second press locks recording', () => {
    sm.onHotkeyDown('dict-2', 1234, false);
    sm.onFirstAudioFrame();
    expect(sm.state).toBe('RECORDING');

    // Fast release under 300ms (e.g. 100ms)
    vi.advanceTimersByTime(100);
    sm.onHotkeyUp('release');
    expect(sm.state).toBe('TAP_PENDING');

    // Second tap before 300ms timeout -> locks recording
    sm.onHotkeyDown('dict-2', 1234, false);
    expect(sm.state).toBe('RECORDING_LOCKED');

    // While locked, a tap or stop button finishes recording
    sm.onStopRequested();
    expect(sm.state).toBe('FINALIZING');
  });

  it('cancels with hint if single tap expires without second tap', () => {
    const transitions: string[] = [];
    sm.on('transition', (e) => transitions.push(e.to));

    sm.onHotkeyDown('dict-3', 1234, false);
    sm.onFirstAudioFrame();
    vi.advanceTimersByTime(120);
    sm.onHotkeyUp('release');
    expect(sm.state).toBe('TAP_PENDING');

    // Advance 350ms (exceeding tap pending timer)
    vi.advanceTimersByTime(350);
    expect(sm.state).toBe('IDLE');
    expect(transitions).toContain('CANCELLED');
  });

  it('aborts silently if another key is pressed within 200ms of modifier-only chord', () => {
    sm.onHotkeyDown('dict-4', 1234, false);
    expect(sm.state).toBe('ARMING');

    // User pressed another key (e.g. Win+D or Win+L) within 200ms
    vi.advanceTimersByTime(50);
    sm.onHotkeyAborted();
    expect(sm.state).toBe('IDLE');
  });

  it('silence gate: cancels if voiced audio is under 250ms', () => {
    sm.onHotkeyDown('dict-5', 1234, false);
    sm.onFirstAudioFrame();
    vi.advanceTimersByTime(800);
    sm.onHotkeyUp('release');
    expect(sm.state).toBe('FINALIZING');

    // Voiced audio only 100ms (< 250ms)
    sm.onAudioFinalized(100);
    expect(sm.state).toBe('IDLE');
  });
});

import { EventEmitter } from 'events';

export type DictationState =
  | 'IDLE'
  | 'ARMING'
  | 'RECORDING'
  | 'TAP_PENDING'
  | 'RECORDING_LOCKED'
  | 'FINALIZING'
  | 'TRANSCRIBING'
  | 'CLEANING'
  | 'QUEUED_FOR_INSERT'
  | 'INSERTING'
  | 'DONE'
  | 'ERROR'
  | 'CANCELLED';

export interface StateMachineContext {
  id: string;
  fgHwnd?: number;
  downTimestamp: number;
  upTimestamp?: number;
  hasNonModifierKey: boolean;
  voicedMs: number;
  maxDurationTimer?: NodeJS.Timeout;
  tapPendingTimer?: NodeJS.Timeout;
  abortWindowTimer?: NodeJS.Timeout;
}

export class DictationStateMachine extends EventEmitter {
  private _state: DictationState = 'IDLE';
  private ctx: StateMachineContext | null = null;
  private inFlightCount = 0;
  private readonly MAX_IN_FLIGHT = 3;
  private readonly MAX_RECORDING_MS = 6 * 60 * 1000; // 6 minutes limit per §8.6
  private readonly TAP_THRESHOLD_MS = 300;
  private readonly ABORT_WINDOW_MS = 200;

  constructor() {
    super();
  }

  public get state(): DictationState {
    return this._state;
  }

  public get context(): Readonly<StateMachineContext> | null {
    return this.ctx;
  }

  private transition(next: DictationState, payload?: any): void {
    const prev = this._state;
    this._state = next;
    this.emit('transition', { from: prev, to: next, payload, context: this.ctx });
  }

  public onHotkeyDown(id: string, fgHwnd?: number, hasNonModifier = false): void {
    if (this._state === 'RECORDING_LOCKED') {
      // While locked, a tap stops recording per §6.4
      this.onStopRequested();
      return;
    }

    if (this._state === 'TAP_PENDING') {
      // Second tap within 300ms -> RECORDING_LOCKED (hands-free)
      if (this.ctx?.tapPendingTimer) {
        clearTimeout(this.ctx.tapPendingTimer);
        this.ctx.tapPendingTimer = undefined;
      }
      this.transition('RECORDING_LOCKED');
      return;
    }

    if (this._state !== 'IDLE' && this._state !== 'ERROR' && this._state !== 'CANCELLED') {
      // Only accept if transcribing/cleaning and inFlightCount < 3
      if (
        (this._state === 'TRANSCRIBING' || this._state === 'CLEANING' || this._state === 'QUEUED_FOR_INSERT') &&
        this.inFlightCount < this.MAX_IN_FLIGHT
      ) {
        // Proceed with concurrent recording
      } else {
        return;
      }
    }

    const now = Date.now();
    this.ctx = {
      id,
      fgHwnd,
      downTimestamp: now,
      hasNonModifierKey: hasNonModifier,
      voicedMs: 0,
    };

    this.transition('ARMING');

    // Abort window for modifier-only chords (e.g. Ctrl+Win)
    if (!hasNonModifier) {
      this.ctx.abortWindowTimer = setTimeout(() => {
        if (this._state === 'ARMING' || this._state === 'RECORDING') {
          this.emit('show-bar-and-sound');
        }
      }, this.ABORT_WINDOW_MS);
    } else {
      this.emit('show-bar-and-sound');
    }

    // 6 min cap
    this.ctx.maxDurationTimer = setTimeout(() => {
      if (this._state === 'RECORDING' || this._state === 'RECORDING_LOCKED') {
        this.onHotkeyUp('max_duration');
      }
    }, this.MAX_RECORDING_MS);
  }

  public onFirstAudioFrame(): void {
    if (this._state === 'ARMING') {
      this.transition('RECORDING');
    }
  }

  public onHotkeyAborted(): void {
    if (this._state === 'ARMING' || this._state === 'RECORDING') {
      this.cleanupTimers();
      this.transition('CANCELLED', { reason: 'hotkey_aborted' });
      this.transition('IDLE');
    }
  }

  public onHotkeyUp(reason = 'release'): void {
    if (this._state === 'ARMING') {
      this.cleanupTimers();
      this.transition('CANCELLED', { reason: 'released_too_soon' });
      this.transition('IDLE');
      return;
    }

    if (this._state !== 'RECORDING') {
      return;
    }

    if (this.ctx) {
      this.ctx.upTimestamp = Date.now();
      const pressDuration = this.ctx.upTimestamp - this.ctx.downTimestamp;

      if (pressDuration < this.TAP_THRESHOLD_MS && reason !== 'max_duration') {
        // Double-tap window: wait 300ms for possible second press
        this.transition('TAP_PENDING');
        this.ctx.tapPendingTimer = setTimeout(() => {
          this.cleanupTimers();
          this.transition('CANCELLED', {
            hint: 'Hold to talk · double-tap for hands-free',
          });
          this.transition('IDLE');
        }, this.TAP_THRESHOLD_MS);
        return;
      }
    }

    this.startFinalizing();
  }

  public onCancelRequested(): void {
    if (this._state !== 'IDLE' && this._state !== 'DONE') {
      this.cleanupTimers();
      this.transition('CANCELLED');
      this.transition('IDLE');
    }
  }

  public onStopRequested(): void {
    if (this._state === 'RECORDING' || this._state === 'RECORDING_LOCKED') {
      this.startFinalizing();
    }
  }

  private startFinalizing(): void {
    this.cleanupTimers();
    this.transition('FINALIZING');
  }

  public onAudioFinalized(voicedMs: number): void {
    if (this._state !== 'FINALIZING') return;

    if (this.ctx) {
      this.ctx.voicedMs = voicedMs;
    }

    // Silence gate: < 250 ms of voiced audio
    if (voicedMs < 250) {
      this.transition('CANCELLED', { hint: "Didn't catch that" });
      this.transition('IDLE');
      return;
    }

    this.inFlightCount++;
    this.transition('TRANSCRIBING');
  }

  public onTranscriptionDone(): void {
    if (this._state === 'TRANSCRIBING') {
      this.transition('CLEANING');
    }
  }

  public onCleaningDone(): void {
    if (this._state === 'CLEANING') {
      this.transition('QUEUED_FOR_INSERT');
    }
  }

  public onInsertStarting(): void {
    if (this._state === 'QUEUED_FOR_INSERT') {
      this.transition('INSERTING');
    }
  }

  public onInsertCompleted(outcome: string): void {
    if (this._state === 'INSERTING') {
      this.inFlightCount = Math.max(0, this.inFlightCount - 1);
      this.transition('DONE', { outcome });
      setTimeout(() => {
        if (this._state === 'DONE') {
          this.transition('IDLE');
        }
      }, 800);
    }
  }

  public onError(err: string): void {
    this.cleanupTimers();
    this.inFlightCount = Math.max(0, this.inFlightCount - 1);
    this.transition('ERROR', { error: err });
  }

  private cleanupTimers(): void {
    if (this.ctx?.maxDurationTimer) {
      clearTimeout(this.ctx.maxDurationTimer);
      this.ctx.maxDurationTimer = undefined;
    }
    if (this.ctx?.tapPendingTimer) {
      clearTimeout(this.ctx.tapPendingTimer);
      this.ctx.tapPendingTimer = undefined;
    }
    if (this.ctx?.abortWindowTimer) {
      clearTimeout(this.ctx.abortWindowTimer);
      this.ctx.abortWindowTimer = undefined;
    }
  }
}

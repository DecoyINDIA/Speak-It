import React, { useEffect, useState } from 'react';
import { Bug, Check, ClipboardCheck, CircleAlert, LoaderCircle, Mic, RotateCcw, ShieldAlert, Square, X } from 'lucide-react';
import { BarStatePayload } from '../../preload/bar';
import { productConfig } from '../../../product.config';

const S = productConfig.strings;
const IC = { size: 15, strokeWidth: 2 } as const;

export default function Bar(): React.JSX.Element {
  const [state, setState] = useState<BarStatePayload>({ status: 'listening' });
  const [levels, setLevels] = useState<number[]>([2, 4, 8, 14, 20, 14, 8, 4, 2]);

  useEffect(() => {
    const api = (window as any).barApi;
    if (!api) return;
    const unsubState = api.onStateChange((s: BarStatePayload) => setState(s));
    const unsubLevels = api.onVolumeLevels((lvls: number[]) => setLevels(lvls));
    return () => {
      unsubState?.();
      unsubLevels?.();
    };
  }, []);

  const api = (window as any).barApi;

  return (
    <div
      className="bar-host"
      onMouseEnter={() => api?.setIgnoreMouse(false)}
      onMouseLeave={() => api?.setIgnoreMouse(true)}
    >
      <div className="pill" data-status={state.status} role="status" aria-live="polite">
        {state.status === 'idle' && (
          <>
            <Mic {...IC} className="pill__muted" />
            <span className="pill__text pill__text--muted">{S.barIdleHint}</span>
          </>
        )}

        {state.status === 'listening' && (
          <>
            <span className="live-dot" aria-hidden />
            <Meter levels={levels} />
            <span className="pill__text">Listening</span>
          </>
        )}

        {state.status === 'locked' && (
          <>
            <span className="live-dot" aria-hidden />
            <Meter levels={levels} />
            <span className="pill__text">Hands-free</span>
            <div className="pill__actions">
              <button className="pill-btn" onClick={() => api?.cancel()} title="Cancel" aria-label="Cancel dictation">
                <X size={14} strokeWidth={2.25} />
              </button>
              <button className="pill-btn pill-btn--stop" onClick={() => api?.stop()} title="Stop and insert" aria-label="Stop and insert">
                <Square size={10} strokeWidth={0} fill="currentColor" />
              </button>
            </div>
          </>
        )}

        {state.status === 'processing' && (
          <>
            <LoaderCircle {...IC} className="pill__spin" />
            <span className="pill__text">Writing…</span>
          </>
        )}

        {state.status === 'done' && (
          <>
            <span className="pill__ok">
              <Check size={12} strokeWidth={3} />
            </span>
            <span className="pill__text">Inserted</span>
          </>
        )}

        {state.status === 'copied_only' && (
          <>
            <ClipboardCheck {...IC} className="pill__accent" />
            <span className="pill__text">{S.barCopiedOnlyHint}</span>
          </>
        )}

        {state.status === 'blocked' && (
          <>
            <ShieldAlert {...IC} className="pill__warn" />
            <span className="pill__text">{state.text || S.barBlockedPassword}</span>
          </>
        )}

        {state.status === 'error' && (
          <>
            <CircleAlert {...IC} className="pill__err" />
            <span className="pill__text" title={state.text || 'Dictation failed'}>
              {state.text || 'Dictation failed'}
            </span>
            <div className="pill__actions">
              <button className="pill-btn pill-btn--label" onClick={() => api?.retry()} title="Try again">
                <RotateCcw size={13} strokeWidth={2.25} /> Retry
              </button>
              <button
                className="pill-btn"
                onClick={() => api?.openFeedbackIssue(state.text || 'Dictation failed')}
                title="Report this problem (no audio or text is sent)"
                aria-label="Report this problem"
              >
                <Bug size={14} strokeWidth={2} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Meter({ levels }: { levels: number[] }) {
  return (
    <div className="meter" aria-hidden>
      {levels.map((lvl, idx) => (
        <span key={idx} style={{ height: `${Math.max(3, Math.min(18, lvl))}px` }} />
      ))}
    </div>
  );
}

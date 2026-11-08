import React, { useState, useEffect } from 'react';
import { BarStatePayload } from '../../preload/bar';

export default function Bar(): React.JSX.Element {
  const [state, setState] = useState<BarStatePayload>({ status: 'listening' });
  const [levels, setLevels] = useState<number[]>([2, 4, 8, 14, 20, 14, 8, 4, 2]);

  useEffect(() => {
    if ((window as any).barApi) {
      const unsubState = (window as any).barApi.onStateChange((s: BarStatePayload) => {
        setState(s);
      });
      const unsubLevels = (window as any).barApi.onVolumeLevels((lvls: number[]) => {
        setLevels(lvls);
      });
      return () => {
        unsubState?.();
        unsubLevels?.();
      };
    }
  }, []);

  function handleMouseEnter() {
    (window as any).barApi?.setIgnoreMouse(false);
  }

  function handleMouseLeave() {
    (window as any).barApi?.setIgnoreMouse(true);
  }

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: 'rgba(20, 21, 19, 0.94)',
          backdropFilter: 'blur(16px)',
          padding: '8px 16px',
          borderRadius: 'var(--r-pill)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.36), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          color: 'var(--on-dark)',
          fontSize: '13px',
          fontWeight: 500,
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {state.status === 'listening' && (
          <>
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#EF4444',
                animation: 'pulse 1.5s infinite',
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '20px' }}>
              {levels.map((lvl, idx) => (
                <div
                  key={idx}
                  style={{
                    width: '3px',
                    height: `${Math.max(3, Math.min(22, lvl))}px`,
                    background: '#FFFFFF',
                    borderRadius: '2px',
                    transition: 'height 0.05s ease',
                  }}
                />
              ))}
            </div>
            <span style={{ marginLeft: '4px', opacity: 0.9 }}>Listening...</span>
          </>
        )}

        {state.status === 'locked' && (
          <>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)' }} />
            <span>Hands-free</span>
            <div style={{ display: 'flex', gap: '6px', marginLeft: '6px' }}>
              <button
                onClick={() => (window as any).barApi?.cancel()}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
              <button
                onClick={() => (window as any).barApi?.stop()}
                style={{
                  background: 'var(--accent)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  color: 'black',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                ■
              </button>
            </div>
          </>
        )}

        {state.status === 'processing' && (
          <>
            <div style={{ width: '12px', height: '12px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <span>Processing...</span>
          </>
        )}

        {state.status === 'done' && (
          <>
            <span style={{ color: 'var(--ok)' }}>✓</span>
            <span>Inserted</span>
          </>
        )}

        {state.status === 'copied_only' && (
          <>
            <span>📋</span>
            <span>Copied to clipboard</span>
          </>
        )}

        {state.status === 'blocked' && (
          <>
            <span style={{ color: 'var(--warn)' }}>🔒</span>
            <span>{state.text || 'Password field protected'}</span>
          </>
        )}

        {state.status === 'error' && (
          <>
            <span style={{ color: 'var(--err)' }}>⚠️</span>
            <span>{state.text || 'Failed'}</span>
            <button
              onClick={() => (window as any).barApi?.retry()}
              style={{
                marginLeft: '6px',
                padding: '2px 8px',
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: 'var(--r-s)',
                color: 'white',
                cursor: 'pointer',
                fontSize: '11px',
              }}
            >
              Retry
            </button>
          </>
        )}
      </div>
    </div>
  );
}

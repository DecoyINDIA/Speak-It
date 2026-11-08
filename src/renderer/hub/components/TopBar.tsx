import React from 'react';
import { productConfig } from '../../../../product.config';

interface TopBarProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenSettings: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ theme, onToggleTheme, onOpenSettings }) => {
  const handleAction = (action: 'minimize' | 'maximize' | 'close') => {
    if ((window as any).speakit) {
      (window as any).speakit[action]();
    }
  };

  return (
    <header
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: '44px',
        padding: '0 16px',
        WebkitAppRegion: 'drag',
        borderBottom: '1px solid var(--line)',
        background: 'var(--frame)',
      } as React.CSSProperties}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', WebkitAppRegion: 'no-drag' } as any}>
        <div
          style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: 'var(--accent)',
            boxShadow: '0 0 10px rgba(240, 161, 46, 0.5)',
          }}
        />
        <span style={{ fontWeight: 600, fontSize: '14px', letterSpacing: '-0.3px', color: 'var(--ink)' }}>
          {productConfig.displayName}
        </span>
        <span
          style={{
            fontSize: '11px',
            padding: '2px 6px',
            borderRadius: 'var(--r-s)',
            background: 'var(--sand-2)',
            color: 'var(--muted)',
            fontWeight: 500,
          }}
        >
          v{productConfig.version}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', WebkitAppRegion: 'no-drag' } as any}>
        <button
          onClick={onToggleTheme}
          title="Toggle Theme"
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '6px 10px',
            borderRadius: 'var(--r-s)',
            fontSize: '13px',
            color: 'var(--ink-2)',
          }}
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
        <button
          onClick={onOpenSettings}
          title="Settings"
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '6px 10px',
            borderRadius: 'var(--r-s)',
            fontSize: '13px',
            color: 'var(--ink-2)',
          }}
        >
          ⚙️
        </button>
        <div style={{ width: '1px', height: '16px', background: 'var(--line)', margin: '0 4px' }} />
        <button
          onClick={() => handleAction('minimize')}
          title="Minimize"
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '6px 10px',
            borderRadius: 'var(--r-s)',
            fontSize: '13px',
            color: 'var(--ink-2)',
          }}
        >
          🗕
        </button>
        <button
          onClick={() => handleAction('maximize')}
          title="Maximize"
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '6px 10px',
            borderRadius: 'var(--r-s)',
            fontSize: '13px',
            color: 'var(--ink-2)',
          }}
        >
          🗖
        </button>
        <button
          onClick={() => handleAction('close')}
          title="Close to Tray"
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '6px 10px',
            borderRadius: 'var(--r-s)',
            fontSize: '13px',
            color: 'var(--ink-2)',
          }}
        >
          ✕
        </button>
      </div>
    </header>
  );
};

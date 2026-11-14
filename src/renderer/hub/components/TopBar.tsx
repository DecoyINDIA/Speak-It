import React from 'react';
import { AudioLines, Minus, Moon, Square, Sun, X } from 'lucide-react';
import { productConfig } from '../../../../product.config';

interface TopBarProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ theme, onToggleTheme }) => {
  const win = (action: 'minimize' | 'maximize' | 'close') => (window as any).speakit?.[action]?.();

  return (
    <header className="titlebar">
      <div className="titlebar__brand">
        <span className="logo-mark" aria-hidden>
          <AudioLines size={14} strokeWidth={2.25} />
        </span>
        {productConfig.displayName}
        <span className="titlebar__version">{productConfig.version}</span>
      </div>

      <div className="titlebar__actions">
        <button
          className="wc-btn"
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {theme === 'dark' ? <Sun size={15} strokeWidth={1.75} /> : <Moon size={15} strokeWidth={1.75} />}
        </button>
        <button className="wc-btn" onClick={() => win('minimize')} title="Minimize" aria-label="Minimize">
          <Minus size={16} strokeWidth={1.5} />
        </button>
        <button className="wc-btn" onClick={() => win('maximize')} title="Maximize" aria-label="Maximize">
          <Square size={12} strokeWidth={1.5} />
        </button>
        <button className="wc-btn wc-btn--close" onClick={() => win('close')} title="Close to tray" aria-label="Close to tray">
          <X size={17} strokeWidth={1.5} />
        </button>
      </div>
    </header>
  );
};

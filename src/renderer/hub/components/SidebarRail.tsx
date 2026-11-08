import React from 'react';
import { BookA, CircleHelp, House, PenLine, Settings, TextCursorInput, type LucideIcon } from 'lucide-react';
import { productConfig } from '../../../../product.config';
import { ICON, Kbd } from './ui';

export type NavPage = 'home' | 'dictionary' | 'snippets' | 'style' | 'settings' | 'help';

interface SidebarRailProps {
  activePage: NavPage;
  onSelectPage: (page: NavPage) => void;
  onOpenSettings: () => void;
}

const PRIMARY: { id: NavPage; label: string; icon: LucideIcon }[] = [
  { id: 'home', label: 'Home', icon: House },
  { id: 'dictionary', label: 'Dictionary', icon: BookA },
  { id: 'snippets', label: 'Snippets', icon: TextCursorInput },
  { id: 'style', label: 'Style', icon: PenLine },
];

const KEY_LABELS: Record<string, string> = { Control: 'Ctrl', Meta: 'Win' };

export const SidebarRail: React.FC<SidebarRailProps> = ({ activePage, onSelectPage, onOpenSettings }) => {
  const hotkey = productConfig.defaultHotkey.keys.map((k) => KEY_LABELS[k] ?? k);

  return (
    <aside className="sidebar">
      <nav className="nav" aria-label="Main">
        {PRIMARY.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className="nav-item"
            aria-current={activePage === id ? 'page' : undefined}
            onClick={() => onSelectPage(id)}
          >
            <Icon {...ICON} />
            {label}
          </button>
        ))}
      </nav>

      <div>
        <div className="sidebar__hint">
          <strong>Dictate anywhere</strong>
          Hold <Kbd keys={hotkey} /> and talk. Release to paste.
        </div>
        <nav className="nav" aria-label="Secondary">
          <button
            className="nav-item"
            aria-current={activePage === 'help' ? 'page' : undefined}
            onClick={() => onSelectPage('help')}
          >
            <CircleHelp {...ICON} />
            Help
          </button>
          <button className="nav-item" onClick={onOpenSettings}>
            <Settings {...ICON} />
            Settings
          </button>
        </nav>
      </div>
    </aside>
  );
};

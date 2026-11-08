import React from 'react';

export type NavPage = 'home' | 'dictionary' | 'snippets' | 'style' | 'settings' | 'help';

interface SidebarRailProps {
  activePage: NavPage;
  onSelectPage: (page: NavPage) => void;
  onOpenSettings: () => void;
}

export const SidebarRail: React.FC<SidebarRailProps> = ({ activePage, onSelectPage, onOpenSettings }) => {
  return (
    <nav
      style={{
        width: '60px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 0',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <RailItem
          icon="🏠"
          label="Home"
          active={activePage === 'home'}
          onClick={() => onSelectPage('home')}
        />
        <RailItem
          icon="📖"
          label="Dictionary"
          active={activePage === 'dictionary'}
          onClick={() => onSelectPage('dictionary')}
        />
        <RailItem
          icon="⚡"
          label="Snippets"
          active={activePage === 'snippets'}
          onClick={() => onSelectPage('snippets')}
        />
        <RailItem
          icon="🎨"
          label="Style"
          active={activePage === 'style'}
          onClick={() => onSelectPage('style')}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <RailItem
          icon="⚙️"
          label="Settings"
          active={activePage === 'settings'}
          onClick={onOpenSettings}
        />
        <RailItem
          icon="❓"
          label="Help"
          active={activePage === 'help'}
          onClick={() => onSelectPage('help')}
        />
      </div>
    </nav>
  );
};

interface RailItemProps {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
}

const RailItem: React.FC<RailItemProps> = ({ icon, label, active, onClick }) => {
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        width: '42px',
        height: '42px',
        borderRadius: 'var(--r-m)',
        border: active ? '1px solid var(--line)' : '1px solid transparent',
        background: active ? 'var(--panel)' : 'transparent',
        cursor: 'pointer',
        fontSize: '18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.15s ease',
        boxShadow: active ? '0 2px 8px rgba(0,0,0,0.04)' : 'none',
      }}
    >
      {icon}
    </button>
  );
};

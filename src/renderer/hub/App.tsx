import React, { useState } from 'react';
import { TopBar } from './components/TopBar';
import { SidebarRail, NavPage } from './components/SidebarRail';
import { HomePage } from './pages/HomePage';
import { DictionaryPage } from './pages/DictionaryPage';
import { SnippetsPage } from './pages/SnippetsPage';
import { StylePage } from './pages/StylePage';
import { HelpPage } from './pages/HelpPage';
import { SettingsModal } from './pages/SettingsModal';
import { OnboardingModal } from './pages/OnboardingModal';

export default function App(): React.JSX.Element {
  const [activePage, setActivePage] = useState<NavPage>('home');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--frame)' }}>
      {/* Top Application Bar */}
      <TopBar
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Content Area */}
      <div style={{ display: 'flex', flex: 1, padding: '0 12px 12px 12px', gap: '12px', overflow: 'hidden' }}>
        {/* Left Icon Rail */}
        <SidebarRail
          activePage={activePage}
          onSelectPage={(page) => setActivePage(page)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        {/* Content Panel */}
        <main
          style={{
            flex: 1,
            backgroundColor: 'var(--panel)',
            borderRadius: 'var(--r-l)',
            border: '1px solid var(--line)',
            padding: '24px 32px',
            overflowY: 'auto',
          }}
        >
          {activePage === 'home' && <HomePage onNavigate={(p) => setActivePage(p)} />}
          {activePage === 'dictionary' && <DictionaryPage />}
          {activePage === 'snippets' && <SnippetsPage />}
          {activePage === 'style' && <StylePage />}
          {activePage === 'help' && <HelpPage />}
        </main>
      </div>

      {/* Modals */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <OnboardingModal
        isOpen={isOnboardingOpen}
        onComplete={() => setIsOnboardingOpen(false)}
      />
    </div>
  );
}

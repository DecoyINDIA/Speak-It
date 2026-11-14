import React, { useEffect, useState } from 'react';
import { TopBar } from './components/TopBar';
import { SidebarRail, NavPage } from './components/SidebarRail';
import { HomePage } from './pages/HomePage';
import { DictionaryPage } from './pages/DictionaryPage';
import { SnippetsPage } from './pages/SnippetsPage';
import { StylePage } from './pages/StylePage';
import { HelpPage } from './pages/HelpPage';
import { SettingsModal } from './pages/SettingsModal';
import { OnboardingModal } from './pages/OnboardingModal';

type ThemePref = 'light' | 'dark' | 'system';

function resolveTheme(pref: ThemePref): 'light' | 'dark' {
  if (pref === 'system') {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  return pref;
}

function applyTheme(theme: 'light' | 'dark') {
  document.documentElement.setAttribute('data-theme', theme);
}

export default function App(): React.JSX.Element {
  const [activePage, setActivePage] = useState<NavPage>('home');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Pick up the saved theme preference (dark is the default look).
  useEffect(() => {
    (async () => {
      const s = await (window as any).speakit?.getSettings?.();
      const pref: ThemePref | undefined = s?.general?.theme;
      if (pref) setTheme(resolveTheme(pref));
    })();
  }, []);

  async function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    const api = (window as any).speakit;
    if (api?.getSettings && api?.updateSettings) {
      const s = await api.getSettings();
      if (s?.general) await api.updateSettings({ general: { ...s.general, theme: next } });
    }
  }

  function handleSettingsClose() {
    setIsSettingsOpen(false);
    // The settings dialog can change the theme preference.
    (async () => {
      const s = await (window as any).speakit?.getSettings?.();
      if (s?.general?.theme) setTheme(resolveTheme(s.general.theme));
    })();
  }

  return (
    <div className="shell">
      <TopBar theme={theme} onToggleTheme={toggleTheme} />

      <div className="body">
        <SidebarRail
          activePage={activePage}
          onSelectPage={setActivePage}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        <main className="panel">
          {activePage === 'home' && <HomePage onNavigate={setActivePage} />}
          {activePage === 'dictionary' && <DictionaryPage />}
          {activePage === 'snippets' && <SnippetsPage />}
          {activePage === 'style' && <StylePage />}
          {activePage === 'help' && <HelpPage />}
        </main>
      </div>

      <SettingsModal isOpen={isSettingsOpen} onClose={handleSettingsClose} />
      <OnboardingModal isOpen={isOnboardingOpen} onComplete={() => setIsOnboardingOpen(false)} />
    </div>
  );
}

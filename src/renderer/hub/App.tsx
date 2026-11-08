import React, { useState, useEffect } from 'react';
import { productConfig } from '../../../product.config';

type Page = 'home' | 'dictionary' | 'snippets' | 'style' | 'settings' | 'help';

interface DictationRow {
  uid: string;
  created_at: number;
  status: string;
  clean_text?: string;
  raw_text?: string;
  words?: number;
  speech_ms?: number;
}

interface Stats {
  totalWords: number;
  avgWpm: number;
  dayStreak: number;
  totalDictations: number;
}

export default function App(): React.JSX.Element {
  const [activePage, setActivePage] = useState<Page>('home');
  const [stats, setStats] = useState<Stats>({ totalWords: 0, avgWpm: 0, dayStreak: 0, totalDictations: 0 });
  const [dictations, setDictations] = useState<DictationRow[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, [activePage, searchQuery]);

  async function loadData() {
    if ((window as any).speakit) {
      try {
        const s = await (window as any).speakit.getStats();
        if (s) setStats(s);

        const list = await (window as any).speakit.getDictations(50, 0, searchQuery);
        if (list) setDictations(list);
      } catch (err) {
        console.error('Failed to load data:', err);
      }
    }
  }

  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
  }

  function handleWindow(action: 'minimize' | 'maximize' | 'close') {
    if ((window as any).speakit) {
      (window as any).speakit[action]();
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--frame)' }}>
      {/* Top Header / Titlebar */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: '42px',
          padding: '0 12px',
          WebkitAppRegion: 'drag',
        } as React.CSSProperties}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', WebkitAppRegion: 'no-drag' } as any}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent)' }} />
          <span style={{ fontWeight: 600, fontSize: '14px', letterSpacing: '-0.2px' }}>{productConfig.displayName}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', WebkitAppRegion: 'no-drag' } as any}>
          <button
            onClick={toggleTheme}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--ink-2)',
              padding: '4px 8px',
              fontSize: '13px',
              borderRadius: 'var(--r-s)',
            }}
          >
            {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
          </button>
          <button
            onClick={() => handleWindow('minimize')}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ink-2)', padding: '4px 8px' }}
          >
            🗕
          </button>
          <button
            onClick={() => handleWindow('maximize')}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ink-2)', padding: '4px 8px' }}
          >
            🗖
          </button>
          <button
            onClick={() => handleWindow('close')}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ink-2)', padding: '4px 8px' }}
          >
            ✕
          </button>
        </div>
      </header>

      {/* Main Area: Left Rail + Content Panel */}
      <div style={{ display: 'flex', flex: 1, padding: '0 12px 12px 12px', gap: '12px', overflow: 'hidden' }}>
        {/* Left Icon Rail */}
        <nav
          style={{
            width: '64px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 0',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <RailButton active={activePage === 'home'} label="Home" icon="🏠" onClick={() => setActivePage('home')} />
            <RailButton active={activePage === 'dictionary'} label="Dictionary" icon="📖" onClick={() => setActivePage('dictionary')} />
            <RailButton active={activePage === 'snippets'} label="Snippets" icon="⚡" onClick={() => setActivePage('snippets')} />
            <RailButton active={activePage === 'style'} label="Style" icon="🎨" onClick={() => setActivePage('style')} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <RailButton active={activePage === 'settings'} label="Settings" icon="⚙️" onClick={() => setActivePage('settings')} />
            <RailButton active={activePage === 'help'} label="Help" icon="❓" onClick={() => setActivePage('help')} />
          </div>
        </nav>

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
          {activePage === 'home' && (
            <div style={{ maxWidth: '840px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h1 style={{ fontSize: '28px', fontWeight: 600, color: 'var(--ink)' }}>Good day</h1>
                  <p style={{ color: 'var(--muted)', fontSize: '14px', marginTop: '4px' }}>
                    {productConfig.strings.barIdleHint}
                  </p>
                </div>
              </div>

              {/* Stats Card */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '16px',
                  padding: '20px',
                  borderRadius: 'var(--r-m)',
                  background: 'var(--sand)',
                  border: '1px solid var(--line)',
                }}
              >
                <div>
                  <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--muted)' }}>
                    Total Words
                  </div>
                  <div style={{ fontSize: '32px', fontFamily: 'var(--font-display)', color: 'var(--ink)' }}>
                    {stats.totalWords.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--muted)' }}>
                    Avg Speed
                  </div>
                  <div style={{ fontSize: '32px', fontFamily: 'var(--font-display)', color: 'var(--ink)' }}>
                    {stats.avgWpm} <span style={{ fontSize: '16px', fontFamily: 'var(--font-ui)' }}>wpm</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--muted)' }}>
                    Day Streak
                  </div>
                  <div style={{ fontSize: '32px', fontFamily: 'var(--font-display)', color: 'var(--accent)' }}>
                    {stats.dayStreak} 🔥
                  </div>
                </div>
              </div>

              {/* History Section */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Recent Dictations</h2>
                  <input
                    type="text"
                    placeholder="Search history..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 'var(--r-s)',
                      border: '1px solid var(--line)',
                      background: 'var(--sand)',
                      color: 'var(--ink)',
                      outline: 'none',
                      fontSize: '13px',
                      width: '200px',
                    }}
                  />
                </div>

                {dictations.length === 0 ? (
                  <div
                    style={{
                      padding: '48px 0',
                      textAlign: 'center',
                      color: 'var(--muted)',
                      border: '1px dashed var(--line)',
                      borderRadius: 'var(--r-m)',
                    }}
                  >
                    Hold <kbd style={{ padding: '2px 6px', background: 'var(--sand-2)', borderRadius: '4px' }}>Ctrl + Win</kbd> and start talking.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {dictations.map((d) => (
                      <div
                        key={d.uid}
                        style={{
                          padding: '14px 18px',
                          borderRadius: 'var(--r-m)',
                          background: 'var(--sand)',
                          border: '1px solid var(--line)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--muted)' }}>
                          <span>{new Date(d.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <span>{d.words || 0} words</span>
                        </div>
                        <p style={{ fontSize: '14px', lineHeight: '1.5', color: 'var(--ink)' }}>{d.clean_text || d.raw_text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activePage !== 'home' && (
            <div style={{ maxWidth: '840px', margin: '0 auto' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 600, textTransform: 'capitalize' }}>{activePage}</h1>
              <p style={{ color: 'var(--muted)', marginTop: '8px' }}>{activePage} management panel.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function RailButton({ active, icon, label, onClick }: { active: boolean; icon: string; label: string; onClick: () => void }) {
  return (
    <button
      title={label}
      onClick={onClick}
      style={{
        width: '44px',
        height: '44px',
        borderRadius: 'var(--r-m)',
        border: active ? '1px solid var(--line)' : 'none',
        background: active ? 'var(--panel)' : 'transparent',
        cursor: 'pointer',
        fontSize: '18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.15s ease',
      }}
    >
      {icon}
    </button>
  );
}

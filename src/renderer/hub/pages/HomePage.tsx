import React, { useState, useEffect } from 'react';
import { productConfig } from '../../../../product.config';

interface DictationRow {
  uid: string;
  created_at: number;
  status: string;
  clean_text?: string;
  raw_text?: string;
  words?: number;
  speech_ms?: number;
  audio_path?: string;
}

interface Stats {
  totalWords: number;
  avgWpm: number;
  dayStreak: number;
  totalDictations: number;
}

export const HomePage: React.FC<{ onNavigate: (page: any) => void }> = ({ onNavigate }) => {
  const [stats, setStats] = useState<Stats>({ totalWords: 0, avgWpm: 0, dayStreak: 0, totalDictations: 0 });
  const [dictations, setDictations] = useState<DictationRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showHero, setShowHero] = useState(true);
  const [copiedUid, setCopiedUid] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    if ((window as any).speakit) {
      const unsub = (window as any).speakit.onDictationUpdated(() => {
        loadData();
      });
      return () => unsub?.();
    }
  }, [searchQuery]);

  async function loadData() {
    if ((window as any).speakit) {
      try {
        const s = await (window as any).speakit.getStats();
        if (s) setStats(s);

        const list = await (window as any).speakit.getDictations(50, 0, searchQuery);
        if (list) setDictations(list);
      } catch (err) {
        console.error('Failed to load home data:', err);
      }
    }
  }

  function handleCopy(text?: string, uid?: string) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (uid) {
      setCopiedUid(uid);
      setTimeout(() => setCopiedUid(null), 1500);
    }
  }

  async function handleDelete(uid: string) {
    if ((window as any).speakit) {
      await (window as any).speakit.deleteDictation(uid);
      loadData();
    }
  }

  // Group dictations by Today / Yesterday / Earlier
  const todayStr = new Date().toDateString();
  const yesterdayStr = new Date(Date.now() - 86400000).toDateString();

  const grouped = dictations.reduce((acc: Record<string, DictationRow[]>, d) => {
    const dStr = new Date(d.created_at).toDateString();
    let label = dStr;
    if (dStr === todayStr) label = 'Today';
    else if (dStr === yesterdayStr) label = 'Yesterday';
    if (!acc[label]) acc[label] = [];
    acc[label].push(d);
    return acc;
  }, {});

  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good morning';
    if (hr < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div style={{ maxWidth: '840px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Greeting Header */}
      <div>
        <h1 style={{ fontSize: '28px', fontWeight: 600, color: 'var(--ink)' }}>{getGreeting()}</h1>
        <p style={{ color: 'var(--muted)', fontSize: '14px', marginTop: '4px' }}>
          Hold <kbd style={{ padding: '2px 6px', background: 'var(--sand-2)', borderRadius: '4px' }}>Ctrl + Win</kbd> to dictate anywhere.
        </p>
      </div>

      {/* Dismissible Dark Hero Card */}
      {showHero && (
        <div
          style={{
            position: 'relative',
            background: 'var(--card-dark)',
            color: 'var(--on-dark)',
            padding: '24px 28px',
            borderRadius: 'var(--r-l)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
          }}
        >
          <div>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--accent)', fontWeight: 600 }}>
              Personalize
            </span>
            <h3 style={{ fontSize: '22px', fontFamily: 'var(--font-display)', marginTop: '4px', fontWeight: 400 }}>
              Make SpeakIt sound like <span style={{ fontStyle: 'italic', color: 'var(--accent)' }}>you</span>
            </h3>
            <p style={{ fontSize: '13px', color: '#B3B5AE', marginTop: '4px', maxWidth: '420px' }}>
              Configure your personal, work, and email writing styles to get transcripts that sound natural for each app.
            </p>
            <button
              onClick={() => onNavigate('style')}
              style={{
                marginTop: '16px',
                padding: '6px 14px',
                borderRadius: 'var(--r-pill)',
                background: 'var(--on-dark)',
                color: 'var(--card-dark)',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '12px',
              }}
            >
              Set up styles →
            </button>
          </div>
          <button
            onClick={() => setShowHero(false)}
            style={{
              position: 'absolute',
              top: '14px',
              right: '16px',
              background: 'transparent',
              border: 'none',
              color: '#8C8E87',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Stats Card */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px',
          padding: '20px 24px',
          borderRadius: 'var(--r-m)',
          background: 'var(--sand)',
          border: '1px solid var(--line)',
        }}
      >
        <div>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--muted)', fontWeight: 600 }}>
            Total Words
          </div>
          <div style={{ fontSize: '36px', fontFamily: 'var(--font-display)', color: 'var(--ink)', marginTop: '2px' }}>
            {stats.totalWords.toLocaleString()}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--muted)', fontWeight: 600 }}>
            Average Speed
          </div>
          <div style={{ fontSize: '36px', fontFamily: 'var(--font-display)', color: 'var(--ink)', marginTop: '2px' }}>
            {stats.avgWpm} <span style={{ fontSize: '15px', fontFamily: 'var(--font-ui)', color: 'var(--muted)' }}>wpm</span>
          </div>
        </div>
        <div>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--muted)', fontWeight: 600 }}>
            Day Streak
          </div>
          <div style={{ fontSize: '36px', fontFamily: 'var(--font-display)', color: 'var(--accent)', marginTop: '2px' }}>
            {stats.dayStreak} <span style={{ fontSize: '20px' }}>🔥</span>
          </div>
        </div>
      </div>

      {/* History Feed Section */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ink)' }}>History Feed</h2>
          <input
            type="text"
            placeholder="Search transcripts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--r-s)',
              border: '1px solid var(--line)',
              background: 'var(--sand)',
              color: 'var(--ink)',
              fontSize: '13px',
              width: '220px',
              outline: 'none',
            }}
          />
        </div>

        {dictations.length === 0 ? (
          <div
            style={{
              padding: '48px 24px',
              textAlign: 'center',
              border: '1px dashed var(--line)',
              borderRadius: 'var(--r-m)',
              color: 'var(--muted)',
            }}
          >
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>🎙️</div>
            <p style={{ fontWeight: 500 }}>No dictations yet</p>
            <p style={{ fontSize: '13px', marginTop: '4px' }}>
              Hold <kbd style={{ padding: '2px 6px', background: 'var(--sand-2)', borderRadius: '4px' }}>Ctrl + Win</kbd> and start talking in any application.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {Object.entries(grouped).map(([groupTitle, items]) => (
              <div key={groupTitle}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                  {groupTitle}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {items.map((item) => (
                    <div
                      key={item.uid}
                      style={{
                        padding: '16px 20px',
                        borderRadius: 'var(--r-m)',
                        background: 'var(--sand)',
                        border: '1px solid var(--line)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--muted)' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span style={{ fontWeight: 500 }}>{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <span>•</span>
                          <span>{item.words || 0} words</span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => handleCopy(item.clean_text || item.raw_text, item.uid)}
                            title="Copy transcript"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              color: 'var(--ink-2)',
                              fontSize: '12px',
                            }}
                          >
                            {copiedUid === item.uid ? '✓ Copied' : '⧉ Copy'}
                          </button>
                          <button
                            onClick={() => handleDelete(item.uid)}
                            title="Delete"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              color: 'var(--muted)',
                              fontSize: '12px',
                            }}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                      <p
                        style={{
                          fontSize: '14px',
                          lineHeight: '1.5',
                          color: 'var(--ink)',
                          display: '-webkit-box',
                          WebkitLineClamp: 4,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {item.clean_text || item.raw_text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

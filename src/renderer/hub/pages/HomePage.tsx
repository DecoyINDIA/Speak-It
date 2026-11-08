import React, { useEffect, useState } from 'react';
import { ArrowRight, Check, Copy, Mic, Trash2, X } from 'lucide-react';
import { EmptyState, ICON_SM, Kbd, SearchInput } from '../components/ui';

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

function greeting() {
  const hr = new Date().getHours();
  if (hr < 12) return 'Good morning';
  if (hr < 18) return 'Good afternoon';
  return 'Good evening';
}

export const HomePage: React.FC<{ onNavigate: (page: any) => void }> = ({ onNavigate }) => {
  const [stats, setStats] = useState<Stats>({ totalWords: 0, avgWpm: 0, dayStreak: 0, totalDictations: 0 });
  const [dictations, setDictations] = useState<DictationRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showTip, setShowTip] = useState(true);
  const [copiedUid, setCopiedUid] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    const api = (window as any).speakit;
    if (api) {
      const unsub = api.onDictationUpdated(() => loadData());
      return () => unsub?.();
    }
  }, [searchQuery]);

  async function loadData() {
    const api = (window as any).speakit;
    if (!api) return;
    try {
      const s = await api.getStats();
      if (s) setStats(s);
      const list = await api.getDictations(50, 0, searchQuery);
      if (list) setDictations(list);
    } catch (err) {
      console.error('Failed to load home data:', err);
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
    await (window as any).speakit?.deleteDictation(uid);
    loadData();
  }

  const todayStr = new Date().toDateString();
  const yesterdayStr = new Date(Date.now() - 86400000).toDateString();
  const grouped = dictations.reduce((acc: Record<string, DictationRow[]>, d) => {
    const date = new Date(d.created_at);
    const dStr = date.toDateString();
    let label = date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
    if (dStr === todayStr) label = 'Today';
    else if (dStr === yesterdayStr) label = 'Yesterday';
    (acc[label] ||= []).push(d);
    return acc;
  }, {});

  const hasHistory = dictations.length > 0 || searchQuery.length > 0;

  return (
    <div className="page">
      <header>
        <h1 className="page-title">{greeting()}</h1>
        <dl className="stat-line">
          <div>
            <dt>Words dictated</dt>
            <dd>{stats.totalWords.toLocaleString()}</dd>
          </div>
          <div>
            <dt>Average speed</dt>
            <dd>
              {stats.avgWpm} <span className="muted">wpm</span>
            </dd>
          </div>
          <div>
            <dt>Streak</dt>
            <dd>
              {stats.dayStreak} <span className="muted">{stats.dayStreak === 1 ? 'day' : 'days'}</span>
            </dd>
          </div>
        </dl>
      </header>

      {showTip && (
        <div className="callout">
          <div className="callout__body">
            <strong>Make SpeakIt sound like you.</strong> Pick a tone for messages, work chat and email, and
            dictations are rewritten to match the app you are in.
          </div>
          <button className="btn btn--secondary btn--sm" onClick={() => onNavigate('style')}>
            Set up style <ArrowRight size={14} strokeWidth={2} />
          </button>
          <button className="icon-btn" style={{ width: 28, height: 28 }} onClick={() => setShowTip(false)} aria-label="Dismiss tip">
            <X {...ICON_SM} />
          </button>
        </div>
      )}

      <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="toolbar">
          <h2 className="section-title">History</h2>
          {hasHistory && <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search history" />}
        </div>

        {dictations.length === 0 ? (
          searchQuery ? (
            <EmptyState icon={<Mic {...ICON_SM} />} title="No matches">
              Nothing in your history contains “{searchQuery}”.
            </EmptyState>
          ) : (
            <EmptyState icon={<Mic {...ICON_SM} />} title="Your dictations will show up here">
              Click into any text box, hold <Kbd keys={['Ctrl', 'Win']} /> and start talking. Release to paste.
            </EmptyState>
          )
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {Object.entries(grouped).map(([groupTitle, items]) => (
              <div key={groupTitle}>
                <div className="group-label">{groupTitle}</div>
                <div className="list">
                  {items.map((item) => {
                    const text = item.clean_text || item.raw_text;
                    const copied = copiedUid === item.uid;
                    return (
                      <div key={item.uid} className="row" style={{ alignItems: 'flex-start' }}>
                        <div className="history-meta">
                          <span>
                            {new Date(item.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                          </span>
                          <span className="muted">{item.words || 0} words</span>
                        </div>
                        <p className="history-text selectable">{text}</p>
                        <div className="row__actions">
                          <button
                            className="icon-btn"
                            data-done={copied}
                            onClick={() => handleCopy(text, item.uid)}
                            title={copied ? 'Copied' : 'Copy text'}
                            aria-label={copied ? 'Copied' : 'Copy text'}
                          >
                            {copied ? <Check {...ICON_SM} /> : <Copy {...ICON_SM} />}
                          </button>
                          <button
                            className="icon-btn icon-btn--danger"
                            onClick={() => handleDelete(item.uid)}
                            title="Delete"
                            aria-label="Delete dictation"
                          >
                            <Trash2 {...ICON_SM} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

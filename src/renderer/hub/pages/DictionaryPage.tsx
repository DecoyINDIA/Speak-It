import React, { useEffect, useState } from 'react';
import { BookA, Info, Plus, Trash2, X } from 'lucide-react';
import { EmptyState, ICON_SM, PageHeader, SearchInput } from '../components/ui';

interface DictionaryEntry {
  id: number;
  term: string;
  sounds_like?: string;
  uses?: number;
  created_at: number;
}

export const DictionaryPage: React.FC = () => {
  const [entries, setEntries] = useState<DictionaryEntry[]>([]);
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTerm, setNewTerm] = useState('');
  const [newSoundsLike, setNewSoundsLike] = useState('');
  const [showTip, setShowTip] = useState(true);

  useEffect(() => {
    loadDictionary();
  }, []);

  async function loadDictionary() {
    const list = await (window as any).speakit?.getDictionary();
    if (list) setEntries(list);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newTerm.trim()) return;
    await (window as any).speakit?.addDictionaryTerm(newTerm.trim(), newSoundsLike.trim());
    setNewTerm('');
    setNewSoundsLike('');
    setShowAddForm(false);
    loadDictionary();
  }

  async function handleDelete(id: number) {
    await (window as any).speakit?.deleteDictionaryTerm(id);
    loadDictionary();
  }

  const q = search.toLowerCase();
  const filtered = entries.filter(
    (e) => e.term.toLowerCase().includes(q) || (e.sounds_like && e.sounds_like.toLowerCase().includes(q))
  );

  return (
    <div className="page">
      <PageHeader
        title="Dictionary"
        subtitle="Names, acronyms and jargon SpeakIt should always spell your way."
        action={
          !showAddForm && (
            <button className="btn btn--primary" onClick={() => setShowAddForm(true)}>
              <Plus size={16} strokeWidth={2.25} /> Add word
            </button>
          )
        }
      />

      {showAddForm && (
        <form className="inline-form" onSubmit={handleAdd}>
          <div className="inline-form__row">
            <label className="field">
              <span className="label">Word</span>
              <input
                className="input"
                autoFocus
                placeholder="Antigravity"
                value={newTerm}
                onChange={(e) => setNewTerm(e.target.value)}
                required
              />
            </label>
            <label className="field">
              <span className="label">
                Sounds like <span className="muted" style={{ fontWeight: 500 }}>(optional)</span>
              </span>
              <input
                className="input"
                placeholder="anti gravity"
                value={newSoundsLike}
                onChange={(e) => setNewSoundsLike(e.target.value)}
              />
            </label>
          </div>
          <div className="inline-form__actions">
            <button type="button" className="btn btn--ghost" onClick={() => setShowAddForm(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={!newTerm.trim()}>
              Save word
            </button>
          </div>
        </form>
      )}

      {showTip && (
        <div className="callout">
          <Info {...ICON_SM} />
          <div className="callout__body">
            If a word keeps coming out wrong, add what SpeakIt hears under <strong>Sounds like</strong>. For example,
            word “Antigravity”, sounds like “anti gravity”.
          </div>
          <button className="icon-btn" style={{ width: 24, height: 24 }} onClick={() => setShowTip(false)} aria-label="Dismiss tip">
            <X size={14} strokeWidth={1.75} />
          </button>
        </div>
      )}

      <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {entries.length > 0 && (
          <div className="toolbar">
            <span className="muted" style={{ fontSize: 'var(--text-s)' }}>
              {entries.length} {entries.length === 1 ? 'word' : 'words'}
            </span>
            <SearchInput value={search} onChange={setSearch} placeholder="Search dictionary" />
          </div>
        )}

        {entries.length === 0 ? (
          <EmptyState icon={<BookA {...ICON_SM} />} title="No words yet">
            Add the names and terms you use often, like teammates, products or Hinglish words.
          </EmptyState>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<BookA {...ICON_SM} />} title="No matches">
            No word matches “{search}”.
          </EmptyState>
        ) : (
          <div className="list">
            {filtered.map((item) => (
              <div key={item.id} className="row">
                <span className="selectable" style={{ fontWeight: 650, flex: '0 0 40%', minWidth: 0 }}>
                  {item.term}
                </span>
                <span className="muted" style={{ flex: 1, minWidth: 0, fontSize: 'var(--text-s)' }}>
                  {item.sounds_like ? <>sounds like “{item.sounds_like}”</> : null}
                </span>
                <div className="row__actions">
                  <button
                    className="icon-btn icon-btn--danger"
                    onClick={() => handleDelete(item.id)}
                    title="Remove word"
                    aria-label={`Remove ${item.term}`}
                  >
                    <Trash2 {...ICON_SM} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { CornerDownRight, Plus, TextCursorInput, Trash2 } from 'lucide-react';
import { EmptyState, ICON_SM, PageHeader, SearchInput } from '../components/ui';

interface SnippetEntry {
  id: number;
  trigger: string;
  expansion: string;
  uses?: number;
  created_at: number;
}

export const SnippetsPage: React.FC = () => {
  const [snippets, setSnippets] = useState<SnippetEntry[]>([]);
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [trigger, setTrigger] = useState('');
  const [expansion, setExpansion] = useState('');

  useEffect(() => {
    loadSnippets();
  }, []);

  async function loadSnippets() {
    const list = await (window as any).speakit?.getSnippets();
    if (list) setSnippets(list);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!trigger.trim() || !expansion.trim()) return;
    await (window as any).speakit?.addSnippet(trigger.trim(), expansion.trim());
    setTrigger('');
    setExpansion('');
    setShowAddForm(false);
    loadSnippets();
  }

  async function handleDelete(id: number) {
    await (window as any).speakit?.deleteSnippet(id);
    loadSnippets();
  }

  const q = search.toLowerCase();
  const filtered = snippets.filter(
    (s) => s.trigger.toLowerCase().includes(q) || s.expansion.toLowerCase().includes(q)
  );

  return (
    <div className="page">
      <PageHeader
        title="Snippets"
        subtitle="Say a short phrase and SpeakIt types out the full text: links, addresses, sign-offs, templates."
        action={
          !showAddForm && (
            <button className="btn btn--primary" onClick={() => setShowAddForm(true)}>
              <Plus size={16} strokeWidth={2.25} /> New snippet
            </button>
          )
        }
      />

      {showAddForm && (
        <form className="inline-form" onSubmit={handleAdd}>
          <label className="field">
            <span className="label">When I say</span>
            <input
              className="input"
              autoFocus
              placeholder="my calendar link"
              value={trigger}
              onChange={(e) => setTrigger(e.target.value)}
              required
            />
          </label>
          <label className="field">
            <span className="label">Type this</span>
            <textarea
              className="textarea"
              rows={3}
              placeholder="Book a time that works for you: https://cal.com/you"
              value={expansion}
              onChange={(e) => setExpansion(e.target.value)}
              required
            />
          </label>
          <div className="inline-form__actions">
            <button type="button" className="btn btn--ghost" onClick={() => setShowAddForm(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={!trigger.trim() || !expansion.trim()}>
              Save snippet
            </button>
          </div>
        </form>
      )}

      <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {snippets.length > 0 && (
          <div className="toolbar">
            <span className="muted" style={{ fontSize: 'var(--text-s)' }}>
              {snippets.length} {snippets.length === 1 ? 'snippet' : 'snippets'}
            </span>
            <SearchInput value={search} onChange={setSearch} placeholder="Search snippets" />
          </div>
        )}

        {snippets.length === 0 ? (
          <EmptyState icon={<TextCursorInput {...ICON_SM} />} title="No snippets yet">
            Try one for your email signature: say “my sign-off” and get your full name, title and phone number.
          </EmptyState>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<TextCursorInput {...ICON_SM} />} title="No matches">
            No snippet matches “{search}”.
          </EmptyState>
        ) : (
          <div className="list">
            {filtered.map((item) => (
              <div key={item.id} className="row" style={{ alignItems: 'flex-start', paddingTop: 14, paddingBottom: 14 }}>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span className="snippet-trigger">“{item.trigger}”</span>
                  <div style={{ display: 'flex', gap: 8, color: 'var(--ink-2)' }}>
                    <CornerDownRight size={15} strokeWidth={1.75} style={{ flexShrink: 0, marginTop: 3, color: 'var(--muted)' }} />
                    <span className="selectable" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                      {item.expansion}
                    </span>
                  </div>
                </div>
                <div className="row__actions">
                  <button
                    className="icon-btn icon-btn--danger"
                    onClick={() => handleDelete(item.id)}
                    title="Delete snippet"
                    aria-label={`Delete snippet ${item.trigger}`}
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

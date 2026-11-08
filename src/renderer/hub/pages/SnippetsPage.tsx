import React, { useState, useEffect } from 'react';

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
    if ((window as any).speakit) {
      const list = await (window as any).speakit.getSnippets();
      if (list) setSnippets(list);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!trigger.trim() || !expansion.trim()) return;

    if ((window as any).speakit) {
      await (window as any).speakit.addSnippet(trigger.trim(), expansion.trim());
      setTrigger('');
      setExpansion('');
      setShowAddForm(false);
      loadSnippets();
    }
  }

  async function handleDelete(id: number) {
    if ((window as any).speakit) {
      await (window as any).speakit.deleteSnippet(id);
      loadSnippets();
    }
  }

  const filtered = snippets.filter(
    (s) =>
      s.trigger.toLowerCase().includes(search.toLowerCase()) ||
      s.expansion.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ maxWidth: '840px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 600 }}>Snippets & Shortcuts</h1>
          <p style={{ color: 'var(--muted)', fontSize: '14px', marginTop: '4px' }}>
            Say a short trigger phrase to expand into long boilerplate, emails, links, or templates.
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          style={{
            padding: '8px 16px',
            borderRadius: 'var(--r-pill)',
            background: 'var(--ink)',
            color: 'var(--panel)',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '13px',
          }}
        >
          + Add Snippet
        </button>
      </div>

      {showAddForm && (
        <form
          onSubmit={handleAdd}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            padding: '18px',
            borderRadius: 'var(--r-m)',
            background: 'var(--sand)',
            border: '1px solid var(--line)',
          }}
        >
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px' }}>
              Spoken Trigger Phrase
            </label>
            <input
              type="text"
              placeholder="e.g. my calendar link"
              value={trigger}
              onChange={(e) => setTrigger(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 'var(--r-s)',
                border: '1px solid var(--line)',
                background: 'var(--panel)',
                color: 'var(--ink)',
                fontSize: '13px',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px' }}>
              Expanded Text (Multiline)
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Feel free to book a time that works best for you here: https://cal.com/subham"
              value={expansion}
              onChange={(e) => setExpansion(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 'var(--r-s)',
                border: '1px solid var(--line)',
                background: 'var(--panel)',
                color: 'var(--ink)',
                fontSize: '13px',
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              style={{
                padding: '8px 14px',
                borderRadius: 'var(--r-s)',
                background: 'transparent',
                border: '1px solid var(--line)',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: '8px 18px',
                borderRadius: 'var(--r-s)',
                background: 'var(--accent)',
                color: 'var(--accent-ink)',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '13px',
              }}
            >
              Save Snippet
            </button>
          </div>
        </form>
      )}

      <input
        type="text"
        placeholder="Search snippets..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          padding: '8px 12px',
          borderRadius: 'var(--r-s)',
          border: '1px solid var(--line)',
          background: 'var(--sand)',
          color: 'var(--ink)',
          fontSize: '13px',
          width: '240px',
          outline: 'none',
        }}
      />

      {filtered.length === 0 ? (
        <div style={{ padding: '36px', textAlign: 'center', color: 'var(--muted)', border: '1px dashed var(--line)', borderRadius: 'var(--r-m)' }}>
          No snippets configured yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.map((item) => (
            <div
              key={item.id}
              style={{
                padding: '14px 18px',
                borderRadius: 'var(--r-m)',
                background: 'var(--sand)',
                border: '1px solid var(--line)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '16px',
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--accent-ink)', background: 'var(--accent-soft)', padding: '2px 8px', borderRadius: '4px' }}>
                    "{item.trigger}"
                  </span>
                  <span style={{ color: 'var(--muted)', fontSize: '13px' }}>➔</span>
                </div>
                <div style={{ fontSize: '14px', color: 'var(--ink)', whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>
                  {item.expansion}
                </div>
              </div>
              <button
                onClick={() => handleDelete(item.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--muted)',
                  fontSize: '13px',
                  padding: '4px',
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

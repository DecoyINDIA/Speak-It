import React, { useState, useEffect } from 'react';

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
  const [showBanner, setShowBanner] = useState(true);

  useEffect(() => {
    loadDictionary();
  }, []);

  async function loadDictionary() {
    if ((window as any).speakit) {
      const list = await (window as any).speakit.getDictionary();
      if (list) setEntries(list);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newTerm.trim()) return;

    if ((window as any).speakit) {
      await (window as any).speakit.addDictionaryTerm(newTerm.trim(), newSoundsLike.trim());
      setNewTerm('');
      setNewSoundsLike('');
      setShowAddForm(false);
      loadDictionary();
    }
  }

  async function handleDelete(id: number) {
    if ((window as any).speakit) {
      await (window as any).speakit.deleteDictionaryTerm(id);
      loadDictionary();
    }
  }

  const filtered = entries.filter(
    (e) =>
      e.term.toLowerCase().includes(search.toLowerCase()) ||
      (e.sounds_like && e.sounds_like.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{ maxWidth: '840px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Page Title & Action Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 600 }}>Custom Dictionary</h1>
          <p style={{ color: 'var(--muted)', fontSize: '14px', marginTop: '4px' }}>
            Teach SpeakIt unique names, acronyms, and specialized industry terms.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
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
            + Add Term
          </button>
        </div>
      </div>

      {/* Dismissible Banner */}
      {showBanner && (
        <div
          style={{
            position: 'relative',
            background: 'var(--sand)',
            border: '1px solid var(--line)',
            padding: '16px 20px',
            borderRadius: 'var(--r-m)',
          }}
        >
          <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--ink)' }}>Pro tip for pronunciation</div>
          <p style={{ fontSize: '13px', color: 'var(--ink-2)', marginTop: '4px', maxWidth: '680px' }}>
            If the AI often mishears a name like "Antigravity" as "Anti gravity", enter "Antigravity" as the term and "Anti gravity" under Sounds Like.
          </p>
          <button
            onClick={() => setShowBanner(false)}
            style={{
              position: 'absolute',
              top: '12px',
              right: '14px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--muted)',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Inline Add Form */}
      {showAddForm && (
        <form
          onSubmit={handleAdd}
          style={{
            display: 'flex',
            gap: '12px',
            padding: '16px',
            borderRadius: 'var(--r-m)',
            background: 'var(--sand)',
            border: '1px solid var(--line)',
            alignItems: 'flex-end',
          }}
        >
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px' }}>Term / Name</label>
            <input
              type="text"
              placeholder="e.g. Antigravity"
              value={newTerm}
              onChange={(e) => setNewTerm(e.target.value)}
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
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, marginBottom: '6px' }}>Sounds Like (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Anti gravity"
              value={newSoundsLike}
              onChange={(e) => setNewSoundsLike(e.target.value)}
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
          <button
            type="submit"
            style={{
              padding: '9px 18px',
              borderRadius: 'var(--r-s)',
              background: 'var(--accent)',
              color: 'var(--accent-ink)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px',
            }}
          >
            Save
          </button>
        </form>
      )}

      {/* Search Input */}
      <input
        type="text"
        placeholder="Search dictionary..."
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

      {/* Dictionary List */}
      {filtered.length === 0 ? (
        <div style={{ padding: '36px', textAlign: 'center', color: 'var(--muted)', border: '1px dashed var(--line)', borderRadius: 'var(--r-m)' }}>
          No custom terms added yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtered.map((item) => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 18px',
                borderRadius: 'var(--r-m)',
                background: 'var(--sand)',
                border: '1px solid var(--line)',
              }}
            >
              <div>
                <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--ink)' }}>{item.term}</span>
                {item.sounds_like && (
                  <span style={{ marginLeft: '12px', fontSize: '13px', color: 'var(--muted)' }}>
                    sounds like <em style={{ fontStyle: 'normal', color: 'var(--ink-2)' }}>"{item.sounds_like}"</em>
                  </span>
                )}
              </div>
              <button
                onClick={() => handleDelete(item.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--muted)',
                  fontSize: '13px',
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

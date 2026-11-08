import React, { useState, useEffect } from 'react';

type Category = 'personal' | 'work' | 'email' | 'other';

interface StyleConfig {
  category: Category;
  tone: string;
  custom_instructions?: string;
}

const TONE_SAMPLES = {
  Formal: {
    before: 'hey guys, we gotta finish this by friday or boss is mad',
    after: 'Hello team. Please ensure this deliverable is completed by Friday afternoon.',
  },
  Casual: {
    before: 'hey guys, we gotta finish this by friday or boss is mad',
    after: "Hey team, let's wrap this up by Friday so we stay ahead of schedule!",
  },
  'Very casual': {
    before: 'hey guys, we gotta finish this by friday or boss is mad',
    after: 'hey all, let’s get this done by friday 🙌',
  },
};

export const StylePage: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<Category>('personal');
  const [styles, setStyles] = useState<Record<Category, StyleConfig>>({
    personal: { category: 'personal', tone: 'Casual' },
    work: { category: 'work', tone: 'Formal' },
    email: { category: 'email', tone: 'Formal' },
    other: { category: 'other', tone: 'Casual' },
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadStyles();
  }, []);

  async function loadStyles() {
    if ((window as any).speakit) {
      const list = await (window as any).speakit.getStyles();
      if (list && Array.isArray(list)) {
        const map: any = { ...styles };
        list.forEach((s: any) => {
          if (map[s.category]) {
            map[s.category] = s;
          }
        });
        setStyles(map);
      }
    }
  }

  async function handleToneSelect(tone: string) {
    const updated = { ...styles[activeCategory], tone };
    setStyles({ ...styles, [activeCategory]: updated });
    await saveStyle(updated);
  }

  async function handleInstructionsChange(custom_instructions: string) {
    const updated = { ...styles[activeCategory], custom_instructions };
    setStyles({ ...styles, [activeCategory]: updated });
  }

  async function saveStyle(currentStyle?: StyleConfig) {
    const target = currentStyle || styles[activeCategory];
    if ((window as any).speakit) {
      await (window as any).speakit.updateStyle(target.category, target.tone, target.custom_instructions);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }
  }

  const current = styles[activeCategory];

  return (
    <div style={{ maxWidth: '840px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '26px', fontWeight: 600 }}>Writing Style & Tone</h1>
        <p style={{ color: 'var(--muted)', fontSize: '14px', marginTop: '4px' }}>
          Choose how SpeakIt rewrites your thoughts depending on the active application.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--line)', paddingBottom: '8px' }}>
        <CategoryTab active={activeCategory === 'personal'} label="Personal Messages (Slack/WhatsApp)" onClick={() => setActiveCategory('personal')} />
        <CategoryTab active={activeCategory === 'work'} label="Work & Team (Teams/Docs)" onClick={() => setActiveCategory('work')} />
        <CategoryTab active={activeCategory === 'email'} label="Email (Gmail/Outlook)" onClick={() => setActiveCategory('email')} />
        <CategoryTab active={activeCategory === 'other'} label="Other Apps" onClick={() => setActiveCategory('other')} />
      </div>

      {/* Tone Cards */}
      <div>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)', marginBottom: '12px' }}>Selected Tone</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
          {(['Formal', 'Casual', 'Very casual'] as const).map((tone) => {
            const isSelected = current.tone.toLowerCase() === tone.toLowerCase();
            const sample = TONE_SAMPLES[tone];
            return (
              <div
                key={tone}
                onClick={() => handleToneSelect(tone)}
                style={{
                  padding: '16px',
                  borderRadius: 'var(--r-m)',
                  background: isSelected ? 'var(--panel)' : 'var(--sand)',
                  border: isSelected ? '2px solid var(--accent)' : '1px solid var(--line)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  boxShadow: isSelected ? '0 4px 12px rgba(240, 161, 46, 0.15)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--ink)' }}>{tone}</span>
                  {isSelected && <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>✓</span>}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Before</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', fontStyle: 'italic', lineHeight: '1.3' }}>"{sample.before}"</div>
                <div style={{ fontSize: '11px', color: 'var(--accent-ink)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '4px' }}>After</div>
                <div style={{ fontSize: '13px', color: 'var(--ink)', fontWeight: 500, lineHeight: '1.4' }}>"{sample.after}"</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom Instructions */}
      <div>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)', marginBottom: '8px' }}>Custom Persona Instructions</h3>
        <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '8px' }}>
          Add custom rules for this category (e.g. "Always use British spelling", "Include code blocks for technical commands").
        </p>
        <textarea
          rows={3}
          placeholder="e.g. Always format lists as bullet points; prefer concise 2-sentence answers."
          value={current.custom_instructions || ''}
          onChange={(e) => handleInstructionsChange(e.target.value)}
          onBlur={() => saveStyle()}
          style={{
            width: '100%',
            padding: '10px 14px',
            borderRadius: 'var(--r-m)',
            border: '1px solid var(--line)',
            background: 'var(--sand)',
            color: 'var(--ink)',
            fontSize: '13px',
            fontFamily: 'inherit',
            resize: 'vertical',
          }}
        />
        {saved && <span style={{ fontSize: '12px', color: 'var(--ok)', marginTop: '4px', display: 'inline-block' }}>✓ Changes saved</span>}
      </div>
    </div>
  );
};

function CategoryTab({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 14px',
        borderRadius: 'var(--r-s)',
        background: active ? 'var(--sand)' : 'transparent',
        border: 'none',
        color: active ? 'var(--ink)' : 'var(--muted)',
        fontWeight: active ? 600 : 500,
        fontSize: '13px',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
    >
      {label}
    </button>
  );
}

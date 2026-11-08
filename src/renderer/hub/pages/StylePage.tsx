import React, { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { PageHeader, RadioOption } from '../components/ui';

type Category = 'personal' | 'work' | 'email' | 'other';

interface StyleConfig {
  category: Category;
  tone: string;
  custom_instructions?: string;
}

const CATEGORIES: { id: Category; label: string; apps: string }[] = [
  { id: 'personal', label: 'Messages', apps: 'WhatsApp, Telegram, Discord and other personal chat' },
  { id: 'work', label: 'Work', apps: 'Slack, Teams, Notion, Google Docs and Word' },
  { id: 'email', label: 'Email', apps: 'Gmail, Outlook and other mail apps' },
  { id: 'other', label: 'Everything else', apps: 'Any app not covered above' },
];

const SPOKEN = 'hey guys we gotta finish this by friday or the boss is gonna be mad';

const TONES: { id: string; sample: string }[] = [
  { id: 'Formal', sample: 'Hello team, please make sure this is finished by Friday.' },
  { id: 'Casual', sample: "Hey team, let's get this wrapped up by Friday." },
  { id: 'Very casual', sample: 'hey all, gotta get this done by friday' },
];

export const StylePage: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<Category>('personal');
  const [styles, setStyles] = useState<Record<Category, StyleConfig>>({
    personal: { category: 'personal', tone: 'Casual' },
    work: { category: 'work', tone: 'Formal' },
    email: { category: 'email', tone: 'Formal' },
    other: { category: 'other', tone: 'Casual' },
  });
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    loadStyles();
  }, []);

  async function loadStyles() {
    const list = await (window as any).speakit?.getStyles();
    if (list && Array.isArray(list)) {
      setStyles((prev) => {
        const map: any = { ...prev };
        list.forEach((s: any) => {
          if (map[s.category]) map[s.category] = s;
        });
        return map;
      });
    }
  }

  async function saveStyle(target: StyleConfig) {
    const api = (window as any).speakit;
    if (!api) return;
    await api.updateStyle(target.category, target.tone, target.custom_instructions);
    setSaved(true);
    clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(false), 1600);
  }

  function handleToneSelect(tone: string) {
    const updated = { ...styles[activeCategory], tone };
    setStyles({ ...styles, [activeCategory]: updated });
    saveStyle(updated);
  }

  function handleInstructionsChange(custom_instructions: string) {
    setStyles({ ...styles, [activeCategory]: { ...styles[activeCategory], custom_instructions } });
  }

  const current = styles[activeCategory];
  const category = CATEGORIES.find((c) => c.id === activeCategory)!;

  return (
    <div className="page">
      <PageHeader
        title="Style"
        subtitle="Choose how your words are written in each kind of app. SpeakIt picks the style from the app you are typing in."
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="tabs" role="tablist" aria-label="App category">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              role="tab"
              className="tab"
              aria-selected={activeCategory === c.id}
              onClick={() => setActiveCategory(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
        <p className="hint" style={{ fontSize: 'var(--text-s)' }}>
          {category.apps}
        </p>
      </div>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <h2 className="section-title">Tone</h2>
          <p className="hint" style={{ marginTop: 4, fontSize: 'var(--text-s)' }}>
            If you say: <span style={{ color: 'var(--ink-2)' }}>“{SPOKEN}”</span>
          </p>
        </div>
        <div role="radiogroup" aria-label="Tone" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {TONES.map((t) => (
            <RadioOption
              key={t.id}
              checked={current.tone.toLowerCase() === t.id.toLowerCase()}
              onSelect={() => handleToneSelect(t.id)}
              title={t.id}
            >
              {t.sample}
            </RadioOption>
          ))}
        </div>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label className="field">
          <span className="section-title">Extra instructions</span>
          <span className="hint" style={{ fontSize: 'var(--text-s)', marginBottom: 4 }}>
            Optional rules for {category.label.toLowerCase()}, such as “use British spelling” or “keep it under two
            sentences”.
          </span>
          <textarea
            className="textarea"
            rows={3}
            placeholder="Always format lists as bullet points."
            value={current.custom_instructions || ''}
            onChange={(e) => handleInstructionsChange(e.target.value)}
            onBlur={() => saveStyle(styles[activeCategory])}
          />
        </label>
        <div style={{ height: 20 }} aria-live="polite">
          {saved && (
            <span className="status status--ok">
              <Check size={14} strokeWidth={2.25} /> Saved
            </span>
          )}
        </div>
      </section>
    </div>
  );
};

import React, { useState } from 'react';
import { BookA, Bug, Check, Coffee, ExternalLink, Heart, Lock, Mic, MousePointerClick, ShieldAlert } from 'lucide-react';
import { productConfig } from '../../../../product.config';
import { ICON, Kbd, PageHeader, Toast } from '../components/ui';

const REPO_DOCS = 'https://github.com/DecoyINDIA/Speak-It/blob/main/docs';

export const HelpPage: React.FC = () => {
  const [toast, setToast] = useState<string | null>(null);

  async function exportStats() {
    const stats = await (window as any).speakit?.getAnonymizedStats();
    if (!stats) return;
    await navigator.clipboard.writeText(JSON.stringify(stats, null, 2));
    setToast('Anonymous stats copied. Paste them into your GitHub issue.');
    setTimeout(() => setToast(null), 3000);
  }

  return (
    <div className="page">
      <PageHeader title="Help" subtitle={`How to get the most out of ${productConfig.displayName}.`} />

      <section className="help-list">
        <HelpItem icon={<Mic {...ICON} />} title="Dictate">
          Click into any text box, hold <Kbd keys={['Ctrl', 'Win']} />, speak, then let go. Clean text is pasted at
          your cursor.
        </HelpItem>

        <HelpItem icon={<MousePointerClick {...ICON} />} title="Hands-free mode">
          Tap <Kbd keys={['Ctrl', 'Win']} /> twice quickly to keep recording without holding the keys. Tap again, or
          press stop on the bar, when you are done.
        </HelpItem>

        <HelpItem icon={<BookA {...ICON} />} title="Fix words it gets wrong">
          Add names, acronyms and Hinglish words in Dictionary. Use “Sounds like” to map what it hears to what you
          meant.
        </HelpItem>

        <HelpItem icon={<ShieldAlert {...ICON} />} title="Apps running as administrator">
          Windows blocks typing into apps started with “Run as administrator”. Open the app normally, or paste the text
          SpeakIt copies to your clipboard with <Kbd keys={['Ctrl', 'V']} />.
        </HelpItem>

        <HelpItem icon={<Lock {...ICON} />} title="Privacy">
          {productConfig.displayName} is open source (MIT) and works fully offline. Audio, transcripts and usage data
          stay on this PC unless you connect a cloud provider.
          <div className="help-links">
            <a href={`${REPO_DOCS}/privacy.md`} target="_blank" rel="noreferrer">
              Privacy policy <ExternalLink size={12} strokeWidth={2} />
            </a>
            <a href={`${REPO_DOCS}/terms.md`} target="_blank" rel="noreferrer">
              Terms of use <ExternalLink size={12} strokeWidth={2} />
            </a>
            <a href={`${REPO_DOCS}/troubleshooting.md`} target="_blank" rel="noreferrer">
              Troubleshooting <ExternalLink size={12} strokeWidth={2} />
            </a>
          </div>
        </HelpItem>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2 className="section-title">Report a problem</h2>
        <p className="muted" style={{ maxWidth: '62ch' }}>
          Opens a GitHub issue with your app and system details. Your voice and transcripts are never included.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn--secondary" onClick={() => (window as any).speakit?.openFeedbackIssue()}>
            <Bug size={16} strokeWidth={1.75} /> Report a bug
          </button>
          <button className="btn btn--ghost" onClick={exportStats}>
            Copy anonymous stats
          </button>
        </div>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2 className="section-title">Support the project</h2>
        <p className="muted" style={{ maxWidth: '62ch' }}>
          {productConfig.displayName} is free and built independently. If it saves you time, you can chip in.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <a className="btn btn--secondary" style={{ textDecoration: 'none' }} href="https://github.com/sponsors/DecoyINDIA" target="_blank" rel="noreferrer">
            <Heart size={16} strokeWidth={1.75} /> Sponsor on GitHub
          </a>
          <a className="btn btn--secondary" style={{ textDecoration: 'none' }} href="https://buymeacoffee.com/DecoyINDIA" target="_blank" rel="noreferrer">
            <Coffee size={16} strokeWidth={1.75} /> Buy me a coffee
          </a>
        </div>
      </section>

      <p className="hint">{productConfig.strings.notAffiliatedNotice}</p>

      {toast && (
        <Toast>
          <Check size={16} strokeWidth={2.25} /> {toast}
        </Toast>
      )}
    </div>
  );
};

function HelpItem({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="help-item">
      <div className="help-item__icon" aria-hidden>
        {icon}
      </div>
      <div>
        <h3 className="help-item__title">{title}</h3>
        <div className="help-item__body">{children}</div>
      </div>
    </div>
  );
}

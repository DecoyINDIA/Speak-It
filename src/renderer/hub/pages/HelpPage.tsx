import React from 'react';
import { productConfig } from '../../../../product.config';

export const HelpPage: React.FC = () => {
  return (
    <div style={{ maxWidth: '840px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '26px', fontWeight: 600 }}>Help & Quick Reference</h1>
        <p style={{ color: 'var(--muted)', fontSize: '14px', marginTop: '4px' }}>
          Everything you need to get the most out of {productConfig.displayName}.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <HelpCard title="🎙️ How to Dictate">
          <p>
            Hold <kbd style={{ padding: '2px 6px', background: 'var(--sand-2)', borderRadius: '4px' }}>Ctrl + Win</kbd> in any normal, non-elevated application, speak your thoughts, and release the keys. Polished text will automatically paste directly at your cursor.
          </p>
        </HelpCard>

        <HelpCard title="⚡ Hands-Free Mode (Double-Tap)">
          <p>
            Quickly tap <kbd style={{ padding: '2px 6px', background: 'var(--sand-2)', borderRadius: '4px' }}>Ctrl + Win</kbd> twice within 300ms to lock dictation in hands-free mode. The bar will show cancel (✕) and stop (■) buttons. When finished speaking, tap again or press the stop button.
          </p>
        </HelpCard>

        <HelpCard title="🔒 Elevated Administrator Windows">
          <p>
            Windows User Interface Privilege Isolation (UIPI) blocks low-level keyboard hooks and simulated input into elevated (run as administrator) applications. To dictate into administrative tools, launch them without elevation or use the "Copied to clipboard" fallback.
          </p>
        </HelpCard>

        <HelpCard title="📖 Custom Dictionary & Pronunciation">
          <p>
            Add uncommon names, acronyms, or Hindi/Hinglish terms in the Custom Dictionary tab. You can map how a word sounds to ensure the speech model formats it with exact capitalization.
          </p>
        </HelpCard>

        <HelpCard title="⚖️ Open Source & Privacy">
          <p>
            {productConfig.displayName} is 100% open source under the MIT License. It costs $0 to run forever. No user audio, transcripts, or telemetry are ever collected or sent to the author.
          </p>
          <p style={{ marginTop: '8px', fontStyle: 'italic', color: 'var(--muted)', fontSize: '12px' }}>
            {productConfig.strings.notAffiliatedNotice}
          </p>
        </HelpCard>
      </div>
    </div>
  );
};

function HelpCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: '18px 22px', borderRadius: 'var(--r-m)', background: 'var(--sand)', border: '1px solid var(--line)' }}>
      <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)', marginBottom: '8px' }}>{title}</h3>
      <div style={{ fontSize: '13px', color: 'var(--ink-2)', lineHeight: '1.5' }}>{children}</div>
    </div>
  );
}

import React, { useState } from 'react';
import { productConfig } from '../../../../product.config';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onComplete }) => {
  const [step, setStep] = useState(1);
  const [selectedEngine, setSelectedEngine] = useState<'groq' | 'gemini' | 'offline'>('groq');
  const [apiKey, setApiKey] = useState('');
  const [contextAwareness, setContextAwareness] = useState(false);
  const [keepAudio, setKeepAudio] = useState(true);
  const [testText, setTestText] = useState('');

  if (!isOpen) return null;

  async function handleFinish() {
    if ((window as any).speakit) {
      if (apiKey.trim()) {
        await (window as any).speakit.setSecret(selectedEngine, apiKey.trim());
      }
      await (window as any).speakit.updateSettings({
        privacy: {
          contextAwareness,
          keepAudio,
          retentionDays: 90,
        },
      });
    }
    onComplete();
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
      }}
    >
      <div
        style={{
          width: '580px',
          minHeight: '440px',
          backgroundColor: 'var(--panel)',
          borderRadius: 'var(--r-l)',
          border: '1px solid var(--line)',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '32px 36px',
        }}
      >
        {/* Step 1: Welcome */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
              🎙️
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: 600, color: 'var(--ink)' }}>
              Welcome to {productConfig.displayName}
            </h1>
            <p style={{ fontSize: '15px', color: 'var(--ink-2)', lineHeight: '1.5' }}>
              Voice typing that sounds like you. Speak anywhere in Windows, and clean text appears right at your cursor.
            </p>
            <div style={{ padding: '14px 18px', background: 'var(--sand)', borderRadius: 'var(--r-m)', fontSize: '13px', color: 'var(--muted)' }}>
              • <strong>100% Free forever:</strong> Bring your own free API key or run offline.<br />
              • <strong>Private by default:</strong> Your data stays on your PC. No analytics collected.
            </div>
          </div>
        )}

        {/* Step 2: Engine Selection */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 600 }}>Choose Your Speech Engine</h2>
            <p style={{ fontSize: '13px', color: 'var(--muted)' }}>
              Select where your audio is transcribed. You can change this anytime in Settings.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <EngineChoiceCard
                selected={selectedEngine === 'groq'}
                title="Groq Cloud (Recommended)"
                badge="Fastest · ~500ms"
                desc="Free Whisper Large-v3-Turbo with incredible speed. Prompts are never used for training."
                onClick={() => setSelectedEngine('groq')}
              />
              <EngineChoiceCard
                selected={selectedEngine === 'gemini'}
                title="Google Gemini"
                badge="Multimodal"
                desc="Free-tier audio transcription. Note: Google un-billed tier data may undergo human review."
                onClick={() => setSelectedEngine('gemini')}
              />
              <EngineChoiceCard
                selected={selectedEngine === 'offline'}
                title="100% Offline (whisper.cpp)"
                badge="Zero Cloud"
                desc="Runs entirely on your local machine with no internet connection required."
                onClick={() => setSelectedEngine('offline')}
              />
            </div>

            {selectedEngine !== 'offline' && (
              <div style={{ marginTop: '6px' }}>
                <input
                  type="password"
                  placeholder={`Enter your ${selectedEngine === 'groq' ? 'Groq' : 'Gemini'} API key`}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--r-s)',
                    border: '1px solid var(--line)',
                    background: 'var(--sand)',
                    color: 'var(--ink)',
                    fontSize: '13px',
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Step 3: Privacy Choices */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 600 }}>Privacy Settings</h2>
            <p style={{ fontSize: '13px', color: 'var(--muted)' }}>
              Choose your data preferences. You are always in control.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
              <div style={{ padding: '14px 18px', borderRadius: 'var(--r-m)', background: 'var(--sand)', border: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>Context Awareness (Default: Off)</div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px', maxWidth: '400px' }}>
                      Sends active app name and up to 300 characters before cursor to the AI for smarter capitalization and punctuation. Never activates in password fields.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={contextAwareness}
                    onChange={(e) => setContextAwareness(e.target.checked)}
                  />
                </div>
              </div>

              <div style={{ padding: '14px 18px', borderRadius: 'var(--r-m)', background: 'var(--sand)', border: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>Keep Last 20 Audio Recordings</div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px', maxWidth: '400px' }}>
                      Allows you to replay or retry dictations if a network request fails. Audio is stored purely locally.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={keepAudio}
                    onChange={(e) => setKeepAudio(e.target.checked)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: First Dictation Practice */}
        {step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 600 }}>You're Ready to Dictate!</h2>
            <p style={{ fontSize: '14px', color: 'var(--ink-2)' }}>
              Hold <kbd style={{ padding: '3px 8px', background: 'var(--sand-2)', borderRadius: '4px', fontWeight: 600 }}>Ctrl + Win</kbd>, speak what you want to type, and release.
            </p>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--muted)', marginBottom: '6px' }}>
                Practice Box:
              </label>
              <textarea
                rows={4}
                placeholder="Click here, hold Ctrl + Win, and dictate your first sentence..."
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 'var(--r-m)',
                  border: '1px solid var(--line)',
                  background: 'var(--sand)',
                  color: 'var(--ink)',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'none',
                }}
              />
            </div>
          </div>
        )}

        {/* Bottom Step Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: step === i ? 'var(--accent)' : 'var(--line)',
                }}
              />
            ))}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--r-s)',
                  background: 'transparent',
                  border: '1px solid var(--line)',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                Back
              </button>
            )}
            {step < 4 ? (
              <button
                onClick={() => setStep(step + 1)}
                style={{
                  padding: '8px 20px',
                  borderRadius: 'var(--r-s)',
                  background: 'var(--ink)',
                  color: 'var(--panel)',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '13px',
                }}
              >
                Continue →
              </button>
            ) : (
              <button
                onClick={handleFinish}
                style={{
                  padding: '8px 24px',
                  borderRadius: 'var(--r-s)',
                  background: 'var(--accent)',
                  color: 'var(--accent-ink)',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '13px',
                }}
              >
                Finish Setup
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

function EngineChoiceCard({ title, badge, desc, selected, onClick }: { title: string; badge: string; desc: string; selected: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '12px 16px',
        borderRadius: 'var(--r-m)',
        background: selected ? 'var(--panel)' : 'var(--sand)',
        border: selected ? '2px solid var(--accent)' : '1px solid var(--line)',
        cursor: 'pointer',
        boxShadow: selected ? '0 2px 8px rgba(240, 161, 46, 0.15)' : 'none',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--ink)' }}>{title}</span>
        <span style={{ fontSize: '11px', color: 'var(--accent-ink)', background: 'var(--accent-soft)', padding: '2px 6px', borderRadius: '4px', fontWeight: 500 }}>
          {badge}
        </span>
      </div>
      <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>{desc}</div>
    </div>
  );
}

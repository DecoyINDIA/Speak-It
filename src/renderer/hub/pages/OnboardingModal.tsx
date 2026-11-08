import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, AudioLines, ExternalLink, HardDrive, Lock } from 'lucide-react';
import { productConfig } from '../../../../product.config';
import { Dialog, ICON_SM, Kbd, RadioOption, Switch } from '../components/ui';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

type Engine = 'groq' | 'gemini' | 'offline';
const STEPS = 4;
const DOCS = 'https://github.com/DecoyINDIA/Speak-It/blob/main/docs';

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onComplete }) => {
  const [step, setStep] = useState(1);
  const [selectedEngine, setSelectedEngine] = useState<Engine>('offline');
  const [apiKey, setApiKey] = useState('');
  const [contextAwareness, setContextAwareness] = useState(false);
  const [keepAudio, setKeepAudio] = useState(true);
  const [testText, setTestText] = useState('');

  React.useEffect(() => {
    (window as any).speakit?.setOnboardingStep?.(step);
  }, [step]);

  if (!isOpen) return null;

  async function handleFinish() {
    const api = (window as any).speakit;
    if (api) {
      if (apiKey.trim() && selectedEngine !== 'offline') {
        await api.setSecret(selectedEngine, apiKey.trim());
      }
      await api.updateSettings({
        providers: {
          chain: selectedEngine === 'offline' ? ['offline', 'groq', 'gemini'] : [selectedEngine, 'offline'],
        },
        privacy: { contextAwareness, keepAudio, retentionDays: 90 },
      });
      await api.setOnboardingStep(4);
    }
    onComplete();
  }

  const engineName = selectedEngine === 'groq' ? 'Groq' : 'Gemini';

  return (
    <Dialog label={`Set up ${productConfig.displayName}`} width={580}>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: 460, padding: '32px 36px 24px' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {step === 1 && (
            <>
              <span className="logo-mark" style={{ width: 44, height: 44, borderRadius: 12 }} aria-hidden>
                <AudioLines size={24} strokeWidth={2.25} />
              </span>
              <h1 className="page-title" style={{ marginTop: 8 }}>
                Welcome to {productConfig.displayName}
              </h1>
              <p style={{ color: 'var(--ink-2)', fontSize: 'var(--text-l)', lineHeight: 1.5 }}>
                Talk in any app on Windows and clean, punctuated text appears at your cursor.
              </p>
              <ul className="onb-points">
                <li>
                  <HardDrive {...ICON_SM} />
                  <span>
                    <strong>Works offline.</strong> No account or API key needed to start.
                  </span>
                </li>
                <li>
                  <Lock {...ICON_SM} />
                  <span>
                    <strong>Private by default.</strong> Your voice and transcripts stay on this PC.
                  </span>
                </li>
              </ul>
              <p className="hint" style={{ marginTop: 'auto' }}>
                By continuing you agree to the{' '}
                <a href={`${DOCS}/terms.md`} target="_blank" rel="noreferrer">
                  Terms of Use
                </a>{' '}
                and{' '}
                <a href={`${DOCS}/privacy.md`} target="_blank" rel="noreferrer">
                  Privacy Policy
                </a>
                .
              </p>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <h2 className="page-title" style={{ fontSize: 'var(--text-xl)' }}>Choose a speech engine</h2>
                <p className="page-sub">Start offline now. You can add a cloud engine any time in Settings.</p>
              </div>
              <div role="radiogroup" aria-label="Speech engine" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <RadioOption
                  checked={selectedEngine === 'offline'}
                  onSelect={() => setSelectedEngine('offline')}
                  title="Offline"
                  badge={<span className="badge badge--accent">Recommended</span>}
                >
                  Runs on this PC. No internet, keys or account.
                </RadioOption>
                <RadioOption
                  checked={selectedEngine === 'groq'}
                  onSelect={() => setSelectedEngine('groq')}
                  title="Groq"
                  badge={<span className="badge">Fastest</span>}
                >
                  Free cloud transcription in about half a second. Needs a free API key.
                </RadioOption>
                <RadioOption
                  checked={selectedEngine === 'gemini'}
                  onSelect={() => setSelectedEngine('gemini')}
                  title="Google Gemini"
                >
                  Free tier available. Google may review free-tier data.
                </RadioOption>
              </div>

              {selectedEngine !== 'offline' && (
                <label className="field" style={{ marginTop: 4 }}>
                  <span style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="label">{engineName} API key</span>
                    <a
                      href={selectedEngine === 'groq' ? 'https://console.groq.com/keys' : 'https://aistudio.google.com/app/apikey'}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: 'var(--text-xs)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    >
                      Get a free key <ExternalLink size={12} strokeWidth={2} />
                    </a>
                  </span>
                  <input
                    className="input"
                    type="password"
                    placeholder={selectedEngine === 'groq' ? 'gsk_…' : 'AIza…'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                  <span className="hint">No key yet? Leave this empty and SpeakIt will use offline mode.</span>
                </label>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <div>
                <h2 className="page-title" style={{ fontSize: 'var(--text-xl)' }}>Privacy choices</h2>
                <p className="page-sub">You can change these later in Settings.</p>
              </div>
              <div className="settings-list">
                <div className="setting-row">
                  <div>
                    <div className="setting-row__title">Use app context</div>
                    <div className="setting-row__desc">
                      Sends the app name and up to 300 characters before your cursor to the AI for better punctuation.
                      Never used in password fields.
                    </div>
                  </div>
                  <Switch label="Use app context" checked={contextAwareness} onChange={setContextAwareness} />
                </div>
                <div className="setting-row">
                  <div>
                    <div className="setting-row__title">Keep recent recordings</div>
                    <div className="setting-row__desc">
                      Saves your last 20 recordings on this PC so you can retry if a request fails.
                    </div>
                  </div>
                  <Switch label="Keep recent recordings" checked={keepAudio} onChange={setKeepAudio} />
                </div>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <div>
                <h2 className="page-title" style={{ fontSize: 'var(--text-xl)' }}>Try it</h2>
                <p className="page-sub">
                  Click the box, hold <Kbd keys={['Ctrl', 'Win']} />, say a sentence, then let go.
                </p>
              </div>
              <textarea
                className="textarea"
                rows={5}
                aria-label="Practice box"
                placeholder="Your words will appear here"
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                style={{ resize: 'none', fontSize: 'var(--text-l)' }}
              />
              {selectedEngine === 'offline' && (
                <p className="hint">Running offline. For faster results, add a free Groq key in Settings later.</p>
              )}
            </>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 28 }}>
          <div className="steps" aria-label={`Step ${step} of ${STEPS}`}>
            {Array.from({ length: STEPS }, (_, i) => (
              <span key={i} data-active={step === i + 1} data-done={step > i + 1} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {step > 1 && (
              <button className="btn btn--ghost" onClick={() => setStep(step - 1)}>
                <ArrowLeft size={15} strokeWidth={2} /> Back
              </button>
            )}
            {step < STEPS ? (
              <button className="btn btn--primary" onClick={() => setStep(step + 1)}>
                {step === 1 ? 'Get started' : 'Continue'} <ArrowRight size={15} strokeWidth={2} />
              </button>
            ) : (
              <button className="btn btn--primary" onClick={handleFinish}>
                Finish setup
              </button>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
};

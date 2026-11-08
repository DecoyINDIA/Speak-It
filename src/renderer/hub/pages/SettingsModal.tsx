import React, { useState, useEffect } from 'react';
import { productConfig } from '../../../../product.config';

type SettingsSection = 'general' | 'system' | 'providers' | 'privacy' | 'about';

export const SettingsModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [section, setSection] = useState<SettingsSection>('general');
  const [settings, setSettings] = useState<any>(null);
  const [secretsStatus, setSecretsStatus] = useState<Record<string, boolean>>({});
  const [groqKeyInput, setGroqKeyInput] = useState('');
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  async function loadSettings() {
    if ((window as any).speakit) {
      const s = await (window as any).speakit.getSettings();
      if (s) setSettings(s);
      const sec = await (window as any).speakit.getSecretsStatus();
      if (sec) setSecretsStatus(sec);
    }
  }

  async function updateSetting(pathKey: string, val: any) {
    if (!settings || !(window as any).speakit) return;
    const [cat, key] = pathKey.split('.');
    const partial = { [cat]: { ...settings[cat], [key]: val } };
    const updated = await (window as any).speakit.updateSettings(partial);
    setSettings(updated);
    setSaveStatus('Saved');
    setTimeout(() => setSaveStatus(null), 1200);
  }

  async function saveKey(provider: string, keyVal: string) {
    if (!keyVal.trim() || !(window as any).speakit) return;
    await (window as any).speakit.setSecret(provider, keyVal.trim());
    if (provider === 'groq') setGroqKeyInput('');
    if (provider === 'gemini') setGeminiKeyInput('');
    loadSettings();
    setSaveStatus('Key saved securely in Windows DPAPI');
    setTimeout(() => setSaveStatus(null), 1500);
  }

  async function removeKey(provider: string) {
    if (!(window as any).speakit) return;
    await (window as any).speakit.deleteSecret(provider);
    loadSettings();
  }

  if (!isOpen || !settings) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          width: '740px',
          height: '520px',
          backgroundColor: 'var(--panel)',
          borderRadius: 'var(--r-l)',
          border: '1px solid var(--line)',
          boxShadow: '0 16px 48px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          overflow: 'hidden',
        }}
      >
        {/* Left Settings Navigation */}
        <div
          style={{
            width: '180px',
            borderRight: '1px solid var(--line)',
            background: 'var(--sand)',
            padding: '20px 12px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <NavBtn label="General" active={section === 'general'} onClick={() => setSection('general')} />
            <NavBtn label="System" active={section === 'system'} onClick={() => setSection('system')} />
            <NavBtn label="AI Providers" active={section === 'providers'} onClick={() => setSection('providers')} />
            <NavBtn label="Data & Privacy" active={section === 'privacy'} onClick={() => setSection('privacy')} />
            <NavBtn label="About" active={section === 'about'} onClick={() => setSection('about')} />
          </div>

          <button
            onClick={onClose}
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--r-s)',
              border: '1px solid var(--line)',
              background: 'var(--panel)',
              color: 'var(--ink)',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
            }}
          >
            Done
          </button>
        </div>

        {/* Right Settings Content */}
        <div style={{ flex: 1, padding: '24px 28px', overflowY: 'auto' }}>
          {saveStatus && (
            <div style={{ padding: '6px 12px', background: 'var(--accent-soft)', color: 'var(--accent-ink)', borderRadius: 'var(--r-s)', fontSize: '12px', fontWeight: 600, marginBottom: '16px' }}>
              ✓ {saveStatus}
            </div>
          )}

          {section === 'general' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 600 }}>General Settings</h2>

              <SettingRow title="Primary Dictation Hotkey" desc="Hold to dictate in any application">
                <kbd style={{ padding: '4px 10px', background: 'var(--sand)', border: '1px solid var(--line)', borderRadius: 'var(--r-s)', fontWeight: 600, fontSize: '13px' }}>
                  {settings.general.hotkey.join(' + ')}
                </kbd>
              </SettingRow>

              <SettingRow title="Hands-free Double Tap" desc="Double tap shortcut to lock dictation without holding">
                <input
                  type="checkbox"
                  checked={settings.general.doubleTapHandsFree}
                  onChange={(e) => updateSetting('general.doubleTapHandsFree', e.target.checked)}
                />
              </SettingRow>

              <SettingRow title="Output Language" desc="Keep original spoken language or translate to English">
                <select
                  value={settings.general.outputLanguage}
                  onChange={(e) => updateSetting('general.outputLanguage', e.target.value)}
                  style={{ padding: '6px 10px', borderRadius: 'var(--r-s)', border: '1px solid var(--line)', background: 'var(--sand)', color: 'var(--ink)' }}
                >
                  <option value="as_spoken">As Spoken (Supports Hinglish)</option>
                  <option value="en">Always English</option>
                </select>
              </SettingRow>

              <SettingRow title="Interface Theme" desc="Light or dark color scheme">
                <select
                  value={settings.general.theme}
                  onChange={(e) => updateSetting('general.theme', e.target.value)}
                  style={{ padding: '6px 10px', borderRadius: 'var(--r-s)', border: '1px solid var(--line)', background: 'var(--sand)', color: 'var(--ink)' }}
                >
                  <option value="system">Follow System</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </SettingRow>
            </div>
          )}

          {section === 'system' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 600 }}>System Integration</h2>

              <SettingRow title="Always Show Bar" desc="Keep floating bar visible even when idle">
                <input
                  type="checkbox"
                  checked={settings.system.alwaysShowBar}
                  onChange={(e) => updateSetting('system.alwaysShowBar', e.target.checked)}
                />
              </SettingRow>

              <SettingRow title="Audio Sound Effects" desc="Play start, stop, and insert chimes">
                <input
                  type="checkbox"
                  checked={settings.system.sounds}
                  onChange={(e) => updateSetting('system.sounds', e.target.checked)}
                />
              </SettingRow>

              <SettingRow title="Press Enter Command" desc="Automatically press Enter after dictation if spoken">
                <input
                  type="checkbox"
                  checked={settings.system.pressEnterCommand}
                  onChange={(e) => updateSetting('system.pressEnterCommand', e.target.checked)}
                />
              </SettingRow>

              <SettingRow title="Mic Warm Window" desc="Keep mic open after dictation for instant repeat dictations">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="range"
                    min="0"
                    max="60"
                    step="5"
                    value={settings.system.micWarmWindowSeconds}
                    onChange={(e) => updateSetting('system.micWarmWindowSeconds', parseInt(e.target.value, 10))}
                  />
                  <span style={{ fontSize: '13px', color: 'var(--muted)', width: '36px' }}>{settings.system.micWarmWindowSeconds}s</span>
                </div>
              </SettingRow>
            </div>
          )}

          {section === 'providers' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 600 }}>AI Speech & Cleanup Providers</h2>
                <p style={{ color: 'var(--muted)', fontSize: '13px', marginTop: '4px' }}>
                  Bring your own free API keys. Keys are encrypted with Windows DPAPI.
                </p>
              </div>

              {/* Groq Card */}
              <div style={{ padding: '16px', borderRadius: 'var(--r-m)', background: 'var(--sand)', border: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '14px' }}>Groq (Recommended)</span>
                    <span style={{ marginLeft: '8px', fontSize: '11px', color: 'var(--ok)', background: 'rgba(61,168,106,0.15)', padding: '2px 6px', borderRadius: '4px' }}>
                      Fastest · ~500ms
                    </span>
                  </div>
                  {secretsStatus.groq && (
                    <button onClick={() => removeKey('groq')} style={{ background: 'transparent', border: 'none', color: 'var(--err)', cursor: 'pointer', fontSize: '12px' }}>
                      Remove Key
                    </button>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
                  Model: {settings.providers.groq.sttModel} + {settings.providers.groq.llmModel}
                </div>
                {secretsStatus.groq ? (
                  <div style={{ fontSize: '12px', color: 'var(--ok)', marginTop: '8px' }}>✓ Free API Key Connected</div>
                ) : (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    <input
                      type="password"
                      placeholder="Enter Groq API Key (gsk_...)"
                      value={groqKeyInput}
                      onChange={(e) => setGroqKeyInput(e.target.value)}
                      style={{ flex: 1, padding: '6px 10px', borderRadius: 'var(--r-s)', border: '1px solid var(--line)', background: 'var(--panel)', color: 'var(--ink)' }}
                    />
                    <button
                      onClick={() => saveKey('groq', groqKeyInput)}
                      style={{ padding: '6px 14px', borderRadius: 'var(--r-s)', background: 'var(--ink)', color: 'var(--panel)', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                    >
                      Save Key
                    </button>
                  </div>
                )}
              </div>

              {/* Gemini Card */}
              <div style={{ padding: '16px', borderRadius: 'var(--r-m)', background: 'var(--sand)', border: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: '14px' }}>Google Gemini</span>
                  {secretsStatus.gemini && (
                    <button onClick={() => removeKey('gemini')} style={{ background: 'transparent', border: 'none', color: 'var(--err)', cursor: 'pointer', fontSize: '12px' }}>
                      Remove Key
                    </button>
                  )}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--warn)', marginTop: '4px' }}>
                  Note: On Google's un-billed tier, data may be used by Google for product improvement.
                </div>
                {secretsStatus.gemini ? (
                  <div style={{ fontSize: '12px', color: 'var(--ok)', marginTop: '8px' }}>✓ Free API Key Connected</div>
                ) : (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    <input
                      type="password"
                      placeholder="Enter Gemini API Key (AIza...)"
                      value={geminiKeyInput}
                      onChange={(e) => setGeminiKeyInput(e.target.value)}
                      style={{ flex: 1, padding: '6px 10px', borderRadius: 'var(--r-s)', border: '1px solid var(--line)', background: 'var(--panel)', color: 'var(--ink)' }}
                    />
                    <button
                      onClick={() => saveKey('gemini', geminiKeyInput)}
                      style={{ padding: '6px 14px', borderRadius: 'var(--r-s)', background: 'var(--ink)', color: 'var(--panel)', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                    >
                      Save Key
                    </button>
                  </div>
                )}
              </div>

              {/* Offline Whisper Engine */}
              <div style={{ padding: '16px', borderRadius: 'var(--r-m)', background: 'var(--sand)', border: '1px solid var(--line)' }}>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>Offline Whisper (whisper.cpp)</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
                  Zero internet needed. Model: {settings.providers.offline.model}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--ok)', marginTop: '8px' }}>✓ Offline Engine Ready</div>
              </div>
            </div>
          )}

          {section === 'privacy' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 600 }}>Data & Privacy</h2>

              <SettingRow title="History Retention" desc="Automatically clean up transcripts older than this policy">
                <select
                  value={settings.privacy.retentionDays}
                  onChange={(e) => updateSetting('privacy.retentionDays', parseInt(e.target.value, 10))}
                  style={{ padding: '6px 10px', borderRadius: 'var(--r-s)', border: '1px solid var(--line)', background: 'var(--sand)', color: 'var(--ink)' }}
                >
                  <option value={7}>7 Days</option>
                  <option value={30}>30 Days</option>
                  <option value={90}>90 Days (Recommended)</option>
                  <option value={0}>Keep Forever</option>
                </select>
              </SettingRow>

              <SettingRow title="Keep Last 20 Audio Recordings" desc="Store local WebM files for replay and retrying failed dictations">
                <input
                  type="checkbox"
                  checked={settings.privacy.keepAudio}
                  onChange={(e) => updateSetting('privacy.keepAudio', e.target.checked)}
                />
              </SettingRow>

              <SettingRow
                title="Context Awareness"
                desc="Send active app name & pre-cursor text to AI for better punctuation and casing (Default: Off)"
              >
                <input
                  type="checkbox"
                  checked={settings.privacy.contextAwareness}
                  onChange={(e) => updateSetting('privacy.contextAwareness', e.target.checked)}
                />
              </SettingRow>
            </div>
          )}

          {section === 'about' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 600 }}>About {productConfig.displayName}</h2>
              <div style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: '1.6' }}>
                <p><strong>Version:</strong> {productConfig.version}</p>
                <p><strong>License:</strong> MIT Open Source</p>
                <p><strong>Cost:</strong> $0 forever</p>
                <p style={{ marginTop: '12px', fontStyle: 'italic', color: 'var(--ink-2)' }}>
                  {productConfig.strings.notAffiliatedNotice}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function NavBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 12px',
        borderRadius: 'var(--r-s)',
        background: active ? 'var(--panel)' : 'transparent',
        border: 'none',
        color: active ? 'var(--ink)' : 'var(--muted)',
        fontWeight: active ? 600 : 500,
        fontSize: '13px',
        textAlign: 'left',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}

function SettingRow({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid var(--line)' }}>
      <div style={{ maxWidth: '360px' }}>
        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)' }}>{title}</div>
        <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>{desc}</div>
      </div>
      <div>{children}</div>
    </div>
  );
}

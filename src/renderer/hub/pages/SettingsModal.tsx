import React, { useEffect, useState } from 'react';
import {
  Building2,
  Check,
  CircleCheck,
  Cpu,
  FolderOpen,
  Info,
  Monitor,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  TriangleAlert,
  X,
  type LucideIcon,
} from 'lucide-react';
import { productConfig } from '../../../../product.config';
import { Dialog, ICON, ICON_SM, Kbd, Switch } from '../components/ui';

type SettingsSection = 'general' | 'system' | 'providers' | 'privacy' | 'about';

const SECTIONS: { id: SettingsSection; label: string; icon: LucideIcon }[] = [
  { id: 'general', label: 'General', icon: SlidersHorizontal },
  { id: 'system', label: 'System', icon: Monitor },
  { id: 'providers', label: 'Speech engines', icon: Cpu },
  { id: 'privacy', label: 'Data & privacy', icon: ShieldCheck },
  { id: 'about', label: 'About', icon: Info },
];

const KEY_LABELS: Record<string, string> = { Control: 'Ctrl', Meta: 'Win' };

export const SettingsModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [section, setSection] = useState<SettingsSection>('general');
  const [settings, setSettings] = useState<any>(null);
  const [secretsStatus, setSecretsStatus] = useState<Record<string, boolean>>({});
  const [groqKeyInput, setGroqKeyInput] = useState('');
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [updateCheckMsg, setUpdateCheckMsg] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [managedPolicy, setManagedPolicy] = useState<{ isManaged?: boolean; offlineOnly?: boolean; disableHistory?: boolean } | null>(null);

  useEffect(() => {
    if (isOpen) loadSettings();
  }, [isOpen]);

  async function loadSettings() {
    const api = (window as any).speakit;
    if (!api) return;
    const s = await api.getSettings();
    if (s) setSettings(s);
    const sec = await api.getSecretsStatus();
    if (sec) setSecretsStatus(sec);
    const policy = await api.getManagedPolicy?.();
    if (policy) setManagedPolicy(policy);
  }

  function flash(msg: string) {
    setSaveStatus(msg);
    setTimeout(() => setSaveStatus(null), 1500);
  }

  async function updateSetting(pathKey: string, val: any) {
    const api = (window as any).speakit;
    if (!settings || !api) return;
    const [cat, key] = pathKey.split('.');
    const partial = { [cat]: { ...settings[cat], [key]: val } };
    const updated = await api.updateSettings(partial);
    setSettings(updated);
    flash('Saved');
  }

  async function saveKey(provider: string, keyVal: string) {
    const api = (window as any).speakit;
    if (!keyVal.trim() || !api) return;
    await api.setSecret(provider, keyVal.trim());
    if (provider === 'groq') setGroqKeyInput('');
    if (provider === 'gemini') setGeminiKeyInput('');
    loadSettings();
    flash('Key saved and encrypted');
  }

  async function removeKey(provider: string) {
    await (window as any).speakit?.deleteSecret(provider);
    loadSettings();
  }

  async function checkUpdates() {
    const api = (window as any).speakit;
    if (!api?.checkForUpdates) return;
    setChecking(true);
    setUpdateCheckMsg(null);
    try {
      const res = await api.checkForUpdates();
      if (res.status === 'available') setUpdateCheckMsg(`Version ${res.version} is available.`);
      else if (res.status === 'latest') setUpdateCheckMsg('You are on the latest version.');
      else if (res.status === 'dev') setUpdateCheckMsg('Development build, updates are off.');
      else setUpdateCheckMsg(`Could not check for updates: ${res.version}`);
    } finally {
      setChecking(false);
    }
  }

  if (!isOpen || !settings) return null;

  const offlineOnly = !!managedPolicy?.offlineOnly;

  return (
    <Dialog label="Settings" onClose={onClose} width={780} height={560}>
      <div style={{ display: 'flex', height: '100%' }}>
        <nav className="settings-nav" aria-label="Settings sections">
          <div className="settings-nav__title">Settings</div>
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className="nav-item"
              aria-current={section === id ? 'page' : undefined}
              onClick={() => setSection(id)}
            >
              <Icon {...ICON} />
              {label}
            </button>
          ))}
        </nav>

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div className="settings-head">
            <h2 className="section-title" style={{ fontSize: 'var(--text-xl)' }}>
              {SECTIONS.find((s) => s.id === section)!.label}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {saveStatus && (
                <span className="status status--ok" role="status">
                  <Check size={14} strokeWidth={2.25} /> {saveStatus}
                </span>
              )}
              <button className="icon-btn" onClick={onClose} aria-label="Close settings" title="Close">
                <X {...ICON} />
              </button>
            </div>
          </div>

          <div className="settings-body">
            {section === 'general' && (
              <div className="settings-list">
                <SettingRow title="Dictation shortcut" desc="Hold to record in any app.">
                  <Kbd keys={settings.general.hotkey.map((k: string) => KEY_LABELS[k] ?? k)} />
                </SettingRow>
                <SettingRow title="Hands-free on double tap" desc="Tap the shortcut twice to keep recording without holding.">
                  <Switch
                    label="Hands-free on double tap"
                    checked={settings.general.doubleTapHandsFree}
                    onChange={(v) => updateSetting('general.doubleTapHandsFree', v)}
                  />
                </SettingRow>
                <SettingRow title="Output language" desc="Keep the language you speak, including Hinglish, or always write English.">
                  <select
                    className="select"
                    value={settings.general.outputLanguage}
                    onChange={(e) => updateSetting('general.outputLanguage', e.target.value)}
                  >
                    <option value="as_spoken">As spoken</option>
                    <option value="en">Always English</option>
                  </select>
                </SettingRow>
                <SettingRow title="Theme" desc="Applied when you close settings.">
                  <select
                    className="select"
                    value={settings.general.theme}
                    onChange={(e) => updateSetting('general.theme', e.target.value)}
                  >
                    <option value="system">Match Windows</option>
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                  </select>
                </SettingRow>
              </div>
            )}

            {section === 'system' && (
              <div className="settings-list">
                <SettingRow title="Always show the bar" desc="Keep the floating bar on screen when you are not dictating.">
                  <Switch label="Always show the bar" checked={settings.system.alwaysShowBar} onChange={(v) => updateSetting('system.alwaysShowBar', v)} />
                </SettingRow>
                <SettingRow title="Sounds" desc="Play a short sound when recording starts, stops and text is pasted.">
                  <Switch label="Sounds" checked={settings.system.sounds} onChange={(v) => updateSetting('system.sounds', v)} />
                </SettingRow>
                <SettingRow title="“Press enter” voice command" desc="Say “press enter” at the end to send the message.">
                  <Switch
                    label="Press enter voice command"
                    checked={settings.system.pressEnterCommand}
                    onChange={(v) => updateSetting('system.pressEnterCommand', v)}
                  />
                </SettingRow>
                <SettingRow title="Keep microphone ready" desc="Leave the mic open briefly after dictating so the next one starts instantly.">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <input
                      className="range"
                      type="range"
                      min="0"
                      max="60"
                      step="5"
                      aria-label="Keep microphone ready, seconds"
                      value={settings.system.micWarmWindowSeconds}
                      onChange={(e) => updateSetting('system.micWarmWindowSeconds', parseInt(e.target.value, 10))}
                    />
                    <span style={{ width: 32, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--ink-2)', fontSize: 'var(--text-s)' }}>
                      {settings.system.micWarmWindowSeconds}s
                    </span>
                  </div>
                </SettingRow>
              </div>
            )}

            {section === 'providers' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {managedPolicy?.isManaged && (
                  <div className="callout">
                    <Building2 {...ICON_SM} />
                    <div className="callout__body">
                      <strong>Managed by your organization.</strong>{' '}
                      {offlineOnly ? 'Cloud engines are turned off. Dictation runs fully offline.' : 'Some options may be locked.'}
                    </div>
                  </div>
                )}
                {!offlineOnly && (
                  <p className="muted" style={{ fontSize: 'var(--text-s)' }}>
                    Add a free API key for faster cloud transcription. Keys are encrypted on this PC with Windows DPAPI.
                  </p>
                )}

                <div className="settings-list">
                  <EngineRow
                    name="Offline (whisper.cpp)"
                    detail={`No internet needed. Model: ${settings.providers.offline.model}`}
                    status={
                      <span className="status status--ok">
                        <CircleCheck size={15} strokeWidth={2} /> Ready
                      </span>
                    }
                  />

                  {!offlineOnly && (
                    <EngineRow
                      name="Groq"
                      badge={<span className="badge badge--accent">Fastest</span>}
                      detail={`${settings.providers.groq.sttModel} + ${settings.providers.groq.llmModel}`}
                      status={
                        secretsStatus.groq ? (
                          <span className="status status--ok">
                            <CircleCheck size={15} strokeWidth={2} /> Connected
                          </span>
                        ) : null
                      }
                      onRemove={secretsStatus.groq ? () => removeKey('groq') : undefined}
                    >
                      {!secretsStatus.groq && (
                        <KeyInput
                          value={groqKeyInput}
                          onChange={setGroqKeyInput}
                          placeholder="gsk_…"
                          onSave={() => saveKey('groq', groqKeyInput)}
                          label="Groq API key"
                        />
                      )}
                    </EngineRow>
                  )}

                  {!offlineOnly && (
                    <EngineRow
                      name="Google Gemini"
                      detail={
                        <span style={{ display: 'inline-flex', gap: 6, alignItems: 'flex-start', color: 'var(--warn)' }}>
                          <TriangleAlert size={14} strokeWidth={2} style={{ flexShrink: 0, marginTop: 2 }} />
                          On Google's free tier, your data may be used to improve Google products.
                        </span>
                      }
                      status={
                        secretsStatus.gemini ? (
                          <span className="status status--ok">
                            <CircleCheck size={15} strokeWidth={2} /> Connected
                          </span>
                        ) : null
                      }
                      onRemove={secretsStatus.gemini ? () => removeKey('gemini') : undefined}
                    >
                      {!secretsStatus.gemini && (
                        <KeyInput
                          value={geminiKeyInput}
                          onChange={setGeminiKeyInput}
                          placeholder="AIza…"
                          onSave={() => saveKey('gemini', geminiKeyInput)}
                          label="Gemini API key"
                        />
                      )}
                    </EngineRow>
                  )}
                </div>
              </div>
            )}

            {section === 'privacy' && (
              <div className="settings-list">
                <SettingRow title="Keep history for" desc="Older dictations are deleted automatically.">
                  <select
                    className="select"
                    value={settings.privacy.retentionDays}
                    onChange={(e) => updateSetting('privacy.retentionDays', parseInt(e.target.value, 10))}
                  >
                    <option value={7}>7 days</option>
                    <option value={30}>30 days</option>
                    <option value={90}>90 days</option>
                    <option value={0}>Forever</option>
                  </select>
                </SettingRow>
                <SettingRow title="Keep recent recordings" desc="Save your last 20 recordings on this PC so you can replay or retry them.">
                  <Switch label="Keep recent recordings" checked={settings.privacy.keepAudio} onChange={(v) => updateSetting('privacy.keepAudio', v)} />
                </SettingRow>
                <SettingRow
                  title="Use app context"
                  desc="Send the app name and the text before your cursor to the AI for better punctuation and capitalization. Off by default."
                >
                  <Switch
                    label="Use app context"
                    checked={settings.privacy.contextAwareness}
                    onChange={(v) => updateSetting('privacy.contextAwareness', v)}
                  />
                </SettingRow>
              </div>
            )}

            {section === 'about' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <dl className="about-grid">
                  <dt>Version</dt>
                  <dd>{productConfig.version}</dd>
                  <dt>License</dt>
                  <dd>MIT, open source</dd>
                  <dt>Price</dt>
                  <dd>Free</dd>
                </dl>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <button className="btn btn--secondary" onClick={checkUpdates} disabled={checking}>
                    <RefreshCw size={15} strokeWidth={1.75} style={checking ? { animation: 'spin 0.9s linear infinite' } : undefined} />
                    {checking ? 'Checking…' : 'Check for updates'}
                  </button>
                  <button className="btn btn--ghost" onClick={() => (window as any).speakit?.openLogs?.()}>
                    <FolderOpen size={15} strokeWidth={1.75} /> Open logs folder
                  </button>
                </div>
                {updateCheckMsg && (
                  <p role="status" style={{ fontSize: 'var(--text-s)', color: 'var(--ink-2)' }}>
                    {updateCheckMsg}
                  </p>
                )}
                <p className="hint">{productConfig.strings.notAffiliatedNotice}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
};

function SettingRow({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="setting-row">
      <div style={{ minWidth: 0 }}>
        <div className="setting-row__title">{title}</div>
        <div className="setting-row__desc">{desc}</div>
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

function EngineRow({
  name,
  badge,
  detail,
  status,
  onRemove,
  children,
}: {
  name: string;
  badge?: React.ReactNode;
  detail: React.ReactNode;
  status?: React.ReactNode;
  onRemove?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="setting-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div style={{ minWidth: 0 }}>
          <div className="setting-row__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {name}
            {badge}
          </div>
          <div className="setting-row__desc">{detail}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {status}
          {onRemove && (
            <button className="btn btn--danger-text btn--sm" onClick={onRemove}>
              Remove key
            </button>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

function KeyInput({
  value,
  onChange,
  placeholder,
  onSave,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  onSave: () => void;
  label: string;
}) {
  return (
    <form
      style={{ display: 'flex', gap: 8 }}
      onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }}
    >
      <input
        className="input"
        type="password"
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ flex: 1 }}
      />
      <button type="submit" className="btn btn--primary" disabled={!value.trim()}>
        Save key
      </button>
    </form>
  );
}

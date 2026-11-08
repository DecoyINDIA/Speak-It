let API_BASE = 'http://localhost:3000/api';

// State variables
let isRecording = false;
let userSettings = {
  hotkey: 'Alt+Space',
  hotkeyBehavior: 'push_to_talk',
  defaultMode: 'default',
  autoPaste: true,
  historyEnabled: true,
  geminiApiKey: ''
};

// UI Elements: Navigation & Pages
const pages = {
  home: document.getElementById('page-home'),
  transforms: document.getElementById('page-transforms'),
  meeting: document.getElementById('page-meeting'),
  history: document.getElementById('page-history'),
  dictionary: document.getElementById('page-dictionary'),
  settings: document.getElementById('page-settings')
};

const navItems = document.querySelectorAll('.nav-item');
const apiKeyAlert = document.getElementById('api-key-alert');

// Dashboard UI
const statusTitle = document.getElementById('status-title');
const statusDesc = document.getElementById('status-desc');
const recordBtn = document.getElementById('record-btn');
const shortcutDisplay = document.getElementById('shortcut-display');
const activeModeDisplay = document.getElementById('active-mode-display');
const activePasteDisplay = document.getElementById('active-paste-display');

// Transforms UI
let currentTransform = 'polish';
const transformCards = document.querySelectorAll('.transform-card');
const grabSelectionBtn = document.getElementById('grab-selection-btn');
const transformInput = document.getElementById('transform-input');
const runTransformBtn = document.getElementById('run-transform-btn');
const transformStatus = document.getElementById('transform-status');
const transformOutput = document.getElementById('transform-output');
const pasteBackBtn = document.getElementById('paste-back-btn');

// Meeting UI
let isMeetingRecording = false;
let meetingStreamManager = null;
let meetingTranscriptAccumulator = '';
const meetingRecordBtn = document.getElementById('meeting-record-btn');
const summarizeMeetingBtn = document.getElementById('summarize-meeting-btn');
const meetingStatus = document.getElementById('meeting-status');
const meetingDesc = document.getElementById('meeting-desc');
const meetingIcon = document.getElementById('meeting-icon');
const meetingResultsContainer = document.getElementById('meeting-results-container');
const meetingSummaryText = document.getElementById('meeting-summary-text');
const meetingDecisionsList = document.getElementById('meeting-decisions-list');
const meetingActionsList = document.getElementById('meeting-actions-list');
const meetingDetailedNotes = document.getElementById('meeting-detailed-notes');
const copyMeetingNotesBtn = document.getElementById('copy-meeting-notes-btn');

// Dictionary UI
const dictForm = document.getElementById('dict-form');
const dictTermInput = document.getElementById('dict-term');
const dictSoundsInput = document.getElementById('dict-sounds');
const dictContainer = document.getElementById('dict-container');

// History UI
const historyContainer = document.getElementById('history-container');
const clearHistoryBtn = document.getElementById('clear-history-btn');

// Settings UI
const settingsMode = document.getElementById('settings-mode');
const settingsHotkeyBehavior = document.getElementById('settings-hotkey-behavior');
const settingsAutopaste = document.getElementById('settings-autopaste');
const settingsHistory = document.getElementById('settings-history');
const settingsHotkey = document.getElementById('settings-hotkey');
const settingsApikey = document.getElementById('settings-apikey');
const saveSettingsBtn = document.getElementById('save-settings-btn');
const resetSettingsBtn = document.getElementById('reset-settings-btn');

// Audio Stream Manager instance (16kHz AudioWorklet + streaming WebSocket)
const audioStreamManager = new AudioStreamManager();

// Navigation handler
navItems.forEach(item => {
  item.addEventListener('click', () => {
    const pageId = item.getAttribute('data-page');
    switchPage(pageId);
  });
});

function switchPage(pageId) {
  navItems.forEach(nav => nav.classList.remove('active'));
  const activeNav = Array.from(navItems).find(n => n.getAttribute('data-page') === pageId);
  if (activeNav) activeNav.classList.add('active');

  Object.keys(pages).forEach(key => {
    if (key === pageId && pages[key]) {
      pages[key].classList.add('active');
    } else if (pages[key]) {
      pages[key].classList.remove('active');
    }
  });

  if (pageId === 'history') {
    loadHistory();
  } else if (pageId === 'dictionary') {
    loadDictionary();
  } else if (pageId === 'settings') {
    loadSettings();
  }
}

// Check Backend Health & API Key Status
async function checkBackendHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    const data = await res.json();
    if (!data.apiKeyConfigured) {
      apiKeyAlert.classList.add('active');
    } else {
      apiKeyAlert.classList.remove('active');
    }
  } catch (error) {
    console.error('Failed to connect to backend service:', error);
    apiKeyAlert.classList.add('active');
    apiKeyAlert.querySelector('div').innerHTML = `
      <strong>Backend Service Offline</strong><br>
      Could not connect to the local server. Ensure backend is running on <code>http://localhost:3000</code>.
    `;
  }
}

// Load settings
async function loadSettings() {
  try {
    const res = await fetch(`${API_BASE}/settings`);
    const settings = await res.json();
    userSettings = Object.assign(userSettings, settings);

    if (settingsMode) settingsMode.value = userSettings.defaultMode || 'default';
    if (settingsHotkeyBehavior) settingsHotkeyBehavior.value = userSettings.hotkeyBehavior || 'push_to_talk';
    if (settingsAutopaste) settingsAutopaste.checked = userSettings.autoPaste !== false;
    if (settingsHistory) settingsHistory.checked = userSettings.historyEnabled !== false;
    if (settingsHotkey) settingsHotkey.value = userSettings.hotkey || 'Alt+Space';
    if (settingsApikey) settingsApikey.value = userSettings.geminiApiKey || '';

    if (shortcutDisplay) shortcutDisplay.innerText = userSettings.hotkey;
    if (activeModeDisplay) activeModeDisplay.innerText = userSettings.defaultMode;
    if (activePasteDisplay) activePasteDisplay.innerText = userSettings.autoPaste ? 'Enabled' : 'Disabled';
  } catch (error) {
    console.error('Error fetching settings:', error);
  }
}

// Save settings
if (saveSettingsBtn) {
  saveSettingsBtn.addEventListener('click', async () => {
    const updatedSettings = {
      defaultMode: settingsMode.value,
      hotkeyBehavior: settingsHotkeyBehavior ? settingsHotkeyBehavior.value : 'push_to_talk',
      autoPaste: settingsAutopaste.checked,
      historyEnabled: settingsHistory.checked,
      hotkey: settingsHotkey.value.trim(),
      geminiApiKey: settingsApikey.value.trim()
    };

    try {
      const res = await fetch(`${API_BASE}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings)
      });
      const saved = await res.json();
      userSettings = Object.assign(userSettings, saved);

      window.api.updateHotkey(saved.hotkey);
      if (window.api.setHotkeyMode) {
        window.api.setHotkeyMode(saved.hotkeyBehavior || 'push_to_talk');
      }

      await loadSettings();
      await checkBackendHealth();
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings.');
    }
  });
}

// Reset settings
if (resetSettingsBtn) {
  resetSettingsBtn.addEventListener('click', async () => {
    if (confirm('Reset settings to defaults?')) {
      const defaults = {
        hotkey: 'Alt+Space',
        hotkeyBehavior: 'push_to_talk',
        defaultMode: 'default',
        autoPaste: true,
        historyEnabled: true,
        geminiApiKey: ''
      };
      try {
        await fetch(`${API_BASE}/settings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(defaults)
        });
        window.api.updateHotkey(defaults.hotkey);
        if (window.api.setHotkeyMode) window.api.setHotkeyMode(defaults.hotkeyBehavior);
        loadSettings();
      } catch (e) {
        console.error(e);
      }
    }
  });
}

// AI Transforms Page Handlers
transformCards.forEach(card => {
  card.addEventListener('click', () => {
    transformCards.forEach(c => c.classList.remove('active'));
    card.classList.add('active');
    currentTransform = card.getAttribute('data-transform');
  });
});

if (grabSelectionBtn) {
  grabSelectionBtn.addEventListener('click', async () => {
    try {
      grabSelectionBtn.innerText = 'Capturing...';
      const res = await window.api.copySelection();
      if (res && res.text) {
        transformInput.value = res.text;
        transformStatus.innerText = `Captured ${res.text.length} characters from active app.`;
      } else {
        transformStatus.innerText = 'No text selected. Please highlight text in an app first.';
      }
    } catch (err) {
      console.error('Failed to grab selection:', err);
      transformStatus.innerText = 'Failed to copy selection.';
    } finally {
      grabSelectionBtn.innerText = '📥 Grab Selection from Active App';
    }
  });
}

if (runTransformBtn) {
  runTransformBtn.addEventListener('click', async () => {
    const text = transformInput.value.trim();
    if (!text) {
      alert('Please enter or grab text to transform.');
      return;
    }

    runTransformBtn.disabled = true;
    runTransformBtn.innerText = 'Transforming...';
    transformStatus.innerText = 'Applying Gemini transform...';

    try {
      const res = await fetch(`${API_BASE}/transforms/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          transformType: currentTransform
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Transform failed.');
      }

      const result = await res.json();
      transformOutput.value = result.text;
      transformStatus.innerText = `Done! Word count: ${result.wordCount}`;
      pasteBackBtn.disabled = false;
    } catch (err) {
      console.error('Transform error:', err);
      transformStatus.innerText = `Error: ${err.message}`;
    } finally {
      runTransformBtn.disabled = false;
      runTransformBtn.innerText = 'Apply Transform';
    }
  });
}

if (pasteBackBtn) {
  pasteBackBtn.addEventListener('click', async () => {
    const text = transformOutput.value.trim();
    if (!text) return;
    try {
      pasteBackBtn.disabled = true;
      pasteBackBtn.innerText = 'Pasting...';
      await window.api.executePaste(text);
      transformStatus.innerText = 'Text pasted back into active window successfully!';
    } catch (err) {
      console.error('Paste error:', err);
      transformStatus.innerText = 'Failed to paste text.';
    } finally {
      pasteBackBtn.disabled = false;
      pasteBackBtn.innerText = '🚀 Replace Selection in App';
    }
  });
}

// Meeting Mode Logic
if (meetingRecordBtn) {
  meetingRecordBtn.addEventListener('click', async () => {
    if (isMeetingRecording) {
      // Stop meeting recording
      isMeetingRecording = false;
      meetingRecordBtn.innerText = 'Start Meeting Recording';
      meetingRecordBtn.classList.remove('btn-danger');
      meetingRecordBtn.classList.add('btn-primary');
      meetingStatus.innerText = 'Meeting Stopped';
      meetingDesc.innerText = 'Processing full meeting audio stream...';

      try {
        const result = await meetingStreamManager.stopStream(API_BASE, { mode: 'notes' });
        if (result && result.text) {
          meetingTranscriptAccumulator = result.text;
          meetingDesc.innerText = `Captured ${result.wordCount || result.text.split(/\s+/).length} words. Click 'Summarize Notes' to generate executive minutes.`;
          summarizeMeetingBtn.disabled = false;
        } else {
          meetingDesc.innerText = 'No clear speech captured during meeting.';
        }
      } catch (err) {
        console.error('Meeting stream error:', err);
        meetingDesc.innerText = `Error processing meeting audio: ${err.message}`;
      }
    } else {
      // Start meeting recording
      try {
        meetingStreamManager = new AudioStreamManager();
        await meetingStreamManager.startStream(API_BASE, { mode: 'notes' });
        isMeetingRecording = true;
        meetingRecordBtn.innerText = 'Stop Meeting Recording';
        meetingRecordBtn.classList.remove('btn-primary');
        meetingRecordBtn.classList.add('btn-danger');
        meetingStatus.innerText = 'Recording Meeting (Loopback + Mic)';
        meetingDesc.innerText = 'Capturing speaker dialogue in 16kHz mono...';
        summarizeMeetingBtn.disabled = true;
      } catch (err) {
        console.error('Failed to start meeting stream:', err);
        alert('Could not start meeting recording: ' + err.message);
      }
    }
  });
}

if (summarizeMeetingBtn) {
  summarizeMeetingBtn.addEventListener('click', async () => {
    if (!meetingTranscriptAccumulator) return;
    summarizeMeetingBtn.disabled = true;
    summarizeMeetingBtn.innerText = 'Summarizing...';

    try {
      const res = await fetch(`${API_BASE}/meetings/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: meetingTranscriptAccumulator })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to summarize meeting.');
      }

      const data = await res.json();
      meetingSummaryText.innerText = data.summary || 'Summary unavailable.';
      
      meetingDecisionsList.innerHTML = '';
      (data.decisions || []).forEach(d => {
        const li = document.createElement('li');
        li.innerText = d;
        meetingDecisionsList.appendChild(li);
      });

      meetingActionsList.innerHTML = '';
      (data.actionItems || []).forEach(a => {
        const li = document.createElement('li');
        li.innerText = a;
        meetingActionsList.appendChild(li);
      });

      meetingDetailedNotes.innerText = data.notes || '';
      meetingResultsContainer.style.display = 'block';
    } catch (err) {
      console.error('Summarize error:', err);
      alert('Error summarizing meeting: ' + err.message);
    } finally {
      summarizeMeetingBtn.disabled = false;
      summarizeMeetingBtn.innerText = 'Summarize Notes';
    }
  });
}

if (copyMeetingNotesBtn) {
  copyMeetingNotesBtn.addEventListener('click', () => {
    const summary = meetingSummaryText.innerText;
    const decisions = Array.from(meetingDecisionsList.querySelectorAll('li')).map(li => `- ${li.innerText}`).join('\n');
    const actions = Array.from(meetingActionsList.querySelectorAll('li')).map(li => `- ${li.innerText}`).join('\n');
    const notes = meetingDetailedNotes.innerText;

    const fullMarkdown = `# Meeting Notes\n\n## Executive Summary\n${summary}\n\n## Key Decisions\n${decisions}\n\n## Action Items\n${actions}\n\n## Discussion Details\n${notes}`;
    navigator.clipboard.writeText(fullMarkdown);
    alert('Meeting notes copied to clipboard in Markdown format!');
  });
}

// Dictionary Management
async function loadDictionary() {
  try {
    const res = await fetch(`${API_BASE}/dictionary`);
    const list = await res.json();
    dictContainer.innerHTML = '';

    if (list.length === 0) {
      dictContainer.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 20px;">
          Your dictionary is empty. Add industry jargon, brands, or names.
        </div>
      `;
      return;
    }

    list.forEach(item => {
      const card = document.createElement('div');
      card.className = 'dict-card';
      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div class="dict-word">${item.term}</div>
          <button class="btn btn-danger delete-dict-btn" data-id="${item.id}" style="padding: 4px 8px; font-size: 11px;">Delete</button>
        </div>
        <div class="dict-meta">
          ${item.soundsLike ? `<div>Sounds like: <em>${item.soundsLike}</em></div>` : ''}
          <div style="font-size: 10px; color: var(--text-muted);">Added: ${new Date(item.createdAt).toLocaleDateString()}</div>
        </div>
      `;
      dictContainer.appendChild(card);
    });

    document.querySelectorAll('.delete-dict-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.getAttribute('data-id');
        if (confirm('Remove this word?')) {
          try {
            await fetch(`${API_BASE}/dictionary/${id}`, { method: 'DELETE' });
            loadDictionary();
          } catch (err) {
            console.error(err);
          }
        }
      });
    });
  } catch (error) {
    console.error('Error fetching dictionary:', error);
  }
}

if (dictForm) {
  dictForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const term = dictTermInput.value.trim();
    const soundsLike = dictSoundsInput.value.trim();
    if (!term) return;

    try {
      const res = await fetch(`${API_BASE}/dictionary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ term, soundsLike })
      });
      if (res.ok) {
        dictTermInput.value = '';
        dictSoundsInput.value = '';
        loadDictionary();
      }
    } catch (error) {
      console.error(error);
    }
  });
}

// History Management
async function loadHistory() {
  try {
    const res = await fetch(`${API_BASE}/history`);
    const history = await res.json();
    historyContainer.innerHTML = '';

    if (history.length === 0) {
      historyContainer.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); padding: 40px;">
          No dictations captured yet. Press the hotkey to start speaking!
        </div>
      `;
      return;
    }

    history.forEach(item => {
      const card = document.createElement('div');
      card.className = 'history-card';
      card.innerHTML = `
        <div class="history-header">
          <span class="history-mode-badge">${item.mode}</span>
          <span class="history-time">${new Date(item.timestamp).toLocaleString()}</span>
        </div>
        <div style="font-weight: 500; font-size: 13px; color: var(--text-muted);">Cleaned Output:</div>
        <div class="history-text">${item.text}</div>
        <div style="font-weight: 500; font-size: 13px; color: var(--text-muted); margin-top: 4px;">Raw Transcript:</div>
        <div class="history-raw">${item.rawTranscript}</div>
        <div style="font-size: 11px; color: var(--text-muted); display: flex; gap: 15px;">
          <span>Words: ${item.wordCount}</span>
          <span>Latency: ${(item.durationMs / 1000).toFixed(1)}s</span>
        </div>
      `;
      historyContainer.appendChild(card);
    });
  } catch (error) {
    console.error('Error fetching history:', error);
  }
}

if (clearHistoryBtn) {
  clearHistoryBtn.addEventListener('click', async () => {
    if (confirm('Clear all local dictation logs?')) {
      try {
        await fetch(`${API_BASE}/history`, { method: 'DELETE' });
        loadHistory();
      } catch (e) {
        console.error(e);
      }
    }
  });
}

// 16kHz Audio Streaming logic
async function startRecording() {
  try {
    isRecording = true;
    window.api.setRecordingState(true);

    statusTitle.innerText = 'Listening (16kHz Stream)...';
    statusDesc.innerText = 'Streaming audio frames in real time. Release hotkey or press button to stop.';
    recordBtn.innerText = 'Stop Recording';
    recordBtn.classList.remove('btn-primary');
    recordBtn.classList.add('btn-danger');

    audioStreamManager.onVolumeChange = (db, rms) => {
      const normalized = Math.min(1.0, Math.max(0, (db + 60) / 60));
      if (window.api.onAudioLevel) {
        // Broadcast audio level to indicator floating widget
      }
    };

    await audioStreamManager.startStream(API_BASE, {
      mode: userSettings.defaultMode,
      language: 'auto'
    });
  } catch (error) {
    console.error('Error starting audio stream:', error);
    isRecording = false;
    window.api.setRecordingState(false);
    alert('Microphone access denied or unavailable. Please check system permissions.');
  }
}

async function stopRecording() {
  if (!isRecording) return;
  isRecording = false;
  window.api.setRecordingState(false);

  statusTitle.innerText = 'Processing...';
  statusDesc.innerText = 'Gemini API is transcribing and cleaning up your thoughts...';
  recordBtn.innerText = 'Processing...';
  recordBtn.disabled = true;

  try {
    const result = await audioStreamManager.stopStream(API_BASE, {
      mode: userSettings.defaultMode
    });

    if (result && result.text && result.text.trim()) {
      let detectedLang = { code: 'en', name: 'English' };
      if (window.LanguageDetector && window.LanguageDetector.identifyLanguage) {
        detectedLang = window.LanguageDetector.identifyLanguage(result.text);
      }

      let finalText = result.text;
      try {
        const ctx = await window.api.getContext();
        if (window.FormattingEngine && window.FormattingEngine.applySmartFormatting) {
          finalText = window.FormattingEngine.applySmartFormatting(finalText, ctx);
        }
      } catch (err) {
        console.warn('Context lookup error during paste:', err);
      }

      if (userSettings.autoPaste) {
        window.api.executePaste(finalText);
      } else {
        navigator.clipboard.writeText(finalText);
      }

      window.api.showIndicatorState('success', { language: detectedLang.name });
      setTimeout(() => window.api.hideIndicator(), 1500);

      statusTitle.innerText = 'Done!';
      statusDesc.innerText = `[${detectedLang.name}] Pasted: "${finalText.substring(0, 60)}..."`;
    } else {
      statusTitle.innerText = 'No Speech Detected';
      statusDesc.innerText = 'Try speaking closer to your microphone or check gain levels.';
      window.api.showIndicatorState('error');
      setTimeout(() => window.api.hideIndicator(), 2500);
    }
  } catch (error) {
    console.error('Processing error:', error);
    statusTitle.innerText = 'Failed';
    statusDesc.innerText = error.message || 'An error occurred during transcription.';

    window.api.showIndicatorState('error');
    setTimeout(() => window.api.hideIndicator(), 3000);
  } finally {
    recordBtn.disabled = false;
    recordBtn.innerText = 'Start Test Recording';
    recordBtn.classList.remove('btn-danger');
    recordBtn.classList.add('btn-primary');

    if (userSettings.historyEnabled) {
      loadHistory();
    }
  }
}

function toggleRecording() {
  if (isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
}

// Bind Button click
recordBtn.addEventListener('click', () => {
  toggleRecording();
});

// Push-To-Talk & Toggle Hotkey Triggers
window.api.onRecordingHotkey(() => {
  toggleRecording();
});

window.api.onStartRecording(() => {
  if (!isRecording) {
    startRecording();
  }
});

window.api.onStopRecording(() => {
  if (isRecording) {
    stopRecording();
  }
});

// Navigate routing
window.api.onNavigateTo((page) => {
  switchPage(page);
});

// System notification trigger
window.api.onNotification((data) => {
  alert(`${data.title}\n\n${data.body}`);
});

// Run bootstrap checks
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const dynamicApiBase = await window.api.getApiUrl();
    API_BASE = dynamicApiBase;
    console.log(`[VoiceDraft Frontend] Connected to dynamic API Base: ${API_BASE}`);
  } catch (error) {
    console.error('Failed to get dynamic API URL from Electron main process:', error);
  }
  checkBackendHealth();
  loadSettings();
  
  setInterval(checkBackendHealth, 5000);
});

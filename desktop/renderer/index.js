const API_BASE = 'http://localhost:3000/api';

// State variables
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let userSettings = {
  hotkey: 'Alt+Space',
  defaultMode: 'default',
  autoPaste: true,
  reviewBeforePaste: false,
  historyEnabled: true
};

// UI Elements
const pages = {
  home: document.getElementById('page-home'),
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
const settingsAutopaste = document.getElementById('settings-autopaste');
const settingsHistory = document.getElementById('settings-history');
const settingsHotkey = document.getElementById('settings-hotkey');
const saveSettingsBtn = document.getElementById('save-settings-btn');
const resetSettingsBtn = document.getElementById('reset-settings-btn');

// Navigation handler
navItems.forEach(item => {
  item.addEventListener('click', () => {
    const pageId = item.getAttribute('data-page');
    switchPage(pageId);
  });
});

function switchPage(pageId) {
  // Update nav state
  navItems.forEach(nav => nav.classList.remove('active'));
  const activeNav = Array.from(navItems).find(n => n.getAttribute('data-page') === pageId);
  if (activeNav) activeNav.classList.add('active');

  // Update visible sections
  Object.keys(pages).forEach(key => {
    if (key === pageId) {
      pages[key].classList.add('active');
    } else {
      pages[key].classList.remove('active');
    }
  });

  // Load page-specific data
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
      Could not connect to the local server. Ensure the backend is running on <code>http://localhost:3000</code>.
    `;
  }
}

// Load settings
async function loadSettings() {
  try {
    const res = await fetch(`${API_BASE}/settings`);
    const settings = await res.json();
    userSettings = settings;

    // Update UI elements
    settingsMode.value = settings.defaultMode;
    settingsAutopaste.checked = settings.autoPaste;
    settingsHistory.checked = settings.historyEnabled;
    settingsHotkey.value = settings.hotkey;

    // Update displays
    shortcutDisplay.innerText = settings.hotkey;
    activeModeDisplay.innerText = settings.defaultMode;
    activePasteDisplay.innerText = settings.autoPaste ? 'Enabled' : 'Disabled';
  } catch (error) {
    console.error('Error fetching settings:', error);
  }
}

// Save settings
saveSettingsBtn.addEventListener('click', async () => {
  const updatedSettings = {
    defaultMode: settingsMode.value,
    autoPaste: settingsAutopaste.checked,
    historyEnabled: settingsHistory.checked,
    hotkey: settingsHotkey.value.trim()
  };

  try {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedSettings)
    });
    const saved = await res.json();
    userSettings = saved;

    // Signal main process to update the global hotkey
    window.api.updateHotkey(saved.hotkey);

    // Refresh display
    loadSettings();
    alert('Settings saved successfully!');
  } catch (error) {
    console.error('Error saving settings:', error);
    alert('Failed to save settings.');
  }
});

// Reset settings
resetSettingsBtn.addEventListener('click', async () => {
  if (confirm('Are you sure you want to reset settings to defaults?')) {
    const defaults = {
      hotkey: 'Alt+Space',
      defaultMode: 'default',
      autoPaste: true,
      reviewBeforePaste: false,
      historyEnabled: true
    };
    try {
      await fetch(`${API_BASE}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(defaults)
      });
      window.api.updateHotkey(defaults.hotkey);
      loadSettings();
    } catch (e) {
      console.error(e);
    }
  }
});

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

    // Attach delete listeners
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

// Add Dictionary word
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
    } else {
      const err = await res.json();
      alert(`Error: ${err.error || 'Failed to add word'}`);
    }
  } catch (error) {
    console.error(error);
  }
});

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

// Clear History
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

// HTML5 Audio Recording logic
async function startRecording() {
  try {
    audioChunks = [];
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // WebM format is standard in Chromium renderer
    const options = { mimeType: 'audio/webm' };
    mediaRecorder = new MediaRecorder(stream, options);
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      // Release microphone tracks
      stream.getTracks().forEach(track => track.stop());
      
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      await processAudioBlob(audioBlob);
    };

    mediaRecorder.start();
    isRecording = true;
    
    // Update main process of recording active (displays indicator)
    window.api.setRecordingState(true);

    // Update Dashboard UI
    statusTitle.innerText = 'Listening...';
    statusDesc.innerText = 'Dictating voice input. Press global shortcut or the button to stop.';
    recordBtn.innerText = 'Stop Recording';
    recordBtn.classList.remove('btn-primary');
    recordBtn.classList.add('btn-danger');
  } catch (error) {
    console.error('Error accessing microphone:', error);
    alert('Microphone access denied or unavailable. Please check system permissions.');
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  isRecording = false;
  window.api.setRecordingState(false); // Transitions indicator to 'processing'
}

function toggleRecording() {
  if (isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
}

// Send Audio Blob to Backend API
async function processAudioBlob(blob) {
  statusTitle.innerText = 'Processing...';
  statusDesc.innerText = 'Gemini API is transcribing and cleaning up your thoughts...';
  recordBtn.innerText = 'Processing...';
  recordBtn.disabled = true;

  try {
    const formData = new FormData();
    formData.append('audio', blob, 'recording.webm');
    formData.append('mode', userSettings.defaultMode);

    const res = await fetch(`${API_BASE}/dictations/process`, {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Error processing audio on backend.');
    }

    const result = await res.json();
    
    if (result.text && result.text.trim()) {
      // Instruct main process to paste text at cursor
      if (userSettings.autoPaste) {
        window.api.executePaste(result.text);
      } else {
        // Just copy text to clipboard as secondary option
        navigator.clipboard.writeText(result.text);
      }

      // Signal success state to indicator overlay
      window.api.showIndicatorState('success');
      setTimeout(() => window.api.hideIndicator(), 1500);

      statusTitle.innerText = 'Done!';
      statusDesc.innerText = `Pasted: "${result.text.substring(0, 60)}..."`;
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
    // Reset dashboard button
    recordBtn.disabled = false;
    recordBtn.innerText = 'Start Test Recording';
    recordBtn.classList.remove('btn-danger');
    recordBtn.classList.add('btn-primary');
    
    // Auto-update dashboard displays if history was written
    if (userSettings.historyEnabled) {
      loadHistory();
    }
  }
}

// Bind Button click
recordBtn.addEventListener('click', () => {
  toggleRecording();
});

// Handle IPC triggers from native global hotkey pressed
window.api.onRecordingHotkey(() => {
  toggleRecording();
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
document.addEventListener('DOMContentLoaded', () => {
  checkBackendHealth();
  loadSettings();
  
  // Refresh backend status every 5 seconds Passive check
  setInterval(checkBackendHealth, 5000);
});

# VoiceDraft (SpeakIt) — AI Voice Writing Assistant

**VoiceDraft** is an open-source, privacy-first, desktop-first AI writing assistant. It captures your messy voice thoughts, cleans them up into polished writing using Google Gemini, and inserts them directly at your active text cursor in any application.

---

## Key Features
- **Global Hotkey (`Alt + Space`)**: Push-to-talk dictation in any app (Gmail, Slack, VS Code, Browser, Word, etc.).
- **AI-Powered Cleanup**: Not just raw transcription. It removes fillers, false starts, fixes grammar, and formats structural lists automatically.
- **Dynamic Context Modes**: Default, Email, and Chat modes to tailor formatting and tone.
- **Personal Dictionary**: Add custom product names, jargon, or colleague names to boost speech-to-text accuracy and ensure correct casing.
- **Privacy First (Local Database)**: User configurations, history, and dictionary terms are stored entirely locally in your system's AppData directory (`db.json`).
- **Bring Your Own Key (BYOK)**: Connects directly to Google Gemini using your personal API key, stored locally.

---

## Getting Started

### 1. Requirements
- Node.js (v18 or higher)
- NPM (v9 or higher)
- A Windows computer (Auto-paste is Windows-optimized; copy-to-clipboard fallback for macOS/Linux)
- A Google Gemini API Key (Get a free or pay-as-you-go key from [Google AI Studio](https://aistudio.google.com/))

### 2. Installation & Setup
Clone the repository and install all dependencies:
```bash
git clone https://github.com/your-username/voicedraft.git
cd voicedraft
npm run install-all
```

### 3. Run in Development
Start the compilation watch and run the Electron desktop application concurrently:
```bash
npm run dev
```

### 4. Configure Your API Key
1. Once the application starts, it will minimize to your system tray.
2. Double-click the tray icon or right-click and select **VoiceDraft Dashboard**.
3. Navigate to **Settings** and input your **Gemini API Key**.
4. Click **Save Settings**. Once validation succeeds, the health alert warning will disappear.
5. You're ready! Focus any editor (like Notepad), press and hold `Alt + Space`, speak your mind, and release the hotkey to see the polished text automatically type out.

---

## Production Build & Packaging

To compile the backend services and bundle the Electron application into a single executable installer:
```bash
npm run build
```
The compiled output will be generated inside the `desktop/dist-app/` folder as a self-contained installation package (e.g., `.exe` or `.dmg`).

---

## Project Structure
- `/desktop`: Electron app renderer and main processes, system tray indicators, and keyboard integration.
- `/backend`: Core services handling audio processing, database caching, and direct connection with the Google Gen AI SDK.
- `/scripts`: Custom development tools and scripts.

---

## License
MIT License - Open for modification and community distribution.

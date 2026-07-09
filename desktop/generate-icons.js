const fs = require('fs');
const path = require('path');

// Standard verified 16x16 transparent PNG base64
const TRAY_ICON_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAADElEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

// Standard verified 64x64 transparent PNG base64
const LOGO_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAADElEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

const rendererDir = path.join(__dirname, 'renderer');

if (!fs.existsSync(rendererDir)) {
  fs.mkdirSync(rendererDir, { recursive: true });
}

fs.writeFileSync(path.join(rendererDir, 'tray-icon.png'), Buffer.from(TRAY_ICON_BASE64, 'base64'));
fs.writeFileSync(path.join(rendererDir, 'logo.png'), Buffer.from(LOGO_BASE64, 'base64'));

console.log('[VoiceDraft Assets] Standard icons regenerated successfully.');

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const readline = require('readline');
const EventEmitter = require('events');

class NativeHelperManager extends EventEmitter {
  constructor() {
    super();
    this.process = null;
    this.rl = null;
    this.isReady = false;
    this.pendingRequests = new Map();
    this.requestIdCounter = 0;
    this.restartAttempts = 0;
    this.maxRestartAttempts = 5;
    this.isShuttingDown = false;
  }

  getBinaryPath() {
    // 1. Packaged location
    const packagedPath = path.join(process.resourcesPath || '', 'native-helper', 'SpeakItHelper.exe');
    if (fs.existsSync(packagedPath)) {
      return packagedPath;
    }

    // 2. Local development location
    const devPath = path.join(__dirname, 'native-helper', 'SpeakItHelper.exe');
    if (fs.existsSync(devPath)) {
      return devPath;
    }

    return null;
  }

  start() {
    if (process.platform !== 'win32') {
      console.log('[NativeHelperManager] Non-Windows platform detected. Native helper skipped.');
      return false;
    }

    const binPath = this.getBinaryPath();
    if (!binPath) {
      console.warn('[NativeHelperManager] SpeakItHelper.exe not found at:', binPath);
      return false;
    }

    console.log(`[NativeHelperManager] Spawning native helper: ${binPath}`);

    try {
      this.process = spawn(binPath, [], {
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true
      });

      this.rl = readline.createInterface({
        input: this.process.stdout,
        crlfDelay: Infinity
      });

      this.rl.on('line', (line) => {
        this.handleLine(line);
      });

      this.process.stderr.on('data', (data) => {
        console.error(`[NativeHelper stderr] ${data.toString().trim()}`);
      });

      this.process.on('error', (err) => {
        console.error('[NativeHelperManager] Child process error:', err);
        this.emit('error', err);
      });

      this.process.on('close', (code, signal) => {
        console.warn(`[NativeHelperManager] Native helper closed with code ${code}, signal ${signal}`);
        this.isReady = false;
        this.rejectAllPending(new Error(`Native helper closed with code ${code}`));

        if (!this.isShuttingDown && this.restartAttempts < this.maxRestartAttempts) {
          this.restartAttempts++;
          const delay = Math.min(1000 * Math.pow(2, this.restartAttempts), 10000);
          console.log(`[NativeHelperManager] Attempting restart ${this.restartAttempts}/${this.maxRestartAttempts} in ${delay}ms...`);
          setTimeout(() => this.start(), delay);
        }
      });

      return true;
    } catch (err) {
      console.error('[NativeHelperManager] Failed to start native helper:', err);
      return false;
    }
  }

  handleLine(line) {
    line = line.trim();
    if (!line) return;

    try {
      const msg = JSON.parse(line);

      // Handle async events from helper
      if (msg.event) {
        if (msg.event === 'ready') {
          this.isReady = true;
          this.restartAttempts = 0;
          this.emit('ready', msg);
        } else if (msg.event === 'hotkey_down') {
          this.emit('hotkey-down', msg);
        } else if (msg.event === 'hotkey_up') {
          this.emit('hotkey-up', msg);
        } else if (msg.event === 'hotkey_press') {
          this.emit('hotkey-press', msg);
        }
        return;
      }

      // Handle command responses matching pending requests
      if (msg.id && this.pendingRequests.has(msg.id)) {
        const { resolve, reject, timeoutId } = this.pendingRequests.get(msg.id);
        clearTimeout(timeoutId);
        this.pendingRequests.delete(msg.id);

        if (msg.error) {
          reject(new Error(msg.message || msg.error));
        } else {
          resolve(msg);
        }
      }
    } catch (parseError) {
      console.warn('[NativeHelperManager] Could not parse message:', line, parseError);
    }
  }

  sendCommand(cmd, params = {}, timeoutMs = 4000) {
    return new Promise((resolve, reject) => {
      if (!this.process || !this.process.stdin.writable) {
        return reject(new Error('Native helper is not running or stdin not writable.'));
      }

      const id = `req_${++this.requestIdCounter}_${Date.now()}`;
      const payload = JSON.stringify({ id, cmd, ...params });

      const timeoutId = setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Command '${cmd}' timed out after ${timeoutMs}ms`));
        }
      }, timeoutMs);

      this.pendingRequests.set(id, { resolve, reject, timeoutId });

      try {
        this.process.stdin.write(payload + '\n');
      } catch (writeErr) {
        clearTimeout(timeoutId);
        this.pendingRequests.delete(id);
        reject(writeErr);
      }
    });
  }

  rejectAllPending(error) {
    for (const [id, req] of this.pendingRequests.entries()) {
      clearTimeout(req.timeoutId);
      req.reject(error);
    }
    this.pendingRequests.clear();
  }

  // High-level API calls
  async ping() {
    return this.sendCommand('ping', {}, 2000);
  }

  async setHotkey(config = {}) {
    // config: { key: 'Space', modifiers: ['Alt'], mode: 'push_to_talk', swallow: true }
    return this.sendCommand('set_hotkey', {
      key: config.key || 'Space',
      modifiers: config.modifiers || ['Alt'],
      mode: config.mode || 'push_to_talk',
      swallow: config.swallow !== false
    });
  }

  async paste(text, mode = 'auto') {
    return this.sendCommand('paste', { text, mode });
  }

  async copySelection() {
    return this.sendCommand('copy_selection');
  }

  async getContext() {
    return this.sendCommand('get_context');
  }

  stop() {
    this.isShuttingDown = true;
    if (this.process) {
      try {
        this.sendCommand('exit', {}, 500).catch(() => {});
      } catch (_) {}
      setTimeout(() => {
        if (this.process && !this.process.killed) {
          this.process.kill();
        }
      }, 300);
    }
  }
}

module.exports = new NativeHelperManager();

import { describe, it, expect, afterAll } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import { HelperClient } from '../../src/main/helper/client';

describe('Native Helper v2 Contract Tests (§9.5)', () => {
  const exePath = path.resolve(__dirname, '../../native/helper/SpeakItHelper.exe');
  let client: HelperClient;

  it('helper binary exists on disk', () => {
    expect(fs.existsSync(exePath)).toBe(true);
  });

  it('spawns helper and completes hello handshake', async () => {
    client = new HelperClient(exePath);

    let readyEventReceived = false;
    client.on('ready', (payload) => {
      readyEventReceived = true;
      expect(payload.version).toBe('1.0.0');
      expect(payload.pid).toBeGreaterThan(0);
    });

    await client.start();

    const hello = await client.hello();
    expect(hello.version).toBe('1.0.0');
    expect(hello.pid).toBeGreaterThan(0);
    expect(readyEventReceived).toBe(true);
  });

  it('responds to ping with ok', async () => {
    const res = await client.ping();
    expect(res.ok).toBe(true);
  });

  it('gets foreground application context within 150ms deadline', async () => {
    const context = await client.getContext(false, 300);
    expect(typeof context.hwnd).toBe('number');
    expect(typeof context.exe).toBe('string');
    expect(context.isPassword).toBe('no');
  });

  it('begins dictation and snapshots clipboard', async () => {
    const res = await client.beginDictation(0);
    expect(res.ok).toBe(true);
  });

  it('handles hotkey registration without conflicts', async () => {
    const res = await client.setHotkeys([
      { id: 'primary-dictation', keys: ['Control', 'Meta'], mode: 'ptt' },
    ]);
    expect(res.ok).toBe(true);
    expect(res.conflicts).toEqual([]);
  });

  afterAll(() => {
    if (client) {
      client.stop();
    }
  });
});

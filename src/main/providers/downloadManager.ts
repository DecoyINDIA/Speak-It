import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { logger } from '../logger';

export interface ModelInfo {
  id: string;
  name: string;
  sizeBytes: number;
  sha256: string;
  downloadUrl: string;
  isMultilingual: boolean;
}

export const SUPPORTED_MODELS: Record<string, ModelInfo> = {
  'ggml-model-whisper-small.bin': {
    id: 'small',
    name: 'Whisper Small (Multilingual - Default)',
    sizeBytes: 488277259, // ~466 MB
    sha256: '553563b784f34133bf1c70e9a5c8c2a39a04a3e9c5e3d1266e76fb21c7a40df6',
    downloadUrl: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin',
    isMultilingual: true,
  },
  'ggml-model-whisper-base.en.bin': {
    id: 'base.en',
    name: 'Whisper Base (English Only)',
    sizeBytes: 147964211, // ~141 MB
    sha256: 'a3f9e422f25608d0e5138122a27ffb2a095ff6d8315579f18b323dfebf41d9c1',
    downloadUrl: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin',
    isMultilingual: false,
  },
  'ggml-model-whisper-large-v3-turbo.bin': {
    id: 'large-v3-turbo',
    name: 'Whisper Large v3 Turbo (High Accuracy)',
    sizeBytes: 1040000000, // ~1 GB
    sha256: '4f6d4d1e2e92c608f51dfc33b7bca06c9a96e5faec52c9d1c1a525f0e3966fb9',
    downloadUrl: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo.bin',
    isMultilingual: true,
  },
};

export class ModelDownloadManager {
  private modelsDir: string;

  constructor(customModelsDir?: string) {
    this.modelsDir =
      customModelsDir ||
      (process.env.APPDATA ? path.join(process.env.APPDATA, 'SpeakIt', 'models') : path.join(process.cwd(), 'models'));

    if (!fs.existsSync(this.modelsDir)) {
      try {
        fs.mkdirSync(this.modelsDir, { recursive: true });
      } catch {}
    }
  }

  public getModelsDir(): string {
    return this.modelsDir;
  }

  public isModelDownloaded(filename: string): boolean {
    const fullPath = path.join(this.modelsDir, filename);
    return fs.existsSync(fullPath);
  }

  public async verifyModelSha256(filename: string, expectedHash: string): Promise<boolean> {
    const fullPath = path.join(this.modelsDir, filename);
    if (!fs.existsSync(fullPath)) return false;

    return new Promise<boolean>((resolve) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(fullPath);

      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => {
        const computed = hash.digest('hex');
        resolve(computed.toLowerCase() === expectedHash.toLowerCase());
      });
      stream.on('error', () => resolve(false));
    });
  }

  public async downloadModel(
    filename: string,
    onProgress?: (percent: number, downloadedBytes: number, totalBytes: number) => void
  ): Promise<boolean> {
    const info = SUPPORTED_MODELS[filename];
    if (!info) {
      throw new Error(`Unsupported model filename: ${filename}`);
    }

    const targetPath = path.join(this.modelsDir, filename);
    const tempPath = `${targetPath}.download`;

    logger.info(`Starting download of ${info.name} to ${targetPath}...`);

    let startBytes = 0;
    if (fs.existsSync(tempPath)) {
      startBytes = fs.statSync(tempPath).size;
    }

    const headers: Record<string, string> = {};
    if (startBytes > 0) {
      headers['Range'] = `bytes=${startBytes}-`;
    }

    try {
      const res = await fetch(info.downloadUrl, { headers });
      if (!res.ok && res.status !== 206) {
        throw new Error(`Download HTTP error (${res.status}): ${res.statusText}`);
      }

      const total = parseInt(res.headers.get('content-length') || `${info.sizeBytes}`, 10) + startBytes;
      let downloaded = startBytes;

      const fileStream = fs.createWriteStream(tempPath, { flags: startBytes > 0 ? 'a' : 'w' });
      const reader = res.body?.getReader();

      if (!reader) {
        throw new Error('Response body has no readable stream');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          downloaded += value.length;
          fileStream.write(Buffer.from(value));
          if (onProgress) {
            const percent = total > 0 ? Math.round((downloaded / total) * 100) : 0;
            onProgress(percent, downloaded, total);
          }
        }
      }

      fileStream.end();

      // Rename upon complete
      fs.renameSync(tempPath, targetPath);
      logger.info(`Model download finished successfully: ${filename}`);
      return true;
    } catch (err: any) {
      logger.error(`Model download failed: ${err?.message || err}`);
      return false;
    }
  }

  public deleteModel(filename: string): void {
    const fullPath = path.join(this.modelsDir, filename);
    if (fs.existsSync(fullPath)) {
      try {
        fs.unlinkSync(fullPath);
      } catch {}
    }
  }
}

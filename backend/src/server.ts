import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import { db } from './services/db';
import { transcribeAndCleanup, rewriteText } from './services/gemini';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configure CORS to allow our Electron app to connect
app.use(cors());
app.use(express.json());

// Set up Multer for handling file uploads (in-memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024 // 20 MB max audio size
  }
});

// Middleware to check if Gemini API key is configured
const checkApiKey = (req: Request, res: Response, next: Function) => {
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({
      error: 'API_KEY_MISSING',
      message: 'GEMINI_API_KEY is not defined in the backend environment. Please edit backend/.env and add your key.'
    });
  }
  next();
};

// Health Check / Verification endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    apiKeyConfigured: !!process.env.GEMINI_API_KEY,
    platform: process.platform,
    time: new Date().toISOString()
  });
});

// Settings Endpoints
app.get('/api/settings', (req: Request, res: Response) => {
  res.json(db.getSettings());
});

app.post('/api/settings', (req: Request, res: Response) => {
  const updated = db.updateSettings(req.body);
  res.json(updated);
});

// Dictionary Endpoints
app.get('/api/dictionary', (req: Request, res: Response) => {
  res.json(db.getDictionary());
});

app.post('/api/dictionary', (req: Request, res: Response) => {
  const { term, soundsLike, casingRule } = req.body;
  if (!term || typeof term !== 'string' || term.trim() === '') {
    return res.status(400).json({ error: 'Term is required and must be a non-empty string.' });
  }
  const newTerm = db.addDictionaryTerm({
    term: term.trim(),
    soundsLike: soundsLike?.trim() || undefined,
    casingRule: casingRule || undefined
  });
  res.status(201).json(newTerm);
});

app.delete('/api/dictionary/:id', (req: Request, res: Response) => {
  const deleted = db.deleteDictionaryTerm(req.params.id);
  if (deleted) {
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Term not found.' });
  }
});

// History Endpoints
app.get('/api/history', (req: Request, res: Response) => {
  res.json(db.getHistory());
});

app.delete('/api/history', (req: Request, res: Response) => {
  db.clearHistory();
  res.json({ success: true });
});

// Process Dictation Endpoint
app.post(
  '/api/dictations/process',
  checkApiKey,
  upload.single('audio'),
  async (req: Request, res: Response) => {
    const start = Date.now();
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No audio file provided.' });
      }

      const mode = (req.body.mode || 'default') as string;
      const mimeType = req.file.mimetype || 'audio/webm';
      
      const dictionary = db.getDictionary();

      // Call Gemini for transcription & cleanup
      const result = await transcribeAndCleanup(
        req.file.buffer,
        mimeType,
        mode,
        dictionary
      );

      const durationMs = Date.now() - start;
      const wordCount = result.text ? result.text.split(/\s+/).length : 0;

      // Save to local history if enabled
      const savedRecord = db.addHistoryRecord({
        text: result.text,
        rawTranscript: result.rawTranscript,
        wordCount,
        mode,
        durationMs
      });

      res.json({
        id: savedRecord?.id || 'transient',
        text: result.text,
        rawTranscript: result.rawTranscript,
        wordCount,
        durationMs,
        historySaved: !!savedRecord
      });
    } catch (error: any) {
      console.error('Error processing dictation:', error);
      res.status(500).json({
        error: 'PROCESSING_ERROR',
        message: error.message || 'An error occurred while processing the audio with Gemini.'
      });
    }
  }
);

// Command Mode Rewrite Endpoint
app.post('/api/rewrite', checkApiKey, async (req: Request, res: Response) => {
  try {
    const { text, instruction, mode } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text content to rewrite is required.' });
    }
    if (!instruction || typeof instruction !== 'string') {
      return res.status(400).json({ error: 'Instruction description is required.' });
    }

    const rewritten = await rewriteText(text, instruction, mode || 'default');
    
    res.json({
      text: rewritten,
      wordCount: rewritten.split(/\s+/).length
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'REWRITE_ERROR',
      message: error.message || 'An error occurred during text rewrite.'
    });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`[VoiceDraft Backend] Running on http://localhost:${PORT}`);
  console.log(`[VoiceDraft Backend] API Key loaded: ${process.env.GEMINI_API_KEY ? 'YES' : 'NO'}`);
});

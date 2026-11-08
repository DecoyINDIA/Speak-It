import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import { db } from './services/db';
import { transcribeAndCleanup, rewriteText, applyTransform, summarizeMeeting } from './services/gemini';
import { setupStreamingWebSocket } from './services/streamingServer';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const AUTH_TOKEN = process.env.SPEAKIT_API_TOKEN || '';

// Configure CORS to allow our Electron app to connect
app.use(cors());
app.use(express.json());

// Token Authentication Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  // If a token is configured, enforce X-SpeakIt-Token or ?token=
  if (AUTH_TOKEN) {
    const headerToken = req.headers['x-speakit-token'];
    const queryToken = req.query.token;
    if (headerToken !== AUTH_TOKEN && queryToken !== AUTH_TOKEN) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Missing or invalid authentication token.' });
    }
  }
  next();
});

// Set up Multer for handling file uploads (in-memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024 // 20 MB max audio size
  }
});

// Middleware to check if Gemini API key is configured
const checkApiKey = (req: Request, res: Response, next: NextFunction) => {
  const dbApiKey = db.getSettings().geminiApiKey;
  if (!process.env.GEMINI_API_KEY && !dbApiKey) {
    return res.status(500).json({
      error: 'API_KEY_MISSING',
      message: 'Gemini API Key is not configured. Please add it via the Settings page or edit backend/.env.'
    });
  }
  next();
};

// Health Check / Verification endpoint
app.get('/api/health', (req: Request, res: Response) => {
  const dbApiKey = db.getSettings().geminiApiKey;
  res.json({
    status: 'ok',
    apiKeyConfigured: !!process.env.GEMINI_API_KEY || !!dbApiKey,
    platform: process.platform,
    time: new Date().toISOString()
  });
});

// Settings Endpoints
app.get('/api/settings', (req: Request, res: Response) => {
  const settings = db.getSettings();
  const dbApiKey = settings.geminiApiKey;
  const isSet = !!process.env.GEMINI_API_KEY || (typeof dbApiKey === 'string' && dbApiKey.trim().length > 0);
  const safeSettings = {
    ...settings,
    geminiApiKeySet: isSet
  };
  delete (safeSettings as any).geminiApiKey;
  res.json(safeSettings);
});

app.post('/api/settings', (req: Request, res: Response) => {
  const payload = { ...req.body };
  if (payload.geminiApiKey !== undefined && payload.geminiApiKey.trim() === '') {
    delete payload.geminiApiKey;
  }
  const updated = db.updateSettings(payload);
  const isSet = !!process.env.GEMINI_API_KEY || (typeof updated.geminiApiKey === 'string' && updated.geminiApiKey.trim().length > 0);
  const safeUpdated = {
    ...updated,
    geminiApiKeySet: isSet
  };
  delete (safeUpdated as any).geminiApiKey;
  res.json(safeUpdated);
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
      const dbApiKey = db.getSettings().geminiApiKey;

      // Call Gemini for transcription & cleanup
      const result = await transcribeAndCleanup(
        req.file.buffer,
        mimeType,
        mode,
        dictionary,
        dbApiKey
      );

      const cleanedText = result.text;
      const durationMs = Date.now() - start;
      const wordCount = cleanedText ? cleanedText.split(/\s+/).length : 0;

      // Save to local history if enabled
      const savedRecord = db.addHistoryRecord({
        text: cleanedText,
        rawTranscript: result.rawTranscript,
        wordCount,
        mode,
        durationMs
      });

      res.json({
        id: savedRecord?.id || 'transient',
        text: cleanedText,
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

    const dbApiKey = db.getSettings().geminiApiKey;
    const rewritten = await rewriteText(text, instruction, mode || 'default', dbApiKey);
    
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

// AI Transforms Engine: Polish, PromptEngineer, TurnToList, MakeMeSoundSmart, WhatDidIMiss, Translate
app.post('/api/transforms/apply', checkApiKey, async (req: Request, res: Response) => {
  try {
    const { text, transformType, customPrompt } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text content to transform is required.' });
    }

    const dbApiKey = db.getSettings().geminiApiKey;
    const transformed = await applyTransform(
      text,
      transformType || 'polish',
      customPrompt,
      dbApiKey
    );

    res.json({
      text: transformed,
      transformType,
      wordCount: transformed.split(/\s+/).length
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'TRANSFORM_ERROR',
      message: error.message || 'Failed to apply transform'
    });
  }
});

// Meeting Mode Summarizer
app.post('/api/meetings/summarize', checkApiKey, async (req: Request, res: Response) => {
  try {
    const { transcript } = req.body;
    if (!transcript || typeof transcript !== 'string') {
      return res.status(400).json({ error: 'Meeting transcript is required.' });
    }

    const dbApiKey = db.getSettings().geminiApiKey;
    const summaryData = await summarizeMeeting(transcript, dbApiKey);

    res.json(summaryData);
  } catch (error: any) {
    res.status(500).json({
      error: 'MEETING_SUMMARY_ERROR',
      message: error.message || 'Failed to summarize meeting'
    });
  }
});

// Start Server & WebSocket Streaming
const server = http.createServer(app);
setupStreamingWebSocket(server);

const serverInstance = server.listen(Number(PORT), '127.0.0.1', () => {
  console.log(`[VoiceDraft Backend] Running on http://127.0.0.1:${PORT}`);
  console.log(`[VoiceDraft Backend] API Key loaded: ${process.env.GEMINI_API_KEY || db.getSettings().geminiApiKey ? 'YES' : 'NO'}`);
  console.log(`[VoiceDraft Backend] Auth Token: ${AUTH_TOKEN ? 'ENABLED' : 'DISABLED'}`);
});

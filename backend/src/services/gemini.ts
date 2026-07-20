import { GoogleGenAI } from '@google/genai';
import { DictionaryTerm, UserSettings } from './db';
import dotenv from 'dotenv';

dotenv.config();

// Initialize the Gemini API client using the official @google/genai SDK
const getGenAIClient = (customApiKey?: string) => {
  const apiKey = process.env.GEMINI_API_KEY || customApiKey;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not defined. Please check your backend .env file or configuration.');
  }
  return new GoogleGenAI({ apiKey });
};

// System instruction to guide the cleanup
const BASE_SYSTEM_INSTRUCTION = `You are a professional voice writing assistant. 
Your primary task is to take speech (provided as audio or transcript) and rewrite it into clean, well-formatted, grammatically correct text.
Follow these rules strictly:
1. Remove all filler words (e.g. "um", "uh", "like", "you know", "ah", "so").
2. Resolve false starts and self-corrections. For example, if the speaker says "we will go on Monday — no wait, Tuesday", output "we will go on Tuesday".
3. Correct all grammatical errors, capitalization, and punctuation.
4. Separate the text into logical paragraphs if it is long.
5. NEVER invent facts, names, or statements. Preserve the speaker's original meaning, numbers, dates, and instructions.
6. Handle Indian accents and Hinglish (mixed Hindi-English phrases) gracefully by transcribing and translating them into polished, natural English.
7. Return ONLY the final polished text. Do NOT include any introductory greetings, meta-commentary, explanations, notes, or concluding remarks (e.g. do not say "Here is your cleaned text:").
`;

// Helper to build prompt modifiers based on custom modes
function getModeInstruction(mode: string): string {
  switch (mode.toLowerCase()) {
    case 'email':
      return '\nTone: Professional Email. Add standard email greetings, paragraphs, and a polite sign-off if the user started dictating them or if it is clearly an email outline. Maintain a professional, courteous business tone.';
    case 'chat':
      return '\nTone: Casual Chat/Messaging (Slack, Teams, WhatsApp). Keep it brief, conversational, and direct. Do NOT add formal greetings, salutations, or signatures unless explicitly spoken. Keep punctuation natural but relaxed.';
    case 'notes':
      return '\nFormat: Structured Notes. Organize the information clearly using Markdown bullet points, bold headers, or numbered lists where appropriate to make it highly readable.';
    case 'developer':
      return '\nTone & Format: Technical/Developer. Wrap variable names, file paths, function calls, and code snippets in markdown backticks (e.g. `index.ts`, `getSettings()`, `const x = 5`). Do not modify the casing of technical terms or camelCase variables. Make commit-style or PR-description phrases clear.';
    case 'social':
      return '\nTone: Engaging Social Media Post (LinkedIn, X). Make it punchy, structured, and easy to read. You can use standard emojis if appropriate, but do not go overboard.';
    default:
      return '\nTone: Standard Cleaned Text. Maintain the tone of the speaker but make it sound grammatically flawless, clear, and professional.';
  }
}

// Helper to inject dictionary terms
function getDictionaryPrompt(dictionary: DictionaryTerm[]): string {
  if (dictionary.length === 0) return '';
  
  const list = dictionary.map(d => {
    let desc = `"${d.term}"`;
    if (d.soundsLike) desc += ` (sounds like "${d.soundsLike}")`;
    if (d.casingRule) desc += ` (casing rule: "${d.casingRule}")`;
    return desc;
  }).join(', ');
  
  return `\nIMPORTANT: The user has defined the following custom dictionary terms. If you hear sounds matching these terms, transcribe and format them exactly as written here: [${list}]. Pay close attention to their capitalization.`;
}

/**
 * Uploads audio buffer to Gemini and performs cleanup and transcription in one go.
 * Uses gemini-2.5-flash for speed and native multi-modal audio capabilities.
 */
export async function transcribeAndCleanup(
  audioBuffer: Buffer,
  mimeType: string,
  mode: string,
  dictionary: DictionaryTerm[],
  customApiKey?: string
): Promise<{ text: string; rawTranscript: string }> {
  try {
    const ai = getGenAIClient(customApiKey);
    
    const modePrompt = getModeInstruction(mode);
    const dictionaryPrompt = getDictionaryPrompt(dictionary);
    
    // Combine base instruction, mode details, and dictionary terms into the prompt
    const prompt = `${BASE_SYSTEM_INSTRUCTION}
Additional guidelines for this request:
${modePrompt}
${dictionaryPrompt}

You MUST transcribe the attached audio and return a JSON object containing:
1. "rawTranscript": The literal, word-for-word transcript of the audio, including filler words, false starts, and self-corrections.
2. "text": The cleaned, polished, grammatically correct version matching the requested tone/formatting.

If the audio is empty, has only background noise, or contains no speech, set both values to empty strings.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          inlineData: {
            data: audioBuffer.toString('base64'),
            mimeType: mimeType
          }
        },
        prompt
      ],
      config: {
        temperature: 0.1, // Keep it highly deterministic
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            rawTranscript: { type: 'STRING' },
            text: { type: 'STRING' }
          },
          required: ['rawTranscript', 'text']
        }
      }
    });

    let cleanedText = '';
    let rawTranscript = '';

    if (response.text) {
      try {
        const parsed = JSON.parse(response.text.trim());
        cleanedText = parsed.text || '';
        rawTranscript = parsed.rawTranscript || '';
      } catch (jsonErr) {
        console.warn('Failed to parse structured JSON response from Gemini, using raw text fallback:', jsonErr);
        cleanedText = response.text.trim();
        rawTranscript = response.text.trim();
      }
    }

    return {
      text: cleanedText,
      rawTranscript
    };
  } catch (error: any) {
    console.error('Error in Gemini API processing:', error);
    throw error;
  }
}

/**
 * Text-to-text transformation for command mode (shorten, rewrite, bullet points, etc.)
 */
export async function rewriteText(
  text: string,
  instruction: string,
  mode: string,
  customApiKey?: string
): Promise<string> {
  try {
    const ai = getGenAIClient(customApiKey);
    const systemPrompt = `You are a text editing assistant.
Your task is to rewrite the user's text based on their instructions: "${instruction}".
Maintain the tone of the mode if specified (current mode: "${mode}").
Output ONLY the rewritten text, nothing else. Do not say "Here is the rewritten text" or provide any notes.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        systemPrompt,
        `Original text:\n"""\n${text}\n"""`
      ],
      config: {
        temperature: 0.2
      }
    });

    return response.text?.trim() || text;
  } catch (error) {
    console.error('Error in text rewrite:', error);
    throw error;
  }
}

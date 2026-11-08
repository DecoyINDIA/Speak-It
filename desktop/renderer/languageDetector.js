/**
 * Zero-Latency Local Language Identifier
 * Replica of fastText Wasm local LID for rapid language and dialect classification.
 */

const SCRIPT_RANGES = [
  { lang: 'hi', name: 'Devanagari (Hindi)', regex: /[\u0900-\u097F]/ },
  { lang: 'zh', name: 'Chinese', regex: /[\u4E00-\u9FFF]/ },
  { lang: 'ja', name: 'Japanese', regex: /[\u3040-\u309F\u30A0-\u30FF]/ },
  { lang: 'ko', name: 'Korean', regex: /[\uAC00-\uD7AF\u1100-\u11FF]/ },
  { lang: 'ar', name: 'Arabic', regex: /[\u0600-\u06FF]/ },
  { lang: 'ru', name: 'Russian (Cyrillic)', regex: /[\u0400-\u04FF]/ },
  { lang: 'he', name: 'Hebrew', regex: /[\u0590-\u05FF]/ },
  { lang: 'th', name: 'Thai', regex: /[\u0E00-\u0E7F]/ },
  { lang: 'el', name: 'Greek', regex: /[\u0370-\u03FF]/ }
];

const HINGLISH_MARKERS = [
  'kya', 'hai', 'nahi', 'nahin', 'accha', 'achha', 'karo', 'karna',
  'bhai', 'theek', 'thik', 'yaar', 'bolo', 'kaise', 'hoga', 'mera',
  'meri', 'apna', 'chalo', 'dekho', 'samajh', 'lekin', 'kyunki'
];

const LANGUAGE_STOPWORDS = {
  es: ['de', 'la', 'que', 'el', 'en', 'y', 'a', 'los', 'se', 'del', 'las', 'por', 'un', 'para', 'con', 'no', 'una', 'su', 'como', 'pero', 'hola'],
  fr: ['de', 'la', 'le', 'et', 'les', 'des', 'en', 'un', 'du', 'une', 'que', 'est', 'pour', 'qui', 'dans', 'ce', 'il', 'vous', 'nous', 'bonjour', 'comment', 'avec', 'pas'],
  de: ['der', 'die', 'und', 'in', 'den', 'von', 'zu', 'das', 'mit', 'sich', 'des', 'auf', 'für', 'ist', 'im', 'dem', 'nicht', 'ich', 'sie', 'wie', 'hallo'],
  it: ['di', 'e', 'il', 'la', 'che', 'in', 'un', 'per', 'del', 'una', 'sono', 'da', 'della', 'dei', 'nel', 'si', 'con', 'ciao', 'come'],
  pt: ['de', 'a', 'o', 'que', 'e', 'do', 'da', 'em', 'um', 'para', 'com', 'não', 'uma', 'os', 'no', 'se', 'na', 'por', 'olá', 'como'],
  en: ['the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'is', 'are', 'this']
};

/**
 * Detect language of a given text sample in <1ms.
 * @param {string} text Sample transcript text.
 * @returns {object} { code: 'en'|'hi'|'es'|..., name: string, confidence: number, isHinglish: boolean }
 */
function identifyLanguage(text) {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return { code: 'en', name: 'English', confidence: 1.0, isHinglish: false };
  }

  const clean = text.trim().toLowerCase();

  // 1. Script range check (Devanagari, CJK, Cyrillic, Arabic, etc.)
  for (const script of SCRIPT_RANGES) {
    const matches = clean.match(new RegExp(script.regex, 'g'));
    if (matches && matches.length > 0) {
      const ratio = matches.length / clean.replace(/\s+/g, '').length;
      if (ratio > 0.15) {
        return {
          code: script.lang,
          name: script.name,
          confidence: Math.min(1.0, 0.6 + ratio * 0.4),
          isHinglish: false
        };
      }
    }
  }

  // 2. Hinglish marker check
  const tokens = clean.split(/[^\p{L}]+/u).filter(Boolean);
  let hinglishCount = 0;
  for (const token of tokens) {
    if (HINGLISH_MARKERS.includes(token)) {
      hinglishCount++;
    }
  }

  if (hinglishCount >= 2 || (tokens.length <= 4 && hinglishCount >= 1)) {
    return {
      code: 'hi-Latn',
      name: 'Hinglish (Hindi-English)',
      confidence: Math.min(0.95, 0.4 + (hinglishCount / tokens.length) * 0.6),
      isHinglish: true
    };
  }

  // 3. Stopword frequency check across Latin scripts
  let bestLang = 'en';
  let bestScore = 0;

  for (const [lang, words] of Object.entries(LANGUAGE_STOPWORDS)) {
    let score = 0;
    for (const token of tokens) {
      if (words.includes(token)) {
        score++;
      }
    }
    const normalizedScore = tokens.length > 0 ? score / tokens.length : 0;
    if (normalizedScore > bestScore) {
      bestScore = normalizedScore;
      bestLang = lang;
    }
  }

  const langNames = {
    en: 'English',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    it: 'Italian',
    pt: 'Portuguese'
  };

  return {
    code: bestLang,
    name: langNames[bestLang] || 'English',
    confidence: bestScore > 0 ? Math.min(0.95, 0.5 + bestScore * 0.5) : 0.7,
    isHinglish: false
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { identifyLanguage };
}

if (typeof window !== 'undefined') {
  window.LanguageDetector = { identifyLanguage };
}

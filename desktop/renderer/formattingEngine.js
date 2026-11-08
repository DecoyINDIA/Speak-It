/**
 * Smart Pre-Paste Formatting & Voice Backtracking Parser
 * Implements Wispr Flow AX formatting rules and sentence backtracking triggers.
 */

const BACKTRACKING_TRIGGERS = [
  'scratch that',
  'never mind',
  'nevermind',
  'forget that',
  'cancel that',
  'strike that',
  'no wait',
  'wait no',
  'actually',
  'i mean'
];

/**
 * Parses and resolves voice backtracking commands in transcripts.
 * e.g. "We will meet on Monday scratch that Tuesday" -> "We will meet on Tuesday"
 */
function parseBacktracking(transcript) {
  if (!transcript || typeof transcript !== 'string') return '';
  let text = transcript.trim();

  // Iteratively scan for backtracking triggers
  let modified = true;
  while (modified) {
    modified = false;

    for (const trigger of BACKTRACKING_TRIGGERS) {
      // Regex matches trigger on word boundaries, case-insensitive, with optional punctuation
      const pattern = new RegExp(`\\b${trigger}\\b[,\\.]?\\s*`, 'i');
      const match = pattern.exec(text);

      if (match) {
        const triggerIndex = match.index;
        const triggerLength = match[0].length;
        const before = text.substring(0, triggerIndex).trim();
        const after = text.substring(triggerIndex + triggerLength).trim();

        if (!before) {
          // Trigger at the very beginning (e.g. "Scratch that, let's start over")
          text = after;
          modified = true;
          break;
        }

        // If trigger is "never mind" / "forget that" / "cancel that" with nothing after, cancel all
        if (
          (trigger === 'never mind' || trigger === 'nevermind' || trigger === 'forget that' || trigger === 'cancel that') &&
          !after
        ) {
          text = '';
          modified = true;
          break;
        }

        // Find boundary of preceding clause or sentence
        // Look for clause separators: comma, semicolon, dash, period, or conjunctions
        const separators = [/\.\s+/, /;\s+/, /,\s+/, /\s+—\s+/, /\s+-\s+/, /\band\s+/i, /\bbut\s+/i];
        let lastSepIndex = -1;
        let sepLength = 0;

        for (const sep of separators) {
          let pos = -1;
          let m;
          const globalSep = new RegExp(sep.source, 'gi');
          while ((m = globalSep.exec(before)) !== null) {
            pos = m.index;
            if (pos > lastSepIndex) {
              lastSepIndex = pos;
              sepLength = m[0].length;
            }
          }
        }

        if (lastSepIndex !== -1) {
          // Replace clause following the separator with the new clause
          const prefix = before.substring(0, lastSepIndex + sepLength).trimEnd();
          text = prefix + ' ' + after;
        } else {
          // If no punctuation separator, replace the last word/token of 'before'
          // e.g. "we will meet on Monday" -> "we will meet on" + "Tuesday at 3pm"
          const lastWordMatch = before.match(/^(.*?)(\s+\S+)$/);
          if (lastWordMatch && lastWordMatch[1]) {
            text = lastWordMatch[1] + ' ' + after;
          } else {
            text = after;
          }
        }

        // Deduplicate any repeated consecutive words (e.g. "on on Tuesday" -> "on Tuesday")
        text = text.replace(/\b(\w+)\s+\1\b/gi, '$1');

        modified = true;
        break;
      }
    }
  }

  // Clean up any double spaces or stranded commas
  text = text
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,\.!\?;:])/g, '$1')
    .replace(/,\s*,/g, ',')
    .trim();

  return text;
}

/**
 * Inspects UI Automation pre-caret and post-caret text to apply smart spacing & casing.
 * 
 * @param {string} text The transcribed text to be inserted.
 * @param {object} context Active application context: { preText, postText, app, title }
 * @returns {string} Formatted text with correct leading space, capitalization, and trailing space.
 */
function applySmartFormatting(text, context = {}) {
  if (!text) return '';
  let formatted = text.trim();
  if (!formatted) return '';

  const preText = context.preText || '';
  const postText = context.postText || '';

  // 1. Capitalization Logic
  const shouldCapitalize = isSentenceStart(preText);
  if (shouldCapitalize) {
    formatted = capitalizeFirstLetter(formatted);
  } else if (isMidSentence(preText)) {
    // If preceded by comma or lowercase word, ensure we don't start with unnecessary capital
    // unless it looks like an acronym (all caps) or proper noun
    formatted = lowercaseFirstLetterIfNeeded(formatted);
  }

  // 2. Leading Spacing Logic
  if (preText && preText.length > 0) {
    const lastChar = preText[preText.length - 1];

    // Characters that do NOT require a leading space
    const noLeadingSpaceChars = [' ', '\t', '\n', '\r', '(', '[', '{', '"', "'", '`', '/', '\\', '@', '#'];
    const punctuationWithoutSpace = ['.', ',', '!', '?', ';', ':'];

    if (punctuationWithoutSpace.includes(lastChar)) {
      // e.g. "Hello." -> insert space before next sentence
      formatted = ' ' + formatted;
    } else if (!noLeadingSpaceChars.includes(lastChar) && /[\w\d]/.test(lastChar)) {
      // Preceded by alphanumeric character without space (e.g. "word|") -> insert space
      // Unless formatted text starts with punctuation that attaches to word
      if (!/^[,;:\.\?!'\)\]\}]/.test(formatted)) {
        formatted = ' ' + formatted;
      }
    }
  }

  // 3. Trailing Spacing Logic
  if (postText && postText.length > 0) {
    const firstChar = postText[0];
    // If following text starts with alphanumeric and our text doesn't end in space
    if (/[\w\d]/.test(firstChar) && !formatted.endsWith(' ')) {
      formatted = formatted + ' ';
    }
  }

  return formatted;
}

function isSentenceStart(preText) {
  if (!preText || preText.trim() === '') return true;
  const trimmed = preText.trimEnd();
  if (trimmed.length === 0) return true;

  const lastChar = trimmed[trimmed.length - 1];
  // Ends with sentence terminator or newline
  if (['.', '!', '?'].includes(lastChar)) return true;
  if (preText.endsWith('\n') || preText.endsWith('\r')) return true;

  return false;
}

function isMidSentence(preText) {
  if (!preText) return false;
  const trimmed = preText.trimEnd();
  if (!trimmed) return false;
  const lastChar = trimmed[trimmed.length - 1];
  return [',', ';', ':', '-', '—'].includes(lastChar) || /[\w]/.test(lastChar);
}

function capitalizeFirstLetter(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function lowercaseFirstLetterIfNeeded(str) {
  if (!str) return '';
  // Don't lowercase acronyms like "API", "UI", "NASA"
  if (str.length > 1 && str[0] === str[0].toUpperCase() && str[1] === str[1].toUpperCase()) {
    return str;
  }
  return str.charAt(0).toLowerCase() + str.slice(1);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    BACKTRACKING_TRIGGERS,
    parseBacktracking,
    applySmartFormatting,
    isSentenceStart,
    isMidSentence
  };
}

if (typeof window !== 'undefined') {
  window.FormattingEngine = {
    BACKTRACKING_TRIGGERS,
    parseBacktracking,
    applySmartFormatting,
    isSentenceStart,
    isMidSentence
  };
}

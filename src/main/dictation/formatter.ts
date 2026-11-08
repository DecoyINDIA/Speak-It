/**
 * Smart Pre-Paste Formatter
 * Implements caret-relative casing, spacing, and punctuation rules per PLAN.md §8.3 & F6.
 * Note: Backtracking regex parser is deleted per ADR-8 & Appendix A #2.
 */

export interface FormattingContext {
  preText?: string;
  postText?: string;
  appExe?: string;
  urlHost?: string;
}

export function applySmartFormatting(text: string, context: FormattingContext = {}): string {
  if (!text) return '';
  let formatted = text.trim();
  if (!formatted) return '';

  const preText = context.preText || '';
  const postText = context.postText || '';

  // 1. Capitalization Logic
  if (isSentenceStart(preText)) {
    formatted = capitalizeFirstLetter(formatted);
  } else if (isMidSentence(preText)) {
    formatted = lowercaseFirstLetterIfNeeded(formatted);
  }

  // 2. Leading Spacing Logic
  if (preText && preText.length > 0) {
    const lastChar = preText[preText.length - 1];
    const noLeadingSpaceChars = [' ', '\t', '\n', '\r', '(', '[', '{', '"', "'", '`', '/', '\\', '@', '#'];
    const punctuationWithoutSpace = ['.', ',', '!', '?', ';', ':'];

    if (punctuationWithoutSpace.includes(lastChar)) {
      // e.g. "Hello." -> insert space before next sentence
      formatted = ' ' + formatted;
    } else if (!noLeadingSpaceChars.includes(lastChar) && /[\w\d]/.test(lastChar)) {
      // Preceded by alphanumeric character without space (e.g. "word|") -> insert space
      if (!/^[,;:\.\?!'\)\]\}]/.test(formatted)) {
        formatted = ' ' + formatted;
      }
    }
  }

  // 3. Trailing Spacing Logic
  if (postText && postText.length > 0) {
    const firstChar = postText[0];
    if (/[\w\d]/.test(firstChar) && !formatted.endsWith(' ')) {
      formatted = formatted + ' ';
    }
  }

  return formatted;
}

export function isSentenceStart(preText: string): boolean {
  if (!preText || preText.trim() === '') return true;
  const trimmed = preText.trimEnd();
  if (trimmed.length === 0) return true;

  const lastChar = trimmed[trimmed.length - 1];
  if (['.', '!', '?'].includes(lastChar)) return true;
  if (preText.endsWith('\n') || preText.endsWith('\r')) return true;

  return false;
}

export function isMidSentence(preText: string): boolean {
  if (!preText) return false;
  const trimmed = preText.trimEnd();
  if (!trimmed) return false;
  const lastChar = trimmed[trimmed.length - 1];
  return [',', ';', ':', '-', '—'].includes(lastChar) || /[\w]/.test(lastChar);
}

export function capitalizeFirstLetter(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function lowercaseFirstLetterIfNeeded(str: string): string {
  if (!str) return '';
  // Don't lowercase acronyms like "API", "UI", "NASA"
  if (str.length > 1 && str[0] === str[0].toUpperCase() && str[1] === str[1].toUpperCase()) {
    return str;
  }
  return str.charAt(0).toLowerCase() + str.slice(1);
}

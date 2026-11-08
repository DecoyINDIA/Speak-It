export const BACKTRACKING_TRIGGERS = [
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

export function parseBacktracking(transcript: string): string {
  if (!transcript || typeof transcript !== 'string') return '';
  let text = transcript.trim();

  let modified = true;
  while (modified) {
    modified = false;

    for (const trigger of BACKTRACKING_TRIGGERS) {
      const pattern = new RegExp(`\\b${trigger}\\b[,\\.]?\\s*`, 'i');
      const match = pattern.exec(text);

      if (match) {
        const triggerIndex = match.index;
        const triggerLength = match[0].length;
        const before = text.substring(0, triggerIndex).trim();
        const after = text.substring(triggerIndex + triggerLength).trim();

        if (!before) {
          text = after;
          modified = true;
          break;
        }

        if (
          (trigger === 'never mind' || trigger === 'nevermind' || trigger === 'forget that' || trigger === 'cancel that') &&
          !after
        ) {
          text = '';
          modified = true;
          break;
        }

        const separators = [/\.\s+/, /;\s+/, /,\s+/, /\s+—\s+/, /\s+-\s+/, /\band\s+/i, /\bbut\s+/i];
        let lastSepIndex = -1;
        let sepLength = 0;

        for (const sep of separators) {
          let m: RegExpExecArray | null;
          const globalSep = new RegExp(sep.source, 'gi');
          while ((m = globalSep.exec(before)) !== null) {
            if (m.index > lastSepIndex) {
              lastSepIndex = m.index;
              sepLength = m[0].length;
            }
          }
        }

        if (lastSepIndex !== -1) {
          const prefix = before.substring(0, lastSepIndex + sepLength).trimEnd();
          text = prefix + ' ' + after;
        } else {
          const lastWordMatch = before.match(/^(.*?)(\s+\S+)$/);
          if (lastWordMatch && lastWordMatch[1]) {
            text = lastWordMatch[1] + ' ' + after;
          } else {
            text = after;
          }
        }

        text = text.replace(/\b(\w+)\s+\1\b/gi, '$1');
        modified = true;
        break;
      }
    }
  }

  return text
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,\.!\?;:])/g, '$1')
    .replace(/,\s*,/g, ',')
    .trim();
}

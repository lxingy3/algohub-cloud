const maxSentenceCount = 2;

export function buildStorySummary(text, options = {}) {
  const maxChars = Number(options.maxChars || 240);
  const cleaned = cleanSummaryInput(text);
  if (!cleaned) return '';
  if (cleaned.length <= maxChars) return cleaned;

  const sentences = cleaned
    .match(/[^.!?]+[.!?]+|[^.!?]+$/g)
    ?.map((sentence) => sentence.trim())
    .filter(Boolean) || [];
  const selected = [];
  for (const sentence of sentences) {
    const next = [...selected, sentence].join(' ');
    if (selected.length >= maxSentenceCount || next.length > maxChars) break;
    selected.push(sentence);
  }

  const base = selected.length ? selected.join(' ') : cleaned.slice(0, maxChars);
  return trimToWord(base, maxChars);
}

export function cleanSummaryInput(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isOpenAiGeneratedSummary(summary, brief) {
  const storedSummary = String(summary || '').trim();
  const briefSummary = String(brief?.summary || '').trim();
  const modelName = String(brief?.modelName || '').trim().toLowerCase();
  return Boolean(storedSummary && storedSummary === briefSummary && modelName.startsWith('openai'));
}

function trimToWord(text, maxChars) {
  const cleaned = cleanSummaryInput(text);
  if (cleaned.length <= maxChars) return cleaned;
  const truncated = cleaned.slice(0, Math.max(0, maxChars - 3)).trim();
  const wordBoundary = truncated.replace(/\s+\S*$/, '').trim();
  return `${wordBoundary || truncated}...`;
}

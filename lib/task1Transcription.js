import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const SUPPORTED_MEDIA_EXTENSIONS = new Set(['.wav', '.mp3', '.webm', '.flac', '.ogg', '.m4a', '.aac', '.mp4', '.mov', '.m4v', '.ogv']);
const SUPPORTED_MEDIA_MIME_TYPES = new Set([
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/mpeg',
  'audio/mp3',
  'audio/webm',
  'audio/flac',
  'audio/ogg',
  'audio/mp4',
  'audio/x-m4a',
  'audio/aac',
  'video/mp4',
  'video/quicktime',
  'video/x-m4v',
  'video/webm',
  'video/ogg',
]);
const execFileAsync = promisify(execFile);
const TERMINAL_PUNCTUATION = ['.', '?', '!'];
const CONTINUATION_WORDS = new Set([
  'and',
  'but',
  'or',
  'for',
  'nor',
  'so',
  'yet',
  'because',
  'while',
  'when',
  'where',
  'which',
  'who',
  'whose',
  'that',
  'than',
  'then',
  'to',
  'of',
  'in',
  'on',
  'at',
  'by',
  'from',
  'with',
  'between',
  'around',
  'under',
  'over',
  'into',
  'through',
  'as',
]);

export async function transcribeAudioForTask1(file) {
  if (!file || typeof file.arrayBuffer !== 'function') {
    throw new Error('Audio file is required for Task 1.');
  }
  validateSupportedAudioFile(file);
  if (process.env.ML_TASK1_ENDPOINT) {
    return transcribeAudioWithWorker(file);
  }
  return transcribeAudioLocally(file);
}

function validateSupportedAudioFile(file) {
  const name = String(file.name || '').toLowerCase();
  const extension = name.match(/\.[a-z0-9]+$/)?.[0] || '';
  const type = String(file.type || '').toLowerCase().split(';')[0].trim();
  if (SUPPORTED_MEDIA_EXTENSIONS.has(extension) || SUPPORTED_MEDIA_MIME_TYPES.has(type)) return;
  throw new Error('Task 1 supports audio files and common video files; video uploads are transcribed from their audio track only.');
}

async function transcribeAudioWithWorker(file) {
  const formData = new FormData();
  formData.append('file', file, file.name || 'uploaded-audio');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.TASK1_WORKER_TIMEOUT_MS || 60 * 60 * 1000));
  try {
    const headers = {};
    const workerToken = cleanToken(process.env.ML_WORKER_TOKEN);
    if (workerToken) headers.authorization = `Bearer ${workerToken}`;

    const response = await fetch(process.env.ML_TASK1_ENDPOINT, {
      method: 'POST',
      headers,
      body: formData,
      signal: controller.signal,
    });
    const text = await response.text();
    let payload = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = null;
    }
    if (!response.ok) {
      const detail = payload?.detail || payload?.error || text || response.status;
      throw new Error(`Task 1 worker failed: ${detail}`);
    }
    const transcript = String(payload?.transcript || payload?.rawTranscript || '').trim();
    if (!transcript) {
      throw new Error('Task 1 worker did not return transcript text.');
    }
    return {
      ...payload,
      status: payload.status || 'COMPLETED',
      inputKind: 'audio',
      inputFile: file.name || payload.inputFile || 'uploaded audio',
      provider: payload.provider || 'openai-whisper-worker',
      tool: payload.tool || payload.model || 'small',
      model: payload.model || payload.tool || 'small',
      mimeType: file.type || null,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function transcribeAudioLocally(file) {
  const audioBytes = await file.arrayBuffer();
  if (!audioBytes.byteLength) {
    throw new Error('Uploaded audio file is empty.');
  }

  const workDir = await mkdtemp(path.join(tmpdir(), 'algostories-task1-'));
  const inputExt = extensionForFile(file);
  const inputPath = path.join(workDir, `input${inputExt}`);
  const outputPath = path.join(workDir, 'task1-result.json');
  const repoRoot = process.cwd();
  const pythonPath = process.env.TASK1_PYTHON || path.join(repoRoot, '.task1-whisper-env', 'Scripts', 'python.exe');
  const scriptPath = path.join(repoRoot, 'scripts', 'task1-transcribe-local.py');
  const model = process.env.TASK1_WHISPER_MODEL || 'small';

  try {
    await writeFile(inputPath, Buffer.from(audioBytes));
    await execFileAsync(pythonPath, [
      scriptPath,
      '--input',
      inputPath,
      '--output',
      outputPath,
      '--model',
      model,
    ], {
      cwd: repoRoot,
      timeout: Number(process.env.TASK1_LOCAL_TIMEOUT_MS || 45 * 60 * 1000),
      maxBuffer: 1024 * 1024 * 4,
    });
    const result = JSON.parse(await readFile(outputPath, 'utf8'));
    if (!String(result.transcript || result.rawTranscript || '').trim()) {
      throw new Error('Local Whisper did not return transcript text.');
    }
    return {
      ...result,
      inputFile: file.name || result.inputFile || 'uploaded audio',
      inputKind: 'audio',
      status: result.status || 'COMPLETED',
      provider: result.provider || 'local-openai-whisper',
      tool: result.model || model,
      model: result.model || model,
      mimeType: file.type || null,
    };
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

function cleanToken(value) {
  return String(value || '').replace(/^\uFEFF/, '').trim();
}

function extensionForFile(file) {
  const name = String(file.name || '').toLowerCase();
  const match = name.match(/\.[a-z0-9]+$/);
  if (match) return match[0];
  if (file.type === 'audio/mpeg' || file.type === 'audio/mp3') return '.mp3';
  if (file.type === 'audio/ogg') return '.ogg';
  if (file.type === 'audio/webm') return '.webm';
  if (file.type === 'audio/wav' || file.type === 'audio/wave' || file.type === 'audio/x-wav') return '.wav';
  if (file.type === 'audio/flac') return '.flac';
  if (file.type === 'audio/mp4' || file.type === 'audio/x-m4a') return '.m4a';
  if (file.type === 'audio/aac') return '.aac';
  if (file.type === 'video/mp4') return '.mp4';
  if (file.type === 'video/quicktime') return '.mov';
  if (file.type === 'video/x-m4v') return '.m4v';
  if (file.type === 'video/webm') return '.webm';
  if (file.type === 'video/ogg') return '.ogv';
  return '.audio';
}

export function smoothTranscriptSegments(rawSegments) {
  const normalizedSegments = rawSegments
    .map((segment) => ({
      start: Number.isFinite(Number(segment.start)) ? Number(segment.start) : null,
      end: Number.isFinite(Number(segment.end)) ? Number(segment.end) : null,
      text: String(segment.text || '').trim(),
    }))
    .filter((segment) => segment.text);

  const sentenceSegments = [];
  let parts = [];
  let start = null;
  let end = null;

  normalizedSegments.forEach((segment, index) => {
    if (start === null) start = segment.start;
    end = segment.end;
    parts.push(segment.text);

    const nextText = normalizedSegments[index + 1]?.text;
    if (shouldContinue(segment.text, nextText)) return;

    sentenceSegments.push({
      start,
      end,
      text: normalizeSentence(parts.join(' ')),
    });
    parts = [];
    start = null;
    end = null;
  });

  if (parts.length) {
    sentenceSegments.push({
      start,
      end,
      text: normalizeSentence(parts.join(' ')),
    });
  }

  const transcript = sentenceSegments.map((segment) => segment.text).join(' ').trim();
  return { transcript, sentenceSegments };
}

function shouldContinue(currentText, nextText) {
  const text = String(currentText || '').trim();
  if (!text) return true;
  if (TERMINAL_PUNCTUATION.some((mark) => text.endsWith(mark))) return false;
  if ([',', ';', ':', '-', '—'].some((mark) => text.endsWith(mark))) return true;
  if (!nextText) return false;
  const firstWordRaw = String(nextText)
    .trim()
    .split(/\s+/, 1)[0]
    .replace(/^["'“”‘’()[\]{}]+|["'“”‘’()[\]{}]+$/g, '');
  const firstWord = firstWordRaw.toLowerCase();
  const startsLowercase = firstWordRaw[0] === firstWordRaw[0]?.toLowerCase();
  return Boolean(firstWordRaw) && startsLowercase && (CONTINUATION_WORDS.has(firstWord) || firstWord !== 'i');
}

function normalizeSentence(value) {
  let sentence = String(value || '').replace(/\s+/g, ' ').trim();
  if (!sentence) return sentence;
  if (!TERMINAL_PUNCTUATION.some((mark) => sentence.endsWith(mark))) sentence += '.';
  return sentence[0].toUpperCase() + sentence.slice(1);
}

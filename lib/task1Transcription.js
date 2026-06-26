import { InferenceClient } from '@huggingface/inference';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const DEFAULT_ASR_MODEL = 'openai/whisper-large-v3';
const DEFAULT_ASR_PROVIDER = 'fal-ai';
const SUPPORTED_MEDIA_EXTENSIONS = new Set(['.wav', '.mp3', '.webm', '.flac', '.ogg', '.m4a', '.mp4', '.mov', '.m4v', '.ogv']);
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
  if (process.env.TASK1_TRANSCRIBE_MODE === 'local') {
    return transcribeAudioLocally(file);
  }
  const huggingFaceToken = process.env.HUGGINGFACE_API_TOKEN || process.env.HF_TOKEN;
  if (!huggingFaceToken) {
    throw new Error('HUGGINGFACE_API_TOKEN or HF_TOKEN is required for Task 1 audio transcription.');
  }

  const audioBytes = await file.arrayBuffer();
  if (!audioBytes.byteLength) {
    throw new Error('Uploaded audio file is empty.');
  }
  if (audioBytes.byteLength > 25 * 1024 * 1024) {
    throw new Error('Please upload an audio file under 25 MB.');
  }

  const model = process.env.HF_ASR_MODEL || DEFAULT_ASR_MODEL;
  const provider = process.env.HF_ASR_PROVIDER || DEFAULT_ASR_PROVIDER;
  try {
    const client = new InferenceClient(huggingFaceToken);
    const data = await client.automaticSpeechRecognition({
      provider,
      model,
      data: new Blob([audioBytes], { type: file.type || 'application/octet-stream' }),
    });
    const transcript = extractTranscript(data);
    if (!transcript) {
      throw new Error('Whisper ASR did not return transcript text.');
    }

    const rawSegments = extractRawSegments(data, transcript);
    const { transcript: readableTranscript, sentenceSegments } = smoothTranscriptSegments(rawSegments);
    return {
      status: 'COMPLETED',
      tool: model,
      provider,
      model,
      inputKind: 'audio',
      inputFile: file.name || 'uploaded audio',
      mimeType: file.type || null,
      durationSeconds: null,
      transcript: readableTranscript,
      rawTranscript: transcript,
      segments: sentenceSegments,
      sentenceSegments,
      rawSegments,
      outputFormat: 'transcript and segments are sentence-smoothed; rawTranscript/rawSegments keep the original Whisper output',
    };
  } catch (error) {
    throw new Error(`Whisper ASR request failed: ${error?.message || error}`);
  }
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
      provider: payload.provider || 'faster-whisper-worker',
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
      provider: result.provider || 'local-faster-whisper',
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

function extractTranscript(data) {
  if (typeof data === 'string') return data.trim();
  if (!data || typeof data !== 'object') return '';
  return String(data.text || data.transcript || data.generated_text || '').trim();
}

function extractRawSegments(data, transcript) {
  const chunks = Array.isArray(data?.chunks) ? data.chunks : [];
  const chunkSegments = chunks
    .map((chunk) => {
      const timestamp = Array.isArray(chunk.timestamp) ? chunk.timestamp : [];
      return {
        start: timestamp[0] ?? null,
        end: timestamp[1] ?? null,
        text: chunk.text || '',
      };
    })
    .filter((segment) => String(segment.text || '').trim());

  if (chunkSegments.length) return chunkSegments;
  return splitTranscriptIntoSentences(transcript).map((text, index) => ({
    start: index === 0 ? 0 : null,
    end: null,
    text,
  }));
}

function splitTranscriptIntoSentences(transcript) {
  const text = String(transcript || '').replace(/\s+/g, ' ').trim();
  if (!text) return [];
  const matches = text.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g);
  return (matches || [text]).map((item) => item.trim()).filter(Boolean);
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

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const outputDir = path.join(process.cwd(), 'task1-results');
const hasWorkerTranscript = Boolean(process.env.TASK1_TRANSCRIPT_TEXT);
const transcript = process.env.TASK1_TRANSCRIPT_TEXT || [
  'This is a Task 1 transcription result placeholder.',
  'Replace TASK1_TRANSCRIPT_TEXT with the transcript returned by the open-source Whisper worker.',
  'The application endpoint will save this text to the transcription job and the public story transcript fields.',
].join(' ');

const result = {
  task: 'Task 1: audio transcription',
  inputKind: 'audio',
  inputFile: process.env.TASK1_AUDIO_FILE || '../voice test.mp3',
  provider: process.env.TASK1_PROVIDER || 'open-source-whisper',
  status: hasWorkerTranscript ? 'COMPLETED' : 'TEMPLATE',
  transcript,
  generatedAt: new Date().toISOString(),
};

await mkdir(outputDir, { recursive: true });
const outputPath = path.join(outputDir, 'task1-sample-transcription-result.json');
await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
console.log(outputPath);

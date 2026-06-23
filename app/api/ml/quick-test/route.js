import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/auth';
import {
  analyzeNarrativeTextTask4To7,
  analyzeNarrativeTextWithModels,
} from '../../../../lib/mlFullAnalysis';
import { transcribeAudioForTask1 } from '../../../../lib/task1Transcription';
import { buildStorySummary } from '../../../../lib/storySummary';
import { createSignedMediaRead } from '../../../../lib/mediaStorage';
import { getJurisdictionId } from '../../../../lib/jurisdiction';
import { prisma } from '../../../../lib/prisma';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const MAX_NARRATIVE_TEXT_CHARS = 12000;

export async function POST(request) {
  try {
    if (!await isAuthorized(request)) {
      return NextResponse.json({ error: 'Admin access is required.' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      return await handleAudioQuickTest(request);
    }

    const body = await request.json().catch(() => ({}));
    if (body.mediaObjectKey) {
      return await handleStoredAudioQuickTest(body);
    }

    const narrativeText = String(body.narrativeText || '').trim();
    if (!narrativeText) {
      return NextResponse.json({ error: 'Please enter narrative_text.' }, { status: 400 });
    }
    if (narrativeText.length > MAX_NARRATIVE_TEXT_CHARS) {
      return NextResponse.json({ error: `Please keep narrative_text under ${MAX_NARRATIVE_TEXT_CHARS.toLocaleString()} characters.` }, { status: 400 });
    }

    const result = await analyzeQuickTestText(narrativeText, {
      tasks: body.tasks,
      affectedDomain: body.affectedDomain,
    });
    return NextResponse.json({
      ok: true,
      result: {
        ...result,
        summary: result.task7?.summary || buildStorySummary(narrativeText, { maxChars: 320 }),
      },
    });
  } catch (error) {
    console.error('ML quick test failed', error);
    return NextResponse.json({
      error: cleanQuickTestError(error),
    }, { status: 500 });
  }
}

async function handleStoredAudioQuickTest(body) {
  const objectKey = String(body.mediaObjectKey || '').trim();
  if (!objectKey) {
    return NextResponse.json({ error: 'Please upload an audio file.' }, { status: 400 });
  }

  const file = await fileFromStoredMedia({
    objectKey,
    fileName: body.fileName,
    contentType: body.contentType,
  });
  return analyzeAudioFile({
    audioFile: file,
    taskMode: String(body.task || '').trim().toLowerCase(),
    analysisMode: String(body.tasks || '').trim().toLowerCase(),
    fallbackNarrativeText: String(body.narrativeText || '').trim(),
    affectedDomain: String(body.affectedDomain || '').trim(),
  });
}

async function fileFromStoredMedia({ objectKey, fileName, contentType }) {
  const readUrl = await createSignedMediaRead({ objectKey });
  const response = await fetch(readUrl);
  if (!response.ok) {
    throw new Error(`Could not read uploaded audio (${response.status}).`);
  }
  const blob = await response.blob();
  const resolvedContentType = contentType || response.headers.get('content-type') || blob.type || 'audio/mpeg';
  const resolvedFileName = fileName || objectKey.split('/').pop() || 'uploaded-audio';
  return new File([blob], resolvedFileName, { type: resolvedContentType });
}

async function isAuthorized(request) {
  const workerToken = cleanEnvToken(process.env.ML_WORKER_TOKEN);
  const requestToken = cleanEnvToken(request.headers.get('x-ml-worker-token'));
  if (workerToken && requestToken === workerToken) return true;
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;
  return Boolean(await requireAdmin());
}

function cleanEnvToken(value) {
  return String(value || '').replace(/^\uFEFF/, '').trim();
}

async function handleAudioQuickTest(request) {
  const formData = await request.formData();
  const audioFile = formData.get('audio');
  const taskMode = String(formData.get('task') || '').trim().toLowerCase();
  const analysisMode = String(formData.get('tasks') || '').trim().toLowerCase();
  const fallbackNarrativeText = String(formData.get('narrativeText') || '').trim();
  const affectedDomain = String(formData.get('affectedDomain') || '').trim();
  if (!audioFile || typeof audioFile.arrayBuffer !== 'function') {
    return NextResponse.json({ error: 'Please upload an audio file.' }, { status: 400 });
  }

  return analyzeAudioFile({ audioFile, taskMode, analysisMode, fallbackNarrativeText, affectedDomain });
}

async function analyzeAudioFile({ audioFile, taskMode, analysisMode, fallbackNarrativeText, affectedDomain }) {
  let task1;
  try {
    task1 = await transcribeAudioForTask1(audioFile);
  } catch (task1Error) {
    if (fallbackNarrativeText) {
      const analysis = await analyzeQuickTestText(fallbackNarrativeText, { tasks: analysisMode, affectedDomain });
      return NextResponse.json({
        ok: true,
        result: {
          ...analysis,
          inputField: 'audio',
          source: 'audio-upload',
          status: 'PARTIAL',
          summary: analysis.task7?.summary || buildStorySummary(fallbackNarrativeText, { maxChars: 320 }),
          task1: {
            status: 'SKIPPED',
            tool: process.env.HF_ASR_MODEL || 'openai/whisper-large-v3',
            error: cleanQuickTestError(task1Error),
          },
        },
      });
    }
    return NextResponse.json({
      ok: true,
      result: {
        inputField: 'audio',
        source: 'audio-upload',
        status: 'PARTIAL',
        task1: {
          status: 'SKIPPED',
          tool: process.env.HF_ASR_MODEL || 'openai/whisper-large-v3',
          error: cleanQuickTestError(task1Error),
        },
      },
    });
  }
  const narrativeText = String(task1.transcript || task1.rawTranscript || '').trim();
  if (!narrativeText) {
    if (fallbackNarrativeText) {
      const analysis = await analyzeQuickTestText(fallbackNarrativeText, { tasks: analysisMode, affectedDomain });
      return NextResponse.json({
        ok: true,
        result: {
          ...analysis,
          inputField: 'audio',
          source: 'audio-upload',
          status: 'PARTIAL',
          summary: analysis.task7?.summary || buildStorySummary(fallbackNarrativeText, { maxChars: 320 }),
          task1: {
            ...task1,
            status: task1.status || 'SKIPPED',
            error: 'Task 1 did not return transcript text.',
          },
        },
      });
    }
    return NextResponse.json({
      ok: true,
      result: {
        inputField: 'audio',
        source: 'audio-upload',
        status: 'PARTIAL',
        task1: {
          ...task1,
          status: task1.status || 'SKIPPED',
          error: 'Task 1 did not return transcript text.',
        },
      },
    });
  }
  if (taskMode === 'task1') {
    return NextResponse.json({
      ok: true,
      result: {
        inputField: 'audio',
        source: 'audio-upload',
        status: 'PARTIAL',
        summary: buildStorySummary(narrativeText, { maxChars: 320 }),
        task1,
      },
    });
  }
  if (narrativeText.length > MAX_NARRATIVE_TEXT_CHARS) {
    if (fallbackNarrativeText && fallbackNarrativeText.length <= MAX_NARRATIVE_TEXT_CHARS) {
      const analysis = await analyzeQuickTestText(fallbackNarrativeText, { tasks: analysisMode, affectedDomain });
      return NextResponse.json({
        ok: true,
        result: {
          ...analysis,
          inputField: 'audio',
          source: 'audio-upload',
          status: 'PARTIAL',
          summary: analysis.task7?.summary || buildStorySummary(fallbackNarrativeText, { maxChars: 320 }),
          task1,
        },
      });
    }
    return NextResponse.json({
      ok: true,
      result: {
        inputField: 'audio',
        source: 'audio-upload',
        status: 'PARTIAL',
        summary: buildStorySummary(narrativeText, { maxChars: 320 }),
        task1,
        task2: skippedPayload('MoritzLaurer/deberta-v3-base-zeroshot-v1.1-all-33', `Transcript is over ${MAX_NARRATIVE_TEXT_CHARS.toLocaleString()} characters. Add a shorter narrative_text excerpt to run Task 2-7.`),
        task3: skippedPayload('facebook/bart-large-mnli', `Transcript is over ${MAX_NARRATIVE_TEXT_CHARS.toLocaleString()} characters. Add a shorter narrative_text excerpt to run Task 2-7.`),
        task4: skippedPayload('spaCy', `Transcript is over ${MAX_NARRATIVE_TEXT_CHARS.toLocaleString()} characters. Add a shorter narrative_text excerpt to run Task 2-7.`),
        task5: skippedPayload('KeyBERT', `Transcript is over ${MAX_NARRATIVE_TEXT_CHARS.toLocaleString()} characters. Add a shorter narrative_text excerpt to run Task 2-7.`),
        task6: skippedPayload('local algorithm registry linker', `Transcript is over ${MAX_NARRATIVE_TEXT_CHARS.toLocaleString()} characters. Add a shorter narrative_text excerpt to run Task 2-7.`),
        task7: {
          status: 'COMPLETED',
          tool: 'local summary rules',
          summary: buildStorySummary(narrativeText, { maxChars: 320 }),
        },
      },
    });
  }

  const analysis = await analyzeQuickTestText(narrativeText, { tasks: analysisMode, affectedDomain });
  return NextResponse.json({
    ok: true,
    result: {
      ...analysis,
      inputField: 'audio',
      source: 'audio-upload',
      summary: analysis.task7?.summary || buildStorySummary(narrativeText, { maxChars: 320 }),
      task1,
    },
  });
}

async function analyzeQuickTestText(narrativeText, { tasks, affectedDomain } = {}) {
  const analysisMode = normalizeAnalysisMode(tasks);
  const algorithms = await loadAlgorithmCandidates();
  const options = { algorithms, affectedDomain };
  if (analysisMode === 'task4-7') {
    return analyzeNarrativeTextTask4To7(narrativeText, options);
  }
  return analyzeNarrativeTextWithModels(narrativeText, options);
}

function normalizeAnalysisMode(value) {
  const mode = String(value || '').trim().toLowerCase();
  return ['task4-7', '4-7', 'task6-7', '6-7'].includes(mode) ? 'task4-7' : 'task2-7';
}

async function loadAlgorithmCandidates() {
  return prisma.algorithm.findMany({
    where: { jurisdictionId: getJurisdictionId() },
    select: {
      id: true,
      name: true,
      useCase: true,
      description: true,
      purpose: true,
      agencyName: true,
      dataUsed: true,
      decisionType: true,
    },
  });
}

function skippedPayload(tool, error) {
  return {
    status: 'SKIPPED',
    tool,
    error,
  };
}

function cleanQuickTestError(error) {
  if (error?.name === 'AbortError') return 'ML quick test timed out. Try a shorter audio file or text sample.';
  const message = error?.message || String(error || 'ML quick test failed.');
  if (message.includes('Unexpected end of JSON input')) return 'ML quick test returned an empty response.';
  return message;
}

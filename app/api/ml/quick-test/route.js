import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/auth';
import { analyzeNarrativeTextWithModels } from '../../../../lib/mlFullAnalysis';
import { transcribeAudioForTask1 } from '../../../../lib/task1Transcription';
import { createSignedMediaRead } from '../../../../lib/mediaStorage';
import { shouldTranslateToEnglish, translateLongTextWithConfiguredProvider } from '../../../../lib/translation';
import { prepareMlAnalysisInput } from '../../../../lib/mlAnalysisInput';
import { prisma } from '../../../../lib/prisma';
import { getJurisdictionId } from '../../../../lib/jurisdiction';
import {
  buildAlgorithmMatchResultFromAnalysis,
  loadAlgorithmMatchCatalog,
} from '../../../../lib/algorithmMatcher';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

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
    const affectedDomain = String(body.affectedDomain || '').trim();
    const title = String(body.title || '').trim();
    if (!narrativeText) {
      return NextResponse.json({ error: 'Please enter narrative_text.' }, { status: 400 });
    }

    const analysisInput = await prepareMlAnalysisInput(narrativeText);
    const result = await analyzeQuickTestText(analysisInput.text, affectedDomain, title);
    return NextResponse.json({
      ok: true,
      result: {
        ...result,
        inputLanguage: analysisInput.translatedToEnglish ? 'translated-to-english' : 'english',
        originalNarrativeText: analysisInput.translatedToEnglish ? narrativeText : undefined,
        analysisText: analysisInput.text,
        truncatedForAnalysis: analysisInput.truncated,
        originalAnalysisTextLength: analysisInput.originalLength,
        translatedToEnglish: analysisInput.translatedToEnglish,
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
    fallbackNarrativeText: String(body.narrativeText || '').trim(),
    affectedDomain: String(body.affectedDomain || '').trim(),
    title: String(body.title || '').trim(),
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
  const fallbackNarrativeText = String(formData.get('narrativeText') || '').trim();
  const affectedDomain = String(formData.get('affectedDomain') || '').trim();
  const title = String(formData.get('title') || '').trim();
  const compressedForQuickTest = String(formData.get('compressedForQuickTest') || '').trim() === 'true';
  const originalFileName = String(formData.get('originalFileName') || '').trim();
  const originalFileSizeBytes = Number(formData.get('originalFileSizeBytes') || 0) || null;
  const originalDurationSeconds = Number(formData.get('originalDurationSeconds') || 0) || null;
  if (!audioFile || typeof audioFile.arrayBuffer !== 'function') {
    return NextResponse.json({ error: 'Please upload an audio file.' }, { status: 400 });
  }

  return analyzeAudioFile({
    audioFile,
    taskMode,
    fallbackNarrativeText,
    affectedDomain,
    title,
    audioTransformMetadata: compressedForQuickTest ? {
      compressedForQuickTest,
      originalFileName,
      originalFileSizeBytes,
      originalDurationSeconds,
    } : null,
  });
}

async function analyzeAudioFile({ audioFile, taskMode, fallbackNarrativeText, affectedDomain = '', title = '', audioTransformMetadata = null }) {
  let task1;
  try {
    task1 = await transcribeAudioForTask1(audioFile);
  } catch (task1Error) {
    if (fallbackNarrativeText) {
      const analysisInput = await prepareMlAnalysisInput(fallbackNarrativeText);
      const analysis = await analyzeQuickTestText(analysisInput.text, affectedDomain, title);
      return NextResponse.json({
        ok: true,
        result: {
          ...analysis,
          inputField: 'audio',
          source: 'audio-upload',
          status: 'PARTIAL',
          originalNarrativeText: analysisInput.translatedToEnglish ? fallbackNarrativeText : undefined,
          analysisText: analysisInput.text,
          truncatedForAnalysis: analysisInput.truncated,
          originalAnalysisTextLength: analysisInput.originalLength,
          translatedToEnglish: analysisInput.translatedToEnglish,
          task1: {
            status: 'SKIPPED',
            tool: process.env.TASK1_WHISPER_MODEL || 'small',
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
          tool: process.env.TASK1_WHISPER_MODEL || 'small',
          error: cleanQuickTestError(task1Error),
        },
      },
    });
  }
  if (audioTransformMetadata) {
    task1 = {
      ...task1,
      ...audioTransformMetadata,
      inputFile: audioTransformMetadata.originalFileName || task1.inputFile,
    };
  }
  task1 = await prepareTask1ForEnglishDisplay(task1);
  const narrativeText = String(task1.transcript || task1.rawTranscript || '').trim();
  if (!narrativeText) {
    if (fallbackNarrativeText) {
      const analysisInput = await prepareMlAnalysisInput(fallbackNarrativeText);
      const analysis = await analyzeQuickTestText(analysisInput.text, affectedDomain, title);
      return NextResponse.json({
        ok: true,
        result: {
          ...analysis,
          inputField: 'audio',
          source: 'audio-upload',
          status: 'PARTIAL',
          originalNarrativeText: analysisInput.translatedToEnglish ? fallbackNarrativeText : undefined,
          analysisText: analysisInput.text,
          truncatedForAnalysis: analysisInput.truncated,
          originalAnalysisTextLength: analysisInput.originalLength,
          translatedToEnglish: analysisInput.translatedToEnglish,
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
        task1,
      },
    });
  }
  const analysisInput = await prepareMlAnalysisInput(narrativeText);
  const analysis = await analyzeQuickTestText(analysisInput.text, affectedDomain, title);
  return NextResponse.json({
    ok: true,
    result: {
      ...analysis,
      inputField: 'audio',
      source: 'audio-upload',
      analysisText: analysisInput.text,
      truncatedForAnalysis: analysisInput.truncated,
      originalAnalysisTextLength: analysisInput.originalLength,
      task1,
    },
  });
}

async function analyzeQuickTestText(text, affectedDomain = '', title = '') {
  const analysis = await analyzeNarrativeTextWithModels(text);
  const task4And5Complete = analysis.task4?.status === 'COMPLETED' && analysis.task5?.status === 'COMPLETED';
  const algorithmMatching = !affectedDomain
    ? {
      status: 'NEEDS_DOMAIN',
      method: 'task-output+registry-text',
      matches: [],
      reason: 'Select the same affected domain used by a formal Story to preview its production algorithm match.',
    }
    : task4And5Complete
      ? buildAlgorithmMatchResultFromAnalysis({
      analysis,
      narrativeText: text,
      title,
      affectedDomain,
      algorithms: await loadAlgorithmMatchCatalog(prisma, getJurisdictionId()),
    })
    : {
      status: 'SKIPPED',
      method: 'task-output+registry-text',
      matches: [],
      reason: 'Task 4 and Task 5 must complete before algorithm matching can run.',
    };

  return {
    ...analysis,
    affectedDomain: affectedDomain || null,
    downstream: { algorithmMatching },
  };
}

async function prepareTask1ForEnglishDisplay(task1) {
  const originalTranscript = String(task1.transcript || task1.rawTranscript || '').trim();
  if (!shouldTranslateToEnglish(originalTranscript)) return task1;

  const translatedTranscript = await translateLongTextWithConfiguredProvider(originalTranscript, 'auto', 'en');
  if (!translatedTranscript || translatedTranscript === originalTranscript) return task1;

  return {
    ...task1,
    transcript: translatedTranscript,
    rawTranscript: translatedTranscript,
    originalTranscript,
    originalRawTranscript: task1.rawTranscript || originalTranscript,
    originalSegments: task1.segments || task1.sentenceSegments || [],
    segments: [],
    sentenceSegments: [],
    translatedToEnglish: true,
    displayLanguage: 'en',
  };
}

function cleanQuickTestError(error) {
  if (error?.name === 'AbortError') return 'ML quick test timed out. Try a shorter audio file or text sample.';
  const message = error?.message || String(error || 'ML quick test failed.');
  if (message.includes('Unexpected end of JSON input')) return 'ML quick test returned an empty response.';
  return message;
}

import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/auth';
import { analyzeNarrativeTextWithModels } from '../../../../lib/mlFullAnalysis';
import { transcribeAudioForTask1 } from '../../../../lib/task1Transcription';
import { buildStorySummary } from '../../../../lib/storySummary';
import { createSignedMediaRead } from '../../../../lib/mediaStorage';
import { shouldTranslateToEnglish, translateLongText } from '../../../../lib/translation';

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

    const preparedText = await prepareEnglishAnalysisText(narrativeText);
    const analysisInput = limitAnalysisText(preparedText.text);
    const result = await analyzeNarrativeTextWithModels(analysisInput.text);
    return NextResponse.json({
      ok: true,
      result: {
        ...result,
        inputLanguage: preparedText.translatedToEnglish ? 'translated-to-english' : 'english',
        originalNarrativeText: preparedText.translatedToEnglish ? narrativeText : undefined,
        analysisText: analysisInput.text,
        truncatedForAnalysis: analysisInput.truncated,
        originalAnalysisTextLength: analysisInput.originalLength,
        translatedToEnglish: preparedText.translatedToEnglish,
        summary: buildStorySummary(analysisInput.text, { maxChars: 320 }),
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
    audioTransformMetadata: compressedForQuickTest ? {
      compressedForQuickTest,
      originalFileName,
      originalFileSizeBytes,
      originalDurationSeconds,
    } : null,
  });
}

async function analyzeAudioFile({ audioFile, taskMode, fallbackNarrativeText, audioTransformMetadata = null }) {
  let task1;
  try {
    task1 = await transcribeAudioForTask1(audioFile);
  } catch (task1Error) {
    if (fallbackNarrativeText) {
      const preparedFallbackText = await prepareEnglishAnalysisText(fallbackNarrativeText);
      const analysisInput = limitAnalysisText(preparedFallbackText.text);
      const analysis = await analyzeNarrativeTextWithModels(analysisInput.text);
      return NextResponse.json({
        ok: true,
        result: {
          ...analysis,
          inputField: 'audio',
          source: 'audio-upload',
          status: 'PARTIAL',
          originalNarrativeText: preparedFallbackText.translatedToEnglish ? fallbackNarrativeText : undefined,
          analysisText: analysisInput.text,
          truncatedForAnalysis: analysisInput.truncated,
          originalAnalysisTextLength: analysisInput.originalLength,
          translatedToEnglish: preparedFallbackText.translatedToEnglish,
          summary: buildStorySummary(analysisInput.text, { maxChars: 320 }),
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
      const preparedFallbackText = await prepareEnglishAnalysisText(fallbackNarrativeText);
      const analysisInput = limitAnalysisText(preparedFallbackText.text);
      const analysis = await analyzeNarrativeTextWithModels(analysisInput.text);
      return NextResponse.json({
        ok: true,
        result: {
          ...analysis,
          inputField: 'audio',
          source: 'audio-upload',
          status: 'PARTIAL',
          originalNarrativeText: preparedFallbackText.translatedToEnglish ? fallbackNarrativeText : undefined,
          analysisText: analysisInput.text,
          truncatedForAnalysis: analysisInput.truncated,
          originalAnalysisTextLength: analysisInput.originalLength,
          translatedToEnglish: preparedFallbackText.translatedToEnglish,
          summary: buildStorySummary(analysisInput.text, { maxChars: 320 }),
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
    if (fallbackNarrativeText) {
      const preparedFallbackText = await prepareEnglishAnalysisText(fallbackNarrativeText);
      const analysisInput = limitAnalysisText(preparedFallbackText.text);
      const analysis = await analyzeNarrativeTextWithModels(analysisInput.text);
      return NextResponse.json({
        ok: true,
        result: {
          ...analysis,
          inputField: 'audio',
          source: 'audio-upload',
          status: 'PARTIAL',
          originalNarrativeText: preparedFallbackText.translatedToEnglish ? fallbackNarrativeText : undefined,
          analysisText: analysisInput.text,
          truncatedForAnalysis: analysisInput.truncated,
          originalAnalysisTextLength: analysisInput.originalLength,
          translatedToEnglish: preparedFallbackText.translatedToEnglish,
          summary: buildStorySummary(analysisInput.text, { maxChars: 320 }),
          task1,
        },
      });
    }
  }

  const analysisInput = limitAnalysisText(narrativeText);
  const analysis = await analyzeNarrativeTextWithModels(analysisInput.text);
  return NextResponse.json({
    ok: true,
    result: {
      ...analysis,
      inputField: 'audio',
      source: 'audio-upload',
      analysisText: analysisInput.text,
      truncatedForAnalysis: analysisInput.truncated,
      originalAnalysisTextLength: analysisInput.originalLength,
      summary: buildStorySummary(analysisInput.text, { maxChars: 320 }),
      task1,
    },
  });
}

async function prepareEnglishAnalysisText(text) {
  const originalText = String(text || '').trim();
  if (!shouldTranslateToEnglish(originalText)) {
    return { text: originalText, translatedToEnglish: false };
  }
  const translatedText = await translateLongText(originalText, 'auto', 'en');
  if (!translatedText || translatedText === originalText) {
    return { text: originalText, translatedToEnglish: false };
  }
  return { text: translatedText, translatedToEnglish: true };
}

function limitAnalysisText(text) {
  const value = String(text || '').trim();
  return {
    text: value.slice(0, MAX_NARRATIVE_TEXT_CHARS),
    truncated: value.length > MAX_NARRATIVE_TEXT_CHARS,
    originalLength: value.length,
  };
}

async function prepareTask1ForEnglishDisplay(task1) {
  const originalTranscript = String(task1.transcript || task1.rawTranscript || '').trim();
  if (!shouldTranslateToEnglish(originalTranscript)) return task1;

  const translatedTranscript = await translateLongText(originalTranscript, 'auto', 'en');
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

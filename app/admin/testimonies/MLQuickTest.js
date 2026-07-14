'use client';

import { useRef, useState } from 'react';
import { MEDIA_ACCEPT, audioContentTypeForFile } from '../../../lib/audioAccept';
import { getMediaDurationSeconds } from '../../../lib/clientMedia';
import { MLTaskResults } from './ExpandablePanels';

const MAX_NARRATIVE_TEXT_CHARS = 12000;
const MAX_AUDIO_DURATION_SECONDS = 30 * 60;
const DIRECT_AUDIO_UPLOAD_SAFE_BYTES = 4_500_000;
const COMPRESSED_AUDIO_SAMPLE_RATE = 16000;
const COMPRESSED_AUDIO_BITRATES = [16, 8];
const AUDIO_COMPRESSION_TIMEOUT_MS = 2 * 60 * 1000;
let mp3EncoderLoadPromise = null;

export default function MLQuickTest({ domains = [] }) {
  const [storyTitle, setStoryTitle] = useState('');
  const [narrativeText, setNarrativeText] = useState('');
  const [affectedDomain, setAffectedDomain] = useState('');
  const [audioFile, setAudioFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loadingLabel, setLoadingLabel] = useState('');
  const audioInputRef = useRef(null);
  const runVersionRef = useRef(0);
  const abortControllerRef = useRef(null);

  async function runQuickTest(event) {
    event.preventDefault();
    abortCurrentRequest();
    const runVersion = runVersionRef.current + 1;
    runVersionRef.current = runVersion;
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    setError('');
    setResult(null);
    setLoadingLabel('Running...');
    try {
      if (audioFile) {
        await runAudioQuickTest(audioFile, narrativeText, runVersion, abortController.signal);
      } else {
        const payload = await postQuickTest({
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ title: storyTitle, narrativeText, affectedDomain }),
          signal: abortController.signal,
        });
        if (!isCurrentRun(runVersion)) return;
        setResult(payload.result);
      }
    } catch (quickTestError) {
      if (!isCurrentRun(runVersion)) return;
      if (quickTestError.name === 'AbortError') return;
      setError(quickTestError.message || 'Quick test failed.');
    } finally {
      if (isCurrentRun(runVersion)) {
        setLoadingLabel('');
        abortControllerRef.current = null;
      }
    }
  }

  async function runAudioQuickTest(file, fallbackText, runVersion, signal) {
    setLoadingLabel('Checking audio...');
    const fallbackNarrativeText = String(fallbackText || '').trim();
    const durationSeconds = await getMediaDurationSeconds(file).catch(() => null);
    if (durationSeconds && durationSeconds > MAX_AUDIO_DURATION_SECONDS) {
      throw new Error('Audio is over the 30 minute limit. Please upload a shorter file.');
    }

    setLoadingLabel('Uploading audio...');
    setLoadingLabel('Running Task 1...');
    const task1Request = await buildAudioTask1Request(file, signal, fallbackNarrativeText, durationSeconds, setLoadingLabel, affectedDomain, storyTitle);
    if (task1Request.fallbackOnly) {
      await runAudioFallbackOnlyTask25({ file, fallbackNarrativeText, runVersion, signal, reason: task1Request.reason, durationSeconds });
      return;
    }

    const task1Payload = await postQuickTest(task1Request);
    if (!isCurrentRun(runVersion)) return;
    setResult(task1Payload.result);

    const task1 = task1Payload.result?.task1 || {};
    const transcript = String(task1.transcript || task1.rawTranscript || '').trim();
    if (task1.status !== 'COMPLETED' || !transcript) {
      return;
    }

    const analysisText = transcript.slice(0, MAX_NARRATIVE_TEXT_CHARS);
    if (!analysisText) return;

    setLoadingLabel('Running Task 2-5...');
    try {
      const analysisPayload = await postQuickTest({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title: storyTitle, narrativeText: analysisText, affectedDomain }),
        signal,
      });
      if (!isCurrentRun(runVersion)) return;
      setResult({
        ...analysisPayload.result,
        inputField: 'audio',
        source: 'audio-upload',
        task1,
      });
    } catch (analysisError) {
      if (!isCurrentRun(runVersion)) return;
      setResult((current) => ({
        ...(current || task1Payload.result),
        status: 'PARTIAL',
        task2: skippedTask('facebook/bart-large-mnli', cleanQuickTestErrorMessage(analysisError.message || 'Task 2-5 failed.')),
        task3: skippedTask('facebook/bart-large-mnli', cleanQuickTestErrorMessage(analysisError.message || 'Task 2-5 failed.')),
        task4: skippedTask('spaCy', cleanQuickTestErrorMessage(analysisError.message || 'Task 2-5 failed.')),
        task5: skippedTask('KeyBERT', cleanQuickTestErrorMessage(analysisError.message || 'Task 2-5 failed.')),
      }));
    }
  }

  async function runAudioFallbackOnlyTask25({ file, fallbackNarrativeText, runVersion, signal, reason, durationSeconds }) {
    if (!fallbackNarrativeText) {
      throw new Error(reason);
    }
    setLoadingLabel('Running Task 2-5 from narrative_text...');
    const analysisPayload = await postQuickTest({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ title: storyTitle, narrativeText: fallbackNarrativeText, affectedDomain }),
      signal,
    });
    if (!isCurrentRun(runVersion)) return;
    setResult({
      ...analysisPayload.result,
      inputField: 'audio',
      source: 'audio-upload',
      status: 'COMPLETED',
      task1: deferredTask('small', reason, {
        inputFile: file.name,
        fileSizeBytes: file.size,
        durationSeconds,
      }),
    });
  }

  function isCurrentRun(runVersion) {
    return runVersionRef.current === runVersion;
  }

  function abortCurrentRequest() {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
  }

  function clearQuickTestOutput() {
    setResult(null);
    setError('');
  }

  function handleNarrativeTextChange(event) {
    runVersionRef.current += 1;
    abortCurrentRequest();
    setNarrativeText(event.target.value);
    setLoadingLabel('');
    clearQuickTestOutput();
  }

  function handleStoryTitleChange(event) {
    runVersionRef.current += 1;
    abortCurrentRequest();
    setStoryTitle(event.target.value);
    setLoadingLabel('');
    clearQuickTestOutput();
  }

  function handleAudioChange(event) {
    runVersionRef.current += 1;
    abortCurrentRequest();
    setAudioFile(event.target.files?.[0] || null);
    setLoadingLabel('');
    clearQuickTestOutput();
  }

  function clearAudioInput() {
    runVersionRef.current += 1;
    abortCurrentRequest();
    setAudioFile(null);
    setLoadingLabel('');
    clearQuickTestOutput();
    if (audioInputRef.current) audioInputRef.current.value = '';
  }

  return (
    <section data-testid="ml-quick-test" className="mt-5 rounded-lg border bg-white p-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-slate-950">ML Quick Test</h2>
        <p className="text-sm text-slate-600">Test only — results use the production Task 1–5 format and are not saved.</p>
      </div>
      <form onSubmit={runQuickTest} className="mt-3 space-y-3">
        <label className="block text-sm font-medium text-slate-700">
          Story title <span className="font-normal text-slate-500">(optional; used by the formal matcher)</span>
          <input
            type="text"
            name="story_title"
            value={storyTitle}
            onChange={handleStoryTitleChange}
            maxLength={255}
            className="mt-2 min-h-11 w-full rounded-md border px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Affected domain
          <select
            value={affectedDomain}
            onChange={(event) => {
              runVersionRef.current += 1;
              abortCurrentRequest();
              setAffectedDomain(event.target.value);
              setLoadingLabel('');
              clearQuickTestOutput();
            }}
            className="mt-2 min-h-11 w-full rounded-md border px-3 py-2 text-sm"
          >
            <option value="">Select a domain for production-equivalent algorithm matching</option>
            {domains.map((domain) => <option key={domain} value={domain}>{domain}</option>)}
          </select>
        </label>
        <textarea
          value={narrativeText}
          onChange={handleNarrativeTextChange}
          name="narrative_text"
          rows={5}
          placeholder="Paste narrative_text..."
          className="w-full rounded-md border px-3 py-2 text-sm leading-6"
        />
        <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-3">
          <label className="block text-xs font-semibold uppercase text-slate-500" htmlFor="ml-quick-test-audio">Audio or video input</label>
          <input
            id="ml-quick-test-audio"
            ref={audioInputRef}
            type="file"
            accept={MEDIA_ACCEPT}
            onChange={handleAudioChange}
            className="mt-2 block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
          />
          {audioFile ? (
            <button
              type="button"
              onClick={clearAudioInput}
              className="mt-2 min-h-10 rounded-md px-2 text-xs font-semibold text-slate-600 hover:bg-white hover:text-slate-950"
            >
            Clear media
            </button>
          ) : null}
        </div>
        <button
          type="submit"
          disabled={Boolean(loadingLabel) || (!audioFile && !narrativeText.trim())}
          className="min-h-11 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {loadingLabel || 'Run ML test'}
        </button>
      </form>
      {error ? <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      {result ? <QuickTestResult result={result} isRunning={Boolean(loadingLabel)} /> : null}
    </section>
  );
}

async function postQuickTest(requestOptions) {
  const response = await fetch('/api/ml/quick-test', requestOptions);
  const payload = await parseQuickTestResponse(response);
  if (!response.ok) throw new Error(payload.error || 'Quick test failed.');
  return payload;
}

async function parseQuickTestResponse(response) {
  const text = await response.text();
  if (!text) {
    return { error: `Quick test returned an empty response (${response.status}).` };
  }
  try {
    return JSON.parse(text);
  } catch {
    return { error: text.slice(0, 500) || `Quick test returned a non-JSON response (${response.status}).` };
  }
}

async function uploadAudioForQuickTest(audioFile, signal) {
  const contentType = audioContentTypeForFile(audioFile);
  const kind = contentType.toLowerCase().startsWith('video/') ? 'video' : 'audio';
  const presignResponse = await fetch('/api/uploads/presign', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      kind,
      fileName: audioFile.name,
      contentType,
      size: audioFile.size,
    }),
    signal,
  });
  const presignPayload = await parseQuickTestResponse(presignResponse);
  if (!presignResponse.ok) {
    const error = new Error(presignPayload.error || 'Audio upload could not be prepared.');
    error.status = presignResponse.status;
    throw error;
  }

  const uploadResponse = await fetch(presignPayload.uploadUrl, {
    method: 'PUT',
    headers: { 'content-type': presignPayload.contentType || contentType },
    body: audioFile,
    signal,
  });
  if (!uploadResponse.ok) throw new Error(`Audio upload failed (${uploadResponse.status}).`);

  return {
    objectKey: presignPayload.objectKey,
    contentType: presignPayload.contentType || contentType,
    fileName: audioFile.name,
  };
}

async function buildAudioTask1Request(audioFile, signal, fallbackText = '', durationSeconds = null, updateStatus = (_value) => {}, affectedDomain = '', title = '') {
  const contentType = audioContentTypeForFile(audioFile);
  const isVideo = contentType.toLowerCase().startsWith('video/');
  if (isVideo) updateStatus('Uploading video for audio transcription...');
  try {
    const uploadedAudio = await uploadAudioForQuickTest(audioFile, signal);
    return buildStoredAudioRequest(uploadedAudio, 'task1', signal, fallbackText, affectedDomain, title);
  } catch (uploadError) {
    if (uploadError.status !== 503) throw uploadError;
    if (isVideo && audioFile.size > DIRECT_AUDIO_UPLOAD_SAFE_BYTES) {
      if (!fallbackText) {
        throw new Error(`Video uploads need cloud media storage for reliable audio-track transcription. Add narrative_text up to ${MAX_NARRATIVE_TEXT_CHARS.toLocaleString()} characters so Task 2-5 can run now.`);
      }
      return {
        fallbackOnly: true,
        reason: 'Video audio transcription is deferred for this Quick Test run. Task 2-5 ran from narrative_text.',
      };
    }
    if (audioFile.size > DIRECT_AUDIO_UPLOAD_SAFE_BYTES) {
      try {
        updateStatus('Compressing audio...');
        const compressedAudio = await compressAudioForDirectUpload(audioFile, updateStatus, signal);
        return buildDirectAudioRequest(compressedAudio, 'task1', signal, fallbackText, {
          originalFileName: audioFile.name,
          originalFileSizeBytes: String(audioFile.size),
          originalDurationSeconds: durationSeconds ? String(durationSeconds) : '',
          compressedForQuickTest: 'true',
        }, affectedDomain, title);
      } catch (compressionError) {
        if (!fallbackText) {
          throw new Error(`Audio compression did not finish in this browser. Add narrative_text up to ${MAX_NARRATIVE_TEXT_CHARS.toLocaleString()} characters so Task 2-5 can run while audio transcription is retried later.`);
        }
        console.warn('Audio compression fallback failed', compressionError);
      }
      return {
        fallbackOnly: true,
        reason: 'Audio transcription is deferred for this Quick Test run. Task 2-5 ran from narrative_text.',
      };
    }
    return buildDirectAudioRequest(audioFile, 'task1', signal, fallbackText, {}, affectedDomain, title);
  }
}

function buildDirectAudioRequest(audioFile, task = '', signal, fallbackText = '', extraFields = {}, affectedDomain = '', title = '') {
  const formData = new FormData();
  formData.append('audio', audioFile);
  if (task) formData.append('task', task);
  if (fallbackText) formData.append('narrativeText', fallbackText);
  if (affectedDomain) formData.append('affectedDomain', affectedDomain);
  if (title) formData.append('title', title);
  for (const [key, value] of Object.entries(extraFields)) {
    if (value) formData.append(key, value);
  }
  return {
    method: 'POST',
    credentials: 'include',
    body: formData,
    signal,
  };
}

function buildStoredAudioRequest(uploadedAudio, task = '', signal, fallbackText = '', affectedDomain = '', title = '') {
  return {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      mediaObjectKey: uploadedAudio.objectKey,
      contentType: uploadedAudio.contentType,
      fileName: uploadedAudio.fileName,
      task,
      narrativeText: fallbackText,
      affectedDomain,
      title,
    }),
    signal,
  };
}

function skippedTask(tool, error, extra = {}) {
  return {
    status: 'SKIPPED',
    tool,
    error: cleanQuickTestErrorMessage(error),
    ...extra,
  };
}

function deferredTask(tool, reason, extra = {}) {
  return {
    status: 'DEFERRED',
    tool,
    reason,
    ...extra,
  };
}

function cleanQuickTestErrorMessage(message) {
  const text = String(message || 'Quick test failed.');
  if (text.includes('FUNCTION_INVOCATION_TIMEOUT')) {
    return 'The hosted ML request timed out. Try again; completed tasks and local fallback results will be shown when available.';
  }
  return text.replace(/\s+[a-z]{3}\d+::[a-z0-9-]+$/i, '').trim();
}

async function compressAudioForDirectUpload(audioFile, updateStatus, signal) {
  const deadline = Date.now() + AUDIO_COMPRESSION_TIMEOUT_MS;
  const audioBuffer = await decodeAudioFile(audioFile);
  for (const bitrate of COMPRESSED_AUDIO_BITRATES) {
    throwIfCompressionShouldStop(signal, deadline);
    updateStatus(`Compressing audio (${bitrate}kbps)...`);
    const mp3File = await encodeAudioBufferAsMp3(audioBuffer, {
      sourceName: audioFile.name,
      bitrate,
      updateStatus,
      deadline,
      signal,
    });
    if (mp3File.size <= DIRECT_AUDIO_UPLOAD_SAFE_BYTES) {
      return mp3File;
    }
  }
  throw new Error('Compressed audio is still above the direct upload target.');
}

async function decodeAudioFile(audioFile) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    throw new Error('Browser audio decoding is unavailable.');
  }
  const audioContext = new AudioContextClass();
  try {
    const buffer = await audioFile.arrayBuffer();
    return await audioContext.decodeAudioData(buffer);
  } finally {
    await audioContext.close().catch(() => {});
  }
}

async function encodeAudioBufferAsMp3(audioBuffer, { sourceName, bitrate, updateStatus, deadline, signal }) {
  const monoBuffer = await renderMonoBuffer(audioBuffer, COMPRESSED_AUDIO_SAMPLE_RATE);
  const samples = monoBuffer.getChannelData(0);
  const { Mp3Encoder } = await loadMp3Encoder();
  const encoder = new Mp3Encoder(1, COMPRESSED_AUDIO_SAMPLE_RATE, bitrate);
  const chunks = [];
  const frameSize = 1152;
  const totalFrames = Math.ceil(samples.length / frameSize);
  const int16Samples = floatToInt16(samples);

  for (let offset = 0, frame = 0; offset < samples.length; offset += frameSize, frame += 1) {
    if (frame % 400 === 0) {
      throwIfCompressionShouldStop(signal, deadline);
    }
    const mp3Buffer = encoder.encodeBuffer(int16Samples.subarray(offset, offset + frameSize));
    if (mp3Buffer.length) chunks.push(mp3Buffer);
    if (frame % 400 === 0) {
      updateStatus(`Compressing audio (${Math.min(99, Math.round((frame / totalFrames) * 100))}%)...`);
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  throwIfCompressionShouldStop(signal, deadline);
  updateStatus('Finalizing compressed audio...');
  const finalBuffer = encoder.flush();
  if (finalBuffer.length) chunks.push(finalBuffer);
  const outputName = `${sourceName.replace(/\.[^.]+$/, '') || 'audio'}-compressed-${bitrate}kbps.mp3`;
  return new File(chunks, outputName, { type: 'audio/mpeg' });
}

function throwIfCompressionShouldStop(signal, deadline) {
  if (signal?.aborted) {
    const error = new Error('Audio compression was cancelled.');
    error.name = 'AbortError';
    throw error;
  }
  if (Date.now() > deadline) {
    throw new Error('Audio compression took too long in this browser.');
  }
}

async function renderMonoBuffer(audioBuffer, sampleRate) {
  const frameCount = Math.ceil(audioBuffer.duration * sampleRate);
  const OfflineContextClass = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!OfflineContextClass) {
    throw new Error('Browser offline audio rendering is unavailable.');
  }
  const offlineContext = new OfflineContextClass(1, frameCount, sampleRate);
  const source = offlineContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineContext.destination);
  source.start(0);
  return offlineContext.startRendering();
}

function floatToInt16(floatSamples) {
  const output = new Int16Array(floatSamples.length);
  for (let index = 0; index < floatSamples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, floatSamples[index]));
    output[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return output;
}

async function loadMp3Encoder() {
  if (window.lamejs?.Mp3Encoder) {
    return { Mp3Encoder: window.lamejs.Mp3Encoder };
  }
  mp3EncoderLoadPromise ??= loadScript('/vendor/lame.all.js');
  await mp3EncoderLoadPromise;
  const Mp3Encoder = window.lamejs?.Mp3Encoder;
  if (!Mp3Encoder) {
    throw new Error('MP3 encoder could not be loaded.');
  }
  return { Mp3Encoder };
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${src}"]`);
    if (existingScript) {
      existingScript.addEventListener('load', resolve, { once: true });
      existingScript.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

function QuickTestResult({ result, isRunning = false }) {
  const tasks = [result.task1, result.task2, result.task3, result.task4, result.task5].filter(Boolean);
  const hasIncompleteTask = tasks.some((task) => task.status === 'SKIPPED' && task.error);

  return (
    <div className="mt-4 space-y-3">
      {result.status === 'PARTIAL' && (!isRunning || hasIncompleteTask) ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Some tasks did not return a result. Completed tasks are shown below.</p>
      ) : null}
      {result.truncatedForAnalysis ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Task 2-5 used the first {MAX_NARRATIVE_TEXT_CHARS.toLocaleString()} characters for analysis.
        </p>
      ) : null}
      <MLTaskResults result={result} showTechnicalDetails />
    </div>
  );
}

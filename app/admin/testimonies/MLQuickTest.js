'use client';

import { useRef, useState } from 'react';
import { AUDIO_ACCEPT, audioContentTypeForFile } from '../../../lib/audioAccept';

const MAX_NARRATIVE_TEXT_CHARS = 12000;

export default function MLQuickTest() {
  const [narrativeText, setNarrativeText] = useState('');
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
          body: JSON.stringify({ narrativeText }),
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
    setLoadingLabel('Uploading audio...');
    const fallbackNarrativeText = String(fallbackText || '').trim();
    const uploadedAudio = await uploadAudioForQuickTest(file, signal);
    if (!isCurrentRun(runVersion)) return;

    setLoadingLabel('Running Task 1...');
    const task1Payload = await postQuickTest(buildStoredAudioRequest(uploadedAudio, 'task1', signal, fallbackNarrativeText));
    if (!isCurrentRun(runVersion)) return;
    setResult(task1Payload.result);

    const task1 = task1Payload.result?.task1 || {};
    const transcript = String(task1.transcript || task1.rawTranscript || '').trim();
    if (task1.status !== 'COMPLETED' || !transcript) {
      return;
    }

    const analysisText = transcript.length > MAX_NARRATIVE_TEXT_CHARS ? fallbackNarrativeText : transcript;
    if (!analysisText || analysisText.length > MAX_NARRATIVE_TEXT_CHARS) {
      if (!isCurrentRun(runVersion)) return;
      setResult((current) => ({
        ...(current || task1Payload.result),
        status: 'PARTIAL',
        task2: skippedTask('MoritzLaurer/deberta-v3-base-zeroshot-v1.1-all-33', `Transcript is over ${MAX_NARRATIVE_TEXT_CHARS.toLocaleString()} characters. Add a shorter narrative_text excerpt to run Task 2-5.`),
        task3: skippedTask('facebook/bart-large-mnli', `Transcript is over ${MAX_NARRATIVE_TEXT_CHARS.toLocaleString()} characters. Add a shorter narrative_text excerpt to run Task 2-5.`),
        task4: skippedTask('spaCy', `Transcript is over ${MAX_NARRATIVE_TEXT_CHARS.toLocaleString()} characters. Add a shorter narrative_text excerpt to run Task 2-5.`),
        task5: skippedTask('KeyBERT', `Transcript is over ${MAX_NARRATIVE_TEXT_CHARS.toLocaleString()} characters. Add a shorter narrative_text excerpt to run Task 2-5.`),
      }));
      return;
    }

    setLoadingLabel('Running Task 2-5...');
    try {
      const analysisPayload = await postQuickTest({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ narrativeText: analysisText }),
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
        task2: skippedTask('MoritzLaurer/deberta-v3-base-zeroshot-v1.1-all-33', analysisError.message || 'Task 2-5 failed.'),
        task3: skippedTask('facebook/bart-large-mnli', analysisError.message || 'Task 2-5 failed.'),
        task4: skippedTask('spaCy', analysisError.message || 'Task 2-5 failed.'),
        task5: skippedTask('KeyBERT', analysisError.message || 'Task 2-5 failed.'),
      }));
    }
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
      </div>
      <form onSubmit={runQuickTest} className="mt-3 space-y-3">
        <textarea
          value={narrativeText}
          onChange={handleNarrativeTextChange}
          name="narrative_text"
          rows={5}
          placeholder="Paste narrative_text..."
          className="w-full rounded-md border px-3 py-2 text-sm leading-6"
        />
        <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-3">
          <label className="block text-xs font-semibold uppercase text-slate-500" htmlFor="ml-quick-test-audio">Audio input</label>
          <input
            id="ml-quick-test-audio"
            ref={audioInputRef}
            type="file"
            accept={AUDIO_ACCEPT}
            onChange={handleAudioChange}
            className="mt-2 block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
          />
          {audioFile ? (
            <button
              type="button"
              onClick={clearAudioInput}
              className="mt-2 text-xs font-semibold text-slate-600 hover:text-slate-950"
            >
              Clear audio
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
  const presignResponse = await fetch('/api/uploads/presign', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      kind: 'audio',
      fileName: audioFile.name,
      contentType,
      size: audioFile.size,
    }),
    signal,
  });
  const presignPayload = await parseQuickTestResponse(presignResponse);
  if (!presignResponse.ok) throw new Error(presignPayload.error || 'Audio upload could not be prepared.');

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

function buildStoredAudioRequest(uploadedAudio, task = '', signal, fallbackText = '') {
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
    }),
    signal,
  };
}

function skippedTask(tool, error) {
  return {
    status: 'SKIPPED',
    tool,
    error,
  };
}

function QuickTestResult({ result, isRunning = false }) {
  const task1 = result.task1 || {};
  const task2 = result.task2 || {};
  const task3 = result.task3 || {};
  const task4 = result.task4 || {};
  const task5 = result.task5 || {};
  const entities = task4.entities || {};
  const hasTask2 = task2.status === 'SKIPPED' || Boolean(task2.aiImpactClassification);
  const hasTask3 = task3.status === 'SKIPPED' || Array.isArray(task3.aiThemes);
  const hasTask4 = task4.status === 'SKIPPED' || Boolean(task4.entities);
  const hasTask5 = task5.status === 'SKIPPED' || Array.isArray(task5.keywords);
  const hasIncompleteTask = [task1, task2, task3, task4, task5].some((task) => task.status === 'SKIPPED' && task.error);

  return (
    <div className="mt-4 space-y-3">
      {result.status === 'PARTIAL' && (!isRunning || hasIncompleteTask) ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Some tasks did not return a result. Completed tasks are shown below.</p>
      ) : null}
      {result.summary ? (
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase text-slate-500">Summary</p>
          <p className="mt-1 text-sm leading-6 text-slate-800">{result.summary}</p>
        </div>
      ) : null}
      <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-semibold uppercase text-slate-500">Task 1 transcription</p>
        {task1.status === 'SKIPPED' ? (
          <p className="mt-1 text-sm text-slate-700">{task1.reason || 'Skipped for text input.'}</p>
        ) : (
          <div className="mt-2 space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-800">{task1.status}</span>
              {task1.tool ? <span className="text-slate-600">{task1.tool}</span> : null}
              {task1.inputFile ? <span className="text-slate-600">{task1.inputFile}</span> : null}
            </div>
            <p className="whitespace-pre-wrap rounded-md border bg-white p-3 text-sm leading-6 text-slate-800">{task1.transcript || task1.rawTranscript}</p>
            {(task1.segments || []).length ? (
              <div className="grid gap-2 md:grid-cols-2">
                {task1.segments.map((segment, index) => (
                  <div key={`${segment.start}-${segment.end}-${index}`} className="rounded-md border bg-white p-2 text-sm">
                    <p className="text-xs font-semibold text-slate-500">{formatTimestamp(segment.start)} - {formatTimestamp(segment.end)}</p>
                    <p className="mt-1 text-slate-800">{segment.text}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </div>
      {hasTask2 ? (
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase text-slate-500">Task 2 impact classification</p>
          {task2.status === 'SKIPPED' ? <TaskError task={task2} /> : (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-full bg-slate-900 px-2.5 py-1 font-semibold text-white">{task2.aiImpactClassification}</span>
              <span className="text-slate-600">confidence {formatScore(task2.aiConfidenceScore)}</span>
              {task2.humanReviewRequired ? <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">Needs review</span> : null}
            </div>
          )}
        </div>
      ) : null}
      {hasTask3 ? (
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase text-slate-500">Task 3 theme detection</p>
          {task3.status === 'SKIPPED' ? <TaskError task={task3} /> : (
            <div className="mt-2 flex flex-wrap gap-2">
              {(task3.aiThemes || []).length ? task3.aiThemes.map((theme) => (
                <span key={theme.theme} className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-800">
                  {formatLabel(theme.theme)} {formatScore(theme.confidence)}
                </span>
              )) : <span className="text-sm text-slate-600">No themes detected.</span>}
            </div>
          )}
        </div>
      ) : null}
      {hasTask4 ? (
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase text-slate-500">Task 4 entity extraction</p>
          {task4.status === 'SKIPPED' ? <TaskError task={task4} /> : (
            <div className="mt-2 grid gap-3 text-sm text-slate-700 md:grid-cols-2">
              {entityGroups.map((group) => {
                const values = Array.isArray(entities[group]) ? entities[group] : [];
                return (
                <div key={group}>
                  <span className="block text-xs font-semibold uppercase text-slate-500">{formatLabel(group)}</span>
                  <span>{values.length ? values.join(', ') : 'None found'}</span>
                </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
      {hasTask5 ? (
        <div className="rounded-md border border-slate-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase text-slate-500">Task 5 keyword extraction</p>
          {task5.status === 'SKIPPED' ? <TaskError task={task5} /> : (
            <div className="mt-2 flex flex-wrap gap-2">
              {(task5.keywords || []).length ? task5.keywords.map((keyword) => (
                <span key={keyword} className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900">{keyword}</span>
              )) : <span className="text-sm text-slate-600">None found</span>}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

const entityGroups = ['agencies', 'locations', 'systems', 'dates', 'people_roles'];

function TaskError({ task }) {
  return (
    <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      {task.tool ? <p className="font-semibold">{task.tool}</p> : null}
      <p>{task.error || 'No result returned.'}</p>
    </div>
  );
}

function formatScore(value) {
  const score = Number(value);
  return Number.isFinite(score) ? score.toFixed(2) : 'not available';
}

function formatLabel(value) {
  return String(value || '').replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatTimestamp(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `${number.toFixed(2)}s` : '--';
}

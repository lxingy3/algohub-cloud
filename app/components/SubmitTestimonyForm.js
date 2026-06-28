'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Check, ChevronLeft, ChevronRight, Mic, Pause, Play, Send, Shield, Trash2, Type, Upload, Users } from 'lucide-react';
import { MEDIA_ACCEPT, audioContentTypeForFile } from '../../lib/audioAccept';
import { getMediaDurationSeconds } from '../../lib/clientMedia';

const steps = ['submit.stepShare', 'submit.stepSystem', 'submit.stepStory', 'submit.stepDetails', 'submit.stepReview'];
const methods = [
  { id: 'text', icon: Type, label: 'submit.writeStory' },
  { id: 'voice', icon: Mic, label: 'submit.recordStory' },
  { id: 'facilitated', icon: Users, label: 'submit.facilitator' },
];
const domains = ['Housing', 'Child Welfare', 'Benefits', 'Employment', 'Education', 'Public Safety', 'Other'];
const impacts = [
  ['POSITIVE', 'submit.positive'],
  ['NEGATIVE', 'submit.negative'],
  ['MIXED', 'submit.mixed'],
  ['UNCLEAR', 'submit.notSureImpact'],
];
const DRAFT_KEY = 'algostories-submit-draft';
const MAX_RECORDING_SECONDS = 1800;

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

function sanitizeDraft(draft) {
  if (!draft || typeof draft !== 'object') return {};
  const safeDraft = { ...draft };
  delete safeDraft.mediaObjectKey;
  delete safeDraft.mediaUrl;
  delete safeDraft.mediaMimeType;
  delete safeDraft.mediaDurationSeconds;
  return safeDraft;
}

export function SubmitTestimonyForm({ algorithms, selectedAlgorithmId, currentUserEmail }) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [draftStatus, setDraftStatus] = useState(t('submit.loadingDraft'));
  const [algorithmSearch, setAlgorithmSearch] = useState('');
  const [recordingState, setRecordingState] = useState('idle');
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaDurationSeconds, setMediaDurationSeconds] = useState(null);
  const [uploadedMedia, setUploadedMedia] = useState(null);

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const fileInputRef = useRef(null);
  const draftSaveRef = useRef(null);

  const form = useForm({
    defaultValues: {
      storyType: 'text',
      algorithmId: selectedAlgorithmId || '',
      uncertainSystem: false,
      affectedDomain: '',
      title: '',
      narrativeText: '',
      name: '',
      city: '',
      zipCode: '',
      referralSource: '',
      facilitatorCode: '',
      selfReportedImpact: 'UNCLEAR',
      occurredAtText: '',
      wantsContact: 'no',
      contactEmail: currentUserEmail || '',
      isAnonymous: true,
      publicPosting: false,
      followupConsent: false,
    },
  });
  const values = form.watch();
  const storyType = values.storyType;
  const usesDatabaseDraft = Boolean(currentUserEmail);

  const filteredAlgorithms = useMemo(() => {
    const query = algorithmSearch.trim().toLowerCase();
    if (!query) return algorithms;
    return algorithms.filter((algorithm) => algorithm.name.toLowerCase().includes(query));
  }, [algorithms, algorithmSearch]);

  useEffect(() => {
    let active = true;

    async function loadDraft() {
      if (usesDatabaseDraft) {
        try {
          const response = await fetch('/api/submission-draft', { cache: 'no-store' });
          const payload = await response.json().catch(() => null);
          if (active && response.ok && payload?.payload) {
            form.reset({ ...form.getValues(), ...sanitizeDraft(payload.payload), algorithmId: selectedAlgorithmId || payload.payload.algorithmId || '' });
          }
        } catch {
          if (active) setDraftStatus(t('submit.draftSaveFailed'));
        } finally {
          if (active) {
            setDraftReady(true);
            setDraftStatus(t('submit.draftSavedDb'));
          }
        }
        return;
      }

      const stored = window.localStorage.getItem(DRAFT_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          form.reset({ ...form.getValues(), ...sanitizeDraft(parsed), algorithmId: selectedAlgorithmId || parsed.algorithmId || '' });
        } catch {
          window.localStorage.removeItem(DRAFT_KEY);
        }
      }
      if (active) {
        setDraftReady(true);
        setDraftStatus(t('submit.draftSaved'));
      }
    }

    loadDraft();
    return () => {
      active = false;
      if (draftSaveRef.current) clearTimeout(draftSaveRef.current);
    };
  }, [form, selectedAlgorithmId, t, usesDatabaseDraft]);

  useEffect(() => {
    const subscription = form.watch((draft) => {
      if (!draftReady) return;
      const safeDraft = sanitizeDraft(draft);

      if (!usesDatabaseDraft) {
        window.localStorage.setItem(DRAFT_KEY, JSON.stringify(safeDraft));
        setDraftStatus(t('submit.draftSaved'));
        return;
      }

      if (draftSaveRef.current) clearTimeout(draftSaveRef.current);
      draftSaveRef.current = setTimeout(async () => {
        try {
          const response = await fetch('/api/submission-draft', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ payload: safeDraft }),
          });
          setDraftStatus(response.ok ? t('submit.draftSavedDb') : t('submit.draftSaveFailed'));
        } catch {
          setDraftStatus(t('submit.draftSaveFailed'));
        }
      }, 600);
    });
    return () => subscription.unsubscribe();
  }, [draftReady, form, t, usesDatabaseDraft]);

  useEffect(() => {
    return () => {
      stopStream();
      stopTimer();
      if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl);
    };
  }, [mediaPreviewUrl]);

  function stopTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }

  function startTimer() {
    stopTimer();
    setRecordingTime(0);
    timerRef.current = setInterval(() => {
      setRecordingTime((current) => {
        if (current + 1 >= MAX_RECORDING_SECONDS) {
          stopRecording();
          return MAX_RECORDING_SECONDS;
        }
        return current + 1;
      });
    }, 1000);
  }

  function stopStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }

  function setMedia(file) {
    if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl);
    setMediaFile(file);
    setMediaDurationSeconds(null);
    setUploadedMedia(null);
    setMediaPreviewUrl(URL.createObjectURL(file));
    getMediaDurationSeconds(file)
      .then((duration) => setMediaDurationSeconds(duration))
      .catch(() => setMediaDurationSeconds(null));
  }

  async function startRecording() {
    setMessage('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const type = 'audio/webm';
        const fileName = 'voice-story.webm';
        setMedia(new File([new Blob(chunksRef.current, { type })], fileName, { type }));
        stopStream();
      };
      recorder.start();
      setRecordingState('recording');
      startTimer();
    } catch {
      setMessage(t('submit.microphoneUnavailable'));
    }
  }

  function pauseRecording() {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause();
      setRecordingState('paused');
      stopTimer();
    }
  }

  function resumeRecording() {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume();
      setRecordingState('recording');
      startTimer();
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setRecordingState('stopped');
    stopTimer();
  }

  function clearMedia() {
    if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl);
    setMediaPreviewUrl('');
    setMediaFile(null);
    setMediaDurationSeconds(null);
    setUploadedMedia(null);
    setRecordingState('idle');
    setRecordingTime(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function uploadMediaIfNeeded() {
    if (storyType !== 'voice') return null;
    if (uploadedMedia) return uploadedMedia;
    if (!mediaFile) throw new Error(t('submit.uploadFailed'));

    const uploadFile = mediaFile;
    const initialContentType = audioContentTypeForFile(mediaFile);
    if (initialContentType.toLowerCase().startsWith('video/')) {
      setMessage('Uploading video for audio transcription...');
    }
    const uploadContentType = audioContentTypeForFile(uploadFile);
    const uploadKind = uploadContentType.toLowerCase().startsWith('video/') ? 'video' : 'audio';

    const presign = await fetch('/api/uploads/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: uploadKind,
        fileName: uploadFile.name,
        contentType: uploadContentType,
        size: uploadFile.size,
      }),
    });
    const upload = await presign.json().catch(() => null);
    if (!presign.ok) throw new Error(upload?.error || t('submit.storageMissing', { defaultValue: t('submit.r2Missing') }));

    const put = await fetch(upload.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': upload.contentType },
      body: uploadFile,
    });
    if (!put.ok) throw new Error(t('submit.uploadFailed'));

    const nextMedia = {
      objectKey: upload.objectKey,
      url: upload.storageUri,
      provider: upload.provider,
      mimeType: upload.contentType,
      durationSeconds: recordingTime || mediaDurationSeconds || undefined,
    };
    setUploadedMedia(nextMedia);
    return nextMedia;
  }

  function validateStep(targetStep = step) {
    const data = form.getValues();
    if (targetStep === 0 && !data.storyType) return false;
    if (targetStep === 1 && !data.uncertainSystem && !data.algorithmId && !data.affectedDomain) {
      setMessage(t('submit.validationSystem'));
      return false;
    }
    if (targetStep === 2) {
      if (!data.title.trim()) {
        setMessage(t('submit.validationTitle'));
        return false;
      }
      if (data.storyType === 'text' && !data.narrativeText.trim()) {
        setMessage(t('submit.validationStory'));
        return false;
      }
      if (data.storyType === 'voice' && !mediaFile && !uploadedMedia) {
        setMessage(t('submit.validationVoice'));
        return false;
      }
      if (data.storyType === 'facilitated' && !data.facilitatorCode.trim()) {
        setMessage(t('submit.validationFacilitator'));
        return false;
      }
    }
    if (targetStep === 3) {
      if (!data.city.trim()) {
        setMessage(t('submit.validationCity'));
        return false;
      }
      if (data.wantsContact === 'yes' && !data.contactEmail.trim()) {
        setMessage(t('submit.validationEmail'));
        return false;
      }
    }
    setMessage('');
    return true;
  }

  async function nextStep() {
    if (!validateStep()) return;
    if (step === 2 && storyType === 'voice' && !uploadedMedia) {
      try {
        await uploadMediaIfNeeded();
        setMessage(t('submit.mediaPending'));
      } catch (error) {
        setMessage(error.message);
        return;
      }
    }
    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  async function submitStory() {
    if (![0, 1, 2, 3].every((index) => validateStep(index))) return;
    setSubmitting(true);
    setMessage('');
    try {
      const media = await uploadMediaIfNeeded();
      const data = form.getValues();
      const response = await fetch('/api/testimonies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          contactEmail: data.wantsContact === 'yes' ? data.contactEmail : '',
          mediaObjectKey: media?.objectKey,
          mediaUrl: media?.url,
          mediaMimeType: media?.mimeType,
          mediaDurationSeconds: media?.durationSeconds,
          followupConsent: Boolean(data.followupConsent),
          publicPosting: Boolean(data.publicPosting),
          isAnonymous: Boolean(data.isAnonymous),
          uncertainSystem: Boolean(data.uncertainSystem),
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || t('submit.validationSubmit'));
      if (usesDatabaseDraft) {
        await fetch('/api/submission-draft', { method: 'DELETE' }).catch(() => null);
      } else {
        window.localStorage.removeItem(DRAFT_KEY);
      }
      window.location.href = payload.redirectTo || '/stories';
    } catch (error) {
      setMessage(error.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xl sm:p-8">
      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between gap-4 text-sm text-gray-500">
          <span>{t('submit.progress', { current: step + 1, total: steps.length })}</span>
          <span aria-live="polite">{draftStatus}</span>
        </div>
        <div
          className="h-2 rounded-full bg-gray-100"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={steps.length}
          aria-valuenow={step + 1}
          aria-label={t('submit.progress', { current: step + 1, total: steps.length })}
        >
          <div className="h-2 rounded-full bg-yellow-500 transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
        </div>
        <ol className="sr-only">
          {steps.map((item, index) => (
            <li key={item} aria-current={index === step ? 'step' : undefined}>{t(item)}</li>
          ))}
        </ol>
      </div>

      <form onSubmit={(event) => event.preventDefault()} className="space-y-8">
        <h2 className="text-2xl font-bold text-gray-900">{t(steps[step])}</h2>
        {step === 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {methods.map((method) => {
              const Icon = method.icon;
              const active = storyType === method.id;
              return (
                <button
                  key={method.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    form.setValue('storyType', method.id);
                    clearMedia();
                  }}
                  className={`rounded-xl border p-5 text-left transition ${active ? 'border-yellow-400 bg-yellow-50 shadow-md' : 'border-gray-200 bg-white hover:border-yellow-300'}`}
                >
                  <Icon className="mb-4 h-7 w-7 text-yellow-700" />
                  <span className="font-semibold text-gray-900">{t(method.label)}</span>
                </button>
              );
            })}
          </div>
        ) : null}

        {step === 1 ? (
          <section className="space-y-5">
            <label className="block text-sm font-medium text-gray-700">
              {t('submit.algorithmSearch')}
              <input value={algorithmSearch} onChange={(event) => setAlgorithmSearch(event.target.value)} className="mt-2 min-h-11 w-full rounded-md border border-gray-200 px-3 py-2" />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              {t('submit.algorithmLabel')}
              <select {...form.register('algorithmId')} disabled={values.uncertainSystem} className="mt-2 min-h-11 w-full rounded-md border border-gray-200 px-3 py-2 disabled:bg-gray-100">
                <option value="">{t('submit.algorithmPlaceholder')}</option>
                {filteredAlgorithms.map((algorithm) => <option key={algorithm.id} value={algorithm.id}>{algorithm.name}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-3 rounded-lg border border-gray-200 p-4 text-sm text-gray-700">
              <input type="checkbox" {...form.register('uncertainSystem')} className="h-4 w-4" />
              {t('submit.notSure')}
            </label>
            <label className="block text-sm font-medium text-gray-700">
              {t('submit.domain')}
              <select {...form.register('affectedDomain')} className="mt-2 min-h-11 w-full rounded-md border border-gray-200 px-3 py-2">
                <option value="">{t('submit.domainPlaceholder')}</option>
                {domains.map((domain) => <option key={domain} value={domain}>{domain}</option>)}
              </select>
            </label>
          </section>
        ) : null}

        {step === 2 ? (
          <section className="space-y-5">
            <label className="block text-sm font-medium text-gray-700">
              {t('submit.shortTitle')}
              <input {...form.register('title')} className="mt-2 min-h-11 w-full rounded-md border border-gray-200 px-3 py-2" />
            </label>
            {storyType === 'text' ? (
              <label className="block text-sm font-medium text-gray-700">
                {t('submit.stepStory')}
                <span className="mt-1 block text-sm font-normal text-gray-500">{t('submit.storyGuidance')}</span>
                <textarea {...form.register('narrativeText')} rows={9} placeholder={t('submit.storyPrompt')} className="mt-3 w-full resize-y rounded-md border border-gray-200 px-3 py-2" />
              </label>
            ) : null}
            {storyType === 'facilitated' ? (
              <>
                <label className="block text-sm font-medium text-gray-700">
                  {t('submit.facilitatorCode')}
                  <input {...form.register('facilitatorCode')} className="mt-2 min-h-11 w-full rounded-md border border-gray-200 px-3 py-2" />
                </label>
                <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">{t('submit.facilitatorHelp')}</p>
              </>
            ) : null}
            {storyType === 'voice' ? (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                <p className="mb-4 text-sm text-gray-600">{t('submit.maxRecording')}</p>
                {!mediaPreviewUrl && recordingState !== 'recording' && recordingState !== 'paused' ? (
                  <div className="flex flex-wrap gap-3">
                    <button type="button" onClick={startRecording} className="inline-flex min-h-11 items-center rounded-md bg-red-600 px-4 font-semibold text-white hover:bg-red-700">
                      <Mic className="mr-2 h-4 w-4" />
                      {t('submit.startRecording')}
                    </button>
                    <label className="inline-flex min-h-11 cursor-pointer items-center rounded-md border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50">
                      <Upload className="mr-2 h-4 w-4" />
                      {t('submit.uploadAudioOrVideo', { defaultValue: 'Upload audio/video' })}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={MEDIA_ACCEPT}
                        className="sr-only"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) setMedia(file);
                        }}
                      />
                    </label>
                  </div>
                ) : null}
                {recordingState === 'recording' || recordingState === 'paused' ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="h-3 w-3 rounded-full bg-red-500" />
                      <span className="font-mono text-2xl font-bold">{formatTime(recordingTime)}</span>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {recordingState === 'recording' ? (
                        <button type="button" onClick={pauseRecording} className="inline-flex min-h-10 items-center rounded-md border px-3">
                          <Pause className="mr-2 h-4 w-4" />
                          {t('submit.pause')}
                        </button>
                      ) : (
                        <button type="button" onClick={resumeRecording} className="inline-flex min-h-10 items-center rounded-md border px-3">
                          <Play className="mr-2 h-4 w-4" />
                          {t('submit.resume')}
                        </button>
                      )}
                      <button type="button" onClick={stopRecording} className="min-h-10 rounded-md bg-slate-900 px-3 text-white">{t('submit.stop')}</button>
                    </div>
                  </div>
                ) : null}
                {mediaPreviewUrl ? (
                  <div className="space-y-4">
                    <audio src={mediaPreviewUrl} controls className="w-full" />
                    <button type="button" onClick={clearMedia} className="inline-flex items-center rounded-md border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50">
                      <Trash2 className="mr-2 h-4 w-4" />
                      {t('submit.replaceMedia')}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>
        ) : null}

        {step === 3 ? (
          <section className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-gray-700">
                {t('submit.name')} <span className="font-normal">({t('submit.optional')})</span>
                <input {...form.register('name')} disabled={values.isAnonymous} placeholder={t('submit.namePlaceholder')} className="mt-2 min-h-11 w-full rounded-md border border-gray-200 px-3 py-2 disabled:bg-gray-100" />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                {t('submit.city')} <span className="font-normal text-red-600">({t('submit.required')})</span>
                <input {...form.register('city')} placeholder={t('submit.cityPlaceholder')} className="mt-2 min-h-11 w-full rounded-md border border-gray-200 px-3 py-2" />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-gray-700">
                {t('submit.zipCode')} <span className="font-normal">({t('submit.optional')})</span>
                <input {...form.register('zipCode')} placeholder="15201" className="mt-2 min-h-11 w-full rounded-md border border-gray-200 px-3 py-2" />
              </label>
              <label className="block text-sm font-medium text-gray-700">
                {t('submit.happened')}
                <input {...form.register('occurredAtText')} placeholder={t('submit.happenedPlaceholder')} className="mt-2 min-h-11 w-full rounded-md border border-gray-200 px-3 py-2" />
              </label>
            </div>
            <label className="block text-sm font-medium text-gray-700">
              {t('submit.referral')}
              <input {...form.register('referralSource')} placeholder={t('submit.referralPlaceholder')} className="mt-2 min-h-11 w-full rounded-md border border-gray-200 px-3 py-2" />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              {t('submit.impact')}
              <select {...form.register('selfReportedImpact')} className="mt-2 min-h-11 w-full rounded-md border border-gray-200 px-3 py-2">
                {impacts.map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}
              </select>
            </label>
            <fieldset className="space-y-3 rounded-xl border border-gray-200 p-4">
              <legend className="px-1 text-sm font-medium text-gray-700">{t('submit.contact')}</legend>
              <label className="flex min-h-11 items-center gap-3 text-sm text-gray-700">
                <input type="radio" value="yes" {...form.register('wantsContact')} />
                {t('submit.contactYes')}
              </label>
              <label className="flex min-h-11 items-center gap-3 text-sm text-gray-700">
                <input type="radio" value="no" {...form.register('wantsContact')} />
                {t('submit.contactNo')}
              </label>
              {values.wantsContact === 'yes' ? (
                <input {...form.register('contactEmail')} placeholder={t('submit.contactEmail')} className="min-h-11 w-full rounded-md border border-gray-200 px-3 py-2" />
              ) : null}
            </fieldset>
            <label className="flex items-center gap-3 rounded-lg border border-gray-200 p-4 text-sm text-gray-700">
              <input type="checkbox" {...form.register('isAnonymous')} className="h-4 w-4" />
              {t('submit.anonymous')}
            </label>
          </section>
        ) : null}

        {step === 4 ? (
          <section className="space-y-5">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
              <h3 className="mb-4 text-lg font-bold text-gray-900">{t('submit.preview')}</h3>
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <PreviewItem label={t('submit.shortTitle')} value={values.title} />
                <PreviewItem label={t('submit.stepShare')} value={t(methods.find((item) => item.id === storyType)?.label || 'submit.writeStory')} />
                <PreviewItem label={t('submit.domain')} value={values.affectedDomain || 'N/A'} />
                <PreviewItem label={t('submit.city')} value={values.city || 'N/A'} />
                <PreviewItem label={t('submit.impact')} value={t(impacts.find(([value]) => value === values.selfReportedImpact)?.[1] || 'submit.notSureImpact')} />
                <PreviewItem label={t('submit.happened')} value={values.occurredAtText || 'N/A'} />
              </dl>
              {storyType === 'text' ? <p className="mt-4 rounded-md bg-white p-4 text-sm leading-6 text-gray-700">{values.narrativeText}</p> : null}
              {uploadedMedia ? <p className="mt-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{t('submit.mediaPending')}</p> : null}
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
                <Shield className="h-5 w-5 text-amber-700" />
                <h3 className="text-lg font-semibold text-gray-900">{t('submit.consentTitle')}</h3>
              </div>
              <p className="rounded-md bg-amber-50 p-4 text-sm leading-6 text-gray-700">{t('submit.consent')}</p>
              <label className="flex min-h-11 items-center gap-3 text-sm text-gray-800">
                <input type="checkbox" {...form.register('publicPosting')} className="h-4 w-4" />
                {t('submit.publicPosting')}
              </label>
              <label className="flex min-h-11 items-start gap-3 text-sm text-gray-800">
                <input type="checkbox" {...form.register('followupConsent')} className="mt-1 h-4 w-4" />
                {t('submit.consentTitle')} *
              </label>
              {currentUserEmail ? <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-600">{t('submit.submittingAs', { email: currentUserEmail })}</p> : null}
            </div>
          </section>
        ) : null}

        {message ? <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{message}</p> : null}

        <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-6 sm:flex-row sm:justify-between">
          <button type="button" disabled={step === 0 || submitting} onClick={() => setStep((current) => Math.max(current - 1, 0))} className="inline-flex min-h-11 items-center justify-center rounded-md border border-gray-200 px-4 text-sm font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-40">
            <ChevronLeft className="mr-2 h-4 w-4" />
            {t('submit.back')}
          </button>
          {step < steps.length - 1 ? (
            <button type="button" onClick={nextStep} className="inline-flex min-h-11 items-center justify-center rounded-md bg-yellow-500 px-5 text-sm font-semibold text-gray-900 hover:bg-yellow-400">
              {t('submit.next')}
              <ChevronRight className="ml-2 h-4 w-4" />
            </button>
          ) : (
            <button type="button" disabled={submitting} onClick={submitStory} className="inline-flex min-h-11 items-center justify-center rounded-md bg-yellow-500 px-5 text-sm font-semibold text-gray-900 hover:bg-yellow-400 disabled:cursor-not-allowed disabled:bg-yellow-200">
              {submitting ? <Check className="mr-2 h-4 w-4" /> : <Send className="mr-2 h-4 w-4" />}
              {submitting ? t('submit.submitting') : t('submit.submit')}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function PreviewItem({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-1 font-medium text-gray-900">{value}</dd>
    </div>
  );
}

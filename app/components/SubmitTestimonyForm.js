'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic, Pause, Play, Send, Shield, Trash2, Type, Upload, Video } from 'lucide-react';

const tabs = [
  { id: 'text', label: 'Text', icon: Type },
  { id: 'voice', label: 'Voice', icon: Mic },
  { id: 'video', label: 'Video', icon: Video },
];

const MAX_MEDIA_UPLOAD_BYTES = 4 * 1024 * 1024;

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

function formatFileSize(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function SubmitTestimonyForm({ algorithms, selectedAlgorithmId, currentUserEmail }) {
  const [storyType, setStoryType] = useState('text');
  const [message, setMessage] = useState('');
  const [recording, setRecording] = useState({ audio: 'idle', video: 'idle' });
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [videoBlob, setVideoBlob] = useState(null);
  const [audioUploadFile, setAudioUploadFile] = useState(null);
  const [videoUploadFile, setVideoUploadFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const formRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const audioRef = useRef(null);
  const videoRef = useRef(null);
  const audioFileInputRef = useRef(null);
  const videoFileInputRef = useRef(null);

  useEffect(() => {
    return () => {
      stopTimer();
      stopStream();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [audioUrl, videoUrl]);

  useEffect(() => {
    if (recording.video === 'recording' && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [recording.video]);

  function startTimer() {
    setRecordingTime(0);
    timerRef.current = setInterval(() => setRecordingTime((value) => value + 1), 1000);
  }

  function stopTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }

  function stopStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }

  async function startAudioRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onstop = () => {
        stopStream();
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
      };
      recorder.start();
      setRecording((state) => ({ ...state, audio: 'recording' }));
      startTimer();
    } catch {
      setMessage('Microphone access was not available.');
    }
  }

  async function startVideoRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onstop = () => {
        stopStream();
        if (videoRef.current) videoRef.current.srcObject = null;
        const blob = new Blob(chunks, { type: 'video/webm' });
        setVideoBlob(blob);
        setVideoUrl(URL.createObjectURL(blob));
      };
      recorder.start();
      setRecording((state) => ({ ...state, video: 'recording' }));
      startTimer();
    } catch {
      setMessage('Camera access was not available.');
    }
  }

  function stopRecording(kind) {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setRecording((state) => ({ ...state, [kind]: 'stopped' }));
      stopTimer();
    }
  }

  function clearAudio() {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUploadFile(null);
    setAudioUrl('');
    setRecording((state) => ({ ...state, audio: 'idle' }));
    if (audioFileInputRef.current) audioFileInputRef.current.value = '';
  }

  function clearVideo() {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoBlob(null);
    setVideoUploadFile(null);
    setVideoUrl('');
    setRecording((state) => ({ ...state, video: 'idle' }));
    if (videoFileInputRef.current) videoFileInputRef.current.value = '';
  }

  function handleAudioUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_MEDIA_UPLOAD_BYTES) {
      event.target.value = '';
      setMessage(`This audio file is ${formatFileSize(file.size)}. Please upload a file smaller than 4 MB.`);
      return;
    }
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUploadFile(file);
    setAudioUrl(URL.createObjectURL(file));
    setRecording((state) => ({ ...state, audio: 'stopped' }));
  }

  function handleVideoUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_MEDIA_UPLOAD_BYTES) {
      event.target.value = '';
      setMessage(`This video file is ${formatFileSize(file.size)}. Please upload a file smaller than 4 MB.`);
      return;
    }
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoBlob(null);
    setVideoUploadFile(file);
    setVideoUrl(URL.createObjectURL(file));
    setRecording((state) => ({ ...state, video: 'stopped' }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage('');

    const formData = new FormData(formRef.current);
    const narrative = String(formData.get('narrativeText') || '').trim();
    const uploadedAudio = formData.get('audioFile');
    const uploadedVideo = formData.get('videoFile');
    const hasUploadedAudio = audioUploadFile || (uploadedAudio && typeof uploadedAudio === 'object' && uploadedAudio.size > 0);
    const hasUploadedVideo = videoUploadFile || (uploadedVideo && typeof uploadedVideo === 'object' && uploadedVideo.size > 0);
    if (!String(formData.get('city') || '').trim()) {
      setMessage('Please enter your city.');
      return;
    }
    if (!formData.get('followupConsent')) {
      setMessage('Please agree that a reviewer may follow up about this story.');
      return;
    }
    if (storyType === 'text' && !narrative) {
      setMessage('Please write your story.');
      return;
    }
    if (storyType === 'voice' && !audioBlob && !hasUploadedAudio) {
      setMessage('Please record or upload a voice story first.');
      return;
    }
    if (storyType === 'video' && !videoBlob && !hasUploadedVideo) {
      setMessage('Please record or upload a video story first.');
      return;
    }
    if (storyType === 'voice' && audioBlob?.size > MAX_MEDIA_UPLOAD_BYTES) {
      setMessage(`This voice recording is ${formatFileSize(audioBlob.size)}. Please record a shorter clip or upload a file smaller than 4 MB.`);
      return;
    }
    if (storyType === 'video' && videoBlob?.size > MAX_MEDIA_UPLOAD_BYTES) {
      setMessage(`This video recording is ${formatFileSize(videoBlob.size)}. Please record a shorter clip or upload a file smaller than 4 MB.`);
      return;
    }

    formData.set('storyType', storyType);
    if (storyType === 'voice' && audioBlob) formData.set('audioFile', new File([audioBlob], 'voice-story.webm', { type: 'audio/webm' }));
    if (storyType === 'video' && videoBlob) formData.set('videoFile', new File([videoBlob], 'video-story.webm', { type: 'video/webm' }));
    if (storyType === 'voice' && !audioBlob && audioUploadFile) formData.set('audioFile', audioUploadFile);
    if (storyType === 'video' && !videoBlob && videoUploadFile) formData.set('videoFile', videoUploadFile);

    setSubmitting(true);
    let response;
    try {
      response = await fetch('/api/testimonies', { method: 'POST', body: formData });
    } catch {
      setSubmitting(false);
      setMessage('The upload did not reach the server. Please use a media file smaller than 4 MB or try again on a stronger connection.');
      return;
    }
    if (response.ok || response.redirected) {
      window.location.href = '/stories';
      return;
    }
    setSubmitting(false);
    if (response.status === 413) {
      setMessage('This media file is too large for the current deployment. Please upload a file smaller than 4 MB.');
      return;
    }
    const payload = await response.json().catch(() => null);
    setMessage(payload?.error || 'The story could not be submitted. Please check the form and try again.');
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-xl sm:p-8">
      <section className="space-y-4">
        <h2 className="border-b border-gray-200 pb-2 text-xl font-semibold text-gray-900">What Happened?</h2>
        <label className="block text-sm font-medium text-gray-700">
          Select an algorithm related to your experience
          <select name="algorithmId" defaultValue={selectedAlgorithmId || ''} className="mt-2 min-h-11 w-full rounded-md border border-gray-200 px-3 py-2">
            <option value="">Select an algorithm from the list</option>
            {algorithms.map((algorithm) => (
              <option key={algorithm.id} value={algorithm.id}>{algorithm.name}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Short title
          <input name="title" className="mt-2 min-h-11 w-full rounded-md border border-gray-200 px-3 py-2" required />
        </label>
      </section>

      <section className="space-y-4">
        <h2 className="border-b border-gray-200 pb-2 text-xl font-semibold text-gray-900">Tell us your story</h2>
        <div>
          <p className="text-sm font-medium text-gray-700">Share your experience</p>
          <div className="mt-2 flex gap-2 border-b border-gray-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStoryType(tab.id)}
                className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                  storyType === tab.id ? 'border-amber-600 text-amber-700' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {storyType === 'text' ? (
            <textarea
              name="narrativeText"
              rows={8}
              placeholder="Please share the details of your experience..."
              className="mt-4 w-full resize-none rounded-md border border-gray-200 px-3 py-2"
            />
          ) : null}

          {storyType === 'voice' ? (
            <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-6">
              {!audioUrl && recording.audio !== 'recording' ? (
                <div className="flex flex-col items-center gap-4 py-6">
                  <button type="button" onClick={startAudioRecording} className="inline-flex items-center rounded-md bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-700">
                    <Mic className="mr-2 h-5 w-5" />
                    Start recording
                  </button>
                  <label className="inline-flex cursor-pointer items-center rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload audio file
                    <input ref={audioFileInputRef} name="audioFile" type="file" accept="audio/*" className="sr-only" onChange={handleAudioUpload} />
                  </label>
                </div>
              ) : null}
              {recording.audio === 'recording' ? (
                <div className="flex flex-col items-center gap-4 py-6">
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full bg-red-500" />
                    <span className="font-mono text-2xl font-bold">{formatTime(recordingTime)}</span>
                  </div>
                  <button type="button" onClick={() => stopRecording('audio')} className="rounded-md bg-slate-900 px-4 py-2 text-white">Stop recording</button>
                </div>
              ) : null}
              {audioUrl ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 rounded-lg border bg-white p-4">
                    <audio ref={audioRef} src={audioUrl} controls className="flex-1" />
                    <button type="button" onClick={() => audioRef.current?.play()} className="rounded-md border px-3 py-2"><Play className="h-4 w-4" /></button>
                    <button type="button" onClick={() => audioRef.current?.pause()} className="rounded-md border px-3 py-2"><Pause className="h-4 w-4" /></button>
                  </div>
                  <button type="button" onClick={clearAudio} className="inline-flex items-center rounded-md border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete and record/upload again
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          {storyType === 'video' ? (
            <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-6">
              {!videoUrl && recording.video !== 'recording' ? (
                <div className="flex flex-col items-center gap-4 py-6">
                  <button type="button" onClick={startVideoRecording} className="inline-flex items-center rounded-md bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-700">
                    <Video className="mr-2 h-5 w-5" />
                    Start recording
                  </button>
                  <label className="inline-flex cursor-pointer items-center rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload video file
                    <input ref={videoFileInputRef} name="videoFile" type="file" accept="video/*" className="sr-only" onChange={handleVideoUpload} />
                  </label>
                </div>
              ) : null}
              {recording.video === 'recording' ? (
                <div className="flex flex-col items-center gap-4 py-4">
                  <video ref={videoRef} autoPlay muted className="max-h-72 w-full rounded-lg border bg-black object-contain" />
                  <div className="font-mono text-xl font-bold">{formatTime(recordingTime)}</div>
                  <button type="button" onClick={() => stopRecording('video')} className="rounded-md bg-slate-900 px-4 py-2 text-white">Stop recording</button>
                </div>
              ) : null}
              {videoUrl ? (
                <div className="space-y-4">
                  <video src={videoUrl} controls className="max-h-80 w-full rounded-lg border bg-black object-contain" />
                  <button type="button" onClick={clearVideo} className="inline-flex items-center rounded-md border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete and record/upload again
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="border-b border-gray-200 pb-2 text-xl font-semibold text-gray-900">About You</h2>
        <label className="block text-sm font-medium text-gray-700">
          Name <span className="font-normal">(Optional)</span>
          <input name="name" placeholder="Your name" className="mt-2 min-h-11 w-full rounded-md border border-gray-200 px-3 py-2" />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          City <span className="font-normal text-red-600">(Required)</span>
          <input name="city" placeholder="e.g. Pittsburgh, Philadelphia" className="mt-2 min-h-11 w-full rounded-md border border-gray-200 px-3 py-2" required />
        </label>
        <label className="block text-sm font-medium text-gray-700">
          Zip Code <span className="font-normal">(Optional)</span>
          <input name="zipCode" placeholder="15201" className="mt-2 min-h-11 w-full rounded-md border border-gray-200 px-3 py-2" />
        </label>
      </section>

      <section className="space-y-4">
        <h2 className="border-b border-gray-200 pb-2 text-xl font-semibold text-gray-900">How did you hear about us?</h2>
        <label className="block text-sm font-medium text-gray-700">
          Organization or referral source
          <input name="referralSource" placeholder="Organization name or how you found us" className="mt-2 min-h-11 w-full rounded-md border border-gray-200 px-3 py-2" />
        </label>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
          <Shield className="h-5 w-5 text-amber-700" />
          <h2 className="text-xl font-semibold text-gray-900">Consent & Privacy</h2>
        </div>
        <label className="flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-gray-700">
          <span>
            <span className="block font-semibold text-gray-900">Can this story be shared publicly?</span>
            <span>Identifying details will be removed before posting.</span>
          </span>
          <input name="publicPosting" type="checkbox" className="h-5 w-5" />
        </label>
        <label className="flex items-start gap-3 text-sm text-gray-800">
          <input name="followupConsent" type="checkbox" className="mt-1 h-4 w-4" required />
          <span>I understand and agree that a community reviewer may follow up with me regarding this story *</span>
        </label>
        {currentUserEmail ? (
          <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-600">Submitting as {currentUserEmail}.</p>
        ) : null}
      </section>

      {message ? <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{message}</p> : null}
      <button disabled={submitting} className="flex min-h-12 w-full items-center justify-center rounded-md bg-yellow-500 px-5 py-3 font-semibold text-gray-900 hover:bg-yellow-400 disabled:cursor-not-allowed disabled:bg-yellow-200">
        <Send className="mr-2 h-4 w-4" />
        {submitting ? 'Submitting...' : 'Share Your Story'}
      </button>
    </form>
  );
}

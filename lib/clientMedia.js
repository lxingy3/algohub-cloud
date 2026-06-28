import { audioContentTypeForFile } from './audioAccept';

export function getMediaDurationSeconds(file) {
  return new Promise((resolve, reject) => {
    const contentType = audioContentTypeForFile(file);
    const element = document.createElement(contentType.toLowerCase().startsWith('video/') ? 'video' : 'audio');
    const objectUrl = URL.createObjectURL(file);
    let timeoutId = null;
    const cleanup = () => {
      clearTimeout(timeoutId);
      URL.revokeObjectURL(objectUrl);
      element.removeAttribute('src');
      element.load();
    };
    element.preload = 'metadata';
    element.onloadedmetadata = () => {
      const duration = Number.isFinite(element.duration) ? element.duration : null;
      cleanup();
      resolve(duration);
    };
    element.onerror = () => {
      cleanup();
      reject(new Error('Media metadata could not be read.'));
    };
    timeoutId = setTimeout(() => {
      cleanup();
      resolve(null);
    }, 8000);
    element.src = objectUrl;
  });
}

export function extractAudioTrackFromVideo(videoFile, updateStatus = () => {}, signal, durationSeconds = null) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const objectUrl = URL.createObjectURL(videoFile);
    const chunks = [];
    let recorder = null;
    let capturedStream = null;
    let audioContext = null;
    let audioSource = null;
    let audioDestination = null;
    let settled = false;
    let timeoutId = null;

    const cleanup = () => {
      signal?.removeEventListener('abort', abortHandler);
      URL.revokeObjectURL(objectUrl);
      clearTimeout(timeoutId);
      video.pause();
      video.removeAttribute('src');
      video.load();
      recorder?.stream?.getTracks().forEach((track) => track.stop());
      capturedStream?.getTracks().forEach((track) => track.stop());
      audioDestination?.stream?.getTracks().forEach((track) => track.stop());
      try {
        audioSource?.disconnect();
        audioDestination?.disconnect();
      } catch {}
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close().catch(() => {});
      }
    };
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      cleanup();
      callback(value);
    };
    const fail = (message) => finish(reject, new Error(message));
    const abortHandler = () => {
      try {
        if (recorder?.state === 'recording') recorder.stop();
      } catch {}
      fail('Video audio extraction was cancelled.');
    };

    signal?.addEventListener('abort', abortHandler, { once: true });
    video.preload = 'metadata';
    video.playsInline = true;
    video.volume = 1;
    video.onloadedmetadata = async () => {
      try {
        const audioStream = await createVideoAudioStream(video);
        await recordVideoAudio(video, audioStream);
      } catch (error) {
        finish(reject, error);
      }
    };
    video.onerror = () => fail('Video metadata could not be read.');
    video.src = objectUrl;

    async function recordVideoAudio(sourceVideo, audioStream) {
      if (typeof MediaRecorder === 'undefined') throw new Error('Browser audio recording is unavailable.');
      const mimeType = selectAudioRecordingMimeType();
      recorder = new MediaRecorder(audioStream, mimeType ? { mimeType } : undefined);
      recorder.ondataavailable = (event) => {
        if (event.data?.size) chunks.push(event.data);
      };
      recorder.onerror = () => fail('Video audio extraction failed.');
      recorder.onstop = () => {
        if (!chunks.length) {
          fail('No audio data was captured from this video.');
          return;
        }
        const outputType = recorder.mimeType || mimeType || 'audio/webm';
        const blob = new Blob(chunks, { type: outputType });
        const outputName = `${videoFile.name.replace(/\.[^.]+$/, '') || 'video'}-audio.${extensionForAudioMimeType(outputType)}`;
        finish(resolve, new File([blob], outputName, { type: outputType }));
      };
      const expectedDuration = Number.isFinite(Number(durationSeconds))
        ? Number(durationSeconds)
        : Number.isFinite(sourceVideo.duration)
          ? sourceVideo.duration
          : null;
      const stopRecording = () => {
        updateStatus('Preparing extracted audio...');
        if (recorder?.state === 'recording') recorder.stop();
      };
      sourceVideo.currentTime = 0;
      recorder.start(1000);
      timeoutId = setTimeout(
        () => fail('Video audio extraction took too long.'),
        Math.max(60_000, Math.ceil((expectedDuration || 0) * 1000) + 30_000),
      );
      if (expectedDuration) {
        setTimeout(stopRecording, Math.ceil((expectedDuration + 0.5) * 1000));
      }
      updateStatus('Extracting audio from video...');
      await sourceVideo.play();
      sourceVideo.onended = stopRecording;
    }

    async function createVideoAudioStream(sourceVideo) {
      const captureStream = sourceVideo.captureStream || sourceVideo.mozCaptureStream;
      if (captureStream) {
        capturedStream = captureStream.call(sourceVideo);
        const audioStream = new MediaStream(capturedStream.getAudioTracks());
        if (audioStream.getAudioTracks().length) return audioStream;

        await sourceVideo.play();
        await new Promise((resolveTrack) => setTimeout(resolveTrack, 250));
        sourceVideo.pause();
        capturedStream.getTracks().forEach((track) => track.stop());
        capturedStream = captureStream.call(sourceVideo);
        const retryAudioStream = new MediaStream(capturedStream.getAudioTracks());
        if (retryAudioStream.getAudioTracks().length) return retryAudioStream;
      }

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass || typeof MediaStream === 'undefined') {
        throw new Error('Browser video audio extraction is unavailable.');
      }
      updateStatus('Preparing mobile video audio...');
      audioContext = new AudioContextClass();
      audioSource = audioContext.createMediaElementSource(sourceVideo);
      audioDestination = audioContext.createMediaStreamDestination();
      audioSource.connect(audioDestination);
      if (audioContext.state === 'suspended') await audioContext.resume();
      if (!audioDestination.stream.getAudioTracks().length) {
        throw new Error('No audio track was found in this video.');
      }
      return audioDestination.stream;
    }
  });
}

function selectAudioRecordingMimeType() {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') return '';
  return [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/aac',
  ].find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) || '';
}

function extensionForAudioMimeType(mimeType) {
  const normalized = String(mimeType || '').toLowerCase();
  if (normalized.includes('mp4')) return 'm4a';
  if (normalized.includes('aac')) return 'aac';
  if (normalized.includes('ogg')) return 'ogg';
  return 'webm';
}

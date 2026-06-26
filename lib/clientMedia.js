import { audioContentTypeForFile } from './audioAccept';

export function getMediaDurationSeconds(file) {
  return new Promise((resolve, reject) => {
    const contentType = audioContentTypeForFile(file);
    const element = document.createElement(contentType.toLowerCase().startsWith('video/') ? 'video' : 'audio');
    const objectUrl = URL.createObjectURL(file);
    const cleanup = () => {
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
    element.src = objectUrl;
  });
}

export function extractAudioTrackFromVideo(videoFile, updateStatus = () => {}, signal, durationSeconds = null) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const objectUrl = URL.createObjectURL(videoFile);
    const chunks = [];
    let recorder = null;
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
    video.volume = 0;
    video.onloadedmetadata = async () => {
      try {
        const captureStream = video.captureStream || video.mozCaptureStream;
        if (!captureStream) throw new Error('Browser video audio extraction is unavailable.');
        const stream = captureStream.call(video);
        const audioStream = new MediaStream(stream.getAudioTracks());
        if (!audioStream.getAudioTracks().length) {
          await video.play();
          await new Promise((resolveTrack) => setTimeout(resolveTrack, 250));
          audioStream.getTracks().forEach((track) => track.stop());
          const retryStream = captureStream.call(video);
          const retryAudioStream = new MediaStream(retryStream.getAudioTracks());
          if (!retryAudioStream.getAudioTracks().length) throw new Error('No audio track was found in this video.');
          video.pause();
          await recordVideoAudio(video, retryAudioStream);
          return;
        }
        await recordVideoAudio(video, audioStream);
      } catch (error) {
        finish(reject, error);
      }
    };
    video.onerror = () => fail('Video metadata could not be read.');
    video.src = objectUrl;

    async function recordVideoAudio(sourceVideo, audioStream) {
      if (typeof MediaRecorder === 'undefined') throw new Error('Browser audio recording is unavailable.');
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
      recorder = new MediaRecorder(audioStream, { mimeType });
      recorder.ondataavailable = (event) => {
        if (event.data?.size) chunks.push(event.data);
      };
      recorder.onerror = () => fail('Video audio extraction failed.');
      recorder.onstop = () => {
        if (!chunks.length) {
          fail('No audio data was captured from this video.');
          return;
        }
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const outputName = `${videoFile.name.replace(/\.[^.]+$/, '') || 'video'}-audio.webm`;
        finish(resolve, new File([blob], outputName, { type: 'audio/webm' }));
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
  });
}

export const AUDIO_ACCEPT = [
  'audio/*',
  '.wav',
  '.mp3',
  '.webm',
  '.flac',
  '.ogg',
  '.m4a',
  'audio/wav',
  'audio/mpeg',
  'audio/webm',
  'audio/flac',
  'audio/ogg',
  'audio/mp4',
  'audio/x-m4a',
].join(',');

export const MEDIA_ACCEPT = [
  AUDIO_ACCEPT,
  'video/*',
  '.mp4',
  '.mov',
  '.m4v',
  '.webm',
  '.ogv',
  'video/mp4',
  'video/quicktime',
  'video/x-m4v',
  'video/webm',
  'video/ogg',
].join(',');

export function audioContentTypeForFile(file, fallback = 'audio/webm') {
  const declaredType = String(file?.type || '').trim();
  if (declaredType) return declaredType;

  const name = String(file?.name || '').toLowerCase();
  if (name.endsWith('.mp4') || name.endsWith('.m4v')) return 'video/mp4';
  if (name.endsWith('.mov')) return 'video/quicktime';
  if (name.endsWith('.m4a')) return 'audio/mp4';
  if (name.endsWith('.mp3')) return 'audio/mpeg';
  if (name.endsWith('.wav')) return 'audio/wav';
  if (name.endsWith('.webm')) return 'audio/webm';
  if (name.endsWith('.flac')) return 'audio/flac';
  if (name.endsWith('.ogg')) return 'audio/ogg';
  if (name.endsWith('.ogv')) return 'video/ogg';
  return fallback;
}

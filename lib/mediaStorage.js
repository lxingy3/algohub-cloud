import { Storage } from '@google-cloud/storage';
import { NextResponse } from 'next/server';

const MAX_MEDIA_BYTES = 200 * 1024 * 1024;
const ALLOWED_PREFIXES = ['audio/', 'video/'];
const FIREBASE_PROVIDER = 'firebase-gcs';

let storageClient;

export function hasFirebaseStorageConfig() {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID
      && process.env.FIREBASE_CLIENT_EMAIL
      && process.env.FIREBASE_PRIVATE_KEY
      && process.env.FIREBASE_STORAGE_BUCKET,
  );
}

function getFirebaseStorage() {
  if (!hasFirebaseStorageConfig()) {
    throw new Error('FIREBASE_STORAGE_NOT_CONFIGURED');
  }

  if (!storageClient) {
    storageClient = new Storage({
      projectId: process.env.FIREBASE_PROJECT_ID,
      credentials: {
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
    });
  }

  return storageClient.bucket(process.env.FIREBASE_STORAGE_BUCKET);
}

export function assertMediaUpload({ contentType, size }) {
  if (!ALLOWED_PREFIXES.some((prefix) => contentType?.startsWith(prefix))) {
    throw new Error('MEDIA_TYPE_NOT_ALLOWED');
  }
  if (Number(size) > MAX_MEDIA_BYTES) {
    throw new Error('MEDIA_FILE_TOO_LARGE');
  }
}

export function mediaStorageUri(objectKey) {
  if (!objectKey) return null;
  return `gcs://${process.env.FIREBASE_STORAGE_BUCKET || 'firebase-storage'}/${objectKey}`;
}

export function parseStoredMediaUrl(mediaUrl) {
  if (!mediaUrl) return null;
  if (mediaUrl.startsWith('gcs://')) {
    const withoutScheme = mediaUrl.slice('gcs://'.length);
    const slashIndex = withoutScheme.indexOf('/');
    if (slashIndex === -1) return null;
    return {
      provider: FIREBASE_PROVIDER,
      bucket: withoutScheme.slice(0, slashIndex),
      objectKey: withoutScheme.slice(slashIndex + 1),
    };
  }
  return null;
}

export async function createSignedMediaUpload({ objectKey, contentType }) {
  const bucket = getFirebaseStorage();
  const [uploadUrl] = await bucket.file(objectKey).getSignedUrl({
    version: 'v4',
    action: 'write',
    expires: Date.now() + 15 * 60 * 1000,
    contentType,
  });
  return uploadUrl;
}

export async function createSignedMediaRead({ objectKey }) {
  const bucket = getFirebaseStorage();
  const [readUrl] = await bucket.file(objectKey).getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + 10 * 60 * 1000,
  });
  return readUrl;
}

function dataUrlResponse({ request, dataUrl, cacheControl = 'private, max-age=0, must-revalidate', filePrefix = 'media', kind = 'audio' }) {
  const match = /^data:([^;,]+);base64,(.+)$/s.exec(dataUrl || '');
  if (!match) return null;

  const [, contentType, payload] = match;
  const buffer = Buffer.from(payload, 'base64');
  const resolvedContentType = resolveMediaContentType(buffer, contentType, kind);
  const fileName = `${filePrefix}.${extensionForContentType(resolvedContentType)}`;
  const baseHeaders = {
    'Content-Type': resolvedContentType,
    'Accept-Ranges': 'bytes',
    'Cache-Control': cacheControl,
    'Content-Disposition': `inline; filename="${fileName}"`,
  };
  const range = request.headers.get('range');

  if (range) {
    const parsedRange = parseByteRange(range, buffer.length);
    if (!parsedRange) {
      return new NextResponse(null, {
        status: 416,
        headers: {
          ...baseHeaders,
          'Content-Range': `bytes */${buffer.length}`,
        },
      });
    }

    const { start, end } = parsedRange;
    const chunk = buffer.subarray(start, end + 1);
    return new NextResponse(chunk, {
      status: 206,
      headers: {
        ...baseHeaders,
        'Content-Length': String(chunk.length),
        'Content-Range': `bytes ${start}-${end}/${buffer.length}`,
      },
    });
  }

  return new NextResponse(buffer, {
    headers: {
      ...baseHeaders,
      'Content-Length': String(buffer.length),
    },
  });
}

export async function mediaRedirectResponse({ request, mediaUrl, objectKey, cacheControl }) {
  if (mediaUrl?.startsWith('data:')) {
    const kind = request.nextUrl?.pathname?.includes('/video') ? 'video' : 'audio';
    const response = dataUrlResponse({
      request,
      dataUrl: mediaUrl,
      cacheControl,
      filePrefix: `testimony-${kind}`,
      kind,
    });
    if (response) return response;
    return NextResponse.json({ error: 'Media could not be read' }, { status: 500 });
  }

  const stored = parseStoredMediaUrl(mediaUrl);
  const resolvedObjectKey = objectKey || stored?.objectKey;
  if (stored || resolvedObjectKey) {
    try {
      const readUrl = await createSignedMediaRead({ objectKey: resolvedObjectKey });
      return NextResponse.redirect(readUrl);
    } catch (error) {
      if (error?.message === 'FIREBASE_STORAGE_NOT_CONFIGURED') {
        return NextResponse.json({ error: 'Firebase media storage is not configured.' }, { status: 503 });
      }
      return NextResponse.json({ error: 'Media could not be signed for playback.' }, { status: 500 });
    }
  }

  if (mediaUrl) {
    return NextResponse.redirect(new URL(mediaUrl, request.url));
  }

  return NextResponse.json({ error: 'Media not found' }, { status: 404 });
}

function parseByteRange(rangeHeader, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader || '');
  if (!match || size <= 0) return null;

  let start;
  let end;
  if (match[1] === '' && match[2] === '') return null;
  if (match[1] === '') {
    const suffixLength = Number(match[2]);
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) return null;
    start = Math.max(size - suffixLength, 0);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] === '' ? size - 1 : Number(match[2]);
  }

  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || start >= size) return null;
  return { start, end: Math.min(end, size - 1) };
}

function resolveMediaContentType(buffer, declaredContentType, kind) {
  const lowerDeclared = String(declaredContentType || '').toLowerCase();
  if (buffer.subarray(4, 8).toString('ascii') === 'ftyp') {
    return kind === 'video' ? 'video/mp4' : 'audio/mp4';
  }
  if (buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WAVE') {
    return 'audio/wav';
  }
  if (buffer.subarray(0, 4).toString('ascii') === 'OggS') {
    return kind === 'video' ? 'video/ogg' : 'audio/ogg';
  }
  if (isEbmlHeader(buffer)) {
    return kind === 'video' ? 'video/webm' : 'audio/webm';
  }
  if (buffer.subarray(0, 3).toString('ascii') === 'ID3' || isLikelyMp3Frame(buffer)) {
    return 'audio/mpeg';
  }
  return lowerDeclared || (kind === 'video' ? 'video/mp4' : 'audio/mp4');
}

function isLikelyMp3Frame(buffer) {
  return buffer.length > 2 && buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0;
}

function isEbmlHeader(buffer) {
  return buffer.length > 4 && buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3;
}

function extensionForContentType(contentType) {
  if (contentType.includes('mpeg') || contentType.includes('mp3')) return 'mp3';
  if (contentType === 'audio/mp4' || contentType.includes('m4a')) return 'm4a';
  if (contentType.includes('webm')) return 'webm';
  if (contentType.includes('wav')) return 'wav';
  if (contentType.includes('ogg')) return 'ogg';
  if (contentType.includes('mp4')) return 'mp4';
  if (contentType.includes('quicktime')) return 'mov';
  return contentType.startsWith('video/') ? 'video' : 'audio';
}

export const mediaStorageProvider = FIREBASE_PROVIDER;

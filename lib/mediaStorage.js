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

function dataUrlResponse(dataUrl, cacheControl = 'private, max-age=0, must-revalidate') {
  const match = /^data:([^;,]+);base64,(.+)$/s.exec(dataUrl || '');
  if (!match) return null;

  const [, contentType, payload] = match;
  const buffer = Buffer.from(payload, 'base64');
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(buffer.length),
      'Cache-Control': cacheControl,
    },
  });
}

export async function mediaRedirectResponse({ request, mediaUrl, objectKey, cacheControl }) {
  if (mediaUrl?.startsWith('data:')) {
    const response = dataUrlResponse(mediaUrl, cacheControl);
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

export const mediaStorageProvider = FIREBASE_PROVIDER;

import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const MAX_MEDIA_UPLOAD_BYTES = 200 * 1024 * 1024;

let client;

export function hasR2Config() {
  return Boolean(
    process.env.R2_ACCOUNT_ID
      && process.env.R2_ACCESS_KEY_ID
      && process.env.R2_SECRET_ACCESS_KEY
      && process.env.R2_BUCKET_NAME
  );
}

export function getR2Client() {
  if (!hasR2Config()) {
    throw new Error('R2 is not configured');
  }

  if (!client) {
    client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        ...(process.env.R2_SESSION_TOKEN ? { sessionToken: process.env.R2_SESSION_TOKEN } : {}),
      },
    });
  }

  return client;
}

export function assertMediaUpload({ contentType, size }) {
  if (!contentType || !/^audio\/|^video\//.test(contentType)) {
    throw new Error('UNSUPPORTED_MEDIA_TYPE');
  }
  if (!Number.isFinite(size) || size <= 0 || size > MAX_MEDIA_UPLOAD_BYTES) {
    throw new Error('MEDIA_FILE_TOO_LARGE');
  }
}

export function mediaPublicUrl(objectKey) {
  const base = process.env.R2_PUBLIC_BASE_URL?.replace(/\/$/, '');
  return base ? `${base}/${objectKey}` : objectKey;
}

export async function createPresignedMediaUpload({ objectKey, contentType }) {
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: objectKey,
    ContentType: contentType,
  });

  return getSignedUrl(getR2Client(), command, { expiresIn: 60 * 5 });
}

export async function readMediaObject(objectKey) {
  const response = await getR2Client().send(new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: objectKey,
  }));
  const chunks = [];

  for await (const chunk of response.Body) {
    chunks.push(Buffer.from(chunk));
  }

  return {
    buffer: Buffer.concat(chunks),
    contentType: response.ContentType || 'application/octet-stream',
  };
}

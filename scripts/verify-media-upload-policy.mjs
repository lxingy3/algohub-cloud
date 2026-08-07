import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Storage } from '@google-cloud/storage';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const mediaStorageSource = await readFile(join(repoRoot, 'lib/mediaStorage.js'), 'utf8');
const maxBytesExpression = mediaStorageSource.match(/export const MAX_MEDIA_BYTES = ([^;]+);/)?.[1];
const ttlExpression = mediaStorageSource.match(/const SIGNED_UPLOAD_TTL_MS = ([^;]+);/)?.[1];
const policyFunctionSource = mediaStorageSource.match(
  /export function signedMediaUploadPolicyOptions[\s\S]*?\n}\n(?=\nexport async function createSignedMediaUpload)/,
)?.[0];
const prefixFunctionSource = mediaStorageSource.match(
  /export function mediaUploadUserPrefix[\s\S]*?\n}\n(?=\nexport function isOwnedTestimonyMediaObjectKey)/,
)?.[0];
const ownershipFunctionSource = mediaStorageSource.match(
  /export function isOwnedTestimonyMediaObjectKey[\s\S]*?\n}\n(?=\nexport function parseStoredMediaUrl)/,
)?.[0];
assert.ok(
  maxBytesExpression && ttlExpression && policyFunctionSource && prefixFunctionSource && ownershipFunctionSource,
  'media upload policy source must be present',
);

const MAX_MEDIA_BYTES = Function(`"use strict"; return (${maxBytesExpression});`)();
const signedUploadTtlMs = Function(`"use strict"; return (${ttlExpression});`)();
const signedMediaUploadPolicyOptions = Function(
  'SIGNED_UPLOAD_TTL_MS',
  `"use strict"; ${policyFunctionSource.replace('export function', 'function')}; return signedMediaUploadPolicyOptions;`,
)(signedUploadTtlMs);
const isOwnedTestimonyMediaObjectKey = Function(
  `"use strict"; ${prefixFunctionSource.replace('export function', 'function')}; ${
    ownershipFunctionSource.replace('export function', 'function')
  }; return isOwnedTestimonyMediaObjectKey;`,
)();

const now = Date.now();
const contentType = 'audio/webm';
const options = signedMediaUploadPolicyOptions({
  contentType,
  maxBytes: MAX_MEDIA_BYTES,
  now,
});

assert.equal(options.expires, now + 5 * 60 * 1000, 'upload policy must expire after five minutes');
assert.deepEqual(options.fields, {
  'Content-Type': contentType,
  success_action_status: '204',
});
assert.deepEqual(options.conditions, [
  ['content-length-range', 1, MAX_MEDIA_BYTES],
]);
assert.equal(
  isOwnedTestimonyMediaObjectKey({
    objectKey: 'testimonies/audio/users/user-123/2026-07-28/story.webm',
    userId: 'user-123',
  }),
  true,
);
assert.equal(
  isOwnedTestimonyMediaObjectKey({
    objectKey: 'testimonies/audio/users/another-user/2026-07-28/story.webm',
    userId: 'user-123',
  }),
  false,
);
assert.equal(
  isOwnedTestimonyMediaObjectKey({
    objectKey: 'testimonies/audio/2026-07-28/legacy.webm',
    userId: 'user-123',
  }),
  false,
);

const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const storage = new Storage({
  projectId: 'media-upload-policy-self-check',
  credentials: {
    client_email: 'self-check@example.invalid',
    private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }),
  },
});
const [sdkPolicy] = await storage
  .bucket('media-upload-policy-self-check')
  .file('test/audio.webm')
  .generateSignedPostPolicyV4(options);
assert.equal(typeof sdkPolicy.url, 'string');
assert.equal(sdkPolicy.fields.key, 'test/audio.webm');
assert.equal(sdkPolicy.fields['Content-Type'], contentType);
const decodedPolicy = JSON.parse(Buffer.from(sdkPolicy.fields.policy, 'base64').toString('utf8'));
assert.ok(
  decodedPolicy.conditions.some((condition) => (
    Array.isArray(condition)
      && condition[0] === 'content-length-range'
      && condition[1] === 1
      && condition[2] === MAX_MEDIA_BYTES
  )),
  'installed GCS SDK policy must retain the enforced content-length-range',
);

assert.match(mediaStorageSource, /const \[policy\] = await bucket\.file\(objectKey\)\.generateSignedPostPolicyV4/);
assert.match(mediaStorageSource, /uploadUrl: policy\.url/);
assert.match(mediaStorageSource, /uploadFields: policy\.fields/);

const routeSource = await readFile(join(repoRoot, 'app/api/uploads/presign/route.js'), 'utf8');
assert.match(routeSource, /kind === 'image' \? await requireAdmin\(\) : await getCurrentUser\(\)/);
assert.match(routeSource, /uploadMethod: 'POST'/);
assert.match(routeSource, /uploadFields/);
assert.match(routeSource, /mediaUploadUserPrefix\(user\.id\)/);
assert.match(routeSource, /testimonies\/\$\{kind\}\/\$\{userPrefix\}/);

const testimonyRouteSource = await readFile(join(repoRoot, 'app/api/testimonies/route.js'), 'utf8');
assert.match(testimonyRouteSource, /isOwnedTestimonyMediaObjectKey\(\{ objectKey: mediaObjectKey, userId: user\?\.id \}\)/);
const submitPageSource = await readFile(join(repoRoot, 'app/submit-testimony/page.js'), 'utf8');
assert.match(submitPageSource, /mediaUploadEnabled=\{hasFirebaseStorageConfig\(\)\}/);
const submitFormSource = await readFile(join(repoRoot, 'app/components/SubmitTestimonyForm.js'), 'utf8');
assert.match(submitFormSource, /method\.id === 'voice' && \(!isLoggedIn \|\| !mediaUploadEnabled\)/);
assert.match(submitFormSource, /Audio and video upload is temporarily unavailable/);

for (const relativePath of [
  'app/components/SubmitTestimonyForm.js',
  'app/admin/testimonies/MLQuickTest.js',
  'app/admin/organizations/AdminOrganizationsManager.js',
  'app/admin/events/AdminEventsManager.js',
]) {
  const source = await readFile(join(repoRoot, relativePath), 'utf8');
  const fieldsIndex = source.indexOf('Object.entries(');
  const fileIndex = source.indexOf(".append('file'");
  assert.ok(fieldsIndex >= 0 && fileIndex > fieldsIndex, `${relativePath} must append signed fields before the file`);
  assert.match(source.slice(fieldsIndex, fileIndex + 120), /method: 'POST'/, `${relativePath} must upload with POST`);
  assert.doesNotMatch(
    source.slice(fieldsIndex, fileIndex + 240),
    /headers:\s*\{\s*['"]Content-Type/i,
    `${relativePath} must let the browser set multipart Content-Type`,
  );
}

console.log('Media upload policy self-check passed.');

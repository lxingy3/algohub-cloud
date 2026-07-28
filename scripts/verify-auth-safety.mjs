import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { idleDraftKey, idleRestoreKey, isDraftableField, isOwnedDraft } from '../lib/idleDraft.js';
import { allowLegacyEmptyPasswordLogin } from '../lib/password.js';
import { isSameOriginRequest, publicAppOrigin } from '../lib/requestSecurity.js';
import { safeInternalPath, withCompleteProfileModal } from '../lib/safeRedirect.js';

assert.equal(safeInternalPath('/stories?id=1#comments', '/'), '/stories?id=1#comments');
for (const value of ['//evil.example', '/\\evil.example', '/\u0000evil', 'https://evil.example']) {
  assert.equal(safeInternalPath(value, '/'), '/');
}
assert.equal(withCompleteProfileModal('/stories?theme=data#results'), '/stories?theme=data&authModal=complete-profile#results');
assert.equal(withCompleteProfileModal('//evil.example'), '/?authModal=complete-profile');

const resetPasswordSource = await readFile(new URL('../app/api/auth/set-password/route.js', import.meta.url), 'utf8');
assert(
  resetPasswordSource.indexOf('resetCandidate = await prisma.passwordResetToken.findUnique') <
    resetPasswordSource.indexOf('const passwordHash = await hashPassword(password)'),
  'Reset tokens must be checked before the expensive password hash.',
);
const signupSsoSource = await readFile(new URL('../app/signup/SignupSsoButtons.js', import.meta.url), 'utf8');
assert.match(signupSsoSource, /callbackUrl: withCompleteProfileModal\(returnTo\)/);
const completeProfileSource = await readFile(new URL('../app/api/auth/complete-profile/route.js', import.meta.url), 'utf8');
assert.match(completeProfileSource, /prisma\.\$transaction\(async \(tx\)/);
for (const write of ['tx.user.create', 'tx.userRole.create', 'tx.account.create']) {
  assert.match(completeProfileSource, new RegExp(write.replace('.', '\\.')));
}
const nextAuthSource = await readFile(new URL('../lib/nextauth.js', import.meta.url), 'utf8');
assert.match(nextAuthSource, /profile\.preferred_username/);
assert.match(nextAuthSource, /profile\.upn/);
const loginSource = await readFile(new URL('../app/api/auth/login/route.js', import.meta.url), 'utf8');
assert.doesNotMatch(loginSource, /'not-found'|'invalid-password'|'password-not-set'/);
assert.match(loginSource, /'invalid-credentials'/);
const resetRequestSource = await readFile(new URL('../app/api/auth/request-password-reset/route.js', import.meta.url), 'utf8');
assert.match(resetRequestSource, /RESET_REQUEST_COOLDOWN_MS = 5 \* 60 \* 1000/);
assert.match(resetRequestSource, /createdAt: \{ gt:/);

const sameOrigin = new Request('https://algostories.example/api/auth/login', {
  headers: { origin: 'https://algostories.example' },
});
const crossOrigin = new Request('https://algostories.example/api/auth/login', {
  headers: { origin: 'https://evil.example' },
});
assert.equal(isSameOriginRequest(sameOrigin), true);
assert.equal(isSameOriginRequest(crossOrigin), false);
assert.equal(isSameOriginRequest(new Request(sameOrigin.url)), false);
const originalAppBaseUrl = process.env.APP_BASE_URL;
process.env.APP_BASE_URL = 'https://algostories.example/some/path';
assert.equal(publicAppOrigin(new Request('https://untrusted-host.example/reset')), 'https://algostories.example');
if (originalAppBaseUrl === undefined) delete process.env.APP_BASE_URL;
else process.env.APP_BASE_URL = originalAppBaseUrl;

assert.equal(isDraftableField({ name: 'comment', type: 'textarea', autocomplete: '', dataset: {} }), true);
for (const field of [
  { name: 'password', type: 'password' },
  { name: 'resetToken', type: 'text' },
  { name: 'verificationCode', type: 'text' },
  { name: 'code', type: 'text', autocomplete: 'one-time-code' },
  { name: 'attachment', type: 'file' },
]) {
  assert.equal(isDraftableField(field), false);
}
assert.equal(idleDraftKey('user-a'), 'algohub_auto_logout_draft:user-a');
assert.equal(idleRestoreKey('user-a'), 'algohub_restore_auto_logout_draft:user-a');
assert.equal(isOwnedDraft({ ownerUserId: 'user-a', fields: [] }, 'user-a'), true);
assert.equal(isOwnedDraft({ ownerUserId: 'user-a', fields: [] }, 'user-b'), false);

const originalNodeEnv = process.env.NODE_ENV;
const originalLegacyFlag = process.env.ALLOW_LEGACY_EMPTY_PASSWORD_LOGIN;
process.env.NODE_ENV = 'production';
process.env.ALLOW_LEGACY_EMPTY_PASSWORD_LOGIN = 'true';
assert.equal(allowLegacyEmptyPasswordLogin(), false);
process.env.NODE_ENV = 'test';
assert.equal(allowLegacyEmptyPasswordLogin(), true);
if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = originalNodeEnv;
if (originalLegacyFlag === undefined) delete process.env.ALLOW_LEGACY_EMPTY_PASSWORD_LOGIN;
else process.env.ALLOW_LEGACY_EMPTY_PASSWORD_LOGIN = originalLegacyFlag;

console.log('auth safety self-check PASS');

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { getJurisdictionId } from '../lib/jurisdiction.js';
import { hashPasswordResetToken } from '../lib/password.js';
import { requireTestDatabase } from './lib/require-test-database.mjs';

const baseUrl = (process.argv[2] || 'http://127.0.0.1:3000').replace(/\/$/, '');
await requireTestDatabase('verify-auth-comment-moderation-lifecycle', baseUrl);
const { prisma } = await import('../lib/prisma.js');
const jurisdictionId = getJurisdictionId();
const suffix = randomUUID();
const password = `Lifecycle-${suffix.slice(0, 8)}!A7`;
const resetPassword = `Reset-${suffix.slice(0, 8)}!B8`;
const communityEmail = `lifecycle-community-${suffix}@example.invalid`;
const adminEmail = `lifecycle-admin-${suffix}@example.invalid`;
const deletableEmail = `lifecycle-delete-${suffix}@example.invalid`;
const commentMarker = `Lifecycle parent ${suffix}`;
const replyMarker = `Lifecycle reply ${suffix}`;
const testimonyMarker = `Lifecycle testimony ${suffix}`;

let communityUser;
let adminUser;
let deletableUser;
let lifecycleTestimony;

function cookieFrom(response) {
  const value = response.headers.get('set-cookie') || '';
  const match = value.match(/algohub_session=([^;]+)/);
  assert.ok(match, `Expected algohub_session cookie, received: ${value}`);
  return `algohub_session=${match[1]}`;
}

function sessionToken(cookie) {
  return cookie.split('=', 2)[1];
}

async function post(path, body, cookie = '', headers = {}) {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      ...(cookie ? { cookie } : {}),
      'content-type': 'application/x-www-form-urlencoded',
      origin: baseUrl,
      ...headers,
    },
    body: new URLSearchParams(body),
    redirect: 'manual',
  });
}

async function postJson(path, body, cookie = '', headers = {}) {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      ...(cookie ? { cookie } : {}),
      'content-type': 'application/json',
      origin: baseUrl,
      ...headers,
    },
    body: JSON.stringify(body),
    redirect: 'manual',
  });
}

async function signup(email, name) {
  const response = await post('/api/auth/signup', {
    email,
    name,
    password,
    confirmPassword: password,
    callbackUrl: '/stories',
  });
  assert.equal(response.status, 303);
  assert.equal(new URL(response.headers.get('location')).pathname, '/stories');
  return cookieFrom(response);
}

async function login(email, submittedPassword) {
  return post('/api/auth/login', {
    email,
    password: submittedPassword,
    callbackUrl: '/stories',
  });
}

async function moderate(commentId, status, cookie, currentStatus) {
  return post(`/api/admin/comments/${commentId}/moderate`, {
    status,
    currentStatus,
    returnTo: '/admin/comments',
  }, cookie);
}

async function moderateTestimony(testimonyId, status, cookie, notes = '') {
  return post(`/api/admin/testimonies/${testimonyId}/moderate`, {
    status,
    notes,
    returnTo: '/admin/testimonies',
  }, cookie);
}

async function publicStoryHtml(testimonyId) {
  const response = await fetch(`${baseUrl}/stories/${testimonyId}`);
  assert.equal(response.status, 200);
  return response.text();
}

async function publicTestimonyStatus(testimonyId) {
  return (await fetch(`${baseUrl}/api/testimonies/${testimonyId}`)).status;
}

async function main() {
  const testimony = await prisma.testimony.findFirst({
    where: { jurisdictionId, moderationStatus: 'APPROVED', publicPosting: true },
    orderBy: { submittedAt: 'desc' },
    select: { id: true },
  });
  assert.ok(testimony, 'An approved public story is required for the lifecycle regression.');

  let communityCookie = await signup(communityEmail, 'Lifecycle Community');
  communityUser = await prisma.user.findUnique({
    where: { jurisdictionId_email: { jurisdictionId, email: communityEmail } },
  });
  assert.ok(communityUser);
  assert.equal(communityUser.primaryRoleName, 'COMMUNITY_MEMBER');

  const initialToken = sessionToken(communityCookie);
  assert.ok(await prisma.session.findUnique({ where: { sessionToken: initialToken } }));
  const logoutResponse = await post('/api/auth/logout', {}, communityCookie);
  assert.equal(logoutResponse.status, 303);
  assert.equal(await prisma.session.findUnique({ where: { sessionToken: initialToken } }), null);

  const rejectedLogin = await login(communityEmail, `${password}-wrong`);
  assert.equal(rejectedLogin.status, 303);
  assert.equal(new URL(rejectedLogin.headers.get('location')).searchParams.get('authError'), 'invalid-credentials');

  const acceptedLogin = await login(communityEmail, password);
  assert.equal(acceptedLogin.status, 303);
  communityCookie = cookieFrom(acceptedLogin);

  const adminCookie = await signup(adminEmail, 'Lifecycle Admin');
  adminUser = await prisma.user.findUnique({
    where: { jurisdictionId_email: { jurisdictionId, email: adminEmail } },
  });
  assert.ok(adminUser);
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: { name: 'ADMIN', description: 'Administrator.' },
  });
  await prisma.$transaction([
    prisma.userRole.upsert({
      where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
      update: {},
      create: { userId: adminUser.id, roleId: adminRole.id },
    }),
    prisma.user.update({
      where: { id: adminUser.id },
      data: { primaryRoleName: 'ADMIN' },
    }),
  ]);

  const resetRequest = await post('/api/auth/request-password-reset', { email: communityEmail });
  assert.equal(resetRequest.status, 200);
  assert.equal((await resetRequest.json()).ok, true);
  const requestedReset = await prisma.passwordResetToken.findMany({
    where: { userId: communityUser.id },
    select: { id: true, expiresAt: true },
  });
  assert.equal(requestedReset.length, 1);
  assert.ok(requestedReset[0].expiresAt > new Date());

  const repeatedResetRequest = await post('/api/auth/request-password-reset', { email: communityEmail });
  assert.equal(repeatedResetRequest.status, 200);
  assert.equal((await repeatedResetRequest.json()).ok, true);
  assert.deepEqual(
    await prisma.passwordResetToken.findMany({
      where: { userId: communityUser.id },
      select: { id: true },
    }),
    [{ id: requestedReset[0].id }],
  );

  const preResetSessionToken = sessionToken(communityCookie);
  const adminReset = await post(`/api/admin/users/${communityUser.id}/password-reset`, {}, adminCookie);
  assert.equal(adminReset.status, 200);
  const adminResetBody = await adminReset.json();
  const resetUrl = new URL(adminResetBody.resetUrl);
  const resetToken = resetUrl.searchParams.get('resetToken');
  assert.ok(resetToken);
  assert.ok(await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashPasswordResetToken(resetToken) },
  }));

  const mismatchedReset = await postJson('/api/auth/set-password', {
    resetToken,
    password: resetPassword,
    confirmPassword: `${resetPassword}-mismatch`,
  });
  assert.equal(mismatchedReset.status, 400);

  const completedReset = await postJson('/api/auth/set-password', {
    resetToken,
    password: resetPassword,
    confirmPassword: resetPassword,
  });
  assert.equal(completedReset.status, 200);
  assert.equal((await completedReset.json()).ok, true);
  const resetCookie = cookieFrom(completedReset);
  assert.equal(await prisma.session.findUnique({ where: { sessionToken: preResetSessionToken } }), null);
  assert.ok(await prisma.session.findUnique({ where: { sessionToken: sessionToken(resetCookie) } }));
  assert.equal(await prisma.passwordResetToken.count({ where: { userId: communityUser.id } }), 0);
  assert.equal((await postJson('/api/auth/set-password', {
    resetToken,
    password: resetPassword,
    confirmPassword: resetPassword,
  })).status, 400);

  const rejectedOldPassword = await login(communityEmail, password);
  assert.equal(new URL(rejectedOldPassword.headers.get('location')).searchParams.get('authError'), 'invalid-credentials');
  const acceptedResetPassword = await login(communityEmail, resetPassword);
  assert.equal(acceptedResetPassword.status, 303);
  communityCookie = cookieFrom(acceptedResetPassword);

  const selfDelete = await post(
    `/api/admin/users/${adminUser.id}/delete`,
    { returnTo: '/admin/users' },
    adminCookie,
  );
  assert.equal(selfDelete.status, 303);
  assert.equal(new URL(selfDelete.headers.get('location')).searchParams.get('error'), 'self-delete');

  const deletableCookie = await signup(deletableEmail, 'Lifecycle Delete');
  deletableUser = await prisma.user.findUnique({
    where: { jurisdictionId_email: { jurisdictionId, email: deletableEmail } },
  });
  assert.ok(deletableUser);
  const deletableSessionToken = sessionToken(deletableCookie);
  assert.equal((await post(
    `/api/admin/users/${deletableUser.id}/delete`,
    { returnTo: '/admin/users' },
    communityCookie,
  )).status, 403);
  const deletedAccount = await post(
    `/api/admin/users/${deletableUser.id}/delete`,
    { returnTo: '/admin/users' },
    adminCookie,
  );
  assert.equal(deletedAccount.status, 303);
  assert.equal(new URL(deletedAccount.headers.get('location')).searchParams.get('success'), 'deleted');
  assert.equal(await prisma.user.findUnique({ where: { id: deletableUser.id } }), null);
  assert.equal(await prisma.session.findUnique({ where: { sessionToken: deletableSessionToken } }), null);
  assert.equal(await prisma.userRole.count({ where: { userId: deletableUser.id } }), 0);

  const createTestimony = await postJson('/api/testimonies', {
    title: testimonyMarker,
    city: 'Pittsburgh',
    narrativeText: `${testimonyMarker} exercises the complete moderation lifecycle.`,
    affectedDomain: 'Community Services',
    selfReportedImpact: 'MIXED',
    publicPosting: true,
    followupConsent: true,
    isAnonymous: true,
    storyType: 'text',
  }, communityCookie);
  assert.equal(createTestimony.status, 201);
  const createTestimonyBody = await createTestimony.json();
  lifecycleTestimony = await prisma.testimony.findUnique({
    where: { id: createTestimonyBody.id },
    select: { id: true, userId: true, moderationStatus: true, publicPosting: true },
  });
  assert.ok(lifecycleTestimony);
  assert.equal(lifecycleTestimony.userId, communityUser.id);
  assert.equal(lifecycleTestimony.moderationStatus, 'PENDING');
  assert.equal(lifecycleTestimony.publicPosting, true);
  assert.equal(await publicTestimonyStatus(lifecycleTestimony.id), 404);
  assert.equal((await moderateTestimony(
    lifecycleTestimony.id,
    'APPROVED',
    communityCookie,
  )).status, 403);

  const flagTestimony = await moderateTestimony(
    lifecycleTestimony.id,
    'FLAGGED',
    adminCookie,
    'Lifecycle flag review.',
  );
  assert.equal(flagTestimony.status, 303);
  assert.deepEqual(
    await prisma.testimony.findUnique({
      where: { id: lifecycleTestimony.id },
      select: { moderationStatus: true, moderatorId: true, moderationNotes: true },
    }),
    {
      moderationStatus: 'FLAGGED',
      moderatorId: adminUser.id,
      moderationNotes: 'Lifecycle flag review.',
    },
  );
  assert.equal((await moderateTestimony(lifecycleTestimony.id, 'APPROVED', adminCookie)).status, 303);
  assert.equal(await publicTestimonyStatus(lifecycleTestimony.id), 200);
  assert.equal((await moderateTestimony(lifecycleTestimony.id, 'FLAGGED', adminCookie)).status, 400);
  assert.equal((await moderateTestimony(lifecycleTestimony.id, 'REJECTED', adminCookie)).status, 303);
  assert.equal(await publicTestimonyStatus(lifecycleTestimony.id), 404);
  assert.equal((await moderateTestimony(lifecycleTestimony.id, 'PENDING', adminCookie)).status, 303);
  assert.equal((await moderateTestimony(lifecycleTestimony.id, 'APPROVED', adminCookie)).status, 303);
  assert.equal(await publicTestimonyStatus(lifecycleTestimony.id), 200);

  const createComment = await post(
    `/api/stories/${testimony.id}/comments`,
    { content: commentMarker },
    communityCookie,
    { 'x-story-mutation': 'true' },
  );
  assert.equal(createComment.status, 200);
  const createCommentBody = await createComment.json();
  assert.equal(createCommentBody.ok, true);
  assert.equal(createCommentBody.comment.moderationStatus, 'PENDING');
  assert.equal(createCommentBody.comment.parentCommentId, null);
  assert.match(createCommentBody.message, /awaiting moderation/i);
  const parent = await prisma.comment.findFirst({
    where: { userId: communityUser.id, content: commentMarker },
  });
  assert.ok(parent);
  assert.equal(createCommentBody.comment.id, parent.id);
  assert.equal(parent.moderationStatus, 'PENDING');
  assert.doesNotMatch(await publicStoryHtml(testimony.id), new RegExp(commentMarker));

  const forbiddenModeration = await moderate(parent.id, 'APPROVED', communityCookie, 'PENDING');
  assert.equal(forbiddenModeration.status, 403);

  const approveParent = await moderate(parent.id, 'APPROVED', adminCookie, 'PENDING');
  assert.equal(approveParent.status, 303);
  assert.match(await publicStoryHtml(testimony.id), new RegExp(commentMarker));
  assert.equal((await moderate(parent.id, 'REJECTED', adminCookie, 'PENDING')).status, 409);

  const likePath = `/api/stories/${testimony.id}/comments/${parent.id}/like`;
  const toggleLike = () => post(likePath, {}, communityCookie, { 'x-story-mutation': 'true' });
  assert.equal((await toggleLike()).status, 200);
  assert.equal(await prisma.commentLike.count({ where: { commentId: parent.id, userId: communityUser.id } }), 1);
  assert.equal((await toggleLike()).status, 200);
  assert.equal(await prisma.commentLike.count({ where: { commentId: parent.id, userId: communityUser.id } }), 0);

  const toggleReaction = () => post(
    `/api/stories/${testimony.id}/reactions`,
    { reactionType: 'SUPPORT' },
    communityCookie,
    { 'x-story-mutation': 'true' },
  );
  assert.equal((await toggleReaction()).status, 200);
  assert.equal(await prisma.testimonyReaction.count({
    where: { testimonyId: testimony.id, userId: communityUser.id, reactionType: 'SUPPORT' },
  }), 1);
  assert.equal((await toggleReaction()).status, 200);
  assert.equal(await prisma.testimonyReaction.count({
    where: { testimonyId: testimony.id, userId: communityUser.id, reactionType: 'SUPPORT' },
  }), 0);

  const createReply = await post(
    `/api/stories/${testimony.id}/comments`,
    { content: replyMarker, parentCommentId: parent.id },
    communityCookie,
    { 'x-story-mutation': 'true' },
  );
  assert.equal(createReply.status, 200);
  const createReplyBody = await createReply.json();
  assert.equal(createReplyBody.ok, true);
  assert.equal(createReplyBody.comment.moderationStatus, 'PENDING');
  assert.equal(createReplyBody.comment.parentCommentId, parent.id);
  assert.match(createReplyBody.message, /awaiting moderation/i);
  const reply = await prisma.comment.findFirst({
    where: { userId: communityUser.id, content: replyMarker },
  });
  assert.ok(reply);
  assert.equal(createReplyBody.comment.id, reply.id);
  assert.equal((await moderate(reply.id, 'FLAGGED', adminCookie, 'PENDING')).status, 303);
  assert.equal((await moderate(reply.id, 'APPROVED', adminCookie, 'FLAGGED')).status, 303);
  assert.match(await publicStoryHtml(testimony.id), new RegExp(replyMarker));

  assert.equal((await moderate(parent.id, 'FLAGGED', adminCookie, 'APPROVED')).status, 400);
  assert.equal((await moderate(parent.id, 'REJECTED', adminCookie, 'APPROVED')).status, 303);
  assert.doesNotMatch(await publicStoryHtml(testimony.id), new RegExp(commentMarker));
  assert.equal((await moderate(parent.id, 'PENDING', adminCookie, 'REJECTED')).status, 303);
  assert.equal((await moderate(parent.id, 'APPROVED', adminCookie, 'PENDING')).status, 303);
  const restoredHtml = await publicStoryHtml(testimony.id);
  assert.match(restoredHtml, new RegExp(commentMarker));
  assert.match(restoredHtml, new RegExp(replyMarker));

  const finalLogout = await post('/api/auth/logout', {}, communityCookie);
  assert.equal(finalLogout.status, 303);
  assert.equal(
    await prisma.session.findUnique({ where: { sessionToken: sessionToken(communityCookie) } }),
    null,
  );

  console.log(JSON.stringify({
    status: 'PASS',
    storyId: testimony.id,
    auth: 'signup -> logout -> rejected login -> accepted login -> logout',
    passwordReset: 'request -> cooldown -> admin token -> validation -> consume -> sessions revoked -> new password login',
    accounts: 'non-admin denied; self-delete denied; disposable account deleted with session and role cleanup',
    testimonyModeration: 'pending hidden -> flagged -> approved visible -> rejected hidden -> pending -> approved visible',
    comments: 'pending response -> approved; reply pending response -> flagged -> approved',
    moderation: 'non-admin denied; stale state conflicted; invalid transition denied; approved -> rejected -> pending -> approved',
    likes: '0 -> 1 -> 0',
    reactions: '0 -> 1 -> 0',
    sso: 'NOT_RUN: external OAuth callback cannot be simulated deterministically without a provider.',
  }, null, 2));
}

async function cleanup() {
  const userIds = [communityUser?.id, adminUser?.id, deletableUser?.id].filter(Boolean);
  if (!userIds.length) return;
  if (lifecycleTestimony?.id) {
    await prisma.testimony.deleteMany({ where: { id: lifecycleTestimony.id } });
  }
  const comments = await prisma.comment.findMany({
    where: { userId: { in: userIds } },
    select: { id: true, parentCommentId: true },
  });
  const commentIds = comments.map(({ id }) => id);
  if (commentIds.length) {
    await prisma.commentLike.deleteMany({ where: { commentId: { in: commentIds } } });
    await prisma.comment.deleteMany({ where: { id: { in: commentIds }, parentCommentId: { not: null } } });
    await prisma.comment.deleteMany({ where: { id: { in: commentIds } } });
  }
  await prisma.testimonyReaction.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.userRole.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
}

try {
  await main();
} finally {
  await cleanup();
  await prisma.$disconnect();
}

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { prisma } from '../lib/prisma.js';
import { getJurisdictionId } from '../lib/jurisdiction.js';

const baseUrl = (process.argv[2] || 'http://127.0.0.1:3000').replace(/\/$/, '');
const jurisdictionId = getJurisdictionId();
const suffix = randomUUID();
const password = `Lifecycle-${suffix.slice(0, 8)}!A7`;
const communityEmail = `lifecycle-community-${suffix}@example.invalid`;
const adminEmail = `lifecycle-admin-${suffix}@example.invalid`;
const commentMarker = `Lifecycle parent ${suffix}`;
const replyMarker = `Lifecycle reply ${suffix}`;

let communityUser;
let adminUser;

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
      ...headers,
    },
    body: new URLSearchParams(body),
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

async function moderate(commentId, status, cookie) {
  return post(`/api/admin/comments/${commentId}/moderate`, {
    status,
    returnTo: '/admin/comments',
  }, cookie);
}

async function publicStoryHtml(testimonyId) {
  const response = await fetch(`${baseUrl}/stories/${testimonyId}`);
  assert.equal(response.status, 200);
  return response.text();
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
  assert.equal(new URL(rejectedLogin.headers.get('location')).searchParams.get('authError'), 'invalid-password');

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

  const createComment = await post(
    `/api/stories/${testimony.id}/comments`,
    { content: commentMarker },
    communityCookie,
    { 'x-story-mutation': 'true' },
  );
  assert.equal(createComment.status, 200);
  const parent = await prisma.comment.findFirst({
    where: { userId: communityUser.id, content: commentMarker },
  });
  assert.ok(parent);
  assert.equal(parent.moderationStatus, 'PENDING');
  assert.doesNotMatch(await publicStoryHtml(testimony.id), new RegExp(commentMarker));

  const forbiddenModeration = await moderate(parent.id, 'APPROVED', communityCookie);
  assert.equal(forbiddenModeration.status, 403);

  const approveParent = await moderate(parent.id, 'APPROVED', adminCookie);
  assert.equal(approveParent.status, 303);
  assert.match(await publicStoryHtml(testimony.id), new RegExp(commentMarker));

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
  const reply = await prisma.comment.findFirst({
    where: { userId: communityUser.id, content: replyMarker },
  });
  assert.ok(reply);
  assert.equal((await moderate(reply.id, 'FLAGGED', adminCookie)).status, 303);
  assert.equal((await moderate(reply.id, 'APPROVED', adminCookie)).status, 303);
  assert.match(await publicStoryHtml(testimony.id), new RegExp(replyMarker));

  assert.equal((await moderate(parent.id, 'FLAGGED', adminCookie)).status, 400);
  assert.equal((await moderate(parent.id, 'REJECTED', adminCookie)).status, 303);
  assert.doesNotMatch(await publicStoryHtml(testimony.id), new RegExp(commentMarker));
  assert.equal((await moderate(parent.id, 'PENDING', adminCookie)).status, 303);
  assert.equal((await moderate(parent.id, 'APPROVED', adminCookie)).status, 303);
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
    comments: 'pending -> approved; reply pending -> flagged -> approved',
    moderation: 'non-admin denied; invalid transition denied; approved -> rejected -> pending -> approved',
    likes: '0 -> 1 -> 0',
    reactions: '0 -> 1 -> 0',
  }, null, 2));
}

async function cleanup() {
  const userIds = [communityUser?.id, adminUser?.id].filter(Boolean);
  if (!userIds.length) return;
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

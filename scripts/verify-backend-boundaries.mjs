import assert from 'node:assert/strict';
import { maximumPasswordLength, validatePassword } from '../lib/password.js';

const baseUrl = (process.argv[2] || process.env.BACKEND_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const sensitiveStoryFields = ['zipCode', 'submitterName', 'submitterEmail', 'contactEmail', 'followupConsent', 'audioFileUrl', 'videoFileUrl', 'mediaObjectKey', 'aiExtractedExperiences'];

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, { redirect: 'manual', signal: AbortSignal.timeout(60_000), ...options });
  const contentType = response.headers.get('content-type') || '';
  let body = null;
  if (contentType.includes('application/json')) body = await response.json();
  else await response.arrayBuffer();
  return { response, body };
}

async function requestAll(requests) {
  const results = [];
  for (const [path, options] of requests) results.push(await request(path, options));
  return results;
}

function assertNoFields(value, fields, label) {
  for (const field of fields) assert.ok(!(field in (value || {})), `${label} exposed ${field}`);
}

const pages = await requestAll(['/','/algorithms','/stories','/briefings','/events'].map((path) => [path]));
assert.ok(pages.every(({ response }) => response.status === 200), 'A public page did not load');

const testimonyList = await request('/api/testimonies?limit=1');
assert.equal(testimonyList.response.status, 200);
assert.ok(testimonyList.body.items.length > 0, 'No public testimony fixture is available');
assertNoFields(testimonyList.body.items[0], sensitiveStoryFields, 'testimony list');

const storyId = testimonyList.body.items[0].id;
const testimonyDetail = await request(`/api/testimonies/${storyId}`);
assert.equal(testimonyDetail.response.status, 200);
assertNoFields(testimonyDetail.body, sensitiveStoryFields, 'testimony detail');

const algorithmList = await request('/api/algorithms?limit=1');
assert.equal(algorithmList.response.status, 200);
const algorithm = algorithmList.body.items[0];
assert.ok(algorithm?.slug, 'No algorithm fixture is available');
const algorithmDetail = await request(`/api/algorithms/${algorithm.slug}`);
assert.equal(algorithmDetail.response.status, 200);
assert.ok(algorithmDetail.body.testimonyLinks.every((link) => !('moderationStatus' in link.testimony)));
const algorithmStories = await request(`/api/algorithms/${algorithm.slug}/testimonies?limit=50`);
assert.equal(algorithmStories.response.status, 200);
for (const story of algorithmStories.body.items) assertNoFields(story, sensitiveStoryFields, 'algorithm testimony');

const [stats, aggregate] = await requestAll([
  ['/api/stats'],
  ['/api/testimonies/aggregate-stats'],
]);
assert.equal(stats.body.approvedTestimonies, testimonyList.body.total);
assert.equal(aggregate.body.total, testimonyList.body.total);

const briefings = await request('/api/briefings?review_status=DRAFT');
assert.equal(briefings.response.status, 200);
assert.ok(briefings.body.items.every((item) => item.reviewStatus === 'PUBLISHED'), 'Non-public briefing metadata leaked');
if (briefings.body.items.length) {
  const briefing = await request(`/api/briefings/${briefings.body.items[0].slug}`);
  assert.equal(briefing.response.status, 200);
  assert.ok(!briefing.body.reviewedBy || !('email' in briefing.body.reviewedBy), 'Reviewer email leaked');
}

const events = await request('/api/events?limit=2');
assert.equal(events.response.status, 200);
for (const event of events.body.items) {
  if (event.organizer) assertNoFields(event.organizer, ['contactEmail', 'jurisdictionId'], 'event organizer');
}

const blocked = await requestAll([
  ['/api/admin/analytics'],
  ['/api/submission-draft'],
  ['/api/ml/quick-test', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }],
  ['/api/transcription/process', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }],
  ['/api/uploads/presign', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ kind: 'image', scope: 'eventImage', fileName: 'test.png', contentType: 'image/png', size: 100 }),
  }],
]);
assert.deepEqual(blocked.map(({ response }) => response.status), [403, 401, 401, 401, 403]);

const oversizedTranslation = await request('/api/translate', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ sourceLanguage: 'en', targetLanguage: 'es', texts: Array(4).fill('x'.repeat(4000)) }),
});
assert.equal(oversizedTranslation.response.status, 413);
assert.match(validatePassword('x'.repeat(maximumPasswordLength + 1)), /no more than/);

console.log(JSON.stringify({
  baseUrl,
  publicStories: testimonyList.body.total,
  algorithms: algorithmList.body.total,
  publishedBriefings: briefings.body.total,
  eventsChecked: events.body.items.length,
  status: 'PASS',
}, null, 2));

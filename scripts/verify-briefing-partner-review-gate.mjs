import assert from 'node:assert/strict';
import {
  canAccessPartnerReview,
  canChangePartnerDecision,
  evaluatePartnerPublicationGate,
  normalizePartnerReviewStatus,
  parsePartnerDeadline,
} from '../lib/briefingPartnerReview.js';

const partner = {
  organizationId: 'org-a',
  userRoles: [{ role: { name: 'ORG_MEMBER' } }],
};
const facilitator = {
  organizationId: 'org-a',
  userRoles: [{ role: { name: 'FACILITATOR' } }],
};
const admin = { userRoles: [{ role: { name: 'ADMIN' } }] };

assert.equal(canAccessPartnerReview(partner, 'org-a'), true);
assert.equal(canAccessPartnerReview(facilitator, 'org-a'), true);
assert.equal(canAccessPartnerReview(partner, 'org-b'), false);
assert.equal(canAccessPartnerReview({ ...partner, userRoles: [] }, 'org-a'), false);
assert.equal(canAccessPartnerReview(admin, 'org-b'), true);
assert.equal(canChangePartnerDecision('DRAFT'), true);
assert.equal(canChangePartnerDecision('REVIEWED'), true);
assert.equal(canChangePartnerDecision('PUBLISHED'), false);
assert.equal(normalizePartnerReviewStatus('approve'), 'APPROVED');
assert.equal(normalizePartnerReviewStatus('approved'), 'APPROVED');
assert.equal(normalizePartnerReviewStatus('concern'), 'CONCERN');
assert.equal(normalizePartnerReviewStatus('revision'), 'REVISION_REQUESTED');
assert.equal(normalizePartnerReviewStatus('revision_requested'), 'REVISION_REQUESTED');

assert.equal(evaluatePartnerPublicationGate([]).allowed, false);
assert.equal(evaluatePartnerPublicationGate([{ status: 'PENDING' }]).allowed, false);
assert.equal(evaluatePartnerPublicationGate([{ status: 'APPROVED' }, { status: 'CONCERN' }]).allowed, false);
assert.equal(evaluatePartnerPublicationGate([{ status: 'APPROVED' }, { status: 'APPROVED' }]).allowed, true);
assert.equal(evaluatePartnerPublicationGate([{ status: 'APPROVED', organization: { isActive: false } }]).allowed, false);
assert.equal(evaluatePartnerPublicationGate([], { enabled: true, reason: 'short' }).allowed, false);
assert.equal(evaluatePartnerPublicationGate([], { enabled: true, reason: 'Urgent public safety release.' }).allowed, true);
assert.equal(parsePartnerDeadline('2026-07-24').toISOString(), '2026-07-25T03:59:59.999Z');
assert.equal(parsePartnerDeadline('2026-12-24').toISOString(), '2026-12-25T04:59:59.999Z');
assert.equal(parsePartnerDeadline('not-a-date'), null);

console.log('Briefing partner review gate regression passed.');

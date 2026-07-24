export const PARTNER_REVIEW_STATUSES = new Set(['APPROVED', 'CONCERN', 'REVISION_REQUESTED']);

export function normalizePartnerReviewStatus(value) {
  const status = String(value || '').trim().toUpperCase();
  if (status === 'APPROVE') return 'APPROVED';
  if (status === 'REVISION' || status === 'REQUEST_REVISION') return 'REVISION_REQUESTED';
  return PARTNER_REVIEW_STATUSES.has(status) ? status : null;
}

export function canAccessPartnerReview(user, organizationId) {
  const roles = new Set(user?.userRoles?.map(({ role }) => role.name) || []);
  if (roles.has('ADMIN')) return true;
  return Boolean(
    user?.organizationId
    && user.organizationId === organizationId
    && (roles.has('FACILITATOR') || roles.has('ORG_MEMBER'))
  );
}

export function canChangePartnerDecision(reviewStatus) {
  return reviewStatus !== 'PUBLISHED';
}

export function parsePartnerDeadline(value, timeZone = 'America/New_York') {
  const raw = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const offset = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'longOffset',
  }).formatToParts(new Date(`${raw}T23:59:59.999Z`)).find((part) => part.type === 'timeZoneName')?.value.replace('GMT', '');
  const deadline = new Date(`${raw}T23:59:59.999${offset}`);
  return Number.isNaN(deadline.getTime()) ? null : deadline;
}

export function emptyPartnerReviewOverride() {
  return {
    partnerReviewOverrideReason: null,
    partnerReviewOverriddenByUserId: null,
    partnerReviewOverriddenAt: null,
  };
}

export function pendingPartnerReviewDecision() {
  return {
    status: 'PENDING',
    reviewedByUserId: null,
    reviewedAt: null,
  };
}

export async function lockBriefingForUpdate(tx, id) {
  const rows = await tx.$queryRaw`SELECT "id" FROM "briefings" WHERE "id" = ${id}::uuid FOR UPDATE`;
  return rows.length > 0;
}

export function evaluatePartnerPublicationGate(assignments, override = {}) {
  const rows = Array.isArray(assignments) ? assignments : [];
  const pending = rows.filter(({ status, organization }) => status !== 'APPROVED' || organization?.isActive === false);
  const allApproved = rows.length > 0 && pending.length === 0;
  const overrideReason = String(override.reason || '').trim();
  const overridden = Boolean(override.enabled && overrideReason.length >= 10);
  return {
    allowed: allApproved || overridden,
    allApproved,
    overridden,
    overrideReason,
    assignmentCount: rows.length,
    pending,
  };
}

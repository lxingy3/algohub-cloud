export const moderationStatuses = ['PENDING', 'APPROVED', 'FLAGGED', 'REJECTED'];

export const moderationStatusOrder = {
  PENDING: 0,
  APPROVED: 1,
  FLAGGED: 2,
  REJECTED: 3,
};

export const moderationTransitions = {
  PENDING: [
    ['APPROVED', 'Approve'],
    ['FLAGGED', 'Flag'],
    ['REJECTED', 'Reject'],
  ],
  APPROVED: [
    ['REJECTED', 'Reject'],
  ],
  FLAGGED: [
    ['APPROVED', 'Approve'],
    ['REJECTED', 'Reject'],
  ],
  REJECTED: [
    ['PENDING', 'Restore to Pending'],
  ],
};

export function isModerationStatus(value) {
  return moderationStatuses.includes(String(value || '').toUpperCase());
}

export function allowedModerationActions(currentStatus) {
  return moderationTransitions[currentStatus] || [];
}

export function canModerateTo(currentStatus, nextStatus) {
  return allowedModerationActions(currentStatus).some(([status]) => status === nextStatus);
}

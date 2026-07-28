export const LEGACY_IDLE_DRAFT_KEY = 'algohub_auto_logout_draft';
export const LEGACY_IDLE_RESTORE_KEY = 'algohub_restore_auto_logout_draft';

const SENSITIVE_FIELD_NAME = /(password|passcode|token|secret|one.?time|otp|verification.?code)/i;
const SENSITIVE_AUTOCOMPLETE = new Set(['current-password', 'new-password', 'one-time-code']);
const EXCLUDED_INPUT_TYPES = new Set(['button', 'file', 'hidden', 'image', 'password', 'reset', 'submit']);

export function idleDraftKey(userId) {
  return userId ? `${LEGACY_IDLE_DRAFT_KEY}:${userId}` : null;
}

export function idleRestoreKey(userId) {
  return userId ? `${LEGACY_IDLE_RESTORE_KEY}:${userId}` : null;
}

export function isDraftableField(field) {
  const name = String(field?.name || '');
  const type = String(field?.type || '').toLowerCase();
  const autocomplete = String(field?.autocomplete || '').toLowerCase();
  return Boolean(
    name
    && !field?.dataset?.noDraft
    && !EXCLUDED_INPUT_TYPES.has(type)
    && !SENSITIVE_FIELD_NAME.test(name)
    && !SENSITIVE_AUTOCOMPLETE.has(autocomplete)
  );
}

export function isOwnedDraft(draft, userId) {
  return Boolean(draft && userId && draft.ownerUserId === userId && Array.isArray(draft.fields));
}

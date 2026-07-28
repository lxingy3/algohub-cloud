const INTERNAL_ORIGIN = 'https://algostories.internal';
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

export function safeInternalPath(value, fallback = null) {
  if (typeof value !== 'string') return fallback;
  const candidate = value.trim();
  if (
    !candidate.startsWith('/')
    || candidate.startsWith('//')
    || candidate.includes('\\')
    || CONTROL_CHARACTERS.test(candidate)
  ) {
    return fallback;
  }

  try {
    const parsed = new URL(candidate, INTERNAL_ORIGIN);
    if (parsed.origin !== INTERNAL_ORIGIN) return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export function withCompleteProfileModal(value) {
  const parsed = new URL(safeInternalPath(value, '/'), INTERNAL_ORIGIN);
  parsed.searchParams.set('authModal', 'complete-profile');
  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

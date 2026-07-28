export function isSameOriginRequest(request) {
  const origin = request.headers.get('origin');
  if (!origin || origin === 'null') return false;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export function publicAppOrigin(request) {
  const configured = process.env.APP_BASE_URL
    || (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : '');

  if (configured) {
    try {
      const url = new URL(configured);
      if (url.protocol === 'https:' || url.protocol === 'http:') return url.origin;
    } catch {
      // Fall through to the request origin when deployment configuration is invalid.
    }
  }

  return new URL(request.url).origin;
}

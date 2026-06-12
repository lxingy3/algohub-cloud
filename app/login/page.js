import { redirect } from 'next/navigation';

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  const callbackUrl = safeCallbackUrl(params?.callbackUrl) || '/';
  const url = new URL(callbackUrl, 'https://algostories.local');
  url.searchParams.set('authModal', 'login');
  if (params?.error) url.searchParams.set('authError', String(params.error));
  if (params?.role) url.searchParams.set('role', String(params.role));
  redirect(`${url.pathname}${url.search}${url.hash}`);
}

function safeCallbackUrl(value) {
  const callbackUrl = String(value || '');
  if (!callbackUrl.startsWith('/') || callbackUrl.startsWith('//')) return null;
  return callbackUrl;
}

import { redirect } from 'next/navigation';

export default async function SignupPage({ searchParams }) {
  const params = await searchParams;
  const callbackUrl = safeCallbackUrl(params?.callbackUrl) || '/';
  const url = new URL(callbackUrl, 'https://algostories.local');
  url.searchParams.set('authModal', 'signup');
  if (params?.error) url.searchParams.set('signupError', String(params.error));
  redirect(`${url.pathname}${url.search}${url.hash}`);
}

function safeCallbackUrl(value) {
  const callbackUrl = String(value || '');
  if (!callbackUrl.startsWith('/') || callbackUrl.startsWith('//')) return null;
  return callbackUrl;
}

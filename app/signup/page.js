import { redirect } from 'next/navigation';
import { safeInternalPath } from '../../lib/safeRedirect';

export default async function SignupPage({ searchParams }) {
  const params = await searchParams;
  const callbackUrl = safeInternalPath(params?.callbackUrl, '/');
  const url = new URL(callbackUrl, 'https://algostories.local');
  url.searchParams.set('authModal', 'signup');
  if (params?.error) url.searchParams.set('signupError', String(params.error));
  redirect(`${url.pathname}${url.search}${url.hash}`);
}

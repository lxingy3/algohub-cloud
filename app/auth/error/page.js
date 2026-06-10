import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function AuthErrorPage({ searchParams }) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const returnTo = safeReturnTo(cookieStore.get('algohub_auth_return_to')?.value) || '/';
  const error = String(params?.error || 'OAuthCallbackError');
  const separator = returnTo.includes('?') ? '&' : '?';

  redirect(`${returnTo}${separator}authModal=login&authError=${encodeURIComponent(error)}`);
}

function safeReturnTo(value) {
  const returnTo = String(value || '');
  if (!returnTo.startsWith('/') || returnTo.startsWith('//')) return null;
  return returnTo;
}

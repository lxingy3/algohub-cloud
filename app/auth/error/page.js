import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { safeInternalPath } from '../../../lib/safeRedirect';

export default async function AuthErrorPage({ searchParams }) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const returnTo = safeInternalPath(cookieStore.get('algohub_auth_return_to')?.value, '/');
  const error = String(params?.error || 'OAuthCallbackError');
  const separator = returnTo.includes('?') ? '&' : '?';

  redirect(`${returnTo}${separator}authModal=login&authError=${encodeURIComponent(error)}`);
}

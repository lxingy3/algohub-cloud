import { redirect } from 'next/navigation';
import { auth } from '../../../lib/nextauth';
import { getCurrentUser } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

const errorMessages = {
  'name-required': 'Enter the name you want to use on AlgoStories.',
  'auth-required': 'Sign in with Google again to finish setup.',
  'account-exists': 'This email already has an account. Please log in with the existing account.',
};

export default async function CompleteProfilePage({ searchParams }) {
  const params = await searchParams;
  const returnTo = safeReturnTo(params?.returnTo) || '/';
  const currentUser = await getCurrentUser();
  if (currentUser) redirect(returnTo);

  const session = await auth();
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) redirect(`/login?callbackUrl=${encodeURIComponent(returnTo)}&error=auth-required`);

  const error = String(params?.error || '');

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 to-slate-100 px-4 py-10 text-slate-950">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-xl">
        <div className="mb-5">
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">Account setup</p>
          <h1 className="mt-2 text-2xl font-bold">Choose your display name</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Google verified {email}. Pick the name that should appear with your AlgoStories account.
          </p>
        </div>

        {errorMessages[error] ? (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
            {errorMessages[error]}
          </p>
        ) : null}

        <form action="/api/auth/complete-profile" method="post" className="space-y-4">
          <input type="hidden" name="returnTo" value={returnTo} />
          <label className="block text-sm font-medium text-slate-700">
            Display name
            <input
              name="name"
              type="text"
              minLength={2}
              maxLength={120}
              autoComplete="name"
              className="mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
              required
            />
          </label>
          <button className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800">
            Continue
          </button>
        </form>
      </section>
    </main>
  );
}

function safeReturnTo(value) {
  const returnTo = String(value || '');
  if (!returnTo.startsWith('/') || returnTo.startsWith('//')) return null;
  if (returnTo.startsWith('/auth/complete-profile')) return '/';
  return returnTo;
}

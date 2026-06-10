import Link from 'next/link';
import { TransientNotice } from '../components/TransientNotice';
import { SignupSsoButtons } from './SignupSsoButtons';

const roles = ['COMMUNITY_MEMBER', 'FACILITATOR', 'ORG_MEMBER', 'RESEARCHER', 'ADMIN'];

const errors = {
  'account-exists': 'This email already has an account with that role. Please log in or choose another role.',
  'name-conflict': 'This email and role already belong to another user name. Use the existing account or choose a different role.',
};

export default async function SignupPage({ searchParams }) {
  const params = await searchParams;
  const errorMessage = errors[params?.error];

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 py-8" role="dialog" aria-modal="true">
        <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-lg border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">
        <h1 className="text-2xl font-semibold">Signup</h1>
        <p className="mt-2 text-sm text-slate-600">
          Create the account for one role. The same email can be used again for another role.
        </p>
        <TransientNotice message={errorMessage} tone="error" />
        <SignupSsoButtons />
        <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wide text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          or
          <span className="h-px flex-1 bg-slate-200" />
        </div>
        <form action="/api/auth/signup" method="post" className="space-y-4">
          <label className="block text-sm">
            Name
            <input name="name" className="mt-1 w-full rounded-md border px-3 py-2" required />
          </label>
          <label className="block text-sm">
            Email
            <input name="email" type="email" className="mt-1 w-full rounded-md border px-3 py-2" required />
          </label>
          <label className="block text-sm">
            Role
            <select name="role" defaultValue="COMMUNITY_MEMBER" className="mt-1 w-full rounded-md border px-3 py-2">
              {roles.map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </label>
          <button className="w-full rounded-md bg-slate-900 px-4 py-2 text-white">Create account</button>
        </form>
        <p className="mt-4 text-sm">
          Already have one? <Link href="/login" className="text-blue-700">Login</Link>
        </p>
        </div>
      </div>
    </main>
  );
}

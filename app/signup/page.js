import Link from 'next/link';

const roles = ['COMMUNITY_MEMBER', 'FACILITATOR', 'ORG_MEMBER', 'RESEARCHER', 'ADMIN'];

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto max-w-md rounded-lg border bg-white p-6">
        <h1 className="text-2xl font-semibold">Signup</h1>
        <p className="mt-2 text-sm text-slate-600">
          Create the account for one role. The same email can be used again for another role.
        </p>
        <form action="/api/auth/signup" method="post" className="mt-5 space-y-4">
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
    </main>
  );
}

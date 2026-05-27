import Link from 'next/link';

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  const hasError = params?.error;

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto max-w-md rounded-lg border bg-white p-6">
        <h1 className="text-2xl font-semibold">Login</h1>
        <p className="mt-2 text-sm text-slate-600">
          Use one of the role accounts to check permissions.
        </p>
        {hasError ? <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">User not found.</p> : null}
        <form action="/api/auth/login" method="post" className="mt-5 space-y-4">
          <label className="block text-sm">
            Email
            <input
              name="email"
              type="email"
              defaultValue="admin@algostories.local"
              className="mt-1 w-full rounded-md border px-3 py-2"
              required
            />
          </label>
          <button className="w-full rounded-md bg-slate-900 px-4 py-2 text-white">Login</button>
        </form>
        <p className="mt-4 text-sm">
          No account? <Link href="/signup" className="text-blue-700">Sign up</Link>
        </p>
      </div>
    </main>
  );
}

import Link from 'next/link';
import { requireAdmin } from '../../lib/auth';

const links = [
  ['/', 'Back to AlgoStories'],
  ['/admin', 'Dashboard'],
  ['/admin/algorithms', 'Algorithms'],
  ['/admin/events', 'Events'],
  ['/admin/organizations', 'Organizations'],
  ['/admin/testimonies', 'Testimonies'],
  ['/admin/comments', 'Comments'],
  ['/admin/users', 'Users'],
];

export default async function AdminLayout({ children }) {
  const admin = await requireAdmin();

  if (!admin) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-md rounded-lg border bg-white p-6">
          <h1 className="text-2xl font-semibold">Admin login needed</h1>
          <p className="mt-2 text-sm text-slate-600">
            Log in with the admin account first: admin@algostories.local
          </p>
          <Link href="/login" className="mt-5 inline-flex min-h-11 items-center rounded-md bg-slate-900 px-4 py-2 text-white">
            Go to login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="grid min-h-screen md:grid-cols-[220px_1fr]">
        <aside className="border-r bg-white p-4 sm:p-5">
          <Link href="/" className="text-lg font-bold">AlgoHub Admin</Link>
          <p className="mt-1 text-xs text-slate-500">{admin.email}</p>
          <nav className="mt-6 grid gap-2 text-sm">
            {links.map(([href, label]) => (
              <Link key={href} href={href} className="rounded-md px-3 py-2 hover:bg-slate-100">
                {label}
              </Link>
            ))}
          </nav>
          <form action="/api/auth/logout" method="post" className="mt-6">
            <button className="min-h-11 text-sm text-slate-500">Logout</button>
          </form>
        </aside>
        <section className="overflow-x-auto p-4 sm:p-6">{children}</section>
      </div>
    </main>
  );
}

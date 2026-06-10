import Link from 'next/link';
import { requireAdmin } from '../../lib/auth';
import { AdminSidebarNav } from './AdminSidebarNav';

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
      <div className="grid min-h-screen min-w-0 md:grid-cols-[220px_1fr]">
        <aside className="min-w-0 overflow-hidden border-b bg-white p-3 sm:p-4 md:border-b-0 md:border-r md:p-5">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 md:block">
            <div>
              <Link href="/" className="inline-flex min-h-10 items-center text-lg font-bold">AlgoHub Admin</Link>
              <p className="mt-0.5 max-w-[220px] truncate text-xs text-slate-500 md:mt-1">{admin.email}</p>
            </div>
            <div className="flex min-w-0 items-center gap-2 md:mt-4 md:block">
              <Link href="/" className="inline-flex min-h-10 items-center rounded-md px-2 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-900 md:min-h-9">
                Back to AlgoStories
              </Link>
              <form action="/api/auth/logout" method="post" className="md:mt-6">
                <button className="min-h-10 rounded-md px-2 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-900 md:min-h-11">Logout</button>
              </form>
            </div>
          </div>
          <AdminSidebarNav />
        </aside>
        <section className="min-w-0 overflow-x-auto p-4 sm:p-6">{children}</section>
      </div>
    </main>
  );
}

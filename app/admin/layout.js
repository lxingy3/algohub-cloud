import Link from 'next/link';
import { requireAdmin } from '../../lib/auth';
import { AdminSidebarNav } from './AdminSidebarNav';

export default async function AdminLayout({ children }) {
  const admin = await requireAdmin();

  if (!admin) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-amber-50 to-slate-100">
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 py-8" role="dialog" aria-modal="true">
        <div className="w-full max-w-md rounded-lg border border-amber-200 bg-white p-6 shadow-2xl">
          <h1 className="text-2xl font-semibold">Admin login needed</h1>
          <p className="mt-2 text-sm text-slate-600">
            Log in with the admin account first: admin@algostories.local
          </p>
          <Link href="/login?switch=1&role=ADMIN&callbackUrl=/admin" className="mt-5 inline-flex min-h-11 items-center rounded-md bg-[#17140a] px-4 py-2 font-semibold text-amber-100 hover:bg-[#2a210b]">
            Go to login
          </Link>
        </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-amber-50 via-slate-50 to-slate-100">
      <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(51,65,85,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(51,65,85,0.14)_1px,transparent_1px)] [background-size:34px_34px]" />
      <div className="relative grid min-h-screen min-w-0 md:grid-cols-[240px_1fr]">
        <aside className="relative min-w-0 overflow-hidden border-b border-amber-300/20 bg-gradient-to-b from-[#201805] via-[#2a1e07] to-[#050505] p-3 text-white sm:p-4 md:border-b-0 md:border-r md:border-amber-300/20 md:p-5">
          <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] [background-size:34px_34px]" />
          <div className="relative flex min-w-0 flex-wrap items-center justify-between gap-2 md:block">
            <div>
              <Link href="/" className="inline-flex min-h-10 items-center text-lg font-black">
                <span>Algo</span><span className="text-amber-300">Stories</span>
              </Link>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber-200/70">Admin console</p>
              <p className="mt-1 max-w-[220px] truncate text-xs text-amber-50/60">{admin.email}</p>
            </div>
            <div className="flex min-w-0 items-center gap-2 md:mt-4 md:block">
              <Link href="/" className="inline-flex min-h-10 items-center rounded-md border border-white/15 px-3 text-sm font-semibold text-amber-50/80 hover:bg-white/10 hover:text-white">
                Back to AlgoStories
              </Link>
            </div>
          </div>
          <AdminSidebarNav />
          <form action="/api/auth/logout" method="post" className="relative mt-2 md:mt-4">
            <button className="min-h-10 rounded-md px-3 py-2 text-sm font-semibold text-amber-50/65 hover:bg-white/10 hover:text-white">
              Logout
            </button>
          </form>
        </aside>
        <section className="min-w-0 overflow-x-auto p-4 text-slate-950 sm:p-6 lg:p-7">{children}</section>
      </div>
    </main>
  );
}

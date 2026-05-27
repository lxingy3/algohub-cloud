import Link from 'next/link';

const navItems = [
  ['/', 'Home'],
  ['/algorithms', 'Algorithms'],
  ['/stories', 'Stories'],
  ['/events', 'Events'],
  ['/submit-testimony', 'Share Story'],
  ['/login', 'Login'],
  ['/admin', 'Admin'],
];

export function SiteNav({ currentUser }) {
  return (
    <header className="border-b border-amber-200/70 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="text-xl font-black tracking-tight text-slate-950">
          AlgoStories
        </Link>
        <nav className="flex flex-wrap items-center gap-2 text-sm">
          {navItems.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className={label === 'Admin'
                ? 'rounded-md bg-slate-950 px-3 py-2 font-medium text-white hover:bg-slate-800'
                : 'rounded-md border border-slate-200 bg-white px-3 py-2 font-medium text-slate-700 hover:border-amber-300 hover:text-slate-950'}
            >
              {label}
            </Link>
          ))}
          {currentUser ? (
            <form action="/api/auth/logout" method="post">
              <button className="rounded-md border border-slate-200 bg-white px-3 py-2 font-medium text-slate-500 hover:text-slate-900">
                Logout
              </button>
            </form>
          ) : null}
        </nav>
      </div>
    </header>
  );
}


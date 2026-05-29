import Link from 'next/link';

const navItems = [
  ['/', 'Home'],
  ['/algorithms', 'Algorithms'],
  ['/stories', 'Stories'],
  ['/events', 'Community Events'],
  ['/about', 'About'],
];

export function SiteNav({ currentUser }) {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white">
      <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2 md:h-16 md:flex-nowrap md:gap-4 md:px-6 md:py-0">
        <Link href="/" className="flex min-h-11 items-center gap-2">
          <img src="/newlogo.png" alt="AlgoStories Logo" className="h-8 w-auto" />
        </Link>
        <nav className="hidden items-center gap-1 text-sm md:flex">
          {navItems.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="rounded-md px-4 py-2 font-medium text-gray-800 hover:bg-gray-100"
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1 text-sm md:gap-2">
          {currentUser ? (
            <Link href="/my-stories" className="hidden rounded-md px-3 py-2 font-medium text-gray-700 hover:bg-gray-100 md:inline-flex">
              My Stories
            </Link>
          ) : null}
          <Link href="/login" className="inline-flex min-h-11 items-center rounded-md px-3 py-2 font-medium text-gray-700 hover:bg-gray-100 md:min-h-0">
            Login
          </Link>
          <Link href="/admin" className="inline-flex min-h-11 items-center rounded-md border border-gray-200 px-3 py-2 font-medium text-gray-800 hover:bg-gray-100 md:min-h-0">
            Admin
          </Link>
          {currentUser ? (
            <form action="/api/auth/logout" method="post">
              <button className="min-h-11 rounded-md px-3 py-2 font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900 md:min-h-0">
                Logout
              </button>
            </form>
          ) : null}
        </div>
        <nav className="order-3 -mx-1 flex w-full gap-1 overflow-x-auto pb-1 text-sm md:hidden">
          {navItems.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="inline-flex min-h-11 shrink-0 items-center rounded-md px-3 py-2 font-medium text-gray-800 hover:bg-gray-100"
            >
              {label}
            </Link>
          ))}
          {currentUser ? (
            <Link href="/my-stories" className="inline-flex min-h-11 shrink-0 items-center rounded-md px-3 py-2 font-medium text-gray-800 hover:bg-gray-100">
              My Stories
            </Link>
          ) : null}
        </nav>
      </div>
    </header>
  );
}

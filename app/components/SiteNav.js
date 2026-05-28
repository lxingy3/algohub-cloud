import Link from 'next/link';

const navItems = [
  ['/', 'Home'],
  ['/algorithms', 'Algorithms'],
  ['/stories', 'Stories'],
  ['/events', 'Community Events'],
  ['/#about', 'About'],
];

export function SiteNav({ currentUser }) {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-6">
        <Link href="/" className="flex items-center gap-2">
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
        <div className="flex items-center gap-2 text-sm">
          <Link href="/login" className="rounded-md px-3 py-2 font-medium text-gray-700 hover:bg-gray-100">
            Login
          </Link>
          <Link href="/admin" className="rounded-md border border-gray-200 px-3 py-2 font-medium text-gray-800 hover:bg-gray-100">
            Admin
          </Link>
          {currentUser ? (
            <form action="/api/auth/logout" method="post">
              <button className="rounded-md px-3 py-2 font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900">
                Logout
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </header>
  );
}

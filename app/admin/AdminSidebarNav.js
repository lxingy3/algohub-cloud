'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  ['/admin', 'Dashboard'],
  ['/admin/algorithms', 'Algorithms'],
  ['/admin/events', 'Events'],
  ['/admin/organizations', 'Organizations'],
  ['/admin/testimonies', 'Testimonies'],
  ['/admin/comments', 'Comments'],
  ['/admin/users', 'Users'],
];

export function AdminSidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="scrollbar-none mt-4 flex max-w-full gap-2 overflow-x-auto text-sm [-webkit-overflow-scrolling:touch] md:mt-6 md:grid md:overflow-visible">
      {links.map(([href, label]) => {
        const active = href === '/admin' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={`inline-flex min-h-10 shrink-0 items-center rounded-md px-3 py-2 hover:bg-slate-100 md:min-h-0 ${active ? 'bg-slate-900 font-semibold text-white hover:bg-slate-800' : 'text-slate-800'}`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

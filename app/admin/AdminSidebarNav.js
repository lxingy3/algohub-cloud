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
    <nav className="mt-6 grid gap-2 text-sm">
      {links.map(([href, label]) => {
        const active = href === '/admin' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={`rounded-md px-3 py-2 hover:bg-slate-100 ${active ? 'bg-slate-900 font-semibold text-white hover:bg-slate-800' : 'text-slate-800'}`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, CalendarDays, Database, FileCheck2, LayoutDashboard, MessageSquareText, MessagesSquare, Users } from 'lucide-react';

const links = [
  ['/admin', 'Dashboard', LayoutDashboard],
  ['/admin/algorithms', 'Algorithms', Database],
  ['/admin/events', 'Events', CalendarDays],
  ['/admin/organizations', 'Organizations', Building2],
  ['/admin/testimonies', 'Testimonies', MessageSquareText],
  ['/admin/briefings', 'Briefings', FileCheck2],
  ['/admin/comments', 'Comments', MessagesSquare],
  ['/admin/users', 'Users', Users],
];

export function AdminSidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="mt-4 flex max-w-full flex-wrap gap-2 text-sm md:mt-6 md:grid">
      {links.map(([href, label, Icon]) => {
        const active = href === '/admin' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md px-3 py-2 font-semibold transition-colors md:min-h-10 ${active ? 'bg-amber-300 text-slate-950 shadow-sm hover:bg-amber-200' : 'text-amber-50/75 hover:bg-white/10 hover:text-white'}`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

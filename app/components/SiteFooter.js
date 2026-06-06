import Link from 'next/link';
import { Database } from 'lucide-react';

const footerLinks = [
  ['/', 'Home'],
  ['/algorithms', 'Algorithms'],
  ['/stories', 'Stories'],
  ['/events', 'Community Events'],
  ['/about', 'About'],
];

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-auto overflow-hidden border-t border-yellow-400/20 bg-gradient-to-r from-[#1a1404] via-[#2a1e07] to-[#050505] py-8 text-white">
      <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] [background-size:34px_34px]" />
      <div className="mx-auto max-w-6xl px-6">
        <div className="relative flex flex-col items-center justify-between gap-6 md:flex-row">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-bold">
              <Database className="h-5 w-5 text-yellow-300" />
              AlgoStories
            </h3>
            <p className="mt-1 text-sm text-yellow-100/75">
              Transparency in automated decision-making
            </p>
          </div>
          <nav className="flex flex-wrap justify-center gap-6">
            {footerLinks.map(([href, label]) => (
              <Link key={href} href={href} className="text-sm text-yellow-100/75 transition-colors hover:text-yellow-200">
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="relative mt-6 border-t border-yellow-400/20 pt-6 text-center text-sm text-yellow-100/55">
          © {year} AlgoStories. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

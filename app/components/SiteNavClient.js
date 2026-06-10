'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from './LanguageSelector';
import { LoginModal } from './LoginModal';

const navItems = [
  ['/', 'nav.home'],
  ['/algorithms', 'nav.algorithms'],
  ['/stories', 'nav.stories'],
  ['/events', 'nav.events'],
  ['/about', 'nav.about'],
];

export function SiteNavClient({ isLoggedIn, enabledSsoProviders = [] }) {
  const { t } = useTranslation();
  const [loginOpen, setLoginOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white">
      <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-2 px-3 py-2 sm:px-4 md:h-16 md:flex-nowrap md:gap-4 md:px-6 md:py-0">
        <Link href="/" className="flex min-h-11 items-center gap-2">
          <img src="/newlogo.png" alt="AlgoStories Logo" className="h-7 w-auto sm:h-8" />
        </Link>
        <nav className="hidden items-center gap-1 text-sm md:flex">
          {navItems.map(([href, label]) => (
            <Link key={href} href={href} className="rounded-md px-4 py-2 font-medium text-gray-800 hover:bg-gray-100">
              {t(label)}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1 text-sm md:gap-2">
          <LanguageSelector />
          {isLoggedIn ? (
            <Link href="/my-stories" className="hidden rounded-md px-3 py-2 font-medium text-gray-700 hover:bg-gray-100 md:inline-flex">
              {t('nav.myStories')}
            </Link>
          ) : null}
          {!isLoggedIn ? (
            <button type="button" onClick={() => setLoginOpen(true)} className="inline-flex min-h-11 items-center rounded-md px-2 py-2 font-medium text-gray-700 hover:bg-gray-100 sm:px-3 md:min-h-0">
              {t('nav.login')}
            </button>
          ) : null}
          <Link href="/admin" className="inline-flex min-h-11 items-center rounded-md border border-gray-200 px-2 py-2 font-medium text-gray-800 hover:bg-gray-100 sm:px-3 md:min-h-0">
            {t('nav.admin')}
          </Link>
          {isLoggedIn ? (
            <form action="/api/auth/logout" method="post">
              <button className="min-h-11 rounded-md px-3 py-2 font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900 md:min-h-0">
                {t('nav.logout')}
              </button>
            </form>
          ) : null}
        </div>
        <nav className="scrollbar-none order-3 -mx-1 flex w-full gap-1 overflow-x-auto pb-1 text-sm [-webkit-overflow-scrolling:touch] md:hidden">
          {navItems.map(([href, label]) => (
            <Link key={href} href={href} className="inline-flex min-h-11 shrink-0 items-center rounded-md px-3 py-2 font-medium text-gray-800 hover:bg-gray-100">
              {t(label)}
            </Link>
          ))}
          {isLoggedIn ? (
            <Link href="/my-stories" className="inline-flex min-h-11 shrink-0 items-center rounded-md px-3 py-2 font-medium text-gray-800 hover:bg-gray-100">
              {t('nav.myStories')}
            </Link>
          ) : null}
        </nav>
      </div>
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} enabledSsoProviders={enabledSsoProviders} />
    </header>
  );
}

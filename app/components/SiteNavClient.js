'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from './LanguageSelector';
import { IdleLogoutManager } from './IdleLogoutManager';
import { LoginModal } from './LoginModal';
import { SignupModal } from './SignupModal';
import { SetPasswordModal } from './SetPasswordModal';

const navItems = [
  ['/', 'nav.home'],
  ['/algorithms', 'nav.algorithms'],
  ['/briefings', 'Briefings', true],
  ['/stories', 'nav.stories'],
  ['/events', 'nav.events'],
  ['/about', 'nav.about'],
];

const passwordReminderPrefix = 'algohub_password_setup_later:';

const loginErrors = {
  'not-found': 'No account was found for that email.',
  'invalid-password': 'The password is incorrect.',
  'password-not-set': 'This account does not have a password yet. For this test phase, leave the password blank or use social login, then set a password after login.',
};

const signupErrors = {
  'account-exists': 'This email already has an account. Please log in with the existing account.',
  'name-conflict': 'This email already belongs to another user name. Use the existing account.',
  'password-too-short': 'Password must be at least 8 characters.',
  'password-too-long': 'Password must be no more than 128 characters.',
  'password-mismatch': 'Passwords do not match.',
  'invalid-email': 'Enter a valid email address.',
  'invalid-name': 'Enter a name shorter than 256 characters.',
};

const profileErrors = {
  'name-required': 'Enter the name you want to use on AlgoStories.',
  'auth-required': 'Sign in with Google again to finish setup.',
  'account-exists': 'This email already has an account. Please log in with the existing account.',
};

export function SiteNavClient({ isLoggedIn, isAdmin, currentUserId = '', needsPasswordSetup = false, pendingSsoEmail = '' }) {
  const { t } = useTranslation();
  const [authModal, setAuthModal] = useState(null);
  const [loginConfig, setLoginConfig] = useState({ role: undefined, callbackUrl: undefined });
  const [loginErrorMessage, setLoginErrorMessage] = useState('');
  const [signupErrorMessage, setSignupErrorMessage] = useState('');
  const [profileErrorMessage, setProfileErrorMessage] = useState('');
  const [profileReturnTo, setProfileReturnTo] = useState('/');
  const [passwordReminderOpen, setPasswordReminderOpen] = useState(false);
  const [resetToken, setResetToken] = useState('');

  function openLogin(config = {}) {
    setLoginConfig(config);
    setLoginErrorMessage(config.errorMessage || '');
    setAuthModal('login');
  }

  useEffect(() => {
    const url = new URL(window.location.href);
    const requestedModal = url.searchParams.get('authModal');
    const shouldOpenLogin = requestedModal === 'login' || url.searchParams.has('authError');
    const shouldOpenSignup = requestedModal === 'signup' || url.searchParams.has('signupError');
    const shouldOpenResetPassword = requestedModal === 'reset-password';
    const shouldOpenCompleteProfile = requestedModal === 'complete-profile';
    if (!shouldOpenLogin && !shouldOpenSignup && !shouldOpenResetPassword && !shouldOpenCompleteProfile) return;

    const error = url.searchParams.get('authError');
    const signupError = url.searchParams.get('signupError');
    const profileError = url.searchParams.get('profileError');
    const role = url.searchParams.get('role');
    const reset = url.searchParams.get('resetToken') || '';
    url.searchParams.delete('authModal');
    url.searchParams.delete('authError');
    url.searchParams.delete('signupError');
    url.searchParams.delete('profileError');
    url.searchParams.delete('role');
    url.searchParams.delete('resetToken');
    const cleanReturnTo = `${url.pathname}${url.search}${url.hash}`;
    if (shouldOpenCompleteProfile && isLoggedIn) {
      setAuthModal(null);
    } else if (shouldOpenCompleteProfile) {
      setProfileReturnTo(cleanReturnTo || '/');
      setProfileErrorMessage(profileErrors[profileError] || '');
      setAuthModal('complete-profile');
    } else if (shouldOpenResetPassword) {
      setResetToken(reset);
      setAuthModal('reset-password');
    } else if (shouldOpenSignup) {
      setSignupErrorMessage(signupErrors[signupError] || '');
      setAuthModal('signup');
    } else {
      openLogin({
        role,
        callbackUrl: cleanReturnTo,
        errorMessage: loginErrors[error] || (error ? 'Try signing in with a different account.' : ''),
      });
    }
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }, []);

  useEffect(() => {
    if (!needsPasswordSetup || !currentUserId) {
      setPasswordReminderOpen(false);
      return;
    }
    const dismissed = window.sessionStorage.getItem(`${passwordReminderPrefix}${currentUserId}`);
    if (!dismissed) setPasswordReminderOpen(true);
  }, [currentUserId, needsPasswordSetup]);

  function dismissPasswordReminder() {
    if (currentUserId) window.sessionStorage.setItem(`${passwordReminderPrefix}${currentUserId}`, '1');
    setPasswordReminderOpen(false);
  }

  function clearPasswordReminderDismissals() {
    for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
      const key = window.sessionStorage.key(index);
      if (key?.startsWith(passwordReminderPrefix)) window.sessionStorage.removeItem(key);
    }
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white">
        <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-2 px-3 py-2 sm:px-4 md:h-16 md:flex-nowrap md:gap-4 md:px-6 md:py-0">
          <Link href="/" className="flex min-h-11 items-center gap-2">
            <img src="/newlogo.png" alt="AlgoStories Logo" className="h-7 w-auto sm:h-8" />
          </Link>
          <nav className="hidden items-center gap-1 text-sm md:flex">
            {navItems.map(([href, label, literal]) => (
              <Link key={href} href={href} data-no-i18n className="rounded-md px-4 py-2 font-medium text-gray-800 hover:bg-gray-100">
                {literal ? label : t(label)}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-1 text-sm md:gap-2">
            <LanguageSelector />
            {isLoggedIn ? (
              <Link href="/my-stories" data-no-i18n className="hidden rounded-md px-3 py-2 font-medium text-gray-700 hover:bg-gray-100 md:inline-flex">
                {t('nav.myStories')}
              </Link>
            ) : null}
            {!isLoggedIn ? (
              <button type="button" onClick={() => openLogin()} data-no-i18n className="inline-flex min-h-11 items-center rounded-md px-2 py-2 font-medium text-gray-700 hover:bg-gray-100 sm:px-3 md:min-h-0">
                {t('nav.login')}
              </button>
            ) : null}
            {isAdmin ? (
              <Link href="/admin" data-no-i18n className="inline-flex min-h-11 items-center rounded-md border border-gray-200 px-2 py-2 font-medium text-gray-800 hover:bg-gray-100 sm:px-3 md:min-h-0">
                {t('nav.admin')}
              </Link>
            ) : null}
            {isLoggedIn ? (
              <form action="/api/auth/logout" method="post">
                <button onClick={clearPasswordReminderDismissals} data-no-i18n className="min-h-11 rounded-md px-3 py-2 font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900 md:min-h-0">
                  {t('nav.logout')}
                </button>
              </form>
            ) : null}
          </div>
          <nav className="order-3 flex w-full flex-wrap gap-1 pb-1 text-sm md:hidden">
            {navItems.map(([href, label, literal]) => (
              <Link key={href} href={href} data-no-i18n className="inline-flex min-h-11 shrink-0 items-center rounded-md px-3 py-2 font-medium text-gray-800 hover:bg-gray-100">
                {literal ? label : t(label)}
              </Link>
            ))}
            {isLoggedIn ? (
              <Link href="/my-stories" data-no-i18n className="inline-flex min-h-11 shrink-0 items-center rounded-md px-3 py-2 font-medium text-gray-800 hover:bg-gray-100">
                {t('nav.myStories')}
              </Link>
            ) : null}
          </nav>
        </div>
      </header>
      <LoginModal
        key={`${loginConfig.role || 'default'}-${loginConfig.callbackUrl || 'current'}`}
        open={authModal === 'login'}
        onClose={() => setAuthModal(null)}
        onSignup={() => {
          setSignupErrorMessage('');
          setAuthModal('signup');
        }}
        error={Boolean(loginErrorMessage)}
        errorMessage={loginErrorMessage}
        initialRole={loginConfig.role}
        initialCallbackUrl={loginConfig.callbackUrl}
      />
      <SignupModal
        open={authModal === 'signup'}
        onClose={() => setAuthModal(null)}
        onLogin={() => {
          setSignupErrorMessage('');
          openLogin();
        }}
        errorMessage={signupErrorMessage}
      />
      <CompleteProfileModal
        open={authModal === 'complete-profile'}
        email={pendingSsoEmail}
        returnTo={profileReturnTo}
        errorMessage={profileErrorMessage}
      />
      <PasswordSetupReminderModal
        open={passwordReminderOpen && authModal === null}
        onLater={dismissPasswordReminder}
        onSetPassword={() => {
          setPasswordReminderOpen(false);
          setAuthModal('set-password');
        }}
      />
      <SetPasswordModal
        open={authModal === 'set-password' || authModal === 'reset-password'}
        onClose={() => setAuthModal(null)}
        onSaved={() => {
          setResetToken('');
          setAuthModal(null);
          window.location.reload();
        }}
        resetToken={authModal === 'reset-password' ? resetToken : ''}
      />
      <IdleLogoutManager isLoggedIn={isLoggedIn} />
    </>
  );
}

function CompleteProfileModal({ open, email, returnTo, errorMessage }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 py-8" role="dialog" aria-modal="true" aria-labelledby="complete-profile-title">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-2xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">Account setup</p>
        <h1 id="complete-profile-title" className="mt-2 text-2xl font-semibold text-slate-950">Choose your display name</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {email ? `Google verified ${email}. Pick the name that should appear with your AlgoStories account.` : 'Sign in again to finish setup.'}
        </p>
        {errorMessage ? <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{errorMessage}</p> : null}
        <form action="/api/auth/complete-profile" method="post" className="mt-5 space-y-4">
          <input type="hidden" name="returnTo" value={returnTo || '/'} />
          <label className="block text-sm font-medium text-slate-700">
            Display name
            <input
              name="name"
              type="text"
              minLength={2}
              maxLength={120}
              autoComplete="name"
              className="mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
              required
            />
          </label>
          <button className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800">
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}

function PasswordSetupReminderModal({ open, onLater, onSetPassword }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="password-reminder-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onLater?.();
      }}
    >
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-2xl">
        <h1 id="password-reminder-title" className="text-2xl font-semibold text-slate-950">Your account does not have a password yet</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          This account is still using the temporary no-password test login. Set a password to make it safer before production use.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={onSetPassword} className="inline-flex min-h-11 items-center justify-center rounded-md bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800">
            Set password
          </button>
          <button type="button" onClick={onLater} className="inline-flex min-h-11 items-center justify-center rounded-md border border-slate-300 px-4 py-2 font-semibold text-slate-800 hover:bg-slate-50">
            Later
          </button>
        </div>
      </div>
    </div>
  );
}

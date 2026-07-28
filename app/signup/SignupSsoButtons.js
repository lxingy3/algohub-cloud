'use client';

import { signIn } from 'next-auth/react';
import { Github } from 'lucide-react';
import { withCompleteProfileModal } from '../../lib/safeRedirect';

const providers = [
  { id: 'google', label: 'Google', icon: 'G' },
  { id: 'microsoft-entra-id', label: 'Microsoft', icon: 'M' },
  { id: 'github', label: 'GitHub', icon: null },
];

export function SignupSsoButtons() {
  async function startSso(providerId) {
    const returnTo = `${window.location.pathname}${window.location.search}`;
    await fetch('/api/auth/sso-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'COMMUNITY_MEMBER',
        returnTo,
      }),
    });
    await signIn(providerId, { callbackUrl: withCompleteProfileModal(returnTo) });
  }

  return (
    <div className="mt-5 space-y-3">
      <div className="grid gap-2">
        {providers.map((provider) => (
          <button
            key={provider.id}
            type="button"
            onClick={() => startSso(provider.id)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
          >
            {provider.id === 'github' ? <Github className="h-4 w-4" /> : <span className="font-bold">{provider.icon}</span>}
            Continue with {provider.label}
          </button>
        ))}
      </div>
      <p className="text-xs leading-5 text-slate-500">
        After your provider verifies the account, choose the display name used on AlgoStories.
      </p>
    </div>
  );
}

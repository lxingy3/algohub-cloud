'use client';

import { signIn } from 'next-auth/react';
import { Github } from 'lucide-react';
import { useState } from 'react';

const providers = [
  { id: 'google', label: 'Google', icon: 'G' },
  { id: 'microsoft-entra-id', label: 'Microsoft', icon: 'M' },
  { id: 'github', label: 'GitHub', icon: null },
];

export function SignupSsoButtons() {
  const [displayName, setDisplayName] = useState('');

  async function startSso(providerId) {
    await fetch('/api/auth/sso-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'COMMUNITY_MEMBER', displayName }),
    });
    await signIn(providerId, { callbackUrl: '/' });
  }

  return (
    <div className="mt-5 space-y-3">
      <label className="block text-sm font-medium text-slate-700">
        Display name
        <input
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="Use the name from your SSO account"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
        />
      </label>
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
        Leave display name blank to use the name from your SSO account. Social signup creates a community member account.
      </p>
    </div>
  );
}

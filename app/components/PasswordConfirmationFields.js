'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';

export function PasswordConfirmationFields({ minLength = 8 }) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const passwordCharacters = Array.from(password);
  const confirmationCharacters = Array.from(confirmation);
  const matches = password.length > 0 && password === confirmation;
  const finishedMismatch = confirmation.length >= password.length && !matches;

  return (
    <>
      <label className="block text-sm font-medium text-slate-700">
        Password
        <div className="relative mt-1 overflow-hidden rounded-md">
          <div className="pointer-events-none absolute inset-y-0 left-3 z-0 flex items-center" aria-hidden="true">
            {passwordCharacters.map((character, index) => {
              const compared = index < confirmationCharacters.length;
              const state = !compared ? 'pending' : confirmationCharacters[index] === character ? 'match' : 'mismatch';
              return (
                <span
                  key={`${index}-${character}`}
                  data-match-state={state}
                  className={`h-7 w-[15px] transition-all duration-300 ease-out ${
                    state === 'match'
                      ? 'scale-y-100 bg-emerald-200'
                      : state === 'mismatch'
                        ? 'scale-y-100 bg-rose-200'
                        : 'scale-y-0 bg-transparent'
                  } ${index === 0 ? 'rounded-l-md' : ''} ${index === Math.min(confirmationCharacters.length, passwordCharacters.length) - 1 ? 'rounded-r-md' : ''}`}
                />
              );
            })}
          </div>
          <input
            name="password"
            type="password"
            minLength={minLength}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="relative z-10 min-h-11 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 font-mono tracking-[0.32em] text-slate-950 outline-none transition-shadow focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
            required
          />
        </div>
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Confirm password
        <div className="relative mt-1">
          <input
            name="confirmPassword"
            type="password"
            minLength={minLength}
            autoComplete="new-password"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            aria-describedby="password-match-status"
            className={`min-h-11 w-full rounded-md border bg-white px-3 py-2 pr-12 font-mono tracking-[0.32em] text-slate-950 outline-none transition-all duration-300 focus:ring-2 ${
              matches
                ? 'border-emerald-400 focus:border-emerald-500 focus:ring-emerald-100'
                : finishedMismatch
                  ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100'
                  : 'border-slate-300 focus:border-amber-500 focus:ring-amber-200'
            }`}
            required
          />
          <span
            aria-label={matches ? 'Passwords match' : undefined}
            className={`pointer-events-none absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-emerald-200 text-emerald-800 transition-all duration-300 ease-out ${
              matches ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
            }`}
          >
            <Check className="h-4 w-4" />
          </span>
        </div>
      </label>
      <span id="password-match-status" className="sr-only" aria-live="polite">
        {matches ? 'Passwords match.' : finishedMismatch ? 'Passwords do not match.' : ''}
      </span>
    </>
  );
}

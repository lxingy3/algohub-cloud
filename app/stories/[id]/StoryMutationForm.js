'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

export function StoryMutationForm({ action, children, className = '', resetOnSuccess = false }) {
  const router = useRouter();
  const pendingRef = useRef(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    if (pendingRef.current) return;

    const form = event.currentTarget;
    pendingRef.current = true;
    setIsPending(true);
    setError('');

    try {
      const response = await fetch(action, {
        method: 'POST',
        headers: { 'x-story-mutation': 'true' },
        body: new FormData(form),
      });
      const responseUrl = new URL(response.url, window.location.origin);

      if (response.redirected && responseUrl.pathname !== window.location.pathname) {
        window.location.assign(responseUrl.href);
        return;
      }

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error || 'This action could not be completed. Please try again.');
      }

      if (resetOnSuccess) form.reset();
      router.refresh();
    } catch (submitError) {
      setError(submitError.message || 'This action could not be completed. Please try again.');
    } finally {
      pendingRef.current = false;
      setIsPending(false);
    }
  }

  return (
    <form
      action={action}
      method="post"
      className={className}
      aria-busy={isPending}
      data-story-mutation="true"
      onSubmit={handleSubmit}
    >
      {children}
      {error ? <p role="alert" className="mt-2 text-sm text-red-700">{error}</p> : null}
    </form>
  );
}

'use client';

import { useEffect, useState } from 'react';

export function TransientNotice({ message, tone = 'info' }) {
  const [visible, setVisible] = useState(Boolean(message));

  useEffect(() => {
    setVisible(Boolean(message));
    if (!message) return undefined;

    const timer = window.setTimeout(() => setVisible(false), 4500);
    return () => window.clearTimeout(timer);
  }, [message]);

  if (!message || !visible) return null;

  const className =
    tone === 'error'
      ? 'border-red-200 bg-red-50 text-red-700'
      : 'border-emerald-200 bg-emerald-50 text-emerald-800';

  return (
    <div className={`mt-4 rounded-md border p-3 text-sm ${className}`} role="status">
      {message}
    </div>
  );
}

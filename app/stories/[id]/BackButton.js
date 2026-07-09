'use client';

import { ArrowLeft } from 'lucide-react';

export function BackButton() {
  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) {
          window.history.back();
          return;
        }
        window.location.href = '/stories';
      }}
      className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900"
    >
      <ArrowLeft className="h-4 w-4" />
      Back
    </button>
  );
}

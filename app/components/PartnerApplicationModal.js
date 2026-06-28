'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, X } from 'lucide-react';

export function PartnerApplicationModal({ status }) {
  const [open, setOpen] = useState(status === 'missing');

  useEffect(() => {
    if (status === 'missing') setOpen(true);
  }, [status]);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') setOpen(false);
    }

    if (open) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', onKeyDown);
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center rounded-md bg-gray-900 px-5 text-sm font-semibold text-white hover:bg-gray-800"
      >
        Apply to partner
        <ArrowRight className="ml-2 h-4 w-4" />
      </button>

      {status === 'submitted' ? (
        <p className="mt-4 max-w-xl rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
          Application submitted. The project team will review it.
        </p>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 px-4 py-6" role="dialog" aria-modal="true" aria-labelledby="partner-application-title">
          <button type="button" aria-label="Close partner application" className="fixed inset-0 cursor-default" onClick={() => setOpen(false)} />
          <form id="partner-application" action="/api/partners/apply" method="post" className="relative w-full max-w-lg rounded-lg border border-amber-200 bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 id="partner-application-title" className="text-xl font-bold text-gray-900">Partner application</h3>
                <p className="mt-2 text-sm leading-6 text-gray-600">Tell us how your organization would like to support community story collection, outreach, or review.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-md border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 hover:text-gray-900" aria-label="Close partner application">
                <X className="h-4 w-4" />
              </button>
            </div>

            {status === 'missing' ? (
              <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">Please complete organization name, contact email, and message.</p>
            ) : null}

            <div className="mt-5 space-y-3">
              <input name="organizationName" placeholder="Organization name" className="min-h-11 w-full rounded-md border border-gray-200 px-3 py-2 text-sm" required />
              <input name="contactName" placeholder="Contact name" className="min-h-11 w-full rounded-md border border-gray-200 px-3 py-2 text-sm" />
              <input name="contactEmail" type="email" placeholder="Contact email" className="min-h-11 w-full rounded-md border border-gray-200 px-3 py-2 text-sm" required />
              <input name="websiteUrl" type="url" placeholder="Website" className="min-h-11 w-full rounded-md border border-gray-200 px-3 py-2 text-sm" />
              <textarea name="message" rows={4} placeholder="How would you like to work with AlgoStories?" className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm" required />
              <button className="min-h-11 w-full rounded-md bg-yellow-500 px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-yellow-400">
                Submit application
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}

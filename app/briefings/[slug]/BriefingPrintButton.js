'use client';

import { Download, Loader2 } from 'lucide-react';
import { useState } from 'react';

export function BriefingPrintButton({ briefing }) {
  const [status, setStatus] = useState('idle');

  const downloadPdf = async () => {
    setStatus('loading');
    try {
      const { briefingPdfFilename, createBriefingPdf } = await import('./briefingPdf');
      createBriefingPdf(briefing).save(briefingPdfFilename(briefing.slug));
      setStatus('idle');
    } catch (error) {
      console.error('Briefing PDF export failed', error);
      setStatus('error');
    }
  };

  const loading = status === 'loading';
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <button
        type="button"
        onClick={downloadPdf}
        disabled={loading}
        aria-label={`Download PDF for ${briefing.title}`}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-amber-300 px-4 text-sm font-bold text-slate-950 shadow-sm transition hover:bg-amber-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 disabled:cursor-wait disabled:opacity-70"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
        {loading ? 'Building PDF…' : 'Download PDF'}
      </button>
      {status === 'error' ? (
        <p role="alert" className="basis-full text-right text-xs font-semibold text-red-300">
          PDF export failed. Please try again.
        </p>
      ) : null}
    </div>
  );
}

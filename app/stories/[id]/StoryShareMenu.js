'use client';

import { useEffect, useMemo, useState } from 'react';
import { Copy, Share2, Twitter } from 'lucide-react';

export function StoryShareMenu({ title }) {
  const [shareUrl, setShareUrl] = useState('');
  const [copyLabel, setCopyLabel] = useState('Copy link');

  useEffect(() => {
    setShareUrl(window.location.href);
  }, []);

  const shareLinks = useMemo(() => {
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedTitle = encodeURIComponent(`${title} - AlgoStories`);
    return {
      x: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    };
  }, [shareUrl, title]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyLabel('Link copied');
      setTimeout(() => setCopyLabel('Copy link'), 1800);
    } catch {
      setCopyLabel('Copy failed');
      setTimeout(() => setCopyLabel('Copy link'), 1800);
    }
  };

  return (
    <details className="relative">
      <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-gray-600 hover:border-amber-300 [&::-webkit-details-marker]:hidden">
        <Share2 className="h-4 w-4 text-amber-600" />
        Share
      </summary>
      <div className="absolute left-0 top-full z-30 mt-2 w-48 overflow-hidden rounded-md border border-slate-200 bg-white py-1 text-sm shadow-lg" role="menu">
        <button type="button" onClick={copyLink} className="flex w-full items-center px-3 py-2 text-left text-slate-700 hover:bg-slate-50" role="menuitem">
          <Copy className="mr-2 h-4 w-4" />
          {copyLabel}
        </button>
        <a href={shareLinks.x} target="_blank" rel="noopener noreferrer" className="flex items-center px-3 py-2 text-slate-700 hover:bg-slate-50" role="menuitem">
          <Twitter className="mr-2 h-4 w-4" />
          Share on X
        </a>
        <a href={shareLinks.facebook} target="_blank" rel="noopener noreferrer" className="flex items-center px-3 py-2 text-slate-700 hover:bg-slate-50" role="menuitem">
          <FacebookIcon />
          Share on Facebook
        </a>
        <a href={shareLinks.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center px-3 py-2 text-slate-700 hover:bg-slate-50" role="menuitem">
          <LinkedInIcon />
          Share on LinkedIn
        </a>
      </div>
    </details>
  );
}

function FacebookIcon() {
  return (
    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

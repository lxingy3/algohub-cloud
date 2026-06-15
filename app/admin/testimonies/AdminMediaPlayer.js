'use client';

import { useEffect, useRef, useState } from 'react';

export default function AdminMediaPlayer({ sources }) {
  if (!sources?.length) return null;

  return (
    <div className="space-y-3">
      {sources.map((source) => (
        <MediaItem key={`${source.url}-${source.kind}`} source={source} />
      ))}
    </div>
  );
}

function MediaItem({ source }) {
  const mediaRef = useRef(null);
  const [objectUrl, setObjectUrl] = useState('');
  const [error, setError] = useState('');
  const mediaUrl = source.directUrl || objectUrl;

  useEffect(() => {
    if (source.directUrl) {
      setError('');
      setObjectUrl('');
      return undefined;
    }

    const controller = new AbortController();
    let nextObjectUrl = '';

    async function loadMedia() {
      setError('');
      setObjectUrl('');
      try {
        const response = await fetch(source.url, {
          credentials: 'include',
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Media request failed: ${response.status}`);
        const blob = await response.blob();
        nextObjectUrl = URL.createObjectURL(blob);
        setObjectUrl(nextObjectUrl);
      } catch (loadError) {
        if (loadError.name !== 'AbortError') setError('Media could not be loaded.');
      }
    }

    loadMedia();

    return () => {
      controller.abort();
      if (nextObjectUrl) URL.revokeObjectURL(nextObjectUrl);
    };
  }, [source.directUrl, source.url]);

  function pauseOtherMedia() {
    document.querySelectorAll('audio, video').forEach((element) => {
      if (element !== mediaRef.current) element.pause();
    });
  }

  if (error) {
    return <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>;
  }

  if (!mediaUrl) {
    return <p className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">Loading media...</p>;
  }

  if (source.kind === 'video') {
    return (
      <video
        ref={mediaRef}
        className="mt-3 max-h-96 w-full rounded-md border bg-black object-contain"
        src={mediaUrl}
        controls
        preload="metadata"
        onPlay={pauseOtherMedia}
      >
        Your browser does not support video playback.
      </video>
    );
  }

  return (
    <audio ref={mediaRef} className="mt-3 w-full" src={mediaUrl} controls preload="metadata" onPlay={pauseOtherMedia}>
      Your browser does not support audio playback.
    </audio>
  );
}

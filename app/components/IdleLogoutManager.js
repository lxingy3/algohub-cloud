'use client';

import { useEffect, useState } from 'react';

const IDLE_LIMIT_MS = 60 * 60 * 1000;
const DRAFT_KEY = 'algohub_auto_logout_draft';
const RESTORE_KEY = 'algohub_restore_auto_logout_draft';
const activityEvents = ['pointerdown', 'keydown', 'scroll', 'touchstart'];

export function IdleLogoutManager({ isLoggedIn }) {
  const [draft, setDraft] = useState(null);

  useEffect(() => {
    if (!isLoggedIn) return;
    const savedDraft = readDraft();
    if (savedDraft) setDraft(savedDraft);
  }, [isLoggedIn]);

  useEffect(() => {
    restorePendingDraft();
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return undefined;

    let timer;
    const resetTimer = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const currentDraft = collectDraft();
        if (currentDraft) localStorage.setItem(DRAFT_KEY, JSON.stringify(currentDraft));
        void fetch('/api/auth/logout', { method: 'POST', keepalive: true }).finally(() => {
          window.location.assign('/');
        });
      }, IDLE_LIMIT_MS);
    };

    resetTimer();
    activityEvents.forEach((eventName) => window.addEventListener(eventName, resetTimer, { passive: true }));

    return () => {
      window.clearTimeout(timer);
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, resetTimer));
    };
  }, [isLoggedIn]);

  if (!isLoggedIn || !draft) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="idle-draft-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setDraft(null);
      }}
    >
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-2xl">
        <h2 id="idle-draft-title" className="text-xl font-semibold text-slate-950">Unsaved work found</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          You were logged out after one hour of inactivity. We saved the editing context from your last session.
        </p>
        <p className="mt-3 truncate rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">{draft.url}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              sessionStorage.setItem(RESTORE_KEY, JSON.stringify(draft));
              localStorage.removeItem(DRAFT_KEY);
              window.location.assign(draft.url || '/');
            }}
            className="inline-flex min-h-11 items-center rounded-md bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800"
          >
            Resume
          </button>
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem(DRAFT_KEY);
              setDraft(null);
            }}
            className="inline-flex min-h-11 items-center rounded-md border border-slate-300 px-4 py-2 font-semibold text-slate-800 hover:bg-slate-50"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

function readDraft() {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
  } catch {
    return null;
  }
}

function collectDraft() {
  const fields = [];
  document.querySelectorAll('input, textarea, select').forEach((field) => {
    if (!field.name || field.type === 'hidden' || field.type === 'button' || field.type === 'submit') return;
    const value = field.type === 'checkbox' || field.type === 'radio' ? field.checked : field.value;
    const initialValue = field.type === 'checkbox' || field.type === 'radio' ? field.defaultChecked : field.defaultValue;
    const hasChanged = value !== initialValue;
    const hasValue = typeof value === 'boolean' ? value : String(value || '').trim().length > 0;
    if (!hasChanged && !hasValue) return;
    fields.push({ name: field.name, type: field.type, value });
  });

  if (!fields.length) return null;

  return {
    url: `${window.location.pathname}${window.location.search}${window.location.hash}`,
    title: document.title,
    savedAt: new Date().toISOString(),
    fields,
  };
}

function restorePendingDraft() {
  let draft;
  try {
    draft = JSON.parse(sessionStorage.getItem(RESTORE_KEY) || 'null');
  } catch {
    draft = null;
  }
  if (!draft || draft.url !== `${window.location.pathname}${window.location.search}${window.location.hash}`) return;

  window.setTimeout(() => {
    for (const item of draft.fields || []) {
      const field = document.querySelector(`[name="${CSS.escape(item.name)}"]`);
      if (!field) continue;
      if (field.type === 'checkbox' || field.type === 'radio') {
        field.checked = Boolean(item.value);
      } else {
        field.value = item.value;
      }
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
    }
    sessionStorage.removeItem(RESTORE_KEY);
  }, 500);
}

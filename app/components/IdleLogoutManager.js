'use client';

import { useEffect, useState } from 'react';
import {
  idleDraftKey,
  idleRestoreKey,
  isDraftableField,
  isOwnedDraft,
  LEGACY_IDLE_DRAFT_KEY,
  LEGACY_IDLE_RESTORE_KEY,
} from '../../lib/idleDraft';

const IDLE_LIMIT_MS = 60 * 60 * 1000;
const activityEvents = ['pointerdown', 'keydown', 'scroll', 'touchstart'];

export function IdleLogoutManager({ isLoggedIn, currentUserId }) {
  const [draft, setDraft] = useState(null);
  const draftKey = idleDraftKey(currentUserId);
  const restoreKey = idleRestoreKey(currentUserId);

  useEffect(() => {
    localStorage.removeItem(LEGACY_IDLE_DRAFT_KEY);
    sessionStorage.removeItem(LEGACY_IDLE_RESTORE_KEY);
  }, []);

  useEffect(() => {
    if (!isLoggedIn || !draftKey || !currentUserId) return;
    const savedDraft = readDraft(draftKey, currentUserId);
    if (savedDraft) setDraft(savedDraft);
  }, [currentUserId, draftKey, isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn || !restoreKey || !currentUserId) return;
    restorePendingDraft(restoreKey, currentUserId);
  }, [currentUserId, isLoggedIn, restoreKey]);

  useEffect(() => {
    if (!isLoggedIn || !draftKey || !currentUserId) return undefined;

    let timer;
    const resetTimer = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const currentDraft = collectDraft(currentUserId);
        if (currentDraft) localStorage.setItem(draftKey, JSON.stringify(currentDraft));
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
  }, [currentUserId, draftKey, isLoggedIn]);

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
              if (!restoreKey || !draftKey) return;
              sessionStorage.setItem(restoreKey, JSON.stringify(draft));
              localStorage.removeItem(draftKey);
              window.location.assign(draft.url || '/');
            }}
            className="inline-flex min-h-11 items-center rounded-md bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800"
          >
            Resume
          </button>
          <button
            type="button"
            onClick={() => {
              if (draftKey) localStorage.removeItem(draftKey);
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

function readDraft(key, userId) {
  try {
    const draft = JSON.parse(localStorage.getItem(key) || 'null');
    if (isOwnedDraft(draft, userId)) return draft;
    localStorage.removeItem(key);
    return null;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

function collectDraft(userId) {
  const fields = [];
  document.querySelectorAll('input, textarea, select').forEach((field) => {
    if (!isDraftableField(field)) return;
    const value = field.type === 'checkbox' || field.type === 'radio' ? field.checked : field.value;
    const initialValue = field.type === 'checkbox' || field.type === 'radio' ? field.defaultChecked : field.defaultValue;
    const hasChanged = value !== initialValue;
    const hasValue = typeof value === 'boolean' ? value : String(value || '').trim().length > 0;
    if (!hasChanged && !hasValue) return;
    fields.push({ name: field.name, type: field.type, value });
  });

  if (!fields.length) return null;

  return {
    ownerUserId: userId,
    url: `${window.location.pathname}${window.location.search}${window.location.hash}`,
    title: document.title,
    savedAt: new Date().toISOString(),
    fields,
  };
}

function restorePendingDraft(key, userId) {
  let draft;
  try {
    draft = JSON.parse(sessionStorage.getItem(key) || 'null');
  } catch {
    draft = null;
  }
  if (
    !isOwnedDraft(draft, userId)
    || draft.url !== `${window.location.pathname}${window.location.search}${window.location.hash}`
  ) {
    sessionStorage.removeItem(key);
    return;
  }

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
    sessionStorage.removeItem(key);
  }, 500);
}

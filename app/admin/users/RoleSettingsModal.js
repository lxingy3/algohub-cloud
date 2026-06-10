'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

export function RoleSettingsModal({ roles }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-10 items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
      >
        Role settings
      </button>
      {open ? (
        <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-slate-950/60 px-3 py-3 sm:px-4 sm:py-8" role="dialog" aria-modal="true">
          <button type="button" className="fixed inset-0 cursor-default" aria-label="Close role settings" onClick={() => setOpen(false)} />
          <div className="relative max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-4 shadow-2xl sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-950">Role settings</h2>
              <button type="button" onClick={() => setOpen(false)} className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-md p-2 text-slate-500 hover:bg-slate-100" aria-label="Close role settings">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 border-t pt-4">
              <form action="/api/admin/roles" method="post" className="grid gap-2 md:grid-cols-[180px_1fr_auto]">
                <input name="name" placeholder="Role name" className="min-h-11 rounded-md border px-3 py-2" required />
                <input name="description" placeholder="Description" className="min-h-11 rounded-md border px-3 py-2" />
                <button className="min-h-11 rounded-md border px-3 py-2 text-sm font-semibold">Add role</button>
              </form>
              <div className="mt-4 grid gap-3">
                {roles.map((role) => (
                  <form key={role.id} action={`/api/admin/roles/${role.id}`} method="post" className="grid gap-2 rounded-md bg-slate-50 p-3 md:grid-cols-[180px_1fr_auto_auto]">
                    <input name="name" defaultValue={role.name} className="min-h-11 rounded-md border bg-white px-3 py-2" required />
                    <input name="description" defaultValue={role.description || ''} className="min-h-11 rounded-md border bg-white px-3 py-2" />
                    <button name="action" value="update" className="min-h-11 rounded-md border bg-white px-3 py-2 text-sm font-semibold">Save</button>
                    <button name="action" value="delete" className="min-h-11 rounded-md border bg-white px-3 py-2 text-sm font-semibold">Delete</button>
                  </form>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

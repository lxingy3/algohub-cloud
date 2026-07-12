'use client';

import { useState } from 'react';
import { Check, ExternalLink, Pencil, Trash2, Upload } from 'lucide-react';

const MAX_INLINE_LOGO_BYTES = 2 * 1024 * 1024;

export function AdminOrganizationsManager({ organizations, counts, filters, returnTo }) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Organization Manager</h1>
          <p className="mt-2 text-sm text-slate-600">Review partner applications first, then maintain the organizations shown on the About page.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setAdding((current) => !current);
            setEditingId(null);
          }}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 sm:w-auto"
        >
          {adding ? 'Cancel' : 'Add organization'}
        </button>
      </div>

      {adding ? (
        <section className="mt-5 rounded-lg border bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Add organization</h2>
            <button type="button" onClick={() => setAdding(false)} className="min-h-10 rounded-md border px-3 py-2 text-sm">Cancel</button>
          </div>
          <OrganizationForm action="/api/admin/organizations" submitLabel="Add organization" returnTo="/admin/organizations" />
        </section>
      ) : null}

      <section className="mt-5 rounded-lg border bg-white p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Find organizations</h2>
            <p className="mt-1 text-sm text-slate-500">{counts.active} active / {counts.pending} awaiting approval</p>
          </div>
          {returnTo !== '/admin/organizations' ? <a href="/admin/organizations" className="inline-flex min-h-10 items-center rounded-md border px-3 py-2 text-sm font-semibold">Clear filters</a> : null}
        </div>
        <form className="mt-4 grid gap-3 sm:grid-cols-[1fr_190px_auto]">
          <input name="search" defaultValue={filters.search} placeholder="Search name, email, or role" className="min-h-11 rounded-md border px-3 py-2" />
          <select name="status" defaultValue={filters.status} className="min-h-11 rounded-md border bg-white px-3 py-2">
            <option value="all">All organizations</option>
            <option value="pending">Awaiting approval ({counts.pending})</option>
            <option value="active">Active ({counts.active})</option>
          </select>
          <button className="min-h-11 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Find</button>
        </form>
      </section>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        {organizations.map((org) => (
          <article key={org.id} className="rounded-lg border bg-white p-4 shadow-sm">
            {editingId === org.id ? (
              <div>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold">Edit organization</h2>
                  <button type="button" onClick={() => setEditingId(null)} className="min-h-10 rounded-md border px-3 py-2 text-sm">Cancel</button>
                </div>
                <OrganizationForm action={`/api/admin/organizations/${org.id}`} organization={org} submitLabel="Save organization" returnTo={returnTo} />
              </div>
            ) : (
              <OrganizationSummary organization={org} onEdit={() => setEditingId(org.id)} returnTo={returnTo} />
            )}
          </article>
        ))}
        {!organizations.length ? <div className="rounded-lg border bg-white px-4 py-12 text-center text-sm text-slate-500 xl:col-span-2">No organizations match these filters.</div> : null}
      </div>
    </div>
  );
}

function OrganizationSummary({ organization, onEdit, returnTo }) {
  return (
    <div className="grid gap-4 md:grid-cols-[128px_1fr_auto]">
      <div className="flex h-28 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50 p-3">
        {organization.logoPreviewUrl ? (
          <img src={organization.logoPreviewUrl} alt={`${organization.name} logo`} className="max-h-full max-w-full object-contain" />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded bg-gradient-to-br from-amber-100 via-yellow-50 to-slate-100 px-3 text-center">
            <span className="text-sm font-extrabold leading-tight text-slate-900">{organization.name}</span>
          </div>
        )}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          {!organization.isActive ? (
            <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-900">Pending partner application</span>
          ) : (
            <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">Active on About page</span>
          )}
          {organization.role ? <span className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600">{organization.role}</span> : null}
        </div>
        <h2 className="mt-2 text-lg font-semibold text-slate-950">{organization.name}</h2>
        {organization.description ? <p className="mt-1 line-clamp-3 text-sm leading-6 text-slate-600">{organization.description}</p> : null}
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
          {organization.contactEmail ? <span>{organization.contactEmail}</span> : null}
          {organization.websiteUrl ? (
            <a href={organization.websiteUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-1 rounded-md px-1 hover:bg-slate-50 hover:text-slate-900">
              Website <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 md:flex-col md:flex-nowrap">
        <button type="button" onClick={onEdit} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold md:flex-none">
          <Pencil className="h-4 w-4" />
          Edit
        </button>
        {!organization.isActive ? (
          <form action={`/api/admin/organizations/${organization.id}`} method="post" className="flex-1 md:flex-none">
            <input type="hidden" name="returnTo" value={returnTo} />
            <input type="hidden" name="name" value={organization.name} />
            <input type="hidden" name="contactEmail" value={organization.contactEmail || ''} />
            <input type="hidden" name="role" value={organization.role || 'community_partner'} />
            <input type="hidden" name="websiteUrl" value={organization.websiteUrl || ''} />
            <input type="hidden" name="logoUrl" value={organization.logoUrl || ''} />
            <input type="hidden" name="description" value={organization.description || ''} />
            <button name="action" value="approve" className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold text-emerald-700">
              <Check className="h-4 w-4" />
              Approve
            </button>
          </form>
        ) : null}
        <form action={`/api/admin/organizations/${organization.id}`} method="post" className="flex-1 md:flex-none">
          <input type="hidden" name="returnTo" value={returnTo} />
          <input type="hidden" name="action" value="delete" />
          <button type="button" onClick={(clickEvent) => {
            if (window.confirm(`Delete "${organization.name}"? This cannot be undone.`)) clickEvent.currentTarget.form?.requestSubmit();
          }} className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold text-red-700">
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </form>
      </div>
    </div>
  );
}

function OrganizationForm({ action, organization, submitLabel, returnTo }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    const form = event.currentTarget;
    const submitter = event.nativeEvent?.submitter;
    const formData = new FormData(form);
    const logoFile = formData.get('logoFile');

    if (submitter?.name) formData.set(submitter.name, submitter.value);

    if (logoFile && logoFile.size > 0) {
      try {
        setUploading(true);
        const presignResponse = await fetch('/api/uploads/presign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kind: 'image',
            scope: 'organizationLogo',
            fileName: logoFile.name,
            contentType: logoFile.type,
            size: logoFile.size,
          }),
        });
        const presign = await presignResponse.json();
        if (!presignResponse.ok) {
          if (presignResponse.status === 503) {
            formData.set('logoUrl', await logoFileToDataUrl(logoFile));
          } else {
            throw new Error(presign.error || 'Logo upload could not be prepared.');
          }
        } else {
        const uploadResponse = await fetch(presign.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': logoFile.type },
          body: logoFile,
        });
        if (!uploadResponse.ok) throw new Error('Logo upload failed.');
        formData.set('logoUrl', presign.storageUri);
        }
      } catch (uploadError) {
        setError(uploadError.message || 'Logo upload failed.');
        setUploading(false);
        return;
      }
    }

    formData.delete('logoFile');
    const response = await fetch(action, { method: 'POST', body: formData });
    if (response.ok || response.redirected) {
      window.location.href = returnTo;
      return;
    }
    setError('Organization could not be saved.');
    setUploading(false);
  };

  return (
    <form onSubmit={submit} className="mt-4 grid gap-3 md:grid-cols-2">
      <input type="hidden" name="returnTo" value={returnTo} />
      {error ? <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 md:col-span-2">{error}</div> : null}
      <Field label="Name">
        <input name="name" defaultValue={organization?.name || ''} className="w-full rounded-md border px-3 py-2" required />
      </Field>
      <Field label="Role">
        <input name="role" defaultValue={organization?.role || 'community_partner'} className="w-full rounded-md border px-3 py-2" />
      </Field>
      <Field label="Contact email">
        <input name="contactEmail" type="email" defaultValue={organization?.contactEmail || ''} className="w-full rounded-md border px-3 py-2" />
      </Field>
      <Field label="Website">
        <input name="websiteUrl" type="url" defaultValue={organization?.websiteUrl || ''} className="w-full rounded-md border px-3 py-2" />
      </Field>
      <Field label="Logo URL">
        <input name="logoUrl" defaultValue={organization?.logoUrl || ''} className="w-full rounded-md border px-3 py-2" placeholder="https://... or gcs://..." />
      </Field>
      <Field label="Upload logo">
        <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm text-slate-600">
          <Upload className="h-4 w-4" />
          <span>JPEG, PNG, or WebP</span>
          <input name="logoFile" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" />
        </label>
      </Field>
      <Field label="Description" className="md:col-span-2">
        <textarea name="description" defaultValue={organization?.description || ''} className="min-h-28 w-full rounded-md border px-3 py-2" />
      </Field>
      <div className="flex flex-wrap gap-2 md:col-span-2">
        <button disabled={uploading} className="min-h-11 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400">
          {uploading ? 'Uploading logo...' : submitLabel}
        </button>
        {organization && !organization.isActive ? (
          <button name="action" value="approve" disabled={uploading} className="inline-flex min-h-11 items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold text-emerald-700">
            <Check className="h-4 w-4" />
            Approve
          </button>
        ) : null}
      </div>
    </form>
  );
}

function logoFileToDataUrl(file) {
  if (file.size > MAX_INLINE_LOGO_BYTES) {
    throw new Error('Cloud media storage is not configured. Upload a logo smaller than 2 MB, or paste an existing image URL.');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Logo file could not be read.'));
    reader.readAsDataURL(file);
  });
}

function Field({ label, children, className = '' }) {
  return (
    <label className={`grid gap-1 text-sm font-semibold text-slate-700 ${className}`}>
      {label}
      {children}
    </label>
  );
}

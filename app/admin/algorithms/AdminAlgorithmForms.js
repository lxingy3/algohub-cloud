'use client';

import { forwardRef, useRef, useState } from 'react';
import { Eye, Pencil, X } from 'lucide-react';
import { formatStatus } from '../../components/Formatters';

const statuses = ['ACTIVE', 'UNDER_REVIEW', 'DEPRECATED', 'PROPOSED'];
const impacts = ['', 'LOW', 'MEDIUM', 'HIGH'];

export function AddAlgorithmForm({ currentRole = 'ADMIN' }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const formRef = useRef(null);
  const message = currentRole === 'ADMIN'
    ? 'Add this algorithm to the public registry?'
    : 'Submit this algorithm record for admin review?';

  return (
    <>
      <AlgorithmFields
        ref={formRef}
        action="/api/admin/algorithms"
        submitLabel="Add algorithm"
        onSubmit={(event) => {
          event.preventDefault();
          setConfirmOpen(true);
        }}
      />
      {confirmOpen ? (
        <ConfirmDialog
          title="Confirm algorithm submission"
          message={message}
          confirmLabel="Submit algorithm"
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => {
            setConfirmOpen(false);
            formRef.current?.submit();
          }}
        />
      ) : null}
    </>
  );
}

export function AdminAlgorithmCard({ algorithm }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  return (
    <article className="rounded-lg border bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{algorithm.name}</h3>
            <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">{formatStatus(algorithm.status)}</span>
          </div>
          <p className="mt-1 text-sm text-slate-500">{algorithm.agencyName || 'No agency'} / {algorithm.useCase} / {algorithm.location}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setOpen((current) => !current);
              setEditing(false);
            }}
            className="inline-flex min-h-10 items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Eye className="h-4 w-4" />
            {open ? 'Hide' : 'View'}
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(true);
              setEditing(true);
            }}
            className="inline-flex min-h-10 items-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </button>
        </div>
      </div>

      {open && !editing ? <AlgorithmReadOnly algorithm={algorithm} onEdit={() => setEditing(true)} /> : null}
      {open && editing ? (
        <AlgorithmFields
          action={`/api/admin/algorithms/${algorithm.id}`}
          submitLabel="Save changes"
          algorithm={algorithm}
          claim={algorithm.claims?.[0]}
        />
      ) : null}
    </article>
  );
}

function AlgorithmReadOnly({ algorithm, onEdit }) {
  const details = [
    ['Slug', algorithm.slug],
    ['Agency type', algorithm.agencyType],
    ['Use case', algorithm.useCase],
    ['Location', algorithm.location],
    ['Year introduced', algorithm.yearIntroduced],
    ['Year deployed', algorithm.yearDeployed],
    ['Current version', algorithm.currentVersion],
    ['Impact level', algorithm.impactLevel ? formatStatus(algorithm.impactLevel) : 'Not listed'],
    ['Documentation', algorithm.officialDocumentationUrl],
  ];

  return (
    <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4">
      <div className="grid gap-4 text-sm md:grid-cols-2">
        {details.map(([label, value]) => (
          <div key={label}>
            <span className="block text-xs font-semibold uppercase text-slate-500">{label}</span>
            <span className="text-slate-800">{value || 'Not provided'}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-4 text-sm md:grid-cols-2">
        <LongReadOnly label="Description" value={algorithm.description} />
        <LongReadOnly label="Purpose" value={algorithm.purpose} />
        <LongReadOnly label="Data used" value={algorithm.dataUsed} />
        <LongReadOnly label="Decision type" value={algorithm.decisionType} />
        <LongReadOnly label="Official claim" value={algorithm.claims?.[0]?.claimText} />
      </div>
      <button type="button" onClick={onEdit} className="mt-4 inline-flex min-h-10 items-center rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white">
        Edit this algorithm
      </button>
    </div>
  );
}

function LongReadOnly({ label, value }) {
  return (
    <div>
      <span className="block text-xs font-semibold uppercase text-slate-500">{label}</span>
      <p className="mt-1 whitespace-pre-wrap text-slate-800">{value || 'Not provided'}</p>
    </div>
  );
}

const AlgorithmFields = forwardRef(function AlgorithmFields({ action, submitLabel, algorithm = {}, claim = null, onSubmit }, ref) {
  return (
    <form ref={ref} action={action} method="post" onSubmit={onSubmit} className="mt-4 grid gap-3 md:grid-cols-2">
      {claim?.id ? <input type="hidden" name="claimId" value={claim.id} /> : null}
      <Field name="name" label="Name" value={algorithm.name} required />
      <Field name="slug" label="Slug" value={algorithm.slug} />
      <Field name="agencyName" label="Agency / Used by" value={algorithm.agencyName} />
      <Field name="agencyType" label="Agency type" value={algorithm.agencyType} />
      <Field name="useCase" label="Use case" value={algorithm.useCase} />
      <Field name="location" label="Location" value={algorithm.location} />
      <label className="text-sm font-medium text-slate-600">
        Status
        <select name="status" defaultValue={algorithm.status || 'ACTIVE'} className="mt-1 w-full rounded-md border px-3 py-2">
          {statuses.map((status) => <option key={status} value={status}>{formatStatus(status)}</option>)}
        </select>
      </label>
      <label className="text-sm font-medium text-slate-600">
        Impact level
        <select name="impactLevel" defaultValue={algorithm.impactLevel || ''} className="mt-1 w-full rounded-md border px-3 py-2">
          {impacts.map((impact) => <option key={impact || 'none'} value={impact}>{impact ? formatStatus(impact) : 'Not listed'}</option>)}
        </select>
      </label>
      <Field name="yearIntroduced" label="Year introduced" value={algorithm.yearIntroduced} type="number" />
      <Field name="yearDeployed" label="Year deployed" value={algorithm.yearDeployed} type="number" />
      <Field name="currentVersion" label="Current version" value={algorithm.currentVersion} />
      <Field name="officialDocumentationUrl" label="Official documentation URL" value={algorithm.officialDocumentationUrl} />
      <TextField name="description" label="Description" value={algorithm.description} />
      <TextField name="purpose" label="Purpose" value={algorithm.purpose} />
      <TextField name="dataUsed" label="Data used" value={algorithm.dataUsed} />
      <TextField name="decisionType" label="Decision type" value={algorithm.decisionType} />
      <TextField name="storyboardSvg" label="Storyboard SVG / URL" value={algorithm.storyboardSvg} />
      <TextField name="claimText" label="Official claim" value={claim?.claimText} />
      <Field name="claimSource" label="Claim source" value={claim?.claimSource} />
      <div className="flex gap-2 md:col-span-2">
        <button name="action" value="update" className="rounded-md bg-slate-900 px-4 py-2 text-white">{submitLabel}</button>
        {algorithm.id ? <button name="action" value="delete" className="rounded-md border border-red-200 px-4 py-2 text-red-700">Delete</button> : null}
      </div>
    </form>
  );
});

function Field({ name, label, value = '', type = 'text', required = false }) {
  return (
    <label className="text-sm font-medium text-slate-600">
      {label}
      <input name={name} type={type} defaultValue={value || ''} className="mt-1 w-full rounded-md border px-3 py-2" required={required} />
    </label>
  );
}

function TextField({ name, label, value = '' }) {
  return (
    <label className="text-sm font-medium text-slate-600 md:col-span-2">
      {label}
      <textarea name={name} defaultValue={value || ''} rows={3} className="mt-1 w-full rounded-md border px-3 py-2" />
    </label>
  );
}

function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 px-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-lg border bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{message}</p>
          </div>
          <button type="button" onClick={onCancel} className="rounded-md p-2 text-slate-500 hover:bg-slate-100" aria-label="Close confirmation">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="min-h-10 rounded-md border px-3 py-2 text-sm font-semibold">Cancel</button>
          <button type="button" onClick={onConfirm} className="min-h-10 rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white">{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

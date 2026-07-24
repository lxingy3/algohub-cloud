'use client';

import { useState } from 'react';

export function PartnerReviewGateEditor({ initialGate, organizations, defaultDeadline }) {
  const [gate, setGate] = useState(initialGate);
  const [organizationId, setOrganizationId] = useState(organizations[0]?.id || '');
  const [deadline, setDeadline] = useState(defaultDeadline);
  const [reset, setReset] = useState(false);
  const [overrideReason, setOverrideReason] = useState(initialGate.override?.reason || '');
  const [saving, setSaving] = useState('');
  const [message, setMessage] = useState('');
  const readOnly = gate.briefing.reviewStatus === 'PUBLISHED';

  async function mutate(action, fields = {}) {
    setSaving(action);
    setMessage('');
    try {
      const formData = new FormData();
      formData.set('action', action);
      Object.entries(fields).forEach(([key, value]) => formData.set(key, value));
      const response = await fetch(`/api/admin/briefings/${gate.briefing.id}/partner-reviews`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: formData,
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Partner gate could not be updated.');
      const refreshed = await fetch(`/api/admin/briefings/${gate.briefing.id}/partner-reviews`, { cache: 'no-store' });
      const next = await refreshed.json();
      if (!refreshed.ok) throw new Error(next.error || 'Partner gate could not be refreshed.');
      setGate(next);
      setOverrideReason(next.override?.reason || '');
      setMessage('Partner gate updated.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving('');
    }
  }

  function assign() {
    if (!organizationId || !deadline) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
      setMessage('Choose a valid deadline.');
      return;
    }
    mutate('assign', {
      organizationId,
      deadline,
      reset: reset ? '1' : '0',
    });
  }

  return (
    <section className="mt-2 rounded-lg border border-slate-300 bg-slate-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-950">Partner publication gate</h3>
          <p className="mt-1 text-sm text-slate-600">At least one assigned organization must approve. Concerns, revision requests, pending reviews, and overdue reviews block publication.</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${gateReady(gate) ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>
          {gateReady(gate) ? 'Ready to publish' : 'Blocked'}
        </span>
      </div>

      {readOnly ? <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">Published briefings have a read-only partner gate. Mark the briefing reviewed or draft before changing assignments or decisions.</p> : null}

      <div className="mt-4 grid gap-2">
        {gate.assignments.map((assignment) => {
          const overdue = assignment.status !== 'APPROVED' && new Date(assignment.deadline).getTime() < Date.now();
          return <article key={assignment.id} className="rounded-md border bg-white p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong>{assignment.organization.name}</strong>
              <div className="flex items-center gap-2">
                {assignment.organization.isActive === false ? <span className="rounded-full bg-slate-200 px-2 py-1 text-xs font-bold text-slate-700">INACTIVE</span> : null}
                {overdue ? <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-800">OVERDUE</span> : null}
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold">{assignment.status}</span>
              </div>
            </div>
            <p className="mt-2 text-slate-600">Due {formatDeadline(assignment.deadline)}{assignment.reviewedBy ? ` · ${assignment.reviewedBy.name || assignment.reviewedBy.email} reviewed ${formatDate(assignment.reviewedAt)}` : ' · no decision yet'}</p>
            <button type="button" disabled={readOnly || Boolean(saving)} onClick={() => mutate('remove', { organizationId: assignment.organization.id })} className="mt-2 rounded-md border px-3 py-1.5 font-semibold text-red-700 disabled:opacity-50">
              {saving === 'remove' ? 'Removing...' : 'Remove'}
            </button>
          </article>;
        })}
        {!gate.assignments.length ? <p className="rounded-md border border-dashed bg-white p-3 text-sm text-slate-600">No partner organization assigned.</p> : null}
      </div>

      <div className="mt-4 grid gap-3 rounded-md border bg-white p-3 md:grid-cols-[minmax(180px,1fr)_minmax(210px,1fr)_auto]">
        <label className="text-sm font-semibold text-slate-700">Organization
          <select value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} disabled={readOnly} className="mt-1 min-h-10 w-full rounded-md border bg-white px-3 py-2 font-normal">
            {organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-700">Deadline
          <input type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} disabled={readOnly} className="mt-1 min-h-10 w-full rounded-md border px-3 py-2 font-normal" />
        </label>
        <div className="flex flex-col justify-end gap-2">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600"><input type="checkbox" checked={reset} onChange={(event) => setReset(event.target.checked)} disabled={readOnly} />Reset existing decision</label>
          <button type="button" disabled={readOnly || !organizationId || !deadline || Boolean(saving)} onClick={assign} className="min-h-10 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {saving === 'assign' ? 'Saving...' : 'Assign / update'}
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-md border bg-white p-3">
        <label className="text-sm font-semibold text-slate-700">Admin override reason
          <textarea value={overrideReason} onChange={(event) => setOverrideReason(event.target.value)} disabled={readOnly} minLength={10} maxLength={1000} className="mt-1 min-h-24 w-full rounded-md border px-3 py-2 font-normal" placeholder="Explain why publication must proceed without every partner approval." />
        </label>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button type="button" disabled={readOnly || overrideReason.trim().length < 10 || Boolean(saving)} onClick={() => mutate('override', { reason: overrideReason.trim() })} className="rounded-md border px-3 py-2 text-sm font-semibold disabled:opacity-50">
            {saving === 'override' ? 'Saving...' : 'Record override'}
          </button>
          {gate.override ? <button type="button" disabled={readOnly || Boolean(saving)} onClick={() => mutate('clear_override')} className="rounded-md border px-3 py-2 text-sm font-semibold text-red-700 disabled:opacity-50">Clear override</button> : null}
          {gate.override ? <span className="text-xs text-slate-600">Recorded by {gate.override.by?.name || gate.override.by?.email || 'admin'} on {formatDate(gate.override.at)}</span> : null}
        </div>
      </div>
      {message ? <p role="status" className={`mt-3 text-sm font-semibold ${message === 'Partner gate updated.' ? 'text-emerald-700' : 'text-red-700'}`}>{message}</p> : null}
    </section>
  );
}

function gateReady(gate) {
  return Boolean(gate.override || (gate.assignments.length && gate.assignments.every((assignment) => assignment.status === 'APPROVED' && assignment.organization.isActive !== false)));
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : 'not recorded';
}

function formatDeadline(value) {
  return value ? new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value)) : 'not recorded';
}

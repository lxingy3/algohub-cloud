'use client';

import { useState } from 'react';
import { Calendar, ExternalLink, Image as ImageIcon, MapPin, Pencil, Trash2, Upload, Video } from 'lucide-react';
import { formatStatus } from '../../components/Formatters';

const eventTypes = ['WORKSHOP', 'TESTIMONY_SESSION', 'TOWN_HALL', 'TRAINING', 'PANEL', 'OFFICE_HOURS', 'OTHER'];

export function AdminEventsManager({ events, organizations }) {
  const [editingId, setEditingId] = useState(null);
  const [adding, setAdding] = useState(false);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Community Events Manager</h1>
          <p className="mt-1 text-sm text-slate-500">Create and maintain the event details shown on the public events page.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setAdding((current) => !current);
            setEditingId(null);
          }}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 sm:w-auto"
        >
          {adding ? 'Cancel' : 'Add event'}
        </button>
      </div>

      {adding ? (
        <section className="mt-5 rounded-lg border bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Add event</h2>
            <button type="button" onClick={() => setAdding(false)} className="min-h-10 rounded-md border px-3 py-2 text-sm">Cancel</button>
          </div>
          <EventForm action="/api/admin/events" organizations={organizations} submitLabel="Add event" />
        </section>
      ) : null}

      <div className="mt-6 space-y-3">
        {events.map((event) => (
          <article key={event.id} className="rounded-lg border bg-white p-4">
            {editingId === event.id ? (
              <div>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold">Edit event</h2>
                  <button type="button" onClick={() => setEditingId(null)} className="min-h-10 rounded-md border px-3 py-2 text-sm">Cancel</button>
                </div>
                <EventForm action={`/api/admin/events/${event.id}`} event={event} organizations={organizations} submitLabel="Save event" />
              </div>
            ) : (
              <EventSummary event={event} onEdit={() => setEditingId(event.id)} />
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

function EventSummary({ event, onEdit }) {
  const date = new Date(event.date);
  const isPast = date < new Date();

  return (
    <div className="grid gap-4 md:grid-cols-[140px_1fr_auto]">
      <div className="flex h-24 items-center justify-center overflow-hidden rounded-md border bg-slate-50">
        {event.imagePreviewUrl ? (
          <img src={event.imagePreviewUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <ImageIcon className="h-8 w-8 text-slate-300" />
        )}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-600">{formatStatus(event.eventType)}</span>
          <span className={`rounded-md px-2 py-1 text-xs font-semibold ${isPast ? 'bg-slate-100 text-slate-600' : 'bg-yellow-100 text-yellow-800'}`}>{isPast ? 'Past event' : 'Upcoming'}</span>
          {event.isVirtual ? <span className="inline-flex items-center rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-600"><Video className="mr-1 h-3 w-3" /> Virtual</span> : null}
        </div>
        <h2 className="mt-2 text-lg font-semibold text-slate-950">{event.title}</h2>
        {event.description ? <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">{event.description}</p> : null}
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
          <span className="inline-flex items-center gap-1"><Calendar className="h-4 w-4 text-yellow-600" /> {date.toLocaleString()}</span>
          <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4 text-yellow-600" /> {event.isVirtual ? 'Virtual' : event.location || 'Location TBD'}</span>
          {event.registrationUrl ? <span className="inline-flex items-center gap-1"><ExternalLink className="h-4 w-4 text-yellow-600" /> Registration link</span> : null}
        </div>
      </div>
      <div className="flex flex-row gap-2 md:flex-col">
        <button type="button" onClick={onEdit} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold md:flex-none">
          <Pencil className="h-4 w-4" />
          Edit
        </button>
        <form action={`/api/admin/events/${event.id}`} method="post" className="flex-1 md:flex-none">
          <button name="action" value="delete" className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold text-red-700">
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </form>
      </div>
    </div>
  );
}

function EventForm({ action, event, organizations, submitLabel }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (formEvent) => {
    formEvent.preventDefault();
    setError('');
    const form = formEvent.currentTarget;
    const formData = new FormData(form);
    const imageFile = formData.get('imageFile');

    if (imageFile && imageFile.size > 0) {
      try {
        setUploading(true);
        const presignResponse = await fetch('/api/uploads/presign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kind: 'image',
            scope: 'eventImage',
            fileName: imageFile.name,
            contentType: imageFile.type,
            size: imageFile.size,
          }),
        });
        const presign = await presignResponse.json();
        if (!presignResponse.ok) throw new Error(presign.error || 'Image upload could not be prepared.');
        const uploadResponse = await fetch(presign.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': imageFile.type },
          body: imageFile,
        });
        if (!uploadResponse.ok) throw new Error('Image upload failed.');
        formData.set('imageUrl', presign.storageUri);
      } catch (uploadError) {
        setError(uploadError.message || 'Image upload failed.');
        setUploading(false);
        return;
      }
    }

    formData.delete('imageFile');
    const response = await fetch(action, { method: 'POST', body: formData });
    if (response.ok || response.redirected) {
      window.location.href = '/admin/events';
      return;
    }
    setError('Event could not be saved.');
    setUploading(false);
  };

  return (
    <form onSubmit={submit} className="mt-4 grid gap-3 md:grid-cols-2">
      {error ? <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 md:col-span-2">{error}</div> : null}
      <Field label="Title">
        <input name="title" defaultValue={event?.title || ''} className="w-full rounded-md border px-3 py-2" required />
      </Field>
      <Field label="Event type">
        <select name="eventType" defaultValue={event?.eventType || 'OTHER'} className="w-full rounded-md border bg-white px-3 py-2">
          {eventTypes.map((item) => <option key={item} value={item}>{formatStatus(item)}</option>)}
        </select>
      </Field>
      <Field label="Start date and time">
        <input name="date" type="datetime-local" defaultValue={toDatetimeLocal(event?.date)} className="w-full rounded-md border px-3 py-2" required />
      </Field>
      <Field label="End date and time">
        <input name="endDate" type="datetime-local" defaultValue={toDatetimeLocal(event?.endDate)} className="w-full rounded-md border px-3 py-2" />
      </Field>
      <Field label="Location">
        <input name="location" defaultValue={event?.location || ''} className="w-full rounded-md border px-3 py-2" />
      </Field>
      <Field label="Organizer">
        <select name="organizerOrgId" defaultValue={event?.organizerOrgId || ''} className="w-full rounded-md border bg-white px-3 py-2">
          <option value="">No organizer selected</option>
          {organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}
        </select>
      </Field>
      <Field label="Virtual link">
        <input name="virtualLink" type="url" defaultValue={event?.virtualLink || ''} className="w-full rounded-md border px-3 py-2" />
      </Field>
      <Field label="Registration URL">
        <input name="registrationUrl" type="url" defaultValue={event?.registrationUrl || ''} className="w-full rounded-md border px-3 py-2" />
      </Field>
      <Field label="Max attendees">
        <input name="maxAttendees" type="number" min="0" defaultValue={event?.maxAttendees || ''} className="w-full rounded-md border px-3 py-2" />
      </Field>
      <Field label="Image URL">
        <input name="imageUrl" defaultValue={event?.imageUrl || ''} className="w-full rounded-md border px-3 py-2" placeholder="https://... or gcs://..." />
      </Field>
      <Field label="Upload image">
        <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm text-slate-600">
          <Upload className="h-4 w-4" />
          <span>JPEG, PNG, or WebP</span>
          <input name="imageFile" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" />
        </label>
      </Field>
      <div className="flex flex-wrap items-center gap-4 pt-6">
        <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
          <input name="isVirtual" type="checkbox" defaultChecked={Boolean(event?.isVirtual)} className="h-4 w-4 rounded border-slate-300" />
          Virtual event
        </label>
        <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
          <input name="registrationRequired" type="checkbox" defaultChecked={Boolean(event?.registrationRequired)} className="h-4 w-4 rounded border-slate-300" />
          Registration required
        </label>
      </div>
      <Field label="Description" className="md:col-span-2">
        <textarea name="description" defaultValue={event?.description || ''} className="min-h-28 w-full rounded-md border px-3 py-2" />
      </Field>
      <button disabled={uploading} className="min-h-11 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400 md:col-span-2">
        {uploading ? 'Uploading image...' : submitLabel}
      </button>
    </form>
  );
}

function Field({ label, children, className = '' }) {
  return (
    <label className={`grid gap-1 text-sm font-semibold text-slate-700 ${className}`}>
      {label}
      {children}
    </label>
  );
}

function toDatetimeLocal(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

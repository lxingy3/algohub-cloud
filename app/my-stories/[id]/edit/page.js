import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, FileText, RotateCcw } from 'lucide-react';
import { prisma } from '../../../../lib/prisma';
import { getJurisdictionId } from '../../../../lib/jurisdiction';
import { getCurrentUser } from '../../../../lib/auth';
import { SiteNav } from '../../../components/SiteNav';
import { formatDate, formatStatus } from '../../../components/Formatters';

export const dynamic = 'force-dynamic';

const returnedStatuses = new Set(['FLAGGED', 'REJECTED']);

export default async function EditMyStoryPage({ params }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { id } = await params;
  const [testimony, algorithms] = await Promise.all([
    prisma.testimony.findFirst({
      where: { id, jurisdictionId: getJurisdictionId(), userId: user.id },
      select: {
        id: true,
        title: true,
        city: true,
        zipCode: true,
        referralSource: true,
        submitterName: true,
        publicPosting: true,
        followupConsent: true,
        storyType: true,
        narrativeText: true,
        audioFileUrl: true,
        videoFileUrl: true,
        selfReportedImpact: true,
        moderationStatus: true,
        moderationNotes: true,
        submittedAt: true,
        algorithmLinks: { select: { algorithmId: true } },
      },
    }),
    prisma.algorithm.findMany({
      where: { jurisdictionId: getJurisdictionId() },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  if (!testimony) notFound();
  if (!returnedStatuses.has(testimony.moderationStatus)) redirect('/my-stories');

  const selectedAlgorithmId = testimony.algorithmLinks[0]?.algorithmId || '';
  const storyType = testimony.storyType || 'text';

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 to-slate-100 text-gray-900">
      <SiteNav currentUser={user} />
      <section className="relative overflow-hidden border-b border-white/15 bg-gradient-to-r from-[#201805] via-[#4b3508] to-[#0a0a0a]">
        <div className="absolute inset-0 opacity-[0.2] [background-image:linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] [background-size:38px_38px]" />
        <div className="relative mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-12">
          <Link href="/my-stories" className="mb-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-yellow-100 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Back to My Stories
          </Link>
          <h1 className="mb-2 flex items-center gap-3 text-3xl font-bold text-white md:text-4xl">
            <FileText className="h-8 w-8 text-yellow-300" />
            Edit Story
          </h1>
          <p className="text-yellow-100/80">Revise your returned story and send it back for review.</p>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <form action={`/api/my-stories/${testimony.id}`} method="post" encType="multipart/form-data" className="space-y-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-xl sm:p-8">
          <section className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
              <span className="rounded-full border border-orange-200 bg-orange-50 px-2 py-1 text-xs font-semibold text-orange-700">{formatStatus(testimony.moderationStatus)}</span>
              <span>Last reviewed after {formatDate(testimony.submittedAt)}</span>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium uppercase text-slate-700">{storyType}</span>
            </div>
            {testimony.moderationNotes ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <div className="text-xs font-bold uppercase tracking-wide text-amber-800">Moderator note</div>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-800">{testimony.moderationNotes}</p>
              </div>
            ) : null}
          </section>

          <section className="space-y-4">
            <h2 className="border-b border-gray-200 pb-2 text-xl font-semibold text-gray-900">What Happened?</h2>
            <label className="block text-sm font-medium text-gray-700">
              Select an algorithm related to your experience
              <select name="algorithmId" defaultValue={selectedAlgorithmId} className="mt-2 min-h-11 w-full rounded-md border border-gray-200 px-3 py-2">
                <option value="">Select an algorithm from the list</option>
                {algorithms.map((algorithm) => (
                  <option key={algorithm.id} value={algorithm.id}>{algorithm.name}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Short title
              <input name="title" defaultValue={testimony.title || ''} className="mt-2 min-h-11 w-full rounded-md border border-gray-200 px-3 py-2" required />
            </label>
          </section>

          <section className="space-y-4">
            <h2 className="border-b border-gray-200 pb-2 text-xl font-semibold text-gray-900">Tell us your story</h2>
            {storyType === 'voice' && testimony.audioFileUrl ? (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="mb-2 text-sm font-medium text-gray-700">Current voice story</p>
                <audio className="w-full" src={`/api/my-stories/${testimony.id}/media/audio`} controls preload="metadata" />
                <p className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-800">Media replacement now uses secure signed upload. Submit a new voice story if the media itself needs to change.</p>
              </div>
            ) : null}
            {storyType === 'video' && testimony.videoFileUrl ? (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="mb-2 text-sm font-medium text-gray-700">Current video story</p>
                <video className="max-h-80 w-full rounded-lg border bg-black object-contain" src={`/api/my-stories/${testimony.id}/media/video`} controls preload="metadata" />
                <p className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-800">Media replacement now uses secure signed upload. Submit a new video story if the media itself needs to change.</p>
              </div>
            ) : null}
            <label className="block text-sm font-medium text-gray-700">
              Story details
              <textarea
                name="narrativeText"
                rows={8}
                defaultValue={testimony.narrativeText}
                className="mt-2 w-full resize-none rounded-md border border-gray-200 px-3 py-2"
                required={storyType === 'text'}
              />
            </label>
          </section>

          <section className="space-y-4">
            <h2 className="border-b border-gray-200 pb-2 text-xl font-semibold text-gray-900">About You</h2>
            <label className="block text-sm font-medium text-gray-700">
              Name <span className="font-normal">(Optional)</span>
              <input name="name" defaultValue={testimony.submitterName || user.name || ''} placeholder="Your name" className="mt-2 min-h-11 w-full rounded-md border border-gray-200 px-3 py-2" />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              City <span className="font-normal text-red-600">(Required)</span>
              <input name="city" defaultValue={testimony.city || ''} placeholder="e.g. Pittsburgh, Philadelphia" className="mt-2 min-h-11 w-full rounded-md border border-gray-200 px-3 py-2" required />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Zip Code <span className="font-normal">(Optional)</span>
              <input name="zipCode" defaultValue={testimony.zipCode || ''} placeholder="15201" className="mt-2 min-h-11 w-full rounded-md border border-gray-200 px-3 py-2" />
            </label>
          </section>

          <section className="space-y-4">
            <h2 className="border-b border-gray-200 pb-2 text-xl font-semibold text-gray-900">How did you hear about us?</h2>
            <label className="block text-sm font-medium text-gray-700">
              Organization or referral source
              <input name="referralSource" defaultValue={testimony.referralSource || ''} placeholder="Organization name or how you found us" className="mt-2 min-h-11 w-full rounded-md border border-gray-200 px-3 py-2" />
            </label>
          </section>

          <section className="space-y-4">
            <h2 className="border-b border-gray-200 pb-2 text-xl font-semibold text-gray-900">Consent & Privacy</h2>
            <label className="flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-gray-700">
              <span>
                <span className="block font-semibold text-gray-900">Can this story be shared publicly?</span>
                <span>Identifying details will be removed before posting.</span>
              </span>
              <input name="publicPosting" type="checkbox" defaultChecked={testimony.publicPosting} className="h-5 w-5" />
            </label>
            <label className="flex items-start gap-3 text-sm text-gray-800">
              <input name="followupConsent" type="checkbox" defaultChecked={testimony.followupConsent} className="mt-1 h-4 w-4" required />
              <span>I understand and agree that a community reviewer may follow up with me regarding this story *</span>
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Impact
              <select name="selfReportedImpact" defaultValue={testimony.selfReportedImpact || 'UNCLEAR'} className="mt-2 min-h-11 w-full rounded-md border border-gray-200 px-3 py-2">
                <option value="UNCLEAR">Unclear</option>
                <option value="POSITIVE">Positive</option>
                <option value="NEGATIVE">Negative</option>
                <option value="MIXED">Mixed</option>
              </select>
            </label>
          </section>

          <button className="flex min-h-12 w-full items-center justify-center rounded-md bg-yellow-500 px-5 py-3 font-semibold text-gray-900 hover:bg-yellow-400">
            <RotateCcw className="mr-2 h-4 w-4" />
            Resubmit for Review
          </button>
        </form>
      </div>
    </main>
  );
}

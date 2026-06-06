import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Eye, Heart, MessageCircle } from 'lucide-react';
import { prisma } from '../../../lib/prisma';
import { getJurisdictionId } from '../../../lib/jurisdiction';
import { getCurrentUser } from '../../../lib/auth';
import { SiteNav } from '../../components/SiteNav';
import { formatDate } from '../../components/Formatters';

export const dynamic = 'force-dynamic';

export default async function StoryPage({ params }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const testimony = await prisma.testimony.findFirst({
    where: { id, jurisdictionId: getJurisdictionId(), moderationStatus: 'APPROVED' },
    include: {
      brief: true,
      algorithmLinks: { include: { algorithm: true } },
      reactions: true,
      comments: {
        where: { moderationStatus: 'APPROVED', parentCommentId: null },
        orderBy: { createdAt: 'asc' },
        include: {
          user: true,
          replies: { where: { moderationStatus: 'APPROVED' }, include: { user: true, likes: true } },
          likes: true,
        },
      },
    },
  });

  if (!testimony) notFound();

  const eyeOpening = testimony.reactions.filter((reaction) => reaction.reactionType === 'EYE_OPENING').length;
  const support = testimony.reactions.filter((reaction) => reaction.reactionType === 'SUPPORT').length;

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-slate-100 text-slate-950">
      <SiteNav currentUser={user} />
      <article className="mx-auto max-w-4xl px-6 py-8">
        <Link href="/stories" className="text-sm font-semibold text-amber-800 hover:text-amber-950">Back to stories</Link>

        <section className="mt-5 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
            <span>{testimony.city || 'City not listed'}</span>
            <span>/</span>
            <span>{testimony.affectedDomain || 'Domain not listed'}</span>
            <span>/</span>
            <span>{formatDate(testimony.submittedAt)}</span>
          </div>
          <h1 className="mt-4 text-4xl font-black leading-tight">{testimony.title}</h1>
          <p className="mt-4 text-lg leading-8 text-slate-600">{testimony.summary}</p>
          {testimony.algorithmLinks.length ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {testimony.algorithmLinks.map((link) => (
                <Link key={link.algorithmId} href={`/algorithms/${link.algorithm.slug}`} className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
                  {link.algorithm.name}
                </Link>
              ))}
            </div>
          ) : null}
        </section>

        {testimony.brief ? (
          <section className="mt-6 rounded-lg border-l-4 border-amber-500 bg-white p-6 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">Review summary</div>
            <p className="mt-2 leading-7 text-slate-700">{testimony.brief.summary}</p>
          </section>
        ) : null}

        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <p className="whitespace-pre-line leading-8 text-slate-700">{testimony.narrativeText}</p>
          {testimony.audioFileUrl ? (
            <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4">
              <p className="mb-2 text-sm font-semibold text-slate-600">Voice story</p>
              <audio src={testimony.audioFileUrl} controls className="w-full" />
            </div>
          ) : null}
          {testimony.videoFileUrl ? (
            <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4">
              <p className="mb-2 text-sm font-semibold text-slate-600">Video story</p>
              <video src={testimony.videoFileUrl} controls className="max-h-[420px] w-full rounded bg-black" />
            </div>
          ) : null}
          <div className="mt-6 flex flex-wrap gap-2">
            <form action={`/api/stories/${testimony.id}/reactions`} method="post">
              <input type="hidden" name="reactionType" value="EYE_OPENING" />
              <button className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:border-amber-300">
                <Eye className="h-4 w-4 text-amber-600" />
                Eye-Opening {eyeOpening}
              </button>
            </form>
            <form action={`/api/stories/${testimony.id}/reactions`} method="post">
              <input type="hidden" name="reactionType" value="SUPPORT" />
              <button className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:border-amber-300">
                <Heart className="h-4 w-4 text-amber-600" />
                Support {support}
              </button>
            </form>
          </div>
        </section>

        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-2xl font-black">
            <MessageCircle className="h-6 w-6 text-amber-600" />
            Comments
          </h2>
          {user ? (
            <form action={`/api/stories/${testimony.id}/comments`} method="post" className="mt-4">
              <textarea name="content" placeholder="Write a comment" className="min-h-24 w-full rounded-md border border-slate-200 px-3 py-2" required />
              <button className="mt-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Post comment</button>
            </form>
          ) : (
            <p className="mt-4 text-sm text-slate-500">Log in to post a comment.</p>
          )}
          <div className="mt-5 space-y-3">
            {testimony.comments.map((comment) => (
              <CommentBlock key={comment.id} comment={comment} testimonyId={testimony.id} user={user} />
            ))}
          </div>
        </section>
      </article>
    </main>
  );
}

function CommentBlock({ comment, testimonyId, user }) {
  return (
    <div className="rounded-md bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-500">{comment.user?.name || comment.authorName || 'Community member'}</p>
      <p className="mt-1 leading-6">{comment.content}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <form action={`/api/stories/${testimonyId}/comments/${comment.id}/like`} method="post">
          <button className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs">{comment.likes.length} likes</button>
        </form>
      </div>
      {user ? (
        <form action={`/api/stories/${testimonyId}/comments`} method="post" className="mt-3 flex gap-2">
          <input type="hidden" name="parentCommentId" value={comment.id} />
          <input name="content" placeholder="Reply" className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm" required />
          <button className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold">Reply</button>
        </form>
      ) : null}
      {comment.replies.map((reply) => (
        <div key={reply.id} className="ml-5 mt-3 border-l-2 border-amber-200 pl-4">
          <p className="text-sm font-semibold text-slate-500">{reply.user?.name || reply.authorName || 'Community member'}</p>
          <p className="mt-1 leading-6">{reply.content}</p>
          <form action={`/api/stories/${testimonyId}/comments/${reply.id}/like`} method="post" className="mt-2">
            <button className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs">{reply.likes.length} likes</button>
          </form>
        </div>
      ))}
    </div>
  );
}

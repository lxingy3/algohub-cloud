import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar, Eye, FileText, Heart, MessageCircle, Quote } from 'lucide-react';
import { prisma } from '../../../lib/prisma';
import { getJurisdictionId } from '../../../lib/jurisdiction';
import { getCurrentUser } from '../../../lib/auth';
import { SiteNav } from '../../components/SiteNav';
import { formatDate } from '../../components/Formatters';
import { StoryShareMenu } from './StoryShareMenu';

export const dynamic = 'force-dynamic';

export default async function StoryPage({ params }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const testimony = await prisma.testimony.findFirst({
    where: { id, jurisdictionId: getJurisdictionId(), moderationStatus: 'APPROVED' },
    select: {
      id: true,
      sourceId: true,
      title: true,
      summary: true,
      affectedDomain: true,
      submittedAt: true,
      storyType: true,
      narrativeText: true,
      transcriptionText: true,
      audioFileUrl: true,
      videoFileUrl: true,
      brief: { select: { summary: true, keyExcerpts: true } },
      reactions: { select: { reactionType: true } },
      comments: {
        where: { moderationStatus: 'APPROVED', parentCommentId: null },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          authorName: true,
          content: true,
          createdAt: true,
          user: true,
          replies: {
            where: { moderationStatus: 'APPROVED' },
            select: {
              id: true,
              authorName: true,
              content: true,
              createdAt: true,
              user: true,
              likes: { select: { id: true } },
            },
          },
          likes: { select: { id: true } },
        },
      },
    },
  });

  if (!testimony) notFound();

  const excerpts = Array.isArray(testimony.brief?.keyExcerpts) ? testimony.brief.keyExcerpts : [];
  const storyText = testimony.transcriptionText || testimony.narrativeText;
  const citation = getCitation(testimony);
  const eyeOpening = testimony.reactions.filter((reaction) => reaction.reactionType === 'EYE_OPENING').length;
  const support = testimony.reactions.filter((reaction) => reaction.reactionType === 'SUPPORT').length;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 text-slate-950">
      <SiteNav currentUser={user} />

      <article className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        <Link href="/stories" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4" />
          Back to Stories
        </Link>
        <nav className="mt-2 flex items-center gap-2 text-sm text-gray-500" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-gray-900">Home</Link>
          <span>/</span>
          <Link href="/stories" className="hover:text-gray-900">Stories</Link>
          <span>/</span>
          <span className="max-w-[200px] truncate text-gray-900" title={testimony.title}>{testimony.title}</span>
        </nav>

        <section className="mt-5 rounded-lg border border-gray-100 bg-white p-5 pb-4 sm:p-8">
          <div className="mb-2 flex flex-wrap items-center gap-3">
            {testimony.affectedDomain ? (
              <span className="rounded border border-indigo-300 px-2 py-1 text-xs font-semibold text-indigo-700">
                {testimony.affectedDomain}
              </span>
            ) : null}
            <span className="flex items-center gap-1 text-sm text-gray-500">
              <Calendar className="h-3 w-3" />
              {formatDate(testimony.submittedAt)}
            </span>
          </div>

          <EngagementBar testimonyId={testimony.id} title={testimony.title} eyeOpening={eyeOpening} support={support} commentCount={testimony.comments.length} />

          <h1 className="mb-4 text-3xl font-bold leading-tight text-gray-900">{testimony.title}</h1>

          <div className="mb-8 border-l-4 border-yellow-500 pl-4">
            <span className="mb-1 inline-block rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-gray-400">
              AI-generated summary
            </span>
            <p className="text-lg leading-8 text-gray-600">{testimony.brief?.summary || testimony.summary}</p>
          </div>

          {excerpts.length ? <KeyExcerpts excerpts={excerpts} citation={citation} /> : null}

          <div className="prose prose-slate max-w-none">
            <div className="mb-3 inline-block rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-gray-400">
              Story Details
            </div>
            {storyText ? (
              <StoryText text={storyText} />
            ) : (
              <p className="mb-5 leading-8 text-gray-700">No written story details were submitted.</p>
            )}
            {citation ? (
              <p className="mt-6 text-sm text-gray-500">
                <span className="font-medium text-gray-600">Citation:</span> ({citation})
              </p>
            ) : null}
          </div>
        </section>

        <section className="mt-6 rounded-lg border border-gray-100 bg-white p-5 sm:p-8">
          <h2 className="flex items-center gap-2 text-xl font-semibold text-gray-900">
            <MessageCircle className="h-6 w-6 text-amber-600" />
            Comments
          </h2>
          {user ? (
            <form action={`/api/stories/${testimony.id}/comments`} method="post" className="mt-4">
              <textarea name="content" placeholder="Write a comment" className="min-h-24 w-full rounded-md border border-slate-200 px-3 py-2" required />
              <button className="mt-2 min-h-11 w-full rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 sm:w-auto">Post comment</button>
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

function EngagementBar({ testimonyId, title, eyeOpening, support, commentCount }) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      <form action={`/api/stories/${testimonyId}/reactions`} method="post">
        <input type="hidden" name="reactionType" value="EYE_OPENING" />
        <button className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:border-amber-300">
          <Eye className="h-4 w-4 text-amber-600" />
          Eye-Opening {eyeOpening}
        </button>
      </form>
      <form action={`/api/stories/${testimonyId}/reactions`} method="post">
        <input type="hidden" name="reactionType" value="SUPPORT" />
        <button className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:border-amber-300">
          <Heart className="h-4 w-4 text-amber-600" />
          Support {support}
        </button>
      </form>
      <StoryShareMenu title={title} />
      <span className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold">
        <MessageCircle className="h-4 w-4 text-amber-600" />
        Comment {commentCount}
      </span>
    </div>
  );
}

function KeyExcerpts({ excerpts, citation }) {
  return (
    <div className="mb-6 overflow-hidden rounded-xl border border-amber-200 bg-amber-50/50">
      <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-100/60 px-6 py-4">
        <FileText className="h-5 w-5 text-amber-700" />
        <h3 className="font-bold text-amber-900">Key Excerpts</h3>
      </div>
      <div className="divide-y divide-amber-100">
        {excerpts.map((excerpt, index) => (
          <div key={`${excerpt.label}-${index}`} className="px-6 py-5">
            <span className="mb-2 inline-block rounded bg-amber-100 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-amber-700">
              {excerpt.label}
            </span>
            <div className="flex gap-3">
              <Quote className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <p className="leading-relaxed text-gray-700 italic">{excerpt.text}</p>
            </div>
          </div>
        ))}
      </div>
      {citation ? (
        <div className="border-t border-amber-200 bg-amber-100/40 px-6 py-3 text-sm text-gray-500">
          <span className="font-medium text-gray-600">Citation:</span> ({citation})
        </div>
      ) : null}
    </div>
  );
}

function StoryText({ text }) {
  return (
    <>
      {text.split('\n\n').map((paragraph, index) => (
        <p key={index} className="mb-5 leading-8 text-gray-700">
          {paragraph.replace(/^>\s?/, '')}
        </p>
      ))}
    </>
  );
}

function CommentBlock({ comment, testimonyId, user }) {
  return (
    <div className="rounded-md bg-slate-50 p-4">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
        <span className="font-semibold">{comment.user?.name || comment.authorName || 'Community member'}</span>
        <span aria-hidden="true">/</span>
        <time dateTime={comment.createdAt?.toISOString?.()}>{formatDate(comment.createdAt)}</time>
      </div>
      <p className="mt-1 leading-6">{comment.content}</p>
      <form action={`/api/stories/${testimonyId}/comments/${comment.id}/like`} method="post" className="mt-3">
        <button className="min-h-9 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs">{comment.likes.length} likes</button>
      </form>
      {user ? (
        <form action={`/api/stories/${testimonyId}/comments`} method="post" className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input type="hidden" name="parentCommentId" value={comment.id} />
          <input name="content" placeholder="Reply" className="min-h-11 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm" required />
          <button className="min-h-11 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold">Reply</button>
        </form>
      ) : null}
      {comment.replies.map((reply) => (
        <div key={reply.id} className="ml-5 mt-3 border-l-2 border-amber-200 pl-4">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
            <span className="font-semibold">{reply.user?.name || reply.authorName || 'Community member'}</span>
            <span aria-hidden="true">/</span>
            <time dateTime={reply.createdAt?.toISOString?.()}>{formatDate(reply.createdAt)}</time>
          </div>
          <p className="mt-1 leading-6">{reply.content}</p>
          <form action={`/api/stories/${testimonyId}/comments/${reply.id}/like`} method="post" className="mt-2">
            <button className="min-h-9 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs">{reply.likes.length} likes</button>
          </form>
        </div>
      ))}
    </div>
  );
}

function getCitation(testimony) {
  if (testimony.sourceId?.startsWith('story-housing')) return 'Kuo et. al, 2023';
  if (testimony.sourceId?.startsWith('story-child')) return 'Stapleton et. al, 2022';
  return null;
}

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar, Eye, FileText, Heart, MessageCircle, Mic, Play, Quote, Video } from 'lucide-react';
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
    select: {
      id: true,
      sourceId: true,
      title: true,
      summary: true,
      affectedDomain: true,
      submittedAt: true,
      storyType: true,
      narrativeText: true,
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
          user: true,
          replies: {
            where: { moderationStatus: 'APPROVED' },
            select: {
              id: true,
              authorName: true,
              content: true,
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
  const mediaType = getMediaType(testimony, excerpts);
  const hasRealVideo = Boolean(testimony.videoFileUrl);
  const hasRealAudio = Boolean(testimony.audioFileUrl);
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
              <span className="rounded border border-indigo-300 px-2 py-1 text-xs font-medium text-indigo-700">
                {testimony.affectedDomain}
              </span>
            ) : null}
            <span className="flex items-center gap-1 text-sm text-gray-500">
              <Calendar className="h-3 w-3" />
              {formatDate(testimony.submittedAt)}
            </span>
          </div>

          <EngagementBar testimonyId={testimony.id} eyeOpening={eyeOpening} support={support} commentCount={testimony.comments.length} />

          <h1 className="mb-4 text-3xl font-bold leading-tight text-gray-900">{testimony.title}</h1>

          <div className="mb-8 border-l-4 border-yellow-500 pl-4">
            <span className="mb-1 inline-block rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-gray-400">
              AI-generated summary
            </span>
            <p className="text-lg leading-8 text-gray-600">{testimony.brief?.summary || testimony.summary}</p>
          </div>

          {mediaType === 'video' ? <VideoPanel storyId={testimony.id} hasMedia={hasRealVideo} /> : null}
          {mediaType === 'voice' ? <VoicePanel storyId={testimony.id} hasMedia={hasRealAudio} /> : null}
          {excerpts.length ? <KeyExcerpts excerpts={excerpts} citation={citation} /> : null}

          <div className="prose prose-slate max-w-none">
            <div className="mb-3 inline-block rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-gray-400">
              Story Details
            </div>
            {testimony.narrativeText ? (
              <StoryText text={testimony.narrativeText} />
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

function EngagementBar({ testimonyId, eyeOpening, support, commentCount }) {
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
      <span className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold">
        <MessageCircle className="h-4 w-4 text-amber-600" />
        Comment {commentCount}
      </span>
    </div>
  );
}

function VideoPanel({ storyId, hasMedia }) {
  if (hasMedia) {
    return (
      <div className="mb-8 rounded-xl border border-gray-200 bg-gray-50 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-700">
          <Video className="h-4 w-4 text-amber-600" />
          <span>Video Story</span>
        </div>
        <video className="max-h-[32rem] w-full rounded-lg border bg-black object-contain" src={`/api/stories/${storyId}/media/video`} controls preload="metadata">
          Your browser does not support video playback.
        </video>
      </div>
    );
  }

  return (
    <div className="relative mb-8 flex aspect-video items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gray-900">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-950" />
      <div className="relative flex flex-col items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-white/30 bg-white/10 backdrop-blur-sm">
          <Play className="ml-1 h-8 w-8 text-white" />
        </div>
        <div className="flex items-center gap-2 text-sm text-white/60">
          <Video className="h-4 w-4" />
          <span>Video Story</span>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 flex h-10 items-end bg-gradient-to-t from-black/60 to-transparent px-4 pb-2">
        <div className="flex w-full items-center gap-3">
          <div className="h-1 flex-1 rounded-full bg-white/20">
            <div className="h-1 w-0 rounded-full bg-amber-400" />
          </div>
          <span className="font-mono text-xs text-white/50">0:00</span>
        </div>
      </div>
    </div>
  );
}

function VoicePanel({ storyId, hasMedia }) {
  if (hasMedia) {
    return (
      <div className="mb-8 rounded-xl border border-gray-200 bg-gray-50 p-6">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-700">
          <Mic className="h-4 w-4 text-amber-600" />
          <span>Voice Story</span>
        </div>
        <audio className="w-full" src={`/api/stories/${storyId}/media/audio`} controls preload="metadata">
          Your browser does not support audio playback.
        </audio>
      </div>
    );
  }

  const bars = [14, 18, 26, 16, 34, 22, 12, 28, 38, 20, 24, 32, 18, 30, 40, 24, 16, 26, 36, 18, 22, 34, 28, 14, 30, 42, 24, 16, 34, 20, 28, 38, 18, 26, 32, 16, 22, 40, 24, 14];
  return (
    <div className="mb-8 rounded-xl border border-gray-200 bg-gray-50 p-6">
      <div className="flex items-center gap-4">
        <button type="button" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-amber-500 shadow-md">
          <Play className="ml-0.5 h-6 w-6 text-white" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2">
            <Mic className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-medium text-gray-700">Voice Story</span>
          </div>
          <div className="flex h-10 items-center gap-[2px]">
            {bars.map((height, index) => (
              <span key={`${height}-${index}`} className="w-1 rounded-full bg-amber-300" style={{ height }} />
            ))}
          </div>
          <div className="mt-1 flex justify-between">
            <span className="font-mono text-xs text-gray-400">0:00</span>
            <span className="font-mono text-xs text-gray-400">3:24</span>
          </div>
        </div>
      </div>
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
      <p className="text-sm font-semibold text-slate-500">{comment.user?.name || comment.authorName || 'Community member'}</p>
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
          <p className="text-sm font-semibold text-slate-500">{reply.user?.name || reply.authorName || 'Community member'}</p>
          <p className="mt-1 leading-6">{reply.content}</p>
          <form action={`/api/stories/${testimonyId}/comments/${reply.id}/like`} method="post" className="mt-2">
            <button className="min-h-9 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs">{reply.likes.length} likes</button>
          </form>
        </div>
      ))}
    </div>
  );
}

function getMediaType(testimony, excerpts) {
  if (testimony.videoFileUrl || testimony.storyType === 'video') return 'video';
  if (testimony.audioFileUrl || testimony.storyType === 'voice') return 'voice';
  if (testimony.sourceId === 'story-housing-2') return 'voice';
  if (testimony.sourceId === 'story-housing-1') return 'video';
  if (excerpts.length) return 'video';
  return 'text';
}

function getCitation(testimony) {
  if (testimony.sourceId?.startsWith('story-housing')) return 'Kuo et. al, 2023';
  if (testimony.sourceId?.startsWith('story-child')) return 'Stapleton et. al, 2022';
  return null;
}

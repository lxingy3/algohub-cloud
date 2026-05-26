import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '../../../lib/prisma';
import { getJurisdictionId } from '../../../lib/jurisdiction';
import { getCurrentUser } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

export default async function StoryPage({ params }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const testimony = await prisma.testimony.findFirst({
    where: { id, jurisdictionId: getJurisdictionId(), moderationStatus: 'APPROVED' },
    include: {
      brief: true,
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
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <article className="mx-auto max-w-3xl rounded-lg border bg-white p-6">
        <Link href="/stories" className="text-sm text-blue-700">Back to stories</Link>
        <h1 className="mt-3 text-3xl font-semibold">{testimony.title}</h1>
        {testimony.brief ? (
          <div className="mt-5 border-l-4 border-yellow-500 pl-4">
            <div className="text-xs uppercase tracking-wide text-slate-400">Story summary</div>
            <p className="mt-1 text-slate-700">{testimony.brief.summary}</p>
          </div>
        ) : null}
        <p className="mt-6 whitespace-pre-line text-slate-700">{testimony.narrativeText}</p>

        <div className="mt-6 flex flex-wrap gap-2">
          <form action={`/api/stories/${testimony.id}/reactions`} method="post">
            <input type="hidden" name="reactionType" value="EYE_OPENING" />
            <button className="rounded-md border px-3 py-2 text-sm">Eye-Opening {eyeOpening}</button>
          </form>
          <form action={`/api/stories/${testimony.id}/reactions`} method="post">
            <input type="hidden" name="reactionType" value="SUPPORT" />
            <button className="rounded-md border px-3 py-2 text-sm">Support {support}</button>
          </form>
        </div>

        <section className="mt-8 border-t pt-6">
          <h2 className="text-xl font-semibold">Comments</h2>
          {user ? (
            <form action={`/api/stories/${testimony.id}/comments`} method="post" className="mt-4">
              <textarea name="content" placeholder="Write a comment" className="w-full rounded-md border px-3 py-2" required />
              <button className="mt-2 rounded-md bg-slate-900 px-4 py-2 text-sm text-white">Post comment</button>
            </form>
          ) : (
            <p className="mt-4 text-sm text-slate-500">Login to post a comment.</p>
          )}
          <div className="mt-5 space-y-3">
            {testimony.comments.map((comment) => (
              <div key={comment.id} className="rounded-md bg-slate-50 p-3">
                <p className="text-sm text-slate-500">{comment.user?.name || comment.authorName || 'Community member'}</p>
                <p>{comment.content}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <form action={`/api/stories/${testimony.id}/comments/${comment.id}/like`} method="post">
                    <button className="rounded-md border bg-white px-2 py-1 text-xs">{comment.likes.length} likes</button>
                  </form>
                </div>
                {user ? (
                  <form action={`/api/stories/${testimony.id}/comments`} method="post" className="mt-3 flex gap-2">
                    <input type="hidden" name="parentCommentId" value={comment.id} />
                    <input name="content" placeholder="Reply" className="min-w-0 flex-1 rounded-md border bg-white px-3 py-2 text-sm" required />
                    <button className="rounded-md border bg-white px-3 py-2 text-sm">Reply</button>
                  </form>
                ) : null}
                {comment.replies.map((reply) => (
                  <div key={reply.id} className="ml-5 mt-2 border-l pl-3">
                    <p className="text-sm text-slate-500">{reply.user?.name || reply.authorName || 'Community member'}</p>
                    <p>{reply.content}</p>
                    <form action={`/api/stories/${testimony.id}/comments/${reply.id}/like`} method="post" className="mt-2">
                      <button className="rounded-md border bg-white px-2 py-1 text-xs">{reply.likes.length} likes</button>
                    </form>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
      </article>
    </main>
  );
}

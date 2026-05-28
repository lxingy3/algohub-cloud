import Link from 'next/link';
import { ArrowRight, Database, Eye, ExternalLink, Quote, Users } from 'lucide-react';
import { prisma } from '../lib/prisma';
import { getJurisdictionId } from '../lib/jurisdiction';
import { getCurrentUser } from '../lib/auth';
import { SiteNav } from './components/SiteNav';
import { formatDate } from './components/Formatters';
import { AISystemsDiagram } from './components/AISystemsDiagram';
import { HomeUseCaseExplorer } from './components/HomeUseCaseExplorer';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const jurisdictionId = getJurisdictionId();
  const user = await getCurrentUser();
  const [algorithms, recentStories, upcomingEvents] = await Promise.all([
    prisma.algorithm.findMany({
      where: { jurisdictionId },
      orderBy: [{ name: 'asc' }],
      include: { _count: { select: { testimonyLinks: true } } },
    }),
    prisma.testimony.findMany({
      where: { jurisdictionId, moderationStatus: 'APPROVED' },
      orderBy: { submittedAt: 'desc' },
      take: 2,
      include: { _count: { select: { comments: true, reactions: true } } },
    }),
    prisma.communityEvent.findMany({
      where: { jurisdictionId },
      orderBy: { date: 'asc' },
      take: 3,
      include: { organizer: true },
    }),
  ]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 to-slate-100 text-gray-900">
      <SiteNav currentUser={user} />

      <section className="relative overflow-hidden bg-gradient-to-br from-[#e0ac19] via-[#8e690f] to-[#050505] text-white">
        <div className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:44px_44px]" />
        <svg aria-hidden="true" viewBox="0 0 1200 560" preserveAspectRatio="none" className="absolute inset-0 h-full w-full opacity-[0.36]">
          <g fill="none" stroke="rgba(255,255,255,.22)" strokeWidth="1.15">
            <path d="M0 420 L110 360 L235 405 L360 338 L490 382 L620 318 L760 360 L900 300 L1020 345 L1200 280" />
            <path d="M0 500 L135 438 L250 482 L382 420 L510 462 L645 400 L785 445 L915 382 L1060 420 L1200 360" />
            <path d="M0 360 L130 300 L245 340 L365 280 L505 332 L630 270 L770 315 L905 252 L1030 300 L1200 240" />
            <path d="M110 360 L135 438 M235 405 L250 482 M360 338 L382 420 M490 382 L510 462 M620 318 L645 400 M760 360 L785 445 M900 300 L915 382 M1020 345 L1060 420" />
          </g>
        </svg>
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 pb-20 pt-10 md:pb-28 md:pt-16 lg:grid-cols-2 lg:gap-20">
          <div>
            <h1 className="mb-5 text-3xl font-extrabold leading-[1.12] tracking-tight sm:text-4xl md:text-5xl">
              Stories of Automated Systems{' '}
              <span className="text-yellow-100">Shaping Our Daily Lives</span>
            </h1>
            <p className="mb-8 text-base leading-relaxed text-yellow-50/85 md:text-lg">
              Explore how these systems function in our community through clear overviews and shared stories of their real-world impact.
            </p>
            <div className="mb-4 flex flex-wrap gap-4">
              <Link href="/algorithms" className="inline-flex h-12 items-center rounded-md bg-gray-900 px-7 text-base font-semibold text-yellow-200 shadow-[0_0_0_1px_rgba(250,204,21,0.35),0_0_24px_rgba(250,204,21,0.22)] hover:bg-gray-800">
                <Database className="mr-2 h-4 w-4" />
                Browse Algorithms
              </Link>
              <Link href="#about" className="inline-flex h-12 items-center rounded-md border border-white/70 bg-white/10 px-7 text-base font-semibold text-white hover:bg-white/20">
                Learn More
                <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </div>
            <div className="flex gap-6 pl-1 text-base text-yellow-50/80">
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-yellow-100" />
                Transparent profiles
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-yellow-100" />
                Community stories
              </div>
            </div>
          </div>
          <div className="hidden items-center justify-center lg:flex">
            <img
              src="/hero2.png"
              alt="Policy, algorithms, public service, and community relationship diagram"
              className="h-auto w-full max-w-[400px] object-contain mix-blend-screen"
            />
          </div>
        </div>
      </section>

      <AISystemsDiagram />

      <HomeUseCaseExplorer
        algorithms={algorithms.map((algorithm) => ({
          id: algorithm.id,
          slug: algorithm.slug,
          name: algorithm.name,
          description: algorithm.description,
          location: algorithm.location,
          status: algorithm.status,
          useCase: algorithm.useCase,
          storyCount: algorithm._count.testimonyLinks,
        }))}
      />

      <section className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-8">
            <h2 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
              <Users className="h-6 w-6 text-yellow-600" />
              Community Voices & Updates
            </h2>
            <p className="mt-1 text-gray-600">Real stories and latest news</p>
          </div>
          <div className="grid items-start gap-12 md:grid-cols-2">
            <div className="rounded-2xl border-l-4 border-yellow-500 bg-gradient-to-br from-yellow-50 to-yellow-100 p-8">
              <h3 className="mb-6 text-2xl font-bold text-gray-900">Community Voices from Pittsburgh</h3>
              {recentStories.map((story) => (
                <Link key={story.id} href={`/stories/${story.id}`} className="mb-5 block last:mb-0">
                  <Quote className="mb-3 h-8 w-8 text-yellow-400" />
                  <h4 className="font-semibold text-gray-900">{story.title}</h4>
                  <p className="mt-2 line-clamp-3 text-gray-700">{story.summary}</p>
                  <p className="mt-3 text-sm text-gray-500">{story._count.reactions} reactions / {story._count.comments} comments</p>
                </Link>
              ))}
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-yellow-500 to-yellow-600 p-8 text-white">
              <h3 className="mb-6 text-2xl font-bold">What's Happening?</h3>
              <ul className="space-y-6">
                {upcomingEvents.map((event) => (
                  <li key={event.id} className="border-l-2 border-yellow-200 pl-4">
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-yellow-100">
                      {formatDate(event.date)}
                    </div>
                    <div className="mb-1 font-semibold text-white">{event.title}</div>
                    <p className="text-sm text-yellow-50">{event.organizer?.name || event.location || 'Community event'}</p>
                  </li>
                ))}
              </ul>
              <Link href="/events" className="mt-8 inline-flex items-center text-sm font-semibold text-white">
                View community events
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

import Link from 'next/link';
import { ArrowRight, Building2, Database, Eye, ExternalLink, MessageSquare, Quote, Users } from 'lucide-react';
import { prisma } from '../lib/prisma';
import { getJurisdictionId } from '../lib/jurisdiction';
import { getCurrentUser } from '../lib/auth';
import { SiteNav } from './components/SiteNav';
import { AISystemsDiagram } from './components/AISystemsDiagram';
import { HomeUseCaseExplorer } from './components/HomeUseCaseExplorer';
import { HomeEventsPanel } from './components/HomeEventsPanel';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const jurisdictionId = getJurisdictionId();
  const user = await getCurrentUser();
  const now = new Date();
  const [algorithms, recentStories, upcomingEvents, organizationCount] = await Promise.all([
    prisma.algorithm.findMany({
      where: { jurisdictionId },
      orderBy: [{ name: 'asc' }],
      include: {
        _count: {
          select: {
            testimonyLinks: { where: { testimony: { moderationStatus: 'APPROVED', publicPosting: true } } },
          },
        },
        claims: { orderBy: { createdAt: 'asc' } },
        documents: { orderBy: { uploadedAt: 'desc' } },
        testimonyLinks: {
          where: { testimony: { moderationStatus: 'APPROVED', publicPosting: true } },
          include: {
            testimony: {
              select: {
                id: true,
                title: true,
                summary: true,
                narrativeText: true,
              },
            },
          },
          take: 5,
        },
      },
    }),
    prisma.testimony.findMany({
      where: { jurisdictionId, moderationStatus: 'APPROVED', publicPosting: true },
      orderBy: { submittedAt: 'desc' },
      take: 3,
      select: {
        id: true,
        summary: true,
        narrativeText: true,
        _count: { select: { comments: true, reactions: true } },
      },
    }),
    prisma.communityEvent.findMany({
      where: { jurisdictionId, date: { gte: now } },
      orderBy: { date: 'asc' },
      take: 3,
      include: { organizer: true },
    }),
    prisma.organization.count({ where: { jurisdictionId, isActive: true } }),
  ]);
  const approvedStoryCount = await prisma.testimony.count({ where: { jurisdictionId, moderationStatus: 'APPROVED', publicPosting: true } });

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 to-slate-100 text-gray-900">
      <SiteNav currentUser={user} />

      <section className="relative overflow-hidden bg-gradient-to-br from-[#e0ac19] via-[#8e690f] to-[#050505] text-white">
        <div className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:44px_44px]" />
        <svg aria-hidden="true" viewBox="0 0 1200 560" preserveAspectRatio="none" className="absolute inset-0 h-full w-full opacity-[0.36]">
          <defs>
            <linearGradient id="heroMeshStroke" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.12)" />
            </linearGradient>
          </defs>
          <g fill="none" stroke="url(#heroMeshStroke)" strokeWidth="1.15">
            <path d="M0 420 L110 360 L235 405 L360 338 L490 382 L620 318 L760 360 L900 300 L1020 345 L1200 280" />
            <path d="M0 500 L135 438 L250 482 L382 420 L510 462 L645 400 L785 445 L915 382 L1060 420 L1200 360" />
            <path d="M0 360 L130 300 L245 340 L365 280 L505 332 L630 270 L770 315 L905 252 L1030 300 L1200 240" />
            <path d="M110 360 L135 438 M235 405 L250 482 M360 338 L382 420 M490 382 L510 462 M620 318 L645 400 M760 360 L785 445 M900 300 L915 382 M1020 345 L1060 420" />
            <path d="M110 360 L130 300 M235 405 L245 340 M360 338 L365 280 M490 382 L505 332 M620 318 L630 270 M760 360 L770 315 M900 300 L905 252 M1020 345 L1030 300" />
            <path d="M135 438 L250 482 L365 430 L510 462 L645 412 L785 445 L915 392 L1060 420" />
            <path d="M130 300 L245 340 L365 288 L505 332 L630 278 L770 315 L905 260 L1030 300" />
          </g>
          <g fill="rgba(255,255,255,0.24)">
            <circle cx="235" cy="405" r="1.6" />
            <circle cx="360" cy="338" r="1.6" />
            <circle cx="490" cy="382" r="1.6" />
            <circle cx="620" cy="318" r="1.6" />
            <circle cx="760" cy="360" r="1.6" />
            <circle cx="900" cy="300" r="1.6" />
            <circle cx="250" cy="482" r="1.6" />
            <circle cx="382" cy="420" r="1.6" />
            <circle cx="510" cy="462" r="1.6" />
            <circle cx="645" cy="400" r="1.6" />
            <circle cx="785" cy="445" r="1.6" />
            <circle cx="915" cy="382" r="1.6" />
          </g>
        </svg>
        <svg aria-hidden="true" viewBox="0 0 1200 560" preserveAspectRatio="none" className="absolute inset-0 h-full w-full opacity-[0.2]">
          <defs>
            <linearGradient id="dataFlowStroke" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.05)" />
              <stop offset="45%" stopColor="rgba(255,255,255,0.2)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.08)" />
            </linearGradient>
          </defs>
          <g fill="none" stroke="url(#dataFlowStroke)" strokeWidth="1">
            <path d="M90 120 H260 L315 178 H470 L540 130 H690 L760 188 H930 L1005 145 H1135" />
            <path d="M70 210 H210 L280 258 H405 L470 218 H635 L700 270 H840 L915 230 H1090" />
            <path d="M110 300 H250 L330 352 H475 L550 308 H705 L780 360 H925 L990 320 H1140" />
            <path d="M80 390 H230 L300 440 H445 L520 402 H680 L755 450 H910 L980 412 H1120" />
          </g>
          <g fill="rgba(255,255,255,0.18)">
            <circle cx="90" cy="120" r="2.2" /><circle cx="315" cy="178" r="2.2" /><circle cx="540" cy="130" r="2.2" /><circle cx="760" cy="188" r="2.2" /><circle cx="1005" cy="145" r="2.2" />
            <circle cx="70" cy="210" r="2.2" /><circle cx="280" cy="258" r="2.2" /><circle cx="470" cy="218" r="2.2" /><circle cx="700" cy="270" r="2.2" /><circle cx="915" cy="230" r="2.2" />
            <circle cx="110" cy="300" r="2.2" /><circle cx="330" cy="352" r="2.2" /><circle cx="550" cy="308" r="2.2" /><circle cx="780" cy="360" r="2.2" /><circle cx="990" cy="320" r="2.2" />
            <circle cx="80" cy="390" r="2.2" /><circle cx="300" cy="440" r="2.2" /><circle cx="520" cy="402" r="2.2" /><circle cx="755" cy="450" r="2.2" /><circle cx="980" cy="412" r="2.2" />
          </g>
          <g fill="rgba(255,255,255,0.13)">
            <rect x="250" y="113" width="10" height="10" rx="2" /><rect x="690" y="123" width="10" height="10" rx="2" /><rect x="405" y="203" width="10" height="10" rx="2" /><rect x="840" y="263" width="10" height="10" rx="2" /><rect x="475" y="292" width="10" height="10" rx="2" /><rect x="925" y="350" width="10" height="10" rx="2" />
          </g>
        </svg>
        <svg aria-hidden="true" viewBox="0 0 620 560" preserveAspectRatio="none" className="absolute inset-y-0 right-0 h-full w-[52%] opacity-[0.3]">
          <defs>
            <linearGradient id="ctaClusterStroke" x1="100%" y1="0%" x2="0%" y2="40%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.34)" />
              <stop offset="70%" stopColor="rgba(255,255,255,0.18)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.08)" />
            </linearGradient>
          </defs>
          <g fill="none" stroke="url(#ctaClusterStroke)" strokeWidth="1.2">
            <path d="M560 90 L455 160 L355 140 L248 205 L172 280" />
            <path d="M592 165 L492 205 L380 230 L276 252 L172 280" />
            <path d="M575 255 L488 285 L395 318 L292 305 L172 280" />
            <path d="M598 355 L505 382 L410 372 L306 334 L172 280" />
            <path d="M562 460 L468 432 L365 396 L265 346 L172 280" />
            <path d="M455 160 L492 205 L488 285 L505 382 L468 432" />
            <path d="M355 140 L380 230 L395 318 L410 372 L365 396" />
          </g>
          <g fill="rgba(255,255,255,0.26)">
            <circle cx="560" cy="90" r="3" /><circle cx="592" cy="165" r="3" /><circle cx="575" cy="255" r="3" /><circle cx="598" cy="355" r="3" /><circle cx="562" cy="460" r="3" />
            <circle cx="455" cy="160" r="2.6" /><circle cx="492" cy="205" r="2.6" /><circle cx="488" cy="285" r="2.6" /><circle cx="505" cy="382" r="2.6" /><circle cx="468" cy="432" r="2.6" /><circle cx="172" cy="280" r="3.6" />
          </g>
        </svg>
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-10 sm:px-6 md:pb-28 md:pt-16 lg:grid-cols-2 lg:gap-20">
          <div>
            <h1 className="mb-5 text-3xl font-extrabold leading-[1.12] tracking-tight sm:text-4xl md:text-5xl">
              Stories of Automated Systems{' '}
              <span className="text-yellow-100">Shaping Our Daily Lives</span>
            </h1>
            <p className="mb-8 text-base leading-relaxed text-yellow-50/85 md:text-lg">
              Explore how these systems function in our community through clear overviews and shared stories of their real-world impact.
            </p>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
              <Link href="/algorithms" className="inline-flex h-12 items-center justify-center rounded-md bg-gray-900 px-7 text-base font-semibold text-yellow-200 shadow-[0_0_0_1px_rgba(250,204,21,0.35),0_0_24px_rgba(250,204,21,0.22)] hover:bg-gray-800">
                <Database className="mr-2 h-4 w-4" />
                Browse Algorithms
              </Link>
              <Link href="/about" className="inline-flex h-12 items-center justify-center rounded-md border border-white/70 bg-white/10 px-7 text-base font-semibold text-white hover:bg-white/20">
                Learn More
                <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </div>
            <div className="flex flex-col gap-2 pl-1 text-base text-yellow-50/80 sm:flex-row sm:gap-6">
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

      <section className="border-b border-yellow-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-6 sm:px-6 md:grid-cols-3">
          <StatCard href="/algorithms" icon={Database} value={algorithms.length} label="Algorithms Documented" />
          <StatCard href="/stories" icon={MessageSquare} value={approvedStoryCount} label="Testimonies Collected" />
          <StatCard href="/about#partners" icon={Building2} value={organizationCount} label="Organizations Participating" />
        </div>
      </section>

      <AISystemsDiagram />

      <HomeUseCaseExplorer
        algorithms={algorithms.map((algorithm) => ({
          id: algorithm.id,
          slug: algorithm.slug,
          name: algorithm.name,
          description: algorithm.description || '',
          purpose: algorithm.purpose || '',
          agencyName: algorithm.agencyName || '',
          agencyType: algorithm.agencyType || '',
          location: algorithm.location,
          status: algorithm.status,
          useCase: algorithm.useCase,
          dataUsed: algorithm.dataUsed || '',
          decisionType: algorithm.decisionType || '',
          yearIntroduced: algorithm.yearIntroduced,
          yearDeployed: algorithm.yearDeployed,
          currentVersion: algorithm.currentVersion || '',
          impactLevel: algorithm.impactLevel,
          officialDocumentationUrl: algorithm.officialDocumentationUrl || '',
          storyboardSvg: algorithm.storyboardSvg || '',
          storyCount: algorithm._count.testimonyLinks,
          relatedStories: algorithm.testimonyLinks.map((link) => link.testimony),
          claims: algorithm.claims.map((claim) => ({
            id: claim.id,
            claimText: claim.claimText,
            claimSource: claim.claimSource || '',
          })),
          documents: algorithm.documents.map((document) => ({
            id: document.id,
            title: document.title,
            sourceType: document.sourceType,
            sourceUrl: document.sourceUrl || '',
          })),
        }))}
      />

      <section className="py-6">
        <div className="mx-auto flex max-w-6xl justify-end px-4 sm:px-6">
          <Link href="/algorithms" className="inline-flex min-h-11 items-center rounded-md border border-yellow-500 bg-yellow-50 px-5 text-sm font-semibold text-yellow-900 shadow-sm hover:bg-yellow-100">
            Browse More Algorithms
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-8">
            <h2 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
              <Users className="h-6 w-6 text-yellow-600" />
              Community Voices & Updates
            </h2>
            <p className="mt-1 text-gray-600">Real stories and latest news</p>
          </div>
          <div className="grid items-start gap-12 md:grid-cols-2">
            <div className="rounded-2xl border-l-4 border-yellow-500 bg-gradient-to-br from-yellow-50 to-yellow-100 p-5 sm:p-8">
              <h3 className="mb-6 text-2xl font-bold text-gray-900">Recent Community Voices</h3>
              <div className="space-y-5">
                {(recentStories.length ? recentStories : [{
                  id: 'fallback',
                  summary: "I didn't realize an algorithm helped determine my application priority until I noticed the decision didn't match my caseworker's expectations.",
                }]).map((story) => (
                  <Link
                    key={story.id}
                    href={story.id === 'fallback' ? '/stories' : `/stories/${story.id}`}
                    className="block rounded-lg border border-yellow-300/45 bg-transparent p-4 transition-colors hover:bg-yellow-200/30"
                  >
                    <Quote className="mb-3 h-7 w-7 text-yellow-400" />
                    <p className="text-base italic leading-7 text-gray-700">"{story.summary || story.narrativeText}"</p>
                    <p className="mt-3 text-sm text-gray-500">- Anonymous Community Member</p>
                  </Link>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/submit-testimony" className="inline-flex min-h-11 items-center rounded-md bg-yellow-500 px-5 py-2 text-sm font-semibold text-gray-900 hover:bg-yellow-400">
                  Share Your Story
                </Link>
                <Link href="/stories" className="inline-flex min-h-11 items-center rounded-md bg-gray-900 px-5 py-2 text-sm font-semibold text-white hover:bg-gray-800">
                  Read More Stories
                </Link>
              </div>
            </div>
            <HomeEventsPanel events={upcomingEvents.map(serializeHomeEvent)} />
          </div>
        </div>
      </section>

      <section className="bg-white pb-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6 sm:flex sm:items-center sm:justify-between sm:gap-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Are you a community organization?</h2>
              <p className="mt-2 text-gray-600">Partner with us to help residents share experiences and understand public algorithms.</p>
            </div>
            <Link href="/about#partners" className="mt-5 inline-flex min-h-11 items-center rounded-md bg-gray-900 px-5 text-sm font-semibold text-white hover:bg-gray-800 sm:mt-0">
              Partner with us
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function serializeHomeEvent(event) {
  return {
    ...event,
    date: event.date.toISOString(),
    endDate: event.endDate?.toISOString() || null,
    createdAt: event.createdAt?.toISOString() || null,
    imageUrl: event.imageUrl?.startsWith('gcs://') ? `/api/events/${event.id}/image` : event.imageUrl,
    organizer: event.organizer ? {
      ...event.organizer,
      createdAt: event.organizer.createdAt?.toISOString() || null,
    } : null,
  };
}

function StatCard({ href, icon: Icon, value, label }) {
  return (
    <Link href={href} className="group flex items-center gap-4 rounded-lg border border-yellow-100 bg-yellow-50 p-4 transition-all hover:-translate-y-0.5 hover:border-yellow-300 hover:bg-yellow-100 hover:shadow-md">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-yellow-500 text-gray-900">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-sm font-medium text-gray-600 group-hover:text-gray-900">{label}</div>
      </div>
    </Link>
  );
}

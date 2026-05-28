import Link from 'next/link';
import { ArrowRight, Brain, FileText, Handshake, MessageSquare } from 'lucide-react';
import { getCurrentUser } from '../../lib/auth';
import { SiteNav } from '../components/SiteNav';

const principles = [
  {
    icon: FileText,
    title: 'Algorithm Profiles',
    description: 'We create plain-language profiles that explain how automated systems work with no technical jargon.',
  },
  {
    icon: Brain,
    title: 'Public Learning',
    description: 'A resource designed to help residents understand decision-making tools and how they affect daily life.',
  },
  {
    icon: MessageSquare,
    title: 'Community Stories',
    description: 'A dedicated space for residents, service providers, and agencies to share their real-world experiences.',
  },
  {
    icon: Handshake,
    title: 'Neutral Resource',
    description: 'We are not a watchdog or an audit tool. We exist to support clarity, communication, and trust.',
  },
];

export default async function AboutPage() {
  const user = await getCurrentUser();

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 to-slate-100 text-gray-900">
      <SiteNav currentUser={user} />

      <section className="relative overflow-hidden border-b border-white/15 bg-gradient-to-r from-[#201805] via-[#4b3508] to-[#0a0a0a]">
        <div className="absolute inset-0 opacity-[0.2] [background-image:linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] [background-size:38px_38px]" />
        <svg aria-hidden="true" viewBox="0 0 1200 260" preserveAspectRatio="none" className="absolute inset-0 h-full w-full opacity-[0.24]">
          <g fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="1.1">
            <path d="M0 200 L120 160 L240 190 L350 148 L470 176 L590 138 L720 166 L860 126 L980 160 L1200 112" />
            <path d="M0 240 L130 206 L250 234 L375 196 L505 224 L635 188 L770 218 L900 182 L1040 208 L1200 168" />
            <path d="M120 160 L130 206 M240 190 L250 234 M350 148 L375 196 M470 176 L505 224 M590 138 L635 188 M720 166 L770 218 M860 126 L900 182 M980 160 L1040 208" />
          </g>
        </svg>
        <div className="relative mx-auto max-w-4xl px-6 py-16 text-center">
          <h1 className="mb-6 text-4xl font-bold text-white md:text-5xl">
            Understanding the tools behind<br />Pittsburgh's public services.
          </h1>
          <p className="mx-auto max-w-2xl text-xl text-yellow-100/85">
            AlgoStories creates plain-language profiles of the algorithms used by our city to ensure every resident understands how decisions are made.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-12 text-center">
          <h2 className="mb-2 text-3xl font-bold text-gray-900">How AlgoStories Works</h2>
          <p className="text-gray-600">Building a shared understanding of Pittsburgh's public services.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {principles.map((principle) => {
            const Icon = principle.icon;
            return (
              <div key={principle.title} className="rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-amber-200 bg-gradient-to-br from-amber-100 to-yellow-50">
                  <Icon className="h-7 w-7 text-amber-700" />
                </div>
                <h3 className="mb-2 font-semibold text-gray-900">{principle.title}</h3>
                <p className="text-sm leading-6 text-gray-600">{principle.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-r from-[#201805] via-[#4b3508] to-[#0a0a0a] py-16 text-white">
        <div className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,0.09)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.09)_1px,transparent_1px)] [background-size:36px_36px]" />
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <h2 className="mb-4 text-3xl font-bold">Algorithms are just code until they affect you.</h2>
          <p className="mx-auto mb-8 max-w-2xl text-yellow-100/75">
            We can't see the full picture without your help. If you have an experience with a public service decision that didn't make sense, let us know.
          </p>
          <Link href="/stories" className="inline-flex h-12 items-center rounded-md bg-yellow-400 px-7 text-base font-semibold text-gray-900 shadow-[0_0_0_1px_rgba(250,204,21,0.35),0_0_24px_rgba(250,204,21,0.22)] hover:bg-yellow-300">
            Share Your Story Safely
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </section>
    </main>
  );
}

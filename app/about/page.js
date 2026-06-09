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

const teamSections = [
  {
    title: 'P.I.',
    members: [
      {
        name: 'Aakash Gautam',
        role: 'Assistant Professor, School of Computing and Information, University of Pittsburgh',
        image: '/team-orgs/image2.jpg',
        href: 'http://aakash.xyz',
      },
    ],
  },
  {
    title: 'PhD Students',
    members: [
      {
        name: 'Aditya Nayak',
        role: 'PhD Student, School of Computing and Information, University of Pittsburgh',
        image: '/team-orgs/image5.jpg',
        href: 'https://www.linkedin.com/in/adityanayak826/',
      },
      {
        name: 'Abdulaziz Alotaibi',
        role: 'PhD Student, School of Computing and Information, University of Pittsburgh',
        image: '/team-orgs/image8.png',
        href: 'https://www.linkedin.com/in/abdulaziz-alotaibi-529987a4/',
      },
    ],
  },
  {
    title: 'Researchers',
    members: [],
  },
];

const partners = [
  {
    name: 'CAASI',
    description: 'Center for Analytical Approaches to Social Innovation, University of Pittsburgh.',
    image: '/team-orgs/image9.jpg',
    href: 'https://www.caasi.pitt.edu/',
  },
  {
    name: 'WestEnd Power',
    description: 'Community organization working to transform communities in the Greater Pittsburgh region.',
    image: '/team-orgs/image3.png',
    href: 'https://www.westendpowerpgh.org/',
  },
  {
    name: 'Neighborhood Allies',
    description: 'Pittsburgh-area partner expanding opportunity through community change work.',
    image: '/team-orgs/image6.png',
    href: 'https://neighborhoodallies.org/',
  },
  {
    name: 'Literacy Pittsburgh',
    description: 'Since 1982, Literacy Pittsburgh has supported learning across the greater Pittsburgh area.',
    image: '/team-orgs/image1.png',
    href: 'https://www.literacypittsburgh.org/',
  },
  {
    name: 'Community Empowerment Association',
    description: 'Founded in 1993 to support youth and families in distressed and marginalized communities.',
    image: '/team-orgs/image4.png',
    href: 'https://www.ceapittsburgh.org/',
  },
  {
    name: 'Allegheny County Library Association',
    description: 'A federated library system with independent public libraries across Allegheny County.',
    image: '/team-orgs/image7.png',
    href: 'https://aclalibraries.org/',
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
        <div className="relative mx-auto max-w-4xl px-4 py-12 text-center sm:px-6 sm:py-16">
          <h1 className="mb-6 text-3xl font-bold text-white sm:text-4xl md:text-5xl">
            Understanding the tools behind<br />Pittsburgh's public services.
          </h1>
          <p className="mx-auto max-w-2xl text-xl text-yellow-100/85">
            AlgoStories creates plain-language profiles of the algorithms used by our city to ensure every resident understands how decisions are made.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
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

      <section className="border-y border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="mb-10 grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Our Team</h2>
              <p className="mt-2 max-w-2xl text-gray-600">The people supporting the research, design, and community work behind AlgoStories.</p>
            </div>
            <Link href="https://www.sci.pitt.edu/" target="_blank" rel="noreferrer" className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-3 shadow-sm hover:border-amber-300">
              <img src="/team-orgs/pitt-sci-logo.jpg" alt="Pitt SCI logo" className="h-16 w-16 rounded object-cover" />
              <span className="max-w-52 text-sm font-semibold leading-5 text-gray-900">
                School of Computing and Information, University of Pittsburgh
              </span>
            </Link>
          </div>
          <div className="space-y-10">
            {teamSections.map((section) => (
              <div key={section.title}>
                <h3 className="mb-5 border-b border-gray-200 pb-2 text-xl font-semibold text-gray-900">{section.title}</h3>
                {section.members.length ? (
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {section.members.map((member) => (
                      <PersonCard key={member.name} member={member} />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-600">Researchers will be added here as the project team grows.</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="partners" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-12 sm:px-6 sm:py-16">
        <div className="mb-10">
          <h2 className="text-3xl font-bold text-gray-900">Partner Organizations</h2>
          <p className="mt-2 max-w-2xl text-gray-600">Community, research, library, housing, and public-sector partners connected to the project.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {partners.map((partner) => (
            <PartnerCard key={partner.name} partner={partner} />
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-r from-[#201805] via-[#4b3508] to-[#0a0a0a] py-16 text-white">
        <div className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,0.09)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.09)_1px,transparent_1px)] [background-size:36px_36px]" />
        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h2 className="mb-4 text-3xl font-bold">Algorithms are just code until they affect you.</h2>
          <p className="mx-auto mb-8 max-w-2xl text-yellow-100/75">
            We can't see the full picture without your help. If you have an experience with a public service decision that didn't make sense, let us know.
          </p>
          <Link href="/stories" className="inline-flex min-h-12 items-center rounded-md bg-yellow-400 px-7 text-base font-semibold text-gray-900 shadow-[0_0_0_1px_rgba(250,204,21,0.35),0_0_24px_rgba(250,204,21,0.22)] hover:bg-yellow-300">
            Share Your Story Safely
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </section>
    </main>
  );
}

function PersonCard({ member }) {
  return (
    <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <Link href={member.href} className="block" target="_blank" rel="noreferrer">
        <img src={member.image} alt={member.name} className="h-52 w-full rounded-md object-cover" />
      </Link>
      <Link href={member.href} className="mt-4 block text-lg font-bold text-gray-900 hover:text-amber-700" target="_blank" rel="noreferrer">
        {member.name}
      </Link>
      <p className="mt-2 text-sm leading-6 text-gray-600">{member.role}</p>
    </article>
  );
}

function PartnerCard({ partner }) {
  const logo = partner.image ? (
    <img src={partner.image} alt={`${partner.name} logo`} className="max-h-full max-w-full object-contain" />
  ) : (
    <span className="text-center text-lg font-black text-amber-800">{partner.name}</span>
  );

  return (
    <article className="flex min-h-full flex-col rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      {partner.href ? (
        <Link href={partner.href} className="flex h-28 items-center justify-center rounded-md border border-gray-100 bg-gray-50 p-4" target="_blank" rel="noreferrer">
          {logo}
        </Link>
      ) : (
        <div className="flex h-28 items-center justify-center rounded-md border border-gray-100 bg-gray-50 p-4">
          {logo}
        </div>
      )}
      {partner.href ? (
        <Link href={partner.href} className="mt-4 text-lg font-bold text-gray-900 hover:text-amber-700" target="_blank" rel="noreferrer">
          {partner.name}
        </Link>
      ) : (
        <h3 className="mt-4 text-lg font-bold text-gray-900">{partner.name}</h3>
      )}
      <p className="mt-2 flex-1 text-sm leading-6 text-gray-600">{partner.description}</p>
    </article>
  );
}

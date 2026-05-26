import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import {
  AlgorithmStatus,
  BriefingType,
  EventType,
  ImpactLevel,
  ModerationStatus,
  NewsUpdateType,
  PrismaClient,
  ReactionType,
  ReviewStatus,
  TestimonyLinkType,
  SubmissionMethod,
} from '@prisma/client';

const prisma = new PrismaClient();
const __dirname = dirname(fileURLToPath(import.meta.url));
const jurisdictionId = process.env.JURISDICTION_ID || 'pittsburgh';

function readStaticData(fileName, exportName) {
  const filePath = join(__dirname, 'seed-data', fileName);
  const code = readFileSync(filePath, 'utf8').replace(
    `export const ${exportName} =`,
    `const ${exportName} =`,
  );

  return vm.runInNewContext(`${code}\n${exportName};`, {});
}

const algorithmsData = readStaticData('algorithmsData.jsx', 'algorithmsData');
const storiesData = readStaticData('storiesData.jsx', 'storiesData');
const eventsData = readStaticData('eventsData.jsx', 'eventsData');

const extraOrganizations = [
  {
    name: 'CAASI Community Research Collective',
    slug: 'caasi-community-research-collective',
    role: 'research_partner',
    contactEmail: 'partners@caasi.example',
    websiteUrl: 'https://caasi.example',
    description: 'Research and community engagement partner focused on algorithmic accountability.',
  },
  {
    name: 'Homewood Digital Justice Center',
    slug: 'homewood-digital-justice-center',
    role: 'community_partner',
    contactEmail: 'hello@homewoodjustice.example',
    websiteUrl: 'https://homewoodjustice.example',
    description: 'Neighborhood partner hosting workshops and testimony collection sessions.',
  },
  {
    name: 'Pittsburgh Housing Rights Network',
    slug: 'pittsburgh-housing-rights-network',
    role: 'advocacy_partner',
    contactEmail: 'intake@housingrights.example',
    websiteUrl: 'https://housingrights.example',
    description: 'Tenant and housing support organization tracking automated housing decisions.',
  },
  {
    name: 'City Data Governance Lab',
    slug: 'city-data-governance-lab',
    role: 'government_partner',
    contactEmail: 'data-governance@pittsburgh.example',
    websiteUrl: 'https://data.pittsburgh.example',
    description: 'Public-sector partner coordinating algorithm documentation and review.',
  },
];

const extraUsers = [
  ['nora.admin@algostories.local', 'Nora Admin', 'ADMIN', 'city-data-governance-lab'],
  ['maria.facilitator@algostories.local', 'Maria Chen', 'FACILITATOR', 'homewood-digital-justice-center'],
  ['kevin.facilitator@algostories.local', 'Kevin Brown', 'FACILITATOR', 'pittsburgh-housing-rights-network'],
  ['leila.org@algostories.local', 'Leila Watkins', 'ORG_MEMBER', 'caasi-community-research-collective'],
  ['sam.org@algostories.local', 'Sam Patel', 'ORG_MEMBER', 'city-data-governance-lab'],
  ['aditya.research@algostories.local', 'Aditya Nayak', 'RESEARCHER', 'caasi-community-research-collective'],
  ['jamal.community@algostories.local', 'Jamal Reed', 'COMMUNITY_MEMBER', 'homewood-digital-justice-center'],
  ['grace.community@algostories.local', 'Grace Miller', 'COMMUNITY_MEMBER', 'pittsburgh-housing-rights-network'],
  ['toni.community@algostories.local', 'Toni Rivera', 'COMMUNITY_MEMBER', 'homewood-digital-justice-center'],
  ['mei.community@algostories.local', 'Mei Lin', 'COMMUNITY_MEMBER', 'caasi-community-research-collective'],
];

const extraAlgorithms = [
  {
    id: 'seed-alg-eviction-risk',
    name: 'Eviction Risk Prioritization Model',
    description: 'Predicts households at risk of eviction so outreach teams can prioritize legal aid and rental assistance.',
    organization: 'Department of Housing Stability',
    status: 'Active',
    use_case: 'Housing Prioritization',
    impact_level: 'High',
    documentation_url: 'https://example.gov/eviction-risk-model',
    current_version: '1.4.0',
    data_used: 'Court filings, rental assistance history, neighborhood indicators, prior eviction records',
    decision_type: 'Risk score used for outreach prioritization',
    purpose: 'Identify households that may need urgent housing support before eviction filings advance.',
    used_by: 'Pittsburgh Housing Stability Office',
    location: 'Pittsburgh',
    year_deployed: 2024,
    year_introduced: 2023,
  },
  {
    id: 'seed-alg-benefits-verification',
    name: 'Benefits Eligibility Verification Engine',
    description: 'Compares application details against administrative records to flag benefit applications for additional review.',
    organization: 'County Benefits Office',
    status: 'Under Review',
    use_case: 'Benefits Administration',
    impact_level: 'High',
    documentation_url: 'https://example.gov/benefits-verification',
    current_version: '2.0.0',
    data_used: 'Income records, household composition, address history, benefit enrollment records',
    decision_type: 'Eligibility flag and manual review queue',
    purpose: 'Reduce processing time while keeping human review for flagged benefit cases.',
    used_by: 'County Benefits Office',
    location: 'Allegheny County',
    year_deployed: 2025,
    year_introduced: 2024,
  },
  {
    id: 'seed-alg-emergency-dispatch',
    name: 'Emergency Dispatch Triage Assistant',
    description: 'Ranks incoming non-emergency service requests to help dispatchers assign response priority.',
    organization: 'Public Safety Bureau',
    status: 'Proposed',
    use_case: 'Emergency Services',
    impact_level: 'Medium',
    documentation_url: 'https://example.gov/dispatch-triage',
    current_version: '0.9.2',
    data_used: 'Call text, location, prior incident categories, service availability',
    decision_type: 'Suggested response priority',
    purpose: 'Help dispatchers triage service requests during high-volume periods.',
    used_by: 'Public Safety Bureau',
    location: 'Pittsburgh',
    year_deployed: null,
    year_introduced: 2026,
  },
  {
    id: 'seed-alg-library-outreach',
    name: 'Library Resource Recommendation Tool',
    description: 'Recommends library programs and public resources based on community member interests and service needs.',
    organization: 'Public Library System',
    status: 'Active',
    use_case: 'Community Services',
    impact_level: 'Low',
    documentation_url: 'https://example.gov/library-recommendations',
    current_version: '1.1.5',
    data_used: 'Program attendance, topic interests, branch location, voluntary survey responses',
    decision_type: 'Ranked resource recommendation',
    purpose: 'Connect residents with useful public library programs and support resources.',
    used_by: 'Carnegie Library Branches',
    location: 'Pittsburgh',
    year_deployed: 2023,
    year_introduced: 2022,
  },
  {
    id: 'seed-alg-inspection-scheduler',
    name: 'Public Housing Inspection Scheduler',
    description: 'Schedules housing inspections based on complaint history, building age, and prior violation records.',
    organization: 'Housing Authority',
    status: 'Active',
    use_case: 'Housing Inspections',
    impact_level: 'Medium',
    documentation_url: 'https://example.gov/inspection-scheduler',
    current_version: '3.0.1',
    data_used: 'Inspection history, 311 complaints, building permits, property age',
    decision_type: 'Inspection queue ordering',
    purpose: 'Prioritize housing inspections for buildings with higher safety risk indicators.',
    used_by: 'Housing Authority Inspection Unit',
    location: 'Pittsburgh',
    year_deployed: 2022,
    year_introduced: 2021,
  },
  {
    id: 'seed-alg-transit-safety',
    name: 'Transit Safety Incident Classifier',
    description: 'Classifies transit incident reports to route them to safety, maintenance, or customer support teams.',
    organization: 'Regional Transit Authority',
    status: 'Active',
    use_case: 'Transit Safety',
    impact_level: 'Medium',
    documentation_url: 'https://example.gov/transit-incident-classifier',
    current_version: '1.7.3',
    data_used: 'Incident descriptions, route identifiers, time, location, historical incident categories',
    decision_type: 'Incident category recommendation',
    purpose: 'Route transit reports faster while preserving staff review for sensitive cases.',
    used_by: 'Regional Transit Authority',
    location: 'Allegheny County',
    year_deployed: 2024,
    year_introduced: 2023,
  },
  {
    id: 'seed-alg-language-access',
    name: 'Language Access Routing System',
    description: 'Routes public-service requests to interpreters and multilingual staff based on language needs and urgency.',
    organization: 'Office of Immigrant and Refugee Affairs',
    status: 'Active',
    use_case: 'Language Access',
    impact_level: 'Medium',
    documentation_url: 'https://example.gov/language-access-routing',
    current_version: '1.3.0',
    data_used: 'Requested language, service category, appointment time, staff availability',
    decision_type: 'Interpreter routing recommendation',
    purpose: 'Improve access to public services for residents who need language support.',
    used_by: 'Public Service Intake Desk',
    location: 'Pittsburgh',
    year_deployed: 2025,
    year_introduced: 2024,
  },
  {
    id: 'seed-alg-wage-compliance',
    name: 'Wage Compliance Risk Model',
    description: 'Flags employers for wage-theft investigation based on complaint patterns and payroll-risk indicators.',
    organization: 'Labor Standards Office',
    status: 'Under Review',
    use_case: 'Employment',
    impact_level: 'High',
    documentation_url: 'https://example.gov/wage-compliance-risk',
    current_version: '0.8.0',
    data_used: 'Worker complaints, prior violations, industry category, payroll audit history',
    decision_type: 'Investigation priority score',
    purpose: 'Help labor investigators prioritize potential wage violations for review.',
    used_by: 'Labor Standards Office',
    location: 'Pittsburgh',
    year_deployed: 2026,
    year_introduced: 2025,
  },
];

const extraStories = [
  {
    id: 'seed-story-benefits-1',
    title: 'My application was flagged and nobody could explain why',
    city: 'McKeesport',
    summary: 'A resident describes a benefits delay after an eligibility system flagged their application for review.',
    content: 'My benefits application was marked for extra review, but the notice did not explain what information looked wrong. I had to bring the same paperwork three times before anyone could tell me what record they were checking.',
    image_url: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800',
    use_case: 'Benefits Administration',
    story_type: 'text',
    created_date: '2026-04-05T14:00:00.000Z',
  },
  {
    id: 'seed-story-benefits-2',
    title: 'The flag was fixed, but rent was due before the review ended',
    city: 'Pittsburgh',
    summary: 'A community member explains how a delayed benefit review created a short-term housing crisis.',
    content: 'The worker eventually fixed the mismatch, but the review took almost a month. During that time I was choosing between paying rent and buying groceries.',
    image_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800',
    use_case: 'Benefits Administration',
    story_type: 'voice',
    voice_excerpts: [
      { label: 'Delay', text: 'The review took almost a month even though the mismatch was simple.' },
      { label: 'Impact', text: 'The delay forced me to choose between rent and groceries.' },
    ],
    created_date: '2026-04-07T14:00:00.000Z',
  },
  {
    id: 'seed-story-emergency-1',
    title: 'The dispatch category did not match what was happening',
    city: 'Pittsburgh',
    summary: 'A caller describes concern that a triage category understated an urgent safety issue.',
    content: 'The request was categorized as routine, but there were people outside who needed help right away. The dispatcher was kind, but the suggested category did not match the situation.',
    image_url: 'https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b?w=800',
    use_case: 'Emergency Services',
    story_type: 'text',
    created_date: '2026-04-09T14:00:00.000Z',
  },
  {
    id: 'seed-story-library-1',
    title: 'The recommendation helped me find a job workshop',
    city: 'Carrick',
    summary: 'A resident shares a positive experience with a public resource recommendation tool.',
    content: 'The library recommendation pointed me to a resume workshop at a branch I could reach by bus. I would not have known about it otherwise.',
    image_url: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800',
    use_case: 'Community Services',
    story_type: 'text',
    created_date: '2026-04-12T14:00:00.000Z',
  },
  {
    id: 'seed-story-inspection-1',
    title: 'Our building stayed low priority after repeated complaints',
    city: 'Wilkinsburg',
    summary: 'Tenants question how an inspection scheduler ranks buildings with repeated maintenance complaints.',
    content: 'We reported heat and water issues more than once, but the inspection date kept moving. If complaints are part of the system, I want to know why our building stayed low on the list.',
    image_url: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800',
    use_case: 'Housing Inspections',
    story_type: 'video',
    video_excerpts: [
      { label: 'Problem', text: 'The inspection date kept moving even after repeated complaints.' },
      { label: 'Question', text: 'Tenants want to know how complaint history affects scheduling.' },
    ],
    created_date: '2026-04-14T14:00:00.000Z',
  },
  {
    id: 'seed-story-transit-1',
    title: 'My safety report was routed to maintenance instead',
    city: 'Pittsburgh',
    summary: 'A transit rider reports that an incident category sent a safety concern to the wrong team.',
    content: 'I submitted a safety report after an incident at the stop, but the follow-up said it was routed as maintenance. The category matters because it changes who responds.',
    image_url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800',
    use_case: 'Transit Safety',
    story_type: 'text',
    created_date: '2026-04-17T14:00:00.000Z',
  },
  {
    id: 'seed-story-language-1',
    title: 'The interpreter routing finally got me to the right person',
    city: 'Beechview',
    summary: 'A resident describes a successful language access routing experience.',
    content: 'When I requested language support, the appointment was routed to someone who could help in Spanish. It saved me from bringing my child to translate.',
    image_url: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800',
    use_case: 'Language Access',
    story_type: 'text',
    created_date: '2026-04-19T14:00:00.000Z',
  },
  {
    id: 'seed-story-wage-1',
    title: 'Workers need to know how employers get flagged',
    city: 'Pittsburgh',
    summary: 'A worker asks for transparency about wage compliance investigation priorities.',
    content: 'A lot of us filed complaints about late pay, but we do not know how the office decides which employers to investigate first. Workers should know what information counts.',
    image_url: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800',
    use_case: 'Employment',
    story_type: 'text',
    created_date: '2026-04-21T14:00:00.000Z',
  },
  {
    id: 'seed-story-pending-1',
    title: 'Pending testimony about a school risk score',
    city: 'Pittsburgh',
    summary: 'A parent describes confusion about a school risk score and asks for clearer notice.',
    content: 'Our family received a notice about a risk score, but it was not clear what information was used or how we could respond. We need a way to ask questions before support decisions are made.',
    image_url: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800',
    use_case: 'Student Support',
    story_type: 'text',
    moderation_status: 'PENDING',
    created_date: '2026-04-23T14:00:00.000Z',
  },
  {
    id: 'seed-story-flagged-1',
    title: 'Flagged testimony about child welfare screening',
    city: 'Pittsburgh',
    summary: 'A testimony held for additional moderator review before publication.',
    content: 'A family describes a difficult child welfare screening experience and asks for clearer explanations about how prior records influence current decisions.',
    image_url: 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=800',
    use_case: 'Child Welfare',
    story_type: 'text',
    moderation_status: 'FLAGGED',
    created_date: '2026-04-25T14:00:00.000Z',
  },
];

const extraEvents = [
  {
    id: 'seed-event-benefits-clinic',
    title: 'Benefits Algorithm Help Clinic',
    description: 'A walk-in session for residents who want help understanding benefit application flags and review notices.',
    date: '2026-05-28',
    time: '5:30 PM',
    location: 'Hill District Community Center',
    isVirtual: false,
    registrationLink: 'https://example.com/register/benefits-help-clinic',
    tags: ['Workshop', 'Benefits'],
    imageURL: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800',
  },
  {
    id: 'seed-event-admin-training',
    title: 'Partner Admin Dashboard Training',
    description: 'Training for partner organizations on reviewing testimonies, comments, and community events.',
    date: '2026-06-03',
    time: '1:00 PM',
    location: 'Virtual (Zoom)',
    isVirtual: true,
    registrationLink: 'https://example.com/register/admin-training',
    tags: ['Training', 'Admin'],
    imageURL: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800',
  },
  {
    id: 'seed-event-language-access',
    title: 'Language Access Listening Session',
    description: 'Community discussion about interpreter routing and access to public services.',
    date: '2026-06-10',
    time: '6:30 PM',
    location: 'Beechview Healthy Active Living Center',
    isVirtual: false,
    registrationLink: 'https://example.com/register/language-access-session',
    tags: ['Town Hall', 'Language Access'],
    imageURL: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800',
  },
  {
    id: 'seed-event-wage-roundtable',
    title: 'Worker Rights and Algorithmic Enforcement Roundtable',
    description: 'Roundtable on wage compliance screening, worker complaints, and public accountability.',
    date: '2026-06-18',
    time: '4:00 PM',
    location: 'Downtown Labor Center',
    isVirtual: false,
    registrationLink: 'https://example.com/register/wage-roundtable',
    tags: ['Panel', 'Employment'],
    imageURL: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800',
  },
];

const seededCommentThreads = [
  {
    testimonySourceId: 'seed-story-benefits-1',
    userEmail: 'jamal.community@algostories.local',
    content: 'This is exactly why notices need to explain what record triggered a review.',
    status: ModerationStatus.APPROVED,
    replies: [
      {
        userEmail: 'maria.facilitator@algostories.local',
        content: 'We can add this case to the next benefits clinic agenda.',
        status: ModerationStatus.APPROVED,
      },
    ],
  },
  {
    testimonySourceId: 'seed-story-inspection-1',
    userEmail: 'grace.community@algostories.local',
    content: 'Inspection scheduling should show tenants where their complaint sits in the queue.',
    status: ModerationStatus.APPROVED,
    replies: [
      {
        userEmail: 'leila.org@algostories.local',
        content: 'This would be a useful transparency requirement for the policy brief.',
        status: ModerationStatus.PENDING,
      },
    ],
  },
  {
    testimonySourceId: 'seed-story-transit-1',
    userEmail: 'toni.community@algostories.local',
    content: 'Routing categories need an appeal or correction path.',
    status: ModerationStatus.APPROVED,
    replies: [],
  },
  {
    testimonySourceId: 'seed-story-pending-1',
    userEmail: 'mei.community@algostories.local',
    content: 'This question should be reviewed before it appears publicly.',
    status: ModerationStatus.PENDING,
    replies: [],
  },
];

const seededBriefings = [
  {
    title: 'Housing Prioritization Community Signals',
    slug: 'housing-prioritization-community-signals',
    briefingType: 'ALGORITHM_SPECIFIC',
    targetUseCase: 'Housing Prioritization',
    executiveSummary: 'Residents want clearer explanations, more community input, and review paths for housing prioritization systems.',
    keyFindings: ['Community members want participatory oversight.', 'Housing status and past records can be misread.', 'Appeal paths need to be visible.'],
    recommendations: ['Publish plain-language criteria.', 'Add tenant-facing status updates.', 'Review outcomes with partner organizations.'],
  },
  {
    title: 'Benefits Review Delay Watch',
    slug: 'benefits-review-delay-watch',
    briefingType: 'THEMATIC',
    targetTheme: 'Benefits delays',
    executiveSummary: 'Community testimony shows how review flags can create short-term harm even when corrected later.',
    keyFindings: ['Flagged applications need clear notices.', 'Review timelines affect housing and food security.'],
    recommendations: ['Show the reason for each review flag.', 'Escalate cases with urgent rent or food deadlines.'],
  },
  {
    title: 'Community Engagement Review Workflow',
    slug: 'engagement-moderation-readiness',
    briefingType: 'CROSS_CUTTING',
    targetTheme: 'Moderation workflow',
    executiveSummary: 'Community engagement records cover approved, pending, and flagged moderation states for staff review.',
    keyFindings: ['Admin queues include pending content for review.', 'Public pages only show approved content.'],
    recommendations: ['Review approve, reject, and flag actions after deployment.'],
  },
];

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function mapStatus(value) {
  if (value === 'Under Review') return AlgorithmStatus.UNDER_REVIEW;
  if (value === 'Deprecated') return AlgorithmStatus.DEPRECATED;
  if (value === 'Proposed') return AlgorithmStatus.PROPOSED;
  return AlgorithmStatus.ACTIVE;
}

function mapImpact(value) {
  if (value === 'High') return ImpactLevel.HIGH;
  if (value === 'Medium') return ImpactLevel.MEDIUM;
  if (value === 'Low') return ImpactLevel.LOW;
  return null;
}

function mapEventType(event) {
  const text = `${event.title} ${(event.tags || []).join(' ')}`.toLowerCase();
  if (text.includes('workshop')) return EventType.WORKSHOP;
  if (text.includes('town hall')) return EventType.TOWN_HALL;
  if (text.includes('training')) return EventType.TRAINING;
  if (text.includes('panel')) return EventType.PANEL;
  if (text.includes('office hours')) return EventType.OFFICE_HOURS;
  return EventType.OTHER;
}

function toTime24(value) {
  const match = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return '12:00';

  let hour = Number(match[1]);
  const minute = match[2];
  const period = match[3].toUpperCase();
  if (period === 'PM' && hour !== 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;
  return `${String(hour).padStart(2, '0')}:${minute}`;
}

async function seedRoles() {
  const roles = [
    ['ADMIN', 'Full access for managing the platform.'],
    ['FACILITATOR', 'Runs community sessions and helps submit testimonies.'],
    ['ORG_MEMBER', 'Partner organization user.'],
    ['RESEARCHER', 'Read-only access for aggregate research work.'],
    ['COMMUNITY_MEMBER', 'Regular public user.'],
  ];

  const savedRoles = new Map();
  for (const [name, description] of roles) {
    const role = await prisma.role.upsert({
      where: { name },
      update: { description },
      create: { name, description },
    });
    savedRoles.set(name, role);
  }
  return savedRoles;
}

async function addRole(userId, roleId) {
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId, roleId } },
    update: {},
    create: { userId, roleId },
  });
}

async function main() {
  const jurisdiction = await prisma.jurisdiction.upsert({
    where: { id: jurisdictionId },
    update: {},
    create: {
      id: jurisdictionId,
      name: 'Pittsburgh',
      state: 'PA',
      config: {
        contact: { email: 'algohub@pitt.edu' },
        features: { public_stories_enabled: true },
      },
    },
  });

  const roles = await seedRoles();

  const taxonomyLabels = [
    'Benefits Administration',
    'Child Welfare',
    'Community Services',
    'Education',
    'Emergency Services',
    'Employment',
    'Fraud Detection',
    'Housing',
    'Housing Inspections',
    'Housing Prioritization',
    'Language Access',
    'Student Support',
    'Traffic Management',
    'Transit Safety',
  ];

  for (const label of taxonomyLabels) {
    await prisma.sharedTaxonomy.upsert({
      where: { id: `use_case:${slugify(label)}` },
      update: { label },
      create: {
        id: `use_case:${slugify(label)}`,
        category: 'use_case',
        label,
        jurisdictionId: jurisdiction.id,
      },
    });
  }

  const organization = await prisma.organization.upsert({
    where: { slug: 'algo-stories-team' },
    update: {},
    create: {
      jurisdictionId: jurisdiction.id,
      name: 'AlgoStories Team',
      slug: 'algo-stories-team',
      role: 'community_partner',
      description: 'Project partner organization for baseline accounts and content.',
    },
  });

  const organizationsBySlug = new Map([['algo-stories-team', organization]]);
  for (const org of extraOrganizations) {
    const savedOrg = await prisma.organization.upsert({
      where: { slug: org.slug },
      update: {
        name: org.name,
        description: org.description,
        contactEmail: org.contactEmail,
        websiteUrl: org.websiteUrl,
        role: org.role,
        isActive: true,
      },
      create: {
        jurisdictionId: jurisdiction.id,
        name: org.name,
        slug: org.slug,
        description: org.description,
        contactEmail: org.contactEmail,
        websiteUrl: org.websiteUrl,
        role: org.role,
      },
    });
    organizationsBySlug.set(org.slug, savedOrg);
  }

  const seedUsers = [
    ['admin@algostories.local', 'Development Admin', 'ADMIN', 'algo-stories-team'],
    ['facilitator@algostories.local', 'Development Facilitator', 'FACILITATOR', 'algo-stories-team'],
    ['orgmember@algostories.local', 'Development Org Member', 'ORG_MEMBER', 'algo-stories-team'],
    ['researcher@algostories.local', 'Development Researcher', 'RESEARCHER', 'algo-stories-team'],
    ['community@algostories.local', 'Development Community Member', 'COMMUNITY_MEMBER', 'algo-stories-team'],
    ...extraUsers,
  ];

  const usersByRole = new Map();
  const usersByEmail = new Map();
  for (const [email, name, roleName, orgSlug] of seedUsers) {
    const organizationId = organizationsBySlug.get(orgSlug)?.id || organization.id;
    const user = await prisma.user.upsert({
      where: { email },
      update: { name, organizationId },
      create: {
        jurisdictionId: jurisdiction.id,
        email,
        name,
        organizationId,
      },
    });
    await addRole(user.id, roles.get(roleName).id);
    if (!usersByRole.has(roleName)) usersByRole.set(roleName, user);
    usersByEmail.set(email, user);
  }

  const algorithmsByUseCase = new Map();

  for (const algorithm of [...algorithmsData, ...extraAlgorithms]) {
    const savedAlgorithm = await prisma.algorithm.upsert({
      where: { sourceId: algorithm.id },
      update: {
        name: algorithm.name,
        description: algorithm.description,
        status: mapStatus(algorithm.status),
        impactLevel: mapImpact(algorithm.impact_level),
      },
      create: {
        sourceId: algorithm.id,
        jurisdictionId: jurisdiction.id,
        name: algorithm.name,
        slug: slugify(algorithm.name),
        description: algorithm.description,
        purpose: algorithm.purpose,
        agencyName: algorithm.used_by || algorithm.organization,
        agencyType: algorithm.organization,
        useCase: algorithm.use_case,
        location: algorithm.location,
        dataUsed: algorithm.data_used,
        decisionType: algorithm.decision_type,
        yearIntroduced: algorithm.year_introduced,
        yearDeployed: algorithm.year_deployed,
        status: mapStatus(algorithm.status),
        currentVersion: algorithm.current_version,
        impactLevel: mapImpact(algorithm.impact_level),
        officialDocumentationUrl: algorithm.documentation_url,
      },
    });

    await prisma.algorithmDocument.upsert({
      where: { id: `${savedAlgorithm.id}` },
      update: {
        title: `${savedAlgorithm.name} documentation`,
        sourceUrl: algorithm.documentation_url,
      },
      create: {
        id: savedAlgorithm.id,
        algorithmId: savedAlgorithm.id,
        jurisdictionId: jurisdiction.id,
        title: `${savedAlgorithm.name} documentation`,
        sourceUrl: algorithm.documentation_url,
      },
    });

    await prisma.algorithmClaim.upsert({
      where: { id: savedAlgorithm.id },
      update: {
        claimText: algorithm.purpose || algorithm.description,
        claimSource: 'Seed data',
      },
      create: {
        id: savedAlgorithm.id,
        algorithmId: savedAlgorithm.id,
        jurisdictionId: jurisdiction.id,
        claimText: algorithm.purpose || algorithm.description,
        claimSource: 'Seed data',
      },
    });

    if (!algorithmsByUseCase.has(savedAlgorithm.useCase)) {
      algorithmsByUseCase.set(savedAlgorithm.useCase, []);
    }
    algorithmsByUseCase.get(savedAlgorithm.useCase).push(savedAlgorithm);
  }

  const testimoniesBySourceId = new Map();
  for (const story of [...storiesData, ...extraStories]) {
    const savedTestimony = await prisma.testimony.upsert({
      where: { sourceId: story.id },
      update: {
        title: story.title,
        summary: story.summary,
        narrativeText: story.content,
        moderationStatus: story.moderation_status || ModerationStatus.APPROVED,
      },
      create: {
        sourceId: story.id,
        jurisdictionId: jurisdiction.id,
        title: story.title,
        summary: story.summary,
        city: story.city,
        imageUrl: story.image_url,
        submitterName: null,
        isAnonymous: true,
        userId: usersByRole.get('COMMUNITY_MEMBER').id,
        partnerOrgId: organization.id,
        facilitatorId: usersByRole.get('FACILITATOR').id,
        narrativeText: story.content,
        submissionMethod: SubmissionMethod.WEB_FORM,
        affectedDomain: story.use_case,
        aiThemes: story.video_excerpts || story.voice_excerpts || [],
        moderationStatus: story.moderation_status || ModerationStatus.APPROVED,
        submittedAt: new Date(story.created_date),
      },
    });
    testimoniesBySourceId.set(story.id, savedTestimony);

    const keyExcerpts = story.video_excerpts || story.voice_excerpts || [];
    await prisma.testimonyBrief.upsert({
      where: { testimonyId: savedTestimony.id },
      update: { summary: story.summary, keyExcerpts },
      create: {
        testimonyId: savedTestimony.id,
        jurisdictionId: jurisdiction.id,
        summary: story.summary,
        keyExcerpts,
        modelName: 'seed-import',
        reviewStatus: ReviewStatus.REVIEWED,
      },
    });

    const matchingAlgorithms = algorithmsByUseCase.get(story.use_case) || [];
    for (const algorithm of matchingAlgorithms) {
      await prisma.testimonyAlgorithmLink.upsert({
        where: {
          testimonyId_algorithmId: {
            testimonyId: savedTestimony.id,
            algorithmId: algorithm.id,
          },
        },
        update: {},
        create: {
          testimonyId: savedTestimony.id,
          algorithmId: algorithm.id,
          linkType: TestimonyLinkType.SUBMITTER_IDENTIFIED,
          confidence: 1,
        },
      });
    }
  }

  const firstTestimony = await prisma.testimony.findFirst({ where: { jurisdictionId: jurisdiction.id } });
  const communityUser = usersByRole.get('COMMUNITY_MEMBER');
  if (firstTestimony) {
    const seedCommentContent = 'This thread shows how residents can discuss a published testimony.';
    const comment =
      (await prisma.comment.findFirst({
        where: {
          testimonyId: firstTestimony.id,
          userId: communityUser.id,
          content: seedCommentContent,
        },
      })) ||
      (await prisma.comment.create({
        data: {
          jurisdictionId: jurisdiction.id,
          testimonyId: firstTestimony.id,
          userId: communityUser.id,
          authorName: communityUser.name,
          content: seedCommentContent,
          moderationStatus: ModerationStatus.APPROVED,
        },
      }));

    await prisma.commentLike.upsert({
      where: { commentId_userId: { commentId: comment.id, userId: communityUser.id } },
      update: {},
      create: { commentId: comment.id, userId: communityUser.id },
    });

    for (const reactionType of [ReactionType.EYE_OPENING, ReactionType.SUPPORT]) {
      await prisma.testimonyReaction.upsert({
        where: {
          testimonyId_userId_reactionType: {
            testimonyId: firstTestimony.id,
            userId: communityUser.id,
            reactionType,
          },
        },
        update: {},
        create: {
          jurisdictionId: jurisdiction.id,
          testimonyId: firstTestimony.id,
          userId: communityUser.id,
          reactionType,
        },
      });
    }
  }

  for (const thread of seededCommentThreads) {
    const testimony = testimoniesBySourceId.get(thread.testimonySourceId);
    const user = usersByEmail.get(thread.userEmail);
    if (!testimony || !user) continue;

    const comment =
      (await prisma.comment.findFirst({
        where: {
          testimonyId: testimony.id,
          userId: user.id,
          content: thread.content,
        },
      })) ||
      (await prisma.comment.create({
        data: {
          jurisdictionId: jurisdiction.id,
          testimonyId: testimony.id,
          userId: user.id,
          authorName: user.name,
          content: thread.content,
          moderationStatus: thread.status,
        },
      }));

    for (const likeUser of [usersByEmail.get('community@algostories.local'), usersByEmail.get('mei.community@algostories.local')]) {
      if (!likeUser) continue;
      await prisma.commentLike.upsert({
        where: { commentId_userId: { commentId: comment.id, userId: likeUser.id } },
        update: {},
        create: { commentId: comment.id, userId: likeUser.id },
      });
    }

    for (const reply of thread.replies) {
      const replyUser = usersByEmail.get(reply.userEmail);
      if (!replyUser) continue;
      await prisma.comment.findFirst({
        where: {
          testimonyId: testimony.id,
          userId: replyUser.id,
          content: reply.content,
        },
      }) ||
        (await prisma.comment.create({
          data: {
            jurisdictionId: jurisdiction.id,
            testimonyId: testimony.id,
            userId: replyUser.id,
            parentCommentId: comment.id,
            authorName: replyUser.name,
            content: reply.content,
            moderationStatus: reply.status,
          },
        }));
    }
  }

  const reactionUsers = [
    usersByEmail.get('community@algostories.local'),
    usersByEmail.get('jamal.community@algostories.local'),
    usersByEmail.get('grace.community@algostories.local'),
    usersByEmail.get('toni.community@algostories.local'),
    usersByEmail.get('mei.community@algostories.local'),
  ].filter(Boolean);

  const approvedTestimonies = [...testimoniesBySourceId.values()].filter(
    (testimony) => testimony.moderationStatus === ModerationStatus.APPROVED,
  );

  for (const [testimonyIndex, testimony] of approvedTestimonies.entries()) {
    for (const [userIndex, user] of reactionUsers.entries()) {
      const reactionTypes = [];
      if ((testimonyIndex + userIndex) % 2 === 0) reactionTypes.push(ReactionType.SUPPORT);
      if ((testimonyIndex + userIndex) % 3 === 0) reactionTypes.push(ReactionType.EYE_OPENING);

      for (const reactionType of reactionTypes) {
        await prisma.testimonyReaction.upsert({
          where: {
            testimonyId_userId_reactionType: {
              testimonyId: testimony.id,
              userId: user.id,
              reactionType,
            },
          },
          update: {},
          create: {
            jurisdictionId: jurisdiction.id,
            testimonyId: testimony.id,
            userId: user.id,
            reactionType,
          },
        });
      }
    }
  }

  for (const briefing of seededBriefings) {
    const targetAlgorithm = briefing.targetUseCase
      ? algorithmsByUseCase.get(briefing.targetUseCase)?.[0]
      : null;

    await prisma.briefing.upsert({
      where: { slug: briefing.slug },
      update: {
        title: briefing.title,
        executiveSummary: briefing.executiveSummary,
        keyFindings: briefing.keyFindings,
        recommendations: briefing.recommendations,
        testimonyCount: approvedTestimonies.length,
      },
      create: {
        jurisdictionId: jurisdiction.id,
        title: briefing.title,
        slug: briefing.slug,
        briefingType: BriefingType[briefing.briefingType],
        targetAlgorithmId: targetAlgorithm?.id,
        targetTheme: briefing.targetTheme || briefing.targetUseCase,
        testimonyCount: approvedTestimonies.length,
        executiveSummary: briefing.executiveSummary,
        keyFindings: briefing.keyFindings,
        recommendations: briefing.recommendations,
        generatedBy: 'seed',
        reviewStatus: ReviewStatus.PUBLISHED,
        publishedAt: new Date('2026-05-01T12:00:00.000Z'),
      },
    });
  }

  const newsTitles = [
    'Dashboard baseline data is available',
    'Language access routing listening session announced',
    'Housing prioritization briefing published',
  ];
  await prisma.newsUpdate.deleteMany({
    where: {
      jurisdictionId: jurisdiction.id,
      title: { in: newsTitles },
    },
  });

  await prisma.newsUpdate.createMany({
    data: [
      {
        jurisdictionId: jurisdiction.id,
        title: newsTitles[0],
        body: 'The database includes algorithms, testimonies, comments, reactions, events, organizations, users, and briefings for review.',
        updateType: NewsUpdateType.PLATFORM_UPDATE,
        publishedAt: new Date('2026-05-01T12:00:00.000Z'),
      },
      {
        jurisdictionId: jurisdiction.id,
        title: newsTitles[1],
        body: 'Community members can join a listening session about interpreter routing and public-service access.',
        updateType: NewsUpdateType.EVENT,
        publishedAt: new Date('2026-05-03T12:00:00.000Z'),
      },
      {
        jurisdictionId: jurisdiction.id,
        title: newsTitles[2],
        body: 'A briefing summarizes community signals about housing prioritization and appeals.',
        updateType: NewsUpdateType.NEWS,
        publishedAt: new Date('2026-05-05T12:00:00.000Z'),
      },
    ],
  });

  for (const event of [...eventsData, ...extraEvents]) {
    await prisma.communityEvent.upsert({
      where: { sourceId: event.id },
      update: {
        title: event.title,
        description: event.description,
      },
      create: {
        sourceId: event.id,
        jurisdictionId: jurisdiction.id,
        title: event.title,
        description: event.description,
        eventType: mapEventType(event),
        date: new Date(`${event.date}T${toTime24(event.time)}:00`),
        location: event.location,
        isVirtual: event.isVirtual,
        virtualLink: event.isVirtual ? event.registrationLink : null,
        organizerOrgId: organization.id,
        registrationRequired: Boolean(event.registrationLink),
        registrationUrl: event.registrationLink,
        imageUrl: event.imageURL,
      },
    });
  }

  console.log('Seed data loaded.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

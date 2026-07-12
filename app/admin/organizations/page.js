import { prisma } from '../../../lib/prisma';
import { getJurisdictionId } from '../../../lib/jurisdiction';
import { AdminOrganizationsManager } from './AdminOrganizationsManager';

export const dynamic = 'force-dynamic';

const staticPartnerLogos = {
  caasi: '/team-orgs/image9.jpg',
  'westend-power': '/team-orgs/image3.png',
  'west-end-power': '/team-orgs/image3.png',
  'neighborhood-allies': '/team-orgs/image6.png',
  'literacy-pittsburgh': '/team-orgs/image1.png',
  'community-empowerment-association': '/team-orgs/image4.png',
  'allegheny-county-library-association': '/team-orgs/image7.png',
};

export default async function AdminOrganizationsPage({ searchParams }) {
  const params = await searchParams;
  const jurisdictionId = getJurisdictionId();
  const search = String(params?.search || '').trim();
  const status = ['active', 'pending'].includes(String(params?.status || '')) ? String(params.status) : 'all';
  const where = {
    jurisdictionId,
    ...(search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { contactEmail: { contains: search, mode: 'insensitive' } },
        { role: { contains: search, mode: 'insensitive' } },
      ],
    } : {}),
    ...(status === 'active' ? { isActive: true } : {}),
    ...(status === 'pending' ? { isActive: false } : {}),
  };
  const [organizations, statusCounts] = await Promise.all([
    prisma.organization.findMany({
      where,
      orderBy: [
        { isActive: 'asc' },
        { createdAt: 'desc' },
        { name: 'asc' },
      ],
    }),
    prisma.organization.groupBy({
      by: ['isActive'],
      where: { jurisdictionId },
      _count: { isActive: true },
    }),
  ]);
  const counts = Object.fromEntries(statusCounts.map((item) => [item.isActive ? 'active' : 'pending', item._count.isActive]));
  const filters = { search, status };

  return (
    <AdminOrganizationsManager
      organizations={organizations.map(serializeOrganization)}
      counts={{ active: counts.active || 0, pending: counts.pending || 0 }}
      filters={filters}
      returnTo={buildOrganizationsHref(filters)}
    />
  );
}

function buildOrganizationsHref(filters) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.status !== 'all') params.set('status', filters.status);
  const query = params.toString();
  return `/admin/organizations${query ? `?${query}` : ''}`;
}

function serializeOrganization(organization) {
  const staticLogo = staticPartnerLogos[organization.slug] || staticPartnerLogos[slugify(organization.name)];
  const logoUrl = organization.logoUrl || staticLogo || null;
  return {
    ...organization,
    createdAt: organization.createdAt?.toISOString() || null,
    logoPreviewUrl: logoUrl?.startsWith('gcs://') ? `/api/organizations/${organization.id}/logo` : logoUrl,
  };
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

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

export default async function AdminOrganizationsPage() {
  const organizations = await prisma.organization.findMany({
    where: { jurisdictionId: getJurisdictionId() },
    orderBy: [
      { isActive: 'asc' },
      { createdAt: 'desc' },
      { name: 'asc' },
    ],
  });

  return <AdminOrganizationsManager organizations={organizations.map(serializeOrganization)} />;
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

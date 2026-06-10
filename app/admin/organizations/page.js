import { prisma } from '../../../lib/prisma';
import { getJurisdictionId } from '../../../lib/jurisdiction';
import { AdminOrganizationsManager } from './AdminOrganizationsManager';

export const dynamic = 'force-dynamic';

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
  return {
    ...organization,
    createdAt: organization.createdAt?.toISOString() || null,
    logoPreviewUrl: organization.logoUrl?.startsWith('gcs://') ? `/api/organizations/${organization.id}/logo` : organization.logoUrl,
  };
}

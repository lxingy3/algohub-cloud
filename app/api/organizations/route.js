import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { getJurisdictionId } from '../../../lib/jurisdiction';

export const dynamic = 'force-dynamic';

function logoUrlFor(organization) {
  if (!organization.logoUrl) return null;
  return organization.logoUrl.startsWith('gcs://')
    ? `/api/organizations/${organization.id}/logo`
    : organization.logoUrl;
}

function roleWhere(role) {
  if (!role) return {};
  if (role.toLowerCase() !== 'library') return { role };
  return {
    OR: [
      { role },
      { name: { contains: 'library', mode: 'insensitive' } },
      { description: { contains: 'library', mode: 'insensitive' } },
    ],
  };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const role = searchParams.get('role') || '';
  const limit = Math.min(Math.max(Number(searchParams.get('limit') || 20), 1), 50);
  const items = await prisma.organization.findMany({
    where: {
      jurisdictionId: getJurisdictionId(),
      isActive: true,
      ...roleWhere(role),
    },
    orderBy: { name: 'asc' },
    take: limit,
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      websiteUrl: true,
      logoUrl: true,
      role: true,
    },
  });

  return NextResponse.json({
    items: items.map((item) => ({ ...item, logoUrl: logoUrlFor(item) })),
    total: items.length,
  });
}

import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { getJurisdictionId } from '../../../../lib/jurisdiction';
import { requireAdmin } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const algorithms = await prisma.algorithm.findMany({
    where: { jurisdictionId: getJurisdictionId() },
    orderBy: { name: 'asc' },
    include: { _count: { select: { testimonyLinks: true } } },
  });

  const items = algorithms
    .filter((algorithm) => algorithm._count.testimonyLinks === 0)
    .map((algorithm) => ({
      id: algorithm.id,
      slug: algorithm.slug,
      name: algorithm.name,
      impactLevel: algorithm.impactLevel,
      testimonyCount: algorithm._count.testimonyLinks,
    }));

  return NextResponse.json({ items, total: items.length });
}

import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { getJurisdictionId } from '../../../../lib/jurisdiction';
import { requireAdmin } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const items = await prisma.testimony.findMany({
    where: { jurisdictionId: getJurisdictionId() },
    orderBy: { submittedAt: 'desc' },
    include: { user: true, algorithmLinks: { include: { algorithm: true } } },
  });

  return NextResponse.json({ items, total: items.length });
}

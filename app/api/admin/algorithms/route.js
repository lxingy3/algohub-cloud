import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { getJurisdictionId } from '../../../../lib/jurisdiction';
import { requireAdmin } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export async function POST(request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const formData = await request.formData();
  const name = String(formData.get('name') || '').trim();
  const algorithm = await prisma.algorithm.create({
    data: {
      jurisdictionId: getJurisdictionId(),
      name,
      slug: slugify(name),
      description: String(formData.get('description') || ''),
      useCase: String(formData.get('useCase') || 'Other'),
      location: String(formData.get('location') || 'Pittsburgh'),
      agencyName: String(formData.get('agencyName') || ''),
    },
  });

  const claimText = String(formData.get('claimText') || '').trim();
  if (claimText) {
    await prisma.algorithmClaim.create({
      data: {
        algorithmId: algorithm.id,
        jurisdictionId: getJurisdictionId(),
        claimText,
        claimSource: 'Admin form',
      },
    });
  }

  return NextResponse.redirect(new URL('/admin/algorithms', request.url), { status: 303 });
}

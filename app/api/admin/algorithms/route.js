import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { getJurisdictionId } from '../../../../lib/jurisdiction';
import { requireAdmin } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function optionalString(formData, name) {
  const value = String(formData.get(name) || '').trim();
  return value || null;
}

function optionalInt(formData, name) {
  const value = String(formData.get(name) || '').trim();
  return value ? Number(value) : null;
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
      slug: optionalString(formData, 'slug') || slugify(name),
      description: optionalString(formData, 'description'),
      purpose: optionalString(formData, 'purpose'),
      useCase: optionalString(formData, 'useCase') || 'Other',
      location: optionalString(formData, 'location') || 'Pittsburgh',
      agencyName: optionalString(formData, 'agencyName'),
      agencyType: optionalString(formData, 'agencyType'),
      dataUsed: optionalString(formData, 'dataUsed'),
      decisionType: optionalString(formData, 'decisionType'),
      yearIntroduced: optionalInt(formData, 'yearIntroduced'),
      yearDeployed: optionalInt(formData, 'yearDeployed'),
      status: optionalString(formData, 'status') || 'ACTIVE',
      currentVersion: optionalString(formData, 'currentVersion'),
      impactLevel: optionalString(formData, 'impactLevel'),
      officialDocumentationUrl: optionalString(formData, 'officialDocumentationUrl'),
      storyboardSvg: optionalString(formData, 'storyboardSvg'),
    },
  });

  const claimText = String(formData.get('claimText') || '').trim();
  if (claimText) {
    await prisma.algorithmClaim.create({
      data: {
        algorithmId: algorithm.id,
        jurisdictionId: getJurisdictionId(),
        claimText,
        claimSource: optionalString(formData, 'claimSource') || 'Admin form',
      },
    });
  }

  return NextResponse.redirect(new URL('/admin/algorithms', request.url), { status: 303 });
}

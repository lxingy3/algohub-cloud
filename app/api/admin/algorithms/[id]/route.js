import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { requireAdmin } from '../../../../../lib/auth';

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

export async function POST(request, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const { id } = await params;
  const formData = await request.formData();
  const action = String(formData.get('action') || 'update');
  const returnTo = String(formData.get('returnTo') || '/admin/algorithms');
  const algorithm = await prisma.algorithm.findFirst({
    where: { id, jurisdictionId: admin.jurisdictionId },
    select: { id: true },
  });
  if (!algorithm) return NextResponse.json({ error: 'Algorithm not found.' }, { status: 404 });

  if (action === 'delete') {
    await prisma.algorithm.delete({ where: { id } });
  } else {
    const name = String(formData.get('name') || '').trim();
    await prisma.algorithm.update({
      where: { id },
      data: {
        name,
        slug: optionalString(formData, 'slug') || slugify(name),
        description: optionalString(formData, 'description'),
        purpose: optionalString(formData, 'purpose'),
        agencyName: optionalString(formData, 'agencyName'),
        agencyType: optionalString(formData, 'agencyType'),
        useCase: optionalString(formData, 'useCase') || 'Other',
        location: optionalString(formData, 'location') || 'Pittsburgh',
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

    const claimText = optionalString(formData, 'claimText');
    const claimId = optionalString(formData, 'claimId');
    if (claimText && claimId) {
      const claim = await prisma.algorithmClaim.findFirst({
        where: { id: claimId, algorithmId: id, jurisdictionId: admin.jurisdictionId },
        select: { id: true },
      });
      if (!claim) return NextResponse.json({ error: 'Algorithm claim not found.' }, { status: 404 });
      await prisma.algorithmClaim.update({
        where: { id: claimId },
        data: {
          claimText,
          claimSource: optionalString(formData, 'claimSource') || 'Admin form',
        },
      });
    } else if (claimText) {
      await prisma.algorithmClaim.create({
        data: {
          algorithmId: id,
          jurisdictionId: admin.jurisdictionId,
          claimText,
          claimSource: optionalString(formData, 'claimSource') || 'Admin form',
        },
      });
    }
  }

  return NextResponse.redirect(new URL(returnTo.startsWith('/admin/algorithms') ? returnTo : '/admin/algorithms', request.url), { status: 303 });
}

import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { requireAdmin } from '../../../../../lib/auth';
import { getJurisdictionId } from '../../../../../lib/jurisdiction';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const { id } = await params;
  const formData = await request.formData();
  const action = String(formData.get('action') || 'save');
  const reviewStatus = action === 'publish' ? 'PUBLISHED' : action === 'review' ? 'REVIEWED' : 'DRAFT';
  const briefing = await prisma.briefing.findFirst({
    where: { id, jurisdictionId: getJurisdictionId() },
    select: { id: true },
  });
  if (!briefing) return NextResponse.json({ error: 'Briefing not found' }, { status: 404 });

  await prisma.briefing.update({
    where: { id },
    data: {
      title: text(formData, 'title') || 'Untitled briefing',
      executiveSummary: text(formData, 'executiveSummary') || null,
      patternAnalysis: text(formData, 'patternAnalysis') || null,
      keyFindings: lines(formData, 'keyFindings'),
      recommendations: lines(formData, 'recommendations'),
      reviewStatus,
      reviewedByUserId: admin.id,
      publishedAt: reviewStatus === 'PUBLISHED' ? new Date() : null,
    },
  });

  if (request.headers.get('accept')?.includes('application/json')) {
    return NextResponse.json({
      reviewStatus,
      message: reviewStatus === 'PUBLISHED' ? 'Published and ready on the public page.' : reviewStatus === 'REVIEWED' ? 'Review recorded. The briefing remains private.' : 'Draft saved. The briefing remains private.',
      publicPage: reviewStatus === 'PUBLISHED' ? 'Updated now' : 'Not published',
      mlRefresh: 'Not run. The saved charts and corpus results were left unchanged.',
    });
  }
  return NextResponse.redirect(new URL('/admin/briefings', request.url), { status: 303 });
}

function text(formData, key) {
  return String(formData.get(key) || '').trim();
}

function lines(formData, key) {
  return text(formData, key).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

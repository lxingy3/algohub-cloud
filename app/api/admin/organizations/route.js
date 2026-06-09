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
  await prisma.organization.create({
    data: {
      jurisdictionId: getJurisdictionId(),
      name,
      slug: slugify(name),
      contactEmail: String(formData.get('contactEmail') || ''),
      role: String(formData.get('role') || 'community_partner'),
      websiteUrl: String(formData.get('websiteUrl') || '') || null,
      description: String(formData.get('description') || '') || null,
    },
  });

  return NextResponse.redirect(new URL('/admin/organizations', request.url), { status: 303 });
}

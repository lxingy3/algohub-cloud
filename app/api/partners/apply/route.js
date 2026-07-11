import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { getJurisdictionId } from '../../../../lib/jurisdiction';

export const dynamic = 'force-dynamic';

function slugify(value) {
  const base = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return base || 'partner-application';
}

export async function POST(request) {
  const formData = await request.formData();
  const organizationName = String(formData.get('organizationName') || '').trim();
  const contactName = String(formData.get('contactName') || '').trim();
  const contactEmail = String(formData.get('contactEmail') || '').trim().toLowerCase();
  const websiteUrl = String(formData.get('websiteUrl') || '').trim();
  const message = String(formData.get('message') || '').trim();

  const validWebsite = !websiteUrl || /^https?:\/\//i.test(websiteUrl);
  if (
    !organizationName || organizationName.length > 255
    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail) || contactEmail.length > 255
    || contactName.length > 255
    || !message || message.length > 4000
    || websiteUrl.length > 2048 || !validWebsite
  ) {
    return NextResponse.redirect(new URL('/about?partner=missing#partner-application', request.url), { status: 303 });
  }

  await prisma.organization.create({
    data: {
      jurisdictionId: getJurisdictionId(),
      name: organizationName,
      slug: `${slugify(organizationName)}-${Date.now()}`,
      contactEmail,
      websiteUrl: websiteUrl || null,
      role: 'community_partner_application',
      isActive: false,
      description: [
        'Partner application submitted from the public About page.',
        contactName ? `Contact: ${contactName}` : '',
        `Message: ${message}`,
      ].filter(Boolean).join('\n'),
    },
  });

  return NextResponse.redirect(new URL('/about?partner=submitted#partner-application', request.url), { status: 303 });
}

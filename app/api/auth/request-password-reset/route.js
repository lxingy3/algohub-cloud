import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { getJurisdictionId } from '../../../../lib/jurisdiction';
import { normalizeRole } from '../../../../lib/roles';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const formData = await request.formData();
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const role = normalizeRole(formData.get('role'));

  if (email) {
    await prisma.user.findFirst({
      where: {
        email,
        primaryRoleName: role,
        jurisdictionId: getJurisdictionId(),
      },
      select: { id: true },
    });
  }

  return NextResponse.json({
    ok: true,
    emailConfigured: false,
    message: 'Email password reset is not configured yet. Please contact an admin to generate a reset link.',
  });
}

import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/prisma';
import { requireAdmin } from '../../../../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const { id } = await params;
  if (id === admin.id) {
    return NextResponse.redirect(new URL('/admin/users?error=self-delete', request.url), { status: 303 });
  }

  const user = await prisma.user.findFirst({
    where: { id, jurisdictionId: admin.jurisdictionId },
    select: { id: true },
  });
  if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

  try {
    await prisma.user.delete({ where: { id } });
    return NextResponse.redirect(new URL('/admin/users?success=deleted', request.url), { status: 303 });
  } catch (error) {
    console.error('Could not delete user', error);
    return NextResponse.redirect(new URL('/admin/users?error=delete-failed', request.url), { status: 303 });
  }
}

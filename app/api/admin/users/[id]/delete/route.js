import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/prisma';
import { requireAdmin } from '../../../../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const { id } = await params;
  const formData = await request.formData();
  const requestedReturnTo = String(formData.get('returnTo') || '/admin/users');
  const returnTo = requestedReturnTo.startsWith('/admin/users') ? requestedReturnTo : '/admin/users';
  if (id === admin.id) {
    return redirectWithNotice(request, returnTo, 'error', 'self-delete');
  }

  const user = await prisma.user.findFirst({
    where: { id, jurisdictionId: admin.jurisdictionId },
    select: { id: true },
  });
  if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

  try {
    await prisma.user.delete({ where: { id } });
    return redirectWithNotice(request, returnTo, 'success', 'deleted');
  } catch (error) {
    console.error('Could not delete user', error);
    return redirectWithNotice(request, returnTo, 'error', 'delete-failed');
  }
}

function redirectWithNotice(request, returnTo, key, value) {
  const url = new URL(returnTo, request.url);
  url.searchParams.set(key, value);
  return NextResponse.redirect(url, { status: 303 });
}

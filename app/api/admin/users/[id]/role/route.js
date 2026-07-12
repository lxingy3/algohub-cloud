import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/prisma';
import { requireAdmin } from '../../../../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const { id } = await params;
  const formData = await request.formData();
  const roleId = String(formData.get('roleId') || '');
  const returnTo = safeUsersReturnTo(formData.get('returnTo'));

  if (!roleId) {
    return redirectWithNotice(request, returnTo, 'error', 'role-missing');
  }

  const [user, role] = await Promise.all([
    prisma.user.findFirst({ where: { id, jurisdictionId: admin.jurisdictionId } }),
    prisma.role.findUnique({ where: { id: roleId } }),
  ]);

  if (!user || !role) {
    return redirectWithNotice(request, returnTo, 'error', 'role-missing');
  }
  if (id === admin.id && role.name !== 'ADMIN') {
    return redirectWithNotice(request, returnTo, 'error', 'self-role');
  }

  await prisma.$transaction([
    prisma.userRole.deleteMany({ where: { userId: id } }),
    prisma.userRole.create({ data: { userId: id, roleId } }),
    prisma.user.update({
      where: { id },
      data: { primaryRoleName: role.name },
    }),
  ]);

  return redirectWithNotice(request, returnTo, 'success', 'role-updated');
}

function safeUsersReturnTo(value) {
  const returnTo = String(value || '/admin/users');
  return returnTo.startsWith('/admin/users') ? returnTo : '/admin/users';
}

function redirectWithNotice(request, returnTo, key, value) {
  const url = new URL(returnTo, request.url);
  url.searchParams.set(key, value);
  return NextResponse.redirect(url, { status: 303 });
}

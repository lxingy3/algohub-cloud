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

  if (!roleId) {
    return NextResponse.redirect(new URL('/admin/users?error=role-missing', request.url), { status: 303 });
  }

  const [user, role] = await Promise.all([
    prisma.user.findFirst({ where: { id, jurisdictionId: admin.jurisdictionId } }),
    prisma.role.findUnique({ where: { id: roleId } }),
  ]);

  if (!user || !role) {
    return NextResponse.redirect(new URL('/admin/users?error=role-missing', request.url), { status: 303 });
  }
  if (id === admin.id && role.name !== 'ADMIN') {
    return NextResponse.redirect(new URL('/admin/users?error=self-role', request.url), { status: 303 });
  }

  await prisma.$transaction([
    prisma.userRole.deleteMany({ where: { userId: id } }),
    prisma.userRole.create({ data: { userId: id, roleId } }),
    prisma.user.update({
      where: { id },
      data: { primaryRoleName: role.name },
    }),
  ]);

  return NextResponse.redirect(new URL('/admin/users?success=role-updated', request.url), { status: 303 });
}

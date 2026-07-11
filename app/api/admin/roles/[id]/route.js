import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { requireAdmin } from '../../../../../lib/auth';

export const dynamic = 'force-dynamic';
const SYSTEM_ROLES = new Set(['ADMIN', 'COMMUNITY_MEMBER', 'FACILITATOR', 'ORG_MEMBER', 'RESEARCHER']);

export async function POST(request, { params }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const { id } = await params;
  const formData = await request.formData();
  const action = String(formData.get('action') || 'update');
  const role = await prisma.role.findUnique({
    where: { id },
    select: { id: true, name: true, _count: { select: { userRoles: true } } },
  });
  if (!role) return NextResponse.json({ error: 'Role not found.' }, { status: 404 });

  if (action === 'delete') {
    if (SYSTEM_ROLES.has(role.name)) {
      return NextResponse.redirect(new URL('/admin/users?error=role-protected', request.url), { status: 303 });
    }
    if (role._count.userRoles > 0) {
      return NextResponse.redirect(new URL('/admin/users?error=role-in-use', request.url), { status: 303 });
    }
    await prisma.role.delete({ where: { id } });
    return NextResponse.redirect(new URL('/admin/users', request.url), { status: 303 });
  }

  const name = String(formData.get('name') || '').trim().toUpperCase();
  const description = String(formData.get('description') || '').trim();

  if (!name) {
    return NextResponse.json({ error: 'Role name is required' }, { status: 400 });
  }
  if (SYSTEM_ROLES.has(role.name) && name !== role.name) {
    return NextResponse.redirect(new URL('/admin/users?error=role-protected', request.url), { status: 303 });
  }

  await prisma.role.update({
    where: { id },
    data: { name, description },
  });

  return NextResponse.redirect(new URL('/admin/users', request.url), { status: 303 });
}

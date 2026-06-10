export const allowedRoles = ['ADMIN', 'COMMUNITY_MEMBER', 'FACILITATOR', 'ORG_MEMBER', 'RESEARCHER'];

export function normalizeRole(value, fallback = 'COMMUNITY_MEMBER') {
  const role = String(value || fallback).trim().toUpperCase();
  return allowedRoles.includes(role) ? role : fallback;
}

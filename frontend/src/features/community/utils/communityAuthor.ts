import type { AuthUser } from '@/features/auth/api/auth';
import type { CommunityAuthor } from '../types/community';

/**
 * Build a CommunityAuthor preview matching the backend default handle normalization.
 */
export function buildCurrentAuthorSummary(user?: AuthUser | null): CommunityAuthor | null {
  if (!user) {
    return null;
  }

  const normalizedBase = user.name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 24);

  return {
    id: user.id,
    name: user.name,
    username: `${normalizedBase || 'hocvien'}${user.id}`,
    headline: 'Học viên SoftSkill AI',
    avatar_url: user.avatar_url ?? null,
  };
}

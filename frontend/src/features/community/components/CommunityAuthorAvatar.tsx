import { Link } from 'react-router';
import type { CommunityAuthor } from '../types/community';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return 'SS';
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
}

const AVATAR_TONES = [
  'bg-brand-100 text-brand-900 border-brand-200',
  'bg-teal-50 text-teal-800 border-teal-200',
  'bg-amber-50 text-amber-800 border-amber-200',
  'bg-sky-50 text-sky-800 border-sky-200',
  'bg-indigo-50 text-indigo-800 border-indigo-200',
];

interface CommunityAuthorAvatarProps {
  author: CommunityAuthor | null;
  size?: 'sm' | 'md';
  linkToProfile?: boolean;
}

export function CommunityAuthorAvatar({
  author,
  size = 'md',
  linkToProfile = false,
}: CommunityAuthorAvatarProps) {
  const sizeClass = size === 'sm' ? 'h-8 w-8 text-[11px]' : 'h-10 w-10 text-xs';
  const name = author?.name ?? 'Người dùng';
  const toneIndex = (author?.id ?? 0) % AVATAR_TONES.length;
  const toneClass = AVATAR_TONES[toneIndex] ?? AVATAR_TONES[0];

  const content = author?.avatar_url ? (
    <img
      src={author.avatar_url}
      alt={name}
      className={`${sizeClass} shrink-0 rounded-full border border-slate-200 object-cover`}
    />
  ) : (
    <span
      aria-hidden="true"
      className={`${sizeClass} ${toneClass} flex shrink-0 items-center justify-center rounded-full border font-bold tracking-tight`}
    >
      {getInitials(name)}
    </span>
  );

  if (linkToProfile && author?.id) {
    return (
      <Link
        to={`/profile/${author.id}`}
        aria-label={`Hồ sơ của ${name}`}
        className="rounded-full transition hover:opacity-85 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
      >
        {content}
      </Link>
    );
  }

  return content;
}

import React, { useState } from 'react';

export interface UserAvatarProps {
  avatarUrl?: string | null;
  name?: string | null;
  initials?: string;
  color?: string;
  size?: string;
  className?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  avatarUrl,
  name,
  initials,
  color = 'bg-blue-100 text-blue-800',
  size = 'h-10 w-10',
  className = '',
}) => {
  const [imageError, setImageError] = useState(false);

  const displayInitials =
    initials ||
    (name ?? 'HV')
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .slice(-2)
      .join('')
      .toUpperCase();

  if (avatarUrl && !imageError) {
    return (
      <img
        src={avatarUrl}
        alt={name || 'Avatar'}
        referrerPolicy="no-referrer"
        onError={() => setImageError(true)}
        className={`${size} shrink-0 rounded-full object-cover shadow-sm ${className}`}
      />
    );
  }

  return (
    <div
      className={`${size} ${color} flex shrink-0 items-center justify-center rounded-full text-xs font-bold ${className}`}
    >
      {displayInitials}
    </div>
  );
};

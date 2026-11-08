import React, { useState } from 'react';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { cn } from '../../lib/utils';

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

  return (
    <Avatar className={cn(size, 'shrink-0', className)}>
      {avatarUrl && !imageError ? (
        <img
          src={avatarUrl}
          alt={name || 'Avatar'}
          referrerPolicy="no-referrer"
          onError={() => setImageError(true)}
          className="aspect-square size-full rounded-full object-cover"
        />
      ) : (
        <AvatarFallback className={cn('text-xs font-bold', color)}>
          {displayInitials}
        </AvatarFallback>
      )}
    </Avatar>
  );
};

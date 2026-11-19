import React, { useRef } from 'react';
import { Calendar, Camera, Loader2, Pencil, UserCheck, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/layout/UserAvatar';
import { cn } from '@/core/utils/cn';
import type { UserProfileData } from '../types/profile';

export interface ProfileHeaderCardProps {
  profile: UserProfileData;
  isOwnProfile: boolean;
  onEditProfile?: () => void;
  onToggleFollow?: () => void;
  onUploadAvatar?: (file: File) => Promise<void> | void;
  isAvatarUploading?: boolean;
  isFollowing?: boolean;
  isFollowPending?: boolean;
}

export const ProfileHeaderCard: React.FC<ProfileHeaderCardProps> = ({
  profile,
  isOwnProfile,
  onEditProfile,
  onToggleFollow,
  onUploadAvatar,
  isAvatarUploading = false,
  isFollowing = false,
  isFollowPending = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, community_profile, stats } = profile;
  const username = community_profile?.username || user.name.toLowerCase().replace(/\s+/g, '');

  const joinedDateFormatted = user.created_at
    ? (() => {
        try {
          const date = new Date(user.created_at);
          return new Intl.DateTimeFormat('vi-VN', {
            month: 'numeric',
            year: 'numeric',
          }).format(date);
        } catch {
          return null;
        }
      })()
    : null;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
      {/* Decorative banner */}
      <div className="h-28 sm:h-36 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 relative" />

      {/* Main content */}
      <div className="px-6 pb-6 pt-0 relative">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 -mt-14 sm:-mt-16 mb-4">
          {/* Avatar with ring & Facebook-style upload button */}
          <div className="relative rounded-full ring-4 ring-white shadow-md w-fit bg-white group">
            <UserAvatar
              avatarUrl={user.avatar_url}
              name={user.name}
              size="h-24 w-24 sm:h-28 sm:w-28 text-xl"
            />
            {isOwnProfile && onUploadAvatar && (
              <>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isAvatarUploading}
                  aria-label="Cập nhật ảnh đại diện"
                  title="Cập nhật ảnh đại diện"
                  className="absolute bottom-0 right-0 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-slate-900/80 hover:bg-slate-900 text-white shadow-md border-2 border-white transition-all transform hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isAvatarUploading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Camera className="size-4" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      onUploadAvatar(file);
                    }
                    e.target.value = '';
                  }}
                />
              </>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 sm:self-end">
            {isOwnProfile ? (
              <Button
                onClick={onEditProfile}
                variant="outline"
                className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 font-medium"
              >
                <Pencil className="size-4 mr-1.5" />
                Chỉnh sửa hồ sơ
              </Button>
            ) : (
              <Button
                onClick={onToggleFollow}
                disabled={isFollowPending}
                variant={isFollowing ? 'outline' : 'default'}
                className={cn(
                  'rounded-xl font-medium transition',
                  !isFollowing && 'bg-blue-600 hover:bg-blue-700 text-white'
                )}
              >
                {isFollowPending ? (
                  <Loader2 className="size-4 animate-spin mr-1.5" />
                ) : isFollowing ? (
                  <UserCheck className="size-4 mr-1.5" />
                ) : (
                  <UserPlus className="size-4 mr-1.5" />
                )}
                {isFollowing ? 'Đang theo dõi' : 'Theo dõi'}
              </Button>
            )}
          </div>
        </div>

        {/* Identity & Bio */}
        <div className="space-y-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {user.name}
            </h1>
            <p className="text-sm font-semibold text-blue-600">@{username}</p>
          </div>

          {community_profile?.headline && (
            <p className="text-sm font-medium text-slate-600">
              {community_profile.headline}
            </p>
          )}

          {community_profile?.bio && (
            <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed pt-1">
              {community_profile.bio}
            </p>
          )}

          {/* Meta details & stats */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-sm">
            {joinedDateFormatted && (
              <div className="flex items-center gap-1.5 text-slate-500">
                <Calendar className="size-4 text-slate-400" />
                <span>Tham gia tháng {joinedDateFormatted}</span>
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-900">
                {stats.followers_count}
              </span>
              <span className="text-slate-500">người theo dõi</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-900">
                {stats.following_count}
              </span>
              <span className="text-slate-500">đang theo dõi</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import { useNavigate, useParams } from 'react-router';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { StudentPageLayout } from '@/components/layout/StudentPageLayout';
import { Button } from '@/components/ui/button';
import { getApiError } from '@/core/api/client';
import {
  useMyProfileQuery,
  useUserProfileQuery,
  useUploadAvatarMutation,
  useToggleFollow,
} from '../api/useProfile';
import { ProfileHeaderCard } from '../components/ProfileHeaderCard';
import { ProfileStatsCard } from '../components/ProfileStatsCard';
import { ProfileAchievements } from '../components/ProfileAchievements';
import { ProfilePostsList } from '../components/ProfilePostsList';
import { toast } from '@/components/ui/sonner';

function ProfileSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-label="Đang tải dữ liệu hồ sơ">
      {/* Header skeleton */}
      <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-xs">
        <div className="h-28 sm:h-36 bg-slate-200" />
        <div className="px-6 pb-6 pt-0">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 -mt-14 sm:-mt-16 mb-4">
            <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-full bg-slate-300 ring-4 ring-white" />
            <div className="flex gap-2 sm:self-end">
              <div className="h-9 w-32 rounded-xl bg-slate-200" />
              <div className="h-9 w-28 rounded-xl bg-slate-200" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-6 w-48 rounded-md bg-slate-200" />
            <div className="h-4 w-28 rounded-md bg-slate-200" />
            <div className="h-4 w-72 rounded-md bg-slate-200" />
          </div>
        </div>
      </div>

      {/* Stats skeleton */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
        <div className="h-5 w-40 rounded-md bg-slate-200 mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="h-20 rounded-xl bg-slate-100" />
          <div className="h-20 rounded-xl bg-slate-100" />
          <div className="h-20 rounded-xl bg-slate-100" />
        </div>
      </div>

      {/* Achievements skeleton */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
        <div className="h-5 w-44 rounded-md bg-slate-200 mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="h-28 rounded-xl bg-slate-100" />
          <div className="h-28 rounded-xl bg-slate-100" />
          <div className="h-28 rounded-xl bg-slate-100" />
          <div className="h-28 rounded-xl bg-slate-100" />
        </div>
      </div>

      {/* Posts skeleton */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
        <div className="h-5 w-40 rounded-md bg-slate-200 mb-4" />
        <div className="space-y-3">
          <div className="h-24 rounded-xl bg-slate-100" />
          <div className="h-24 rounded-xl bg-slate-100" />
        </div>
      </div>
    </div>
  );
}

export function ProfilePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isSpecificUser = Boolean(id);

  const myProfileQuery = useMyProfileQuery({ enabled: !isSpecificUser });
  const userProfileQuery = useUserProfileQuery(id);

  const activeQuery = isSpecificUser ? userProfileQuery : myProfileQuery;
  const { data: profile, isLoading, isError, error, refetch } = activeQuery;

  const uploadAvatarMutation = useUploadAvatarMutation();
  const toggleFollowMutation = useToggleFollow();

  const handleUploadAvatar = async (file: File) => {
    try {
      await uploadAvatarMutation.mutateAsync(file);
      toast.success('Cập nhật ảnh đại diện thành công');
    } catch (err: unknown) {
      const errorInfo = getApiError(err, 'Không thể tải lên ảnh đại diện. Vui lòng thử lại.');
      toast.error(errorInfo.message);
    }
  };

  const handleToggleFollow = () => {
    if (profile?.user.id) {
      toggleFollowMutation.mutate(profile.user.id);
    }
  };

  return (
    <StudentPageLayout active="/profile" title="Hồ sơ cá nhân">
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {isLoading && <ProfileSkeleton />}

        {isError && (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center shadow-xs">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-3">
              <AlertCircle className="size-6" />
            </div>
            <h2 className="text-base font-bold text-slate-900 mb-1">
              Không thể tải thông tin hồ sơ
            </h2>
            <p className="text-sm text-slate-500 mb-4 max-w-md mx-auto">
              {getApiError(error, 'Đã xảy ra sự cố khi tải thông tin cá nhân. Vui lòng kiểm tra lại kết nối.').message}
            </p>
            <Button
              onClick={() => refetch()}
              variant="outline"
              className="rounded-xl border-slate-200"
            >
              <RefreshCw className="size-4 mr-2" />
              Thử lại
            </Button>
          </div>
        )}

        {profile && !isLoading && (
          <>
            <ProfileHeaderCard
              profile={profile}
              isOwnProfile={profile.is_own_profile}
              isFollowing={profile.is_following}
              isFollowPending={toggleFollowMutation.isPending}
              onUploadAvatar={handleUploadAvatar}
              isAvatarUploading={uploadAvatarMutation.isPending}
              onEditProfile={() => navigate('/settings')}
              onToggleFollow={handleToggleFollow}
            />

            <ProfileStatsCard stats={profile.stats} />

            <ProfileAchievements achievements={profile.achievements} />

            <ProfilePostsList posts={profile.posts} />
          </>
        )}
      </div>
    </StudentPageLayout>
  );
}

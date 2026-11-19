import { CommunityAuthorAvatar } from './CommunityAuthorAvatar';
import { Button } from '@/components/ui/button';
import { useToggleFollowMutation } from '../api/useCommunityMutations';
import type { CommunityPersonResult } from '../types/community';

interface TrendingPeopleListProps {
  people: CommunityPersonResult[];
  isLoading?: boolean;
}

export function TrendingPeopleList({ people, isLoading = false }: TrendingPeopleListProps) {
  const toggleFollow = useToggleFollowMutation();

  if (isLoading) {
    return (
      <div className="divide-y divide-slate-100 p-4">
        {[1, 2, 3].map((idx) => (
          <div key={idx} className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 animate-pulse rounded-full bg-slate-100" />
              <div className="space-y-1.5">
                <div className="h-3.5 w-32 animate-pulse rounded-md bg-slate-100" />
                <div className="h-3 w-20 animate-pulse rounded-md bg-slate-100" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (people.length === 0) {
    return (
      <div className="px-6 py-12 text-center text-xs text-slate-500">
        Không tìm thấy trang cá nhân nào liên quan đến từ khóa này.
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      {people.map((person) => {
        const isFollowing = person.following;
        return (
          <div
            key={person.id}
            className="flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-slate-50/60"
          >
            <div className="flex min-w-0 items-center gap-3">
              <CommunityAuthorAvatar author={person} size="md" />
              <div className="min-w-0">
                <p className="truncate text-xs font-extrabold text-slate-900">{person.name}</p>
                <p className="truncate text-[11px] text-slate-500">@{person.username}</p>
                {person.headline && (
                  <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-600">
                    {person.headline}
                  </p>
                )}
              </div>
            </div>

            <Button
              type="button"
              size="sm"
              variant={isFollowing ? 'outline' : 'default'}
              disabled={toggleFollow.isPending && toggleFollow.variables === person.id}
              onClick={() => toggleFollow.mutate(person.id)}
              className="h-8 shrink-0 rounded-full px-4 text-xs font-semibold cursor-pointer"
            >
              {isFollowing ? 'Đang theo dõi' : 'Theo dõi'}
            </Button>
          </div>
        );
      })}
    </div>
  );
}

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { api, endpoints } from '@/core/api/client';
import type { CommunityFeedResponse, CommunityThreadDetailData } from '../types/community';
import { communityKeys } from './communityKeys';

export function useThreadDetail(postId: number | string) {
  const numericId = Number(postId);

  return useQuery({
    queryKey: communityKeys.thread(numericId),
    enabled: Number.isFinite(numericId) && numericId > 0,
    queryFn: async () => {
      const { data } = await api.get<{ data: CommunityThreadDetailData }>(
        endpoints.community.post(numericId),
      );
      return data.data;
    },
  });
}

export function useBranchReplies(postId: number | string, enabled = false) {
  const numericId = Number(postId);

  return useInfiniteQuery({
    queryKey: communityKeys.branchReplies(numericId),
    enabled: enabled && Number.isFinite(numericId) && numericId > 0,
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const { data } = await api.get<CommunityFeedResponse>(
        endpoints.community.postReplies(numericId),
        {
          params: {
            limit: 20,
            ...(pageParam ? { cursor: pageParam } : {}),
          },
        },
      );
      return data;
    },
    getNextPageParam: (lastPage) =>
      lastPage.meta.has_more ? (lastPage.meta.next_cursor ?? undefined) : undefined,
  });
}

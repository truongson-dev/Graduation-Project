import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { api, endpoints } from '@/core/api/client';
import type {
  CommunityFeedResponse,
  CommunityFeedTab,
  CommunityPersonResult,
  CommunityPost,
  CommunitySearchFilter,
  CommunityTopicTag,
  CommunityTrendingResponse,
} from '../types/community';
import { communityKeys } from './communityKeys';

export function useCommunityTopics() {
  return useQuery({
    queryKey: communityKeys.topics(),
    queryFn: async () => {
      const { data } = await api.get<{ data: CommunityTopicTag[] }>(endpoints.community.topics);
      return data.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCommunityTrending() {
  return useQuery({
    queryKey: communityKeys.trending(),
    queryFn: async () => {
      const { data } = await api.get<CommunityTrendingResponse>(endpoints.community.trending);
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCommunityFeed(
  tab: CommunityFeedTab,
  topic?: string | null,
  postIds?: number[] | null,
  options?: { enabled?: boolean },
) {
  const postIdsKey = postIds && postIds.length > 0 ? postIds.join(',') : null;
  const effectiveLimit =
    postIds && postIds.length > 0 ? Math.min(Math.max(postIds.length, 15), 30) : 15;

  return useInfiniteQuery({
    queryKey: communityKeys.feed(tab, topic, postIdsKey),
    enabled: options?.enabled ?? true,
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const { data } = await api.get<CommunityFeedResponse>(endpoints.community.feed, {
        params: {
          tab,
          limit: effectiveLimit,
          ...(topic ? { topic } : {}),
          ...(postIdsKey ? { post_ids: postIdsKey } : {}),
          ...(pageParam ? { cursor: pageParam } : {}),
        },
      });
      return data;
    },
    getNextPageParam: (lastPage) =>
      lastPage.meta.has_more ? (lastPage.meta.next_cursor ?? undefined) : undefined,
  });
}

export function useCommunitySearch(
  query: string,
  filter: CommunitySearchFilter = 'top',
  postIds?: number[] | null,
) {
  const normalized = query.trim();
  const postIdsKey = postIds && postIds.length > 0 ? postIds.join(',') : null;
  const isEnabled = normalized.length >= 2 || Boolean(postIdsKey);

  return useQuery({
    queryKey: communityKeys.search(normalized, filter, postIdsKey),
    enabled: isEnabled,
    queryFn: async () => {
      if (filter === 'people') {
        const { data } = await api.get<{ data: CommunityPersonResult[] }>(
          endpoints.community.search,
          {
            params: {
              q: normalized,
              filter: 'people',
              limit: 20,
              ...(postIdsKey ? { post_ids: postIdsKey } : {}),
            },
          },
        );
        return { people: data.data, posts: [] as CommunityPost[] };
      }

      const { data } = await api.get<{ data: CommunityPost[] }>(endpoints.community.search, {
        params: {
          q: normalized,
          filter,
          limit: 20,
          ...(postIdsKey ? { post_ids: postIdsKey } : {}),
        },
      });
      return { people: [] as CommunityPersonResult[], posts: data.data };
    },
  });
}

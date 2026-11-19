import type { CommunityFeedTab } from '../types/community';

export const communityKeys = {
  all: ['community'] as const,
  topics: () => [...communityKeys.all, 'topics'] as const,
  trending: () => [...communityKeys.all, 'trending'] as const,
  feeds: () => [...communityKeys.all, 'feed'] as const,
  feed: (tab: CommunityFeedTab, topic?: string | null, postIdsKey?: string | null) =>
    [
      ...communityKeys.feeds(),
      {
        tab,
        topic: topic ?? null,
        ...(postIdsKey ? { postIds: postIdsKey } : {}),
      },
    ] as const,
  searches: () => [...communityKeys.all, 'search'] as const,
  search: (query: string, filter: string = 'top', postIdsKey?: string | null) =>
    [
      ...communityKeys.searches(),
      query.trim(),
      filter,
      ...(postIdsKey ? [postIdsKey] : []),
    ] as const,
  threads: () => [...communityKeys.all, 'thread'] as const,
  thread: (postId: number | string) => [...communityKeys.threads(), Number(postId)] as const,
  branchReplies: (postId: number | string) =>
    [...communityKeys.threads(), Number(postId), 'branch-replies'] as const,
};

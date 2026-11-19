import {
  type InfiniteData,
  type QueryClient,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { api, endpoints } from '@/core/api/client';
import type {
  CommunityFeedResponse,
  CommunityPersonResult,
  CommunityPoll,
  CommunityPost,
  CommunityReactionType,
  CommunityThreadDetailData,
  CreateCommunityPostPayload,
  ToggleFollowResponse,
  ToggleReactionResponse,
  ToggleRepostResponse,
  VotePollResponse,
} from '../types/community';
import { communityKeys } from './communityKeys';

type SearchCacheShape =
  | CommunityPost[]
  | { people?: CommunityPersonResult[]; posts?: CommunityPost[] };

function updatePostRecursive(
  post: CommunityPost,
  matcher: (node: CommunityPost) => boolean,
  updater: (node: CommunityPost) => CommunityPost,
  captured?: Map<number, CommunityPost>,
): CommunityPost {
  let nextPost = post;
  if (matcher(post)) {
    if (captured && !captured.has(post.id)) {
      captured.set(post.id, post);
    }
    nextPost = updater(post);
  }

  if (nextPost.repost_of) {
    const nextRepost = updatePostRecursive(nextPost.repost_of, matcher, updater, captured);
    if (nextRepost !== nextPost.repost_of) {
      nextPost = { ...nextPost, repost_of: nextRepost };
    }
  }

  if (nextPost.quote_post) {
    const nextQuote = updatePostRecursive(nextPost.quote_post, matcher, updater, captured);
    if (nextQuote !== nextPost.quote_post) {
      nextPost = { ...nextPost, quote_post: nextQuote };
    }
  }

  if (nextPost.self_thread_items.length > 0) {
    let changed = false;
    const nextItems = nextPost.self_thread_items.map((item) => {
      const updatedItem = updatePostRecursive(item, matcher, updater, captured);
      if (updatedItem !== item) {
        changed = true;
      }
      return updatedItem;
    });

    if (changed) {
      nextPost = { ...nextPost, self_thread_items: nextItems };
    }
  }

  return nextPost;
}

function applyPostUpdaterToCaches<TSnapshot = CommunityPost>(
  queryClient: QueryClient,
  matcher: (node: CommunityPost) => boolean,
  updater: (node: CommunityPost) => CommunityPost,
  capture?: (node: CommunityPost) => TSnapshot,
): Map<number, TSnapshot> {
  const captured = new Map<number, TSnapshot>();

  const applyWithCapture = (node: CommunityPost): CommunityPost => {
    if (capture && !captured.has(node.id)) {
      captured.set(node.id, capture(node));
    }
    return updater(node);
  };

  queryClient.setQueriesData<InfiniteData<CommunityFeedResponse>>(
    { queryKey: communityKeys.feeds() },
    (oldData) => {
      if (!oldData) {
        return oldData;
      }

      return {
        ...oldData,
        pages: oldData.pages.map((page) => ({
          ...page,
          data: page.data.map((post) => updatePostRecursive(post, matcher, applyWithCapture)),
        })),
      };
    },
  );

  queryClient.setQueriesData<SearchCacheShape>(
    { queryKey: communityKeys.searches() },
    (oldData) => {
      if (!oldData || typeof oldData !== 'object') {
        return oldData;
      }

      if (Array.isArray(oldData)) {
        return oldData.map((post) => updatePostRecursive(post, matcher, applyWithCapture));
      }

      if (!Array.isArray(oldData.posts)) {
        return oldData;
      }

      return {
        ...oldData,
        posts: oldData.posts.map((post) => updatePostRecursive(post, matcher, applyWithCapture)),
      };
    },
  );

  const threadEntries = queryClient.getQueriesData({ queryKey: communityKeys.threads() });
  for (const [key, data] of threadEntries) {
    if (!data || typeof data !== 'object') {
      continue;
    }

    if ('post' in data && 'replies' in data) {
      const detail = data as CommunityThreadDetailData;
      queryClient.setQueryData<CommunityThreadDetailData>(key, {
        ...detail,
        post: updatePostRecursive(detail.post, matcher, applyWithCapture),
        ancestors: detail.ancestors.map((item) => updatePostRecursive(item, matcher, applyWithCapture)),
        self_thread_items: detail.self_thread_items.map((item) =>
          updatePostRecursive(item, matcher, applyWithCapture),
        ),
        replies: detail.replies.map((item) => updatePostRecursive(item, matcher, applyWithCapture)),
      });
    } else if ('pages' in data) {
      const branchData = data as InfiniteData<CommunityFeedResponse>;
      queryClient.setQueryData<InfiniteData<CommunityFeedResponse>>(key, {
        ...branchData,
        pages: branchData.pages.map((page) => ({
          ...page,
          data: page.data.map((post) => updatePostRecursive(post, matcher, applyWithCapture)),
        })),
      });
    }
  }

  return captured;
}

async function cancelPostListQueries(queryClient: QueryClient) {
  await Promise.all([
    queryClient.cancelQueries({ queryKey: communityKeys.feeds() }),
    queryClient.cancelQueries({ queryKey: communityKeys.searches() }),
    queryClient.cancelQueries({ queryKey: communityKeys.threads() }),
  ]);
}

function updatePeopleInSearchCaches(
  queryClient: QueryClient,
  userId: number,
  updater: (person: CommunityPersonResult) => CommunityPersonResult,
): Map<number, boolean> {
  const captured = new Map<number, boolean>();

  queryClient.setQueriesData<SearchCacheShape>(
    { queryKey: communityKeys.searches() },
    (oldData) => {
      if (!oldData || typeof oldData !== 'object' || Array.isArray(oldData) || !Array.isArray(oldData.people)) {
        return oldData;
      }

      return {
        ...oldData,
        people: oldData.people.map((person) => {
          if (person.id !== userId) {
            return person;
          }
          if (!captured.has(person.id)) {
            captured.set(person.id, person.following);
          }
          return updater(person);
        }),
      };
    },
  );

  return captured;
}

function invalidateCommunityCachesQuietly(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: communityKeys.feeds(), refetchType: 'none' });
  void queryClient.invalidateQueries({ queryKey: communityKeys.threads(), refetchType: 'none' });
  void queryClient.invalidateQueries({ queryKey: communityKeys.searches(), refetchType: 'none' });
}

export function useCreatePostMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateCommunityPostPayload) => {
      const { data } = await api.post<{ data: CommunityPost }>(endpoints.community.posts, payload);
      return data.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: communityKeys.feeds() });
      void queryClient.invalidateQueries({ queryKey: communityKeys.topics() });
      void queryClient.invalidateQueries({ queryKey: communityKeys.trending() });
    },
  });
}

export function useCreateReplyMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, body }: { postId: number; body: string }) => {
      const { data } = await api.post<{ data: CommunityPost }>(
        endpoints.community.postReplies(postId),
        { body },
      );
      return data.data;
    },
    onSuccess: (reply, variables) => {
      applyPostUpdaterToCaches(
        queryClient,
        (node) => node.id === variables.postId || (reply.root_id !== null && node.id === reply.root_id && reply.root_id !== variables.postId),
        (node) => ({
          ...node,
          replies_count: node.replies_count + 1,
        }),
      );

      void queryClient.invalidateQueries({ queryKey: communityKeys.threads() });
      if (reply.root_id) {
        void queryClient.invalidateQueries({ queryKey: communityKeys.thread(reply.root_id) });
      }
      void queryClient.invalidateQueries({ queryKey: communityKeys.feeds(), refetchType: 'none' });
    },
  });
}

export function useToggleReactionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, type }: { postId: number; type: CommunityReactionType }) => {
      const { data } = await api.post<{ data: ToggleReactionResponse }>(
        endpoints.community.postReactions(postId),
        { type },
      );
      return data.data;
    },
    onMutate: async ({ postId, type }) => {
      await cancelPostListQueries(queryClient);

      const captured = applyPostUpdaterToCaches<{
        liked: boolean;
        likes_count: number;
        bookmarked: boolean;
      }>(
        queryClient,
        (node) => node.id === postId,
        (node) => {
          if (type === 'like') {
            const nextLiked = !node.viewer.liked;
            return {
              ...node,
              likes_count: Math.max(0, node.likes_count + (nextLiked ? 1 : -1)),
              viewer: { ...node.viewer, liked: nextLiked },
            };
          }

          return {
            ...node,
            viewer: { ...node.viewer, bookmarked: !node.viewer.bookmarked },
          };
        },
        (node) => ({
          liked: node.viewer.liked,
          likes_count: node.likes_count,
          bookmarked: node.viewer.bookmarked,
        }),
      );

      return { captured };
    },
    onError: (_error, variables, context) => {
      const captured = context?.captured;
      if (!captured || captured.size === 0) {
        return;
      }

      applyPostUpdaterToCaches(
        queryClient,
        (node) => captured.has(node.id),
        (node) => {
          const prev = captured.get(node.id);
          if (!prev) {
            return node;
          }

          if (variables.type === 'like') {
            return {
              ...node,
              likes_count: prev.likes_count,
              viewer: { ...node.viewer, liked: prev.liked },
            };
          }

          return {
            ...node,
            viewer: { ...node.viewer, bookmarked: prev.bookmarked },
          };
        },
      );
    },
    onSuccess: (result) => {
      applyPostUpdaterToCaches(
        queryClient,
        (node) => node.id === result.post_id,
        (node) => ({
          ...node,
          likes_count: result.likes_count,
          viewer: {
            ...node.viewer,
            liked: result.type === 'like' ? result.active : node.viewer.liked,
            bookmarked: result.type === 'bookmark' ? result.active : node.viewer.bookmarked,
          },
        }),
      );

      invalidateCommunityCachesQuietly(queryClient);
      const membershipTab = result.type === 'bookmark' ? 'saved' : 'liked';
      void queryClient.invalidateQueries({ queryKey: ['community', 'feed', membershipTab] });
    },
  });
}

export function useToggleRepostMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: number) => {
      const { data } = await api.post<{ data: ToggleRepostResponse }>(
        endpoints.community.postRepost(postId),
      );
      return data.data;
    },
    onMutate: async (postId) => {
      await cancelPostListQueries(queryClient);

      const captured = applyPostUpdaterToCaches<{
        reposted: boolean;
        reposts_count: number;
      }>(
        queryClient,
        (node) => node.id === postId,
        (node) => {
          const nextReposted = !node.viewer.reposted;
          return {
            ...node,
            reposts_count: Math.max(0, node.reposts_count + (nextReposted ? 1 : -1)),
            viewer: { ...node.viewer, reposted: nextReposted },
          };
        },
        (node) => ({
          reposted: node.viewer.reposted,
          reposts_count: node.reposts_count,
        }),
      );

      return { captured };
    },
    onError: (_error, _variables, context) => {
      const captured = context?.captured;
      if (!captured || captured.size === 0) {
        return;
      }

      applyPostUpdaterToCaches(
        queryClient,
        (node) => captured.has(node.id),
        (node) => {
          const prev = captured.get(node.id);
          if (!prev) {
            return node;
          }

          return {
            ...node,
            reposts_count: prev.reposts_count,
            viewer: { ...node.viewer, reposted: prev.reposted },
          };
        },
      );
    },
    onSuccess: (result) => {
      applyPostUpdaterToCaches(
        queryClient,
        (node) => node.id === result.post_id,
        (node) => ({
          ...node,
          reposts_count: result.reposts_count,
          viewer: { ...node.viewer, reposted: result.active },
        }),
      );
      invalidateCommunityCachesQuietly(queryClient);
    },
  });
}

export function useVotePollMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ pollId, optionId }: { pollId: number; optionId: number }) => {
      const { data } = await api.post<{ data: VotePollResponse }>(
        endpoints.community.pollVote(pollId),
        { option_id: optionId },
      );
      return data.data;
    },
    onMutate: async ({ pollId, optionId }) => {
      await cancelPostListQueries(queryClient);

      const captured = applyPostUpdaterToCaches<CommunityPoll | null>(
        queryClient,
        (node) => node.poll?.id === pollId,
        (node) => {
          if (!node.poll) {
            return node;
          }

          const previousOptionId = node.poll.viewer_selected_option_id;
          if (previousOptionId === optionId) {
            return node;
          }

          const totalDelta = previousOptionId === null ? 1 : 0;

          return {
            ...node,
            poll: {
              ...node.poll,
              total_votes: node.poll.total_votes + totalDelta,
              viewer_selected_option_id: optionId,
              options: node.poll.options.map((opt) => {
                if (opt.id === optionId) {
                  return { ...opt, votes_count: opt.votes_count + 1 };
                }
                if (previousOptionId !== null && opt.id === previousOptionId) {
                  return { ...opt, votes_count: Math.max(0, opt.votes_count - 1) };
                }
                return opt;
              }),
            },
          };
        },
        (node) => node.poll,
      );

      return { captured };
    },
    onError: (_error, _variables, context) => {
      const captured = context?.captured;
      if (!captured || captured.size === 0) {
        return;
      }

      applyPostUpdaterToCaches(
        queryClient,
        (node) => captured.has(node.id),
        (node) => ({
          ...node,
          poll: captured.get(node.id) ?? node.poll,
        }),
      );
    },
    onSuccess: (result) => {
      applyPostUpdaterToCaches(
        queryClient,
        (node) => node.poll?.id === result.poll_id,
        (node) => {
          if (!node.poll) {
            return node;
          }

          return {
            ...node,
            poll: {
              ...node.poll,
              total_votes: result.total_votes,
              viewer_selected_option_id: result.selected_option_id,
              options: result.options,
            },
          };
        },
      );
      invalidateCommunityCachesQuietly(queryClient);
    },
  });
}

export function useToggleFollowMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: number) => {
      const { data } = await api.post<{ data: ToggleFollowResponse }>(
        endpoints.community.userFollow(userId),
      );
      return data.data;
    },
    onMutate: async (userId) => {
      await cancelPostListQueries(queryClient);

      const captured = applyPostUpdaterToCaches<boolean | undefined>(
        queryClient,
        (node) => node.author?.id === userId,
        (node) => ({
          ...node,
          viewer: { ...node.viewer, following: !node.viewer.following },
        }),
        (node) => node.viewer.following,
      );

      const capturedPeople = updatePeopleInSearchCaches(queryClient, userId, (person) => ({
        ...person,
        following: !person.following,
      }));

      return { captured, capturedPeople };
    },
    onError: (_error, userId, context) => {
      const captured = context?.captured;
      if (captured && captured.size > 0) {
        applyPostUpdaterToCaches(
          queryClient,
          (node) => captured.has(node.id),
          (node) => ({
            ...node,
            viewer: { ...node.viewer, following: captured.get(node.id) },
          }),
        );
      }
      if (context?.capturedPeople && context.capturedPeople.has(userId)) {
        const prev = context.capturedPeople.get(userId)!;
        updatePeopleInSearchCaches(queryClient, userId, (person) => ({
          ...person,
          following: prev,
        }));
      }
    },
    onSuccess: (result) => {
      applyPostUpdaterToCaches(
        queryClient,
        (node) => node.author?.id === result.user_id,
        (node) => ({
          ...node,
          viewer: { ...node.viewer, following: result.following },
        }),
      );
      updatePeopleInSearchCaches(queryClient, result.user_id, (person) => ({
        ...person,
        following: result.following,
      }));
      invalidateCommunityCachesQuietly(queryClient);
      void queryClient.invalidateQueries({ queryKey: ['community', 'feed', 'following'] });
    },
  });
}

export function useDeletePostMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: number) => {
      await api.delete(endpoints.community.post(postId));
      return postId;
    },
    onSuccess: (postId) => {
      queryClient.setQueriesData<InfiniteData<CommunityFeedResponse>>(
        { queryKey: communityKeys.feeds() },
        (oldData) => {
          if (!oldData) {
            return oldData;
          }

          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              data: page.data.filter(
                (item) => item.id !== postId && item.repost_of?.id !== postId,
              ),
            })),
          };
        },
      );

      queryClient.setQueriesData<SearchCacheShape>(
        { queryKey: communityKeys.searches() },
        (oldData) => {
          if (!oldData || typeof oldData !== 'object' || Array.isArray(oldData) || !Array.isArray(oldData.posts)) {
            return oldData;
          }

          return {
            ...oldData,
            posts: oldData.posts.filter(
              (item) => item.id !== postId && item.repost_of?.id !== postId,
            ),
          };
        },
      );

      // Cleanly remove deleted replies/items from any cached thread detail or branch queries
      const threadEntries = queryClient.getQueriesData({ queryKey: communityKeys.threads() });
      for (const [key, data] of threadEntries) {
        if (!data || typeof data !== 'object') {
          continue;
        }

        if ('post' in data && 'replies' in data) {
          const detail = data as CommunityThreadDetailData;
          const removedIds = new Set<number>([postId]);
          let added = true;
          while (added) {
            added = false;
            for (const item of detail.replies) {
              if (item.parent_id !== null && removedIds.has(item.parent_id) && !removedIds.has(item.id)) {
                removedIds.add(item.id);
                added = true;
              }
            }
          }

          const removedNonSelfCount = detail.replies.filter(
            (r) => removedIds.has(r.id),
          ).length;

          queryClient.setQueryData<CommunityThreadDetailData>(key, {
            ...detail,
            post:
              removedNonSelfCount > 0
                ? {
                    ...detail.post,
                    replies_count: Math.max(0, detail.post.replies_count - removedNonSelfCount),
                  }
                : detail.post,
            self_thread_items: detail.self_thread_items.filter((item) => !removedIds.has(item.id)),
            replies: detail.replies.filter((item) => !removedIds.has(item.id)),
          });
        } else if ('pages' in data) {
          const branchData = data as InfiniteData<CommunityFeedResponse>;
          queryClient.setQueryData<InfiniteData<CommunityFeedResponse>>(key, {
            ...branchData,
            pages: branchData.pages.map((page) => ({
              ...page,
              data: page.data.filter((item) => item.id !== postId),
            })),
          });
        }
      }

      void queryClient.invalidateQueries({ queryKey: communityKeys.feeds(), refetchType: 'none' });
      void queryClient.invalidateQueries({ queryKey: communityKeys.searches(), refetchType: 'none' });
      void queryClient.invalidateQueries({ queryKey: communityKeys.threads() });
      void queryClient.invalidateQueries({ queryKey: communityKeys.trending() });
      void queryClient.invalidateQueries({ queryKey: communityKeys.topics() });
    },
  });
}

export function useHideReplyMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: number) => {
      const { data } = await api.patch<{
        data: { id: number; is_hidden_by_author: boolean };
      }>(endpoints.community.hideReply(postId));
      return data.data;
    },
    onSuccess: (result) => {
      applyPostUpdaterToCaches(
        queryClient,
        (node) => node.id === result.id,
        (node) => ({
          ...node,
          is_hidden_by_author: result.is_hidden_by_author,
        }),
      );
      void queryClient.invalidateQueries({ queryKey: communityKeys.threads() });
    },
  });
}

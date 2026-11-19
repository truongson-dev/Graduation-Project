import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import * as authLib from '@/features/auth/api/auth';
import { api } from '@/core/api/client';
import { communityKeys } from '../api/communityKeys';
import * as communityMutations from '../api/useCommunityMutations';
import * as threadDetailHooks from '../api/useThreadDetail';
import { ThreadComposerDialog } from './ThreadComposerDialog';
import { ThreadPostCard } from './ThreadPostCard';
import { ThreadReplyDialog } from './ThreadReplyDialog';
import type {
  CommunityFeedResponse,
  CommunityPersonResult,
  CommunityPost,
  CommunityTopicTag,
} from '../types/community';

const makePost = (overrides: Partial<CommunityPost> = {}): CommunityPost => ({
  id: 1,
  root_id: null,
  parent_id: null,
  thread_group_id: null,
  depth: 0,
  body: 'Bài viết thử nghiệm',
  reply_control: 'everyone',
  status: 'published',
  is_hidden_by_author: false,
  likes_count: 2,
  replies_count: 0,
  reposts_count: 0,
  quotes_count: 0,
  hot_score: '10.0000',
  created_at: new Date().toISOString(),
  author: {
    id: 10,
    name: 'Tác giả A',
    username: 'tacgiaa10',
    headline: 'Học viên',
    avatar_url: null,
  },
  topic_tag: null,
  poll: null,
  repost_of: null,
  quote_post: null,
  self_thread_items: [],
  viewer: {
    liked: false,
    bookmarked: false,
    reposted: false,
    following: false,
  },
  ...overrides,
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Community Frontend Hardening', () => {
  it('B4 & W6: optimistically updates search { people, posts } cache and rolls back only failed post without clobbering concurrent mutations', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    const postA = makePost({ id: 101, likes_count: 5, viewer: { liked: false, bookmarked: false, reposted: false, following: false } });
    const postB = makePost({ id: 102, reposts_count: 1, viewer: { liked: false, bookmarked: false, reposted: false, following: false } });

    const feedData: { pages: CommunityFeedResponse[]; pageParams: unknown[] } = {
      pages: [{ data: [postA, postB], meta: { next_cursor: null, has_more: false } }],
      pageParams: [undefined],
    };
    const searchData: { people: CommunityPersonResult[]; posts: CommunityPost[] } = {
      people: [],
      posts: [postA, postB],
    };

    queryClient.setQueryData(communityKeys.feed('for_you', null), feedData);
    queryClient.setQueryData(communityKeys.search('thu', 'top', null), searchData);

    let rejectA!: (err: unknown) => void;
    let resolveB!: (val: unknown) => void;
    vi.spyOn(api, 'post')
      .mockImplementationOnce(
        () =>
          new Promise((_, rej) => {
            rejectA = rej;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((res) => {
            resolveB = res;
          }),
      );

    function Harness() {
      const reactMut = communityMutations.useToggleReactionMutation();
      const repostMut = communityMutations.useToggleRepostMutation();
      return (
        <div>
          <button type="button" onClick={() => reactMut.mutate({ postId: 101, type: 'like' })}>
            like-A
          </button>
          <button type="button" onClick={() => repostMut.mutate(102)}>
            repost-B
          </button>
        </div>
      );
    }

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Harness />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // Fire both mutations concurrently
    fireEvent.click(screen.getByRole('button', { name: 'like-A' }));
    fireEvent.click(screen.getByRole('button', { name: 'repost-B' }));

    // B4: Search cache must be optimistically updated IMMEDIATELY for both posts
    await waitFor(() => {
      const cachedSearch = queryClient.getQueryData<{ people: CommunityPersonResult[]; posts: CommunityPost[] }>(
        communityKeys.search('thu', 'top', null),
      );
      expect(cachedSearch?.posts[0].viewer.liked).toBe(true);
      expect(cachedSearch?.posts[0].likes_count).toBe(6);
      expect(cachedSearch?.posts[1].viewer.reposted).toBe(true);
      expect(cachedSearch?.posts[1].reposts_count).toBe(2);
    });

    // Reject A while B succeeds -> A rolls back to 5/false, B MUST stay 2/true
    rejectA(new Error('Network error'));
    resolveB({ data: { data: { post_id: 102, active: true, reposts_count: 2 } } });

    await waitFor(() => {
      const cachedFeed = queryClient.getQueryData<{ pages: CommunityFeedResponse[] }>(
        communityKeys.feed('for_you', null),
      );
      expect(cachedFeed?.pages[0].data[0].viewer.liked).toBe(false);
      expect(cachedFeed?.pages[0].data[0].likes_count).toBe(5);
      expect(cachedFeed?.pages[0].data[1].viewer.reposted).toBe(true);
      expect(cachedFeed?.pages[0].data[1].reposts_count).toBe(2);
    });
  });

  it('W7: hides stuck load-more button in ThreadReplyDialog when branchData is fully loaded despite hidden replies', () => {
    vi.spyOn(authLib, 'useMe').mockReturnValue({
      data: { id: 99, name: 'Viewer', email: 'viewer@test.com', avatar_url: null },
    } as unknown as ReturnType<typeof authLib.useMe>);
    vi.spyOn(communityMutations, 'useCreateReplyMutation').mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof communityMutations.useCreateReplyMutation>);

    const rootPost = makePost({ id: 10, replies_count: 3 });
    const lvl1 = makePost({
      id: 20,
      root_id: 10,
      parent_id: 10,
      depth: 1,
      replies_count: 3, // 3 total in DB, but 2 were hidden by author!
      body: 'Bình luận cấp 1',
    });
    const lvl2Visible = makePost({
      id: 21,
      root_id: 10,
      parent_id: 20,
      depth: 2,
      replies_count: 0,
      body: 'Phản hồi cấp 2 duy nhất hiển thị',
    });

    vi.spyOn(threadDetailHooks, 'useThreadDetail').mockReturnValue({
      data: {
        post: rootPost,
        ancestors: [],
        self_thread_items: [],
        replies: [lvl1, lvl2Visible],
      },
      isLoading: false,
    } as unknown as ReturnType<typeof threadDetailHooks.useThreadDetail>);

    vi.spyOn(threadDetailHooks, 'useBranchReplies').mockImplementation((parentId, enabled) => ({
      data:
        enabled && parentId === 20
          ? {
              pages: [
                {
                  data: [lvl2Visible],
                  meta: { next_cursor: null, has_more: false },
                },
              ],
              pageParams: [undefined],
            }
          : undefined,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetching: false,
    }) as unknown as ReturnType<typeof threadDetailHooks.useBranchReplies>);

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ThreadReplyDialog post={rootPost} onOpenChange={vi.fn()} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // Click to expand level-1 branch (triggers loadMoreOpen = true)
    fireEvent.click(screen.getByRole('button', { name: /Xem 3 câu trả lời/i }));

    // Visible child is shown, and since branchData loaded with hasNextPage: false, there must NOT be a stuck "Xem thêm" button!
    expect(screen.getByText('Phản hồi cấp 2 duy nhất hiển thị')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Xem thêm/i })).toBeNull();
  });

  it('W7: ThreadComposerDialog syncs default topic once topics load asynchronously', () => {
    const mutate = vi.fn();
    vi.spyOn(authLib, 'useMe').mockReturnValue({
      data: { id: 1, name: 'Học Viên', email: 'hv@test.com', avatar_url: null },
    } as unknown as ReturnType<typeof authLib.useMe>);
    vi.spyOn(communityMutations, 'useCreatePostMutation').mockReturnValue({
      mutate,
      isPending: false,
    } as unknown as ReturnType<typeof communityMutations.useCreatePostMutation>);

    const topics: CommunityTopicTag[] = [
      { id: 7, slug: 'giao-tiep', name: 'Giao tiếp', description: null, color_token: 'teal', posts_count: 1 },
    ];

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ThreadComposerDialog open onOpenChange={vi.fn()} topics={[]} defaultTopicSlug="giao-tiep" />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    rerender(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ThreadComposerDialog open onOpenChange={vi.fn()} topics={topics} defaultTopicSlug="giao-tiep" />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    fireEvent.change(screen.getByPlaceholderText(/Chia sẻ tình huống giao tiếp/i), {
      target: { value: 'Nội dung mới sau khi topics tải xong.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Đăng bài/i }));

    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate.mock.calls[0][0].topic_tag_id).toBe(7);
  });

  it('W7: distinguishes following vs mentioned_only reply control labels in ThreadPostCard', () => {
    vi.spyOn(authLib, 'useMe').mockReturnValue({
      data: { id: 99, name: 'Viewer', email: 'viewer@test.com', avatar_url: null },
    } as unknown as ReturnType<typeof authLib.useMe>);

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <MemoryRouter>
            <ThreadPostCard post={makePost({ reply_control: 'following' })} />
          </MemoryRouter>
        </TooltipProvider>
      </QueryClientProvider>,
    );

    expect(screen.queryByText('Chỉ người được nhắc/theo dõi')).toBeNull();
    expect(screen.getByText('Chỉ người tác giả theo dõi')).toBeTruthy();
  });

  it('rolls back only the failed field when Like and Bookmark run concurrently on the same post', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    const postA = makePost({
      id: 301,
      likes_count: 4,
      viewer: { liked: false, bookmarked: false, reposted: false, following: false },
    });

    queryClient.setQueryData(communityKeys.feed('for_you', null), {
      pages: [{ data: [postA], meta: { next_cursor: null, has_more: false } }],
      pageParams: [undefined],
    });

    let rejectLike!: (err: unknown) => void;
    let resolveBookmark!: (val: unknown) => void;
    const postSpy = vi
      .spyOn(api, 'post')
      .mockImplementationOnce(() => new Promise((_, rej) => { rejectLike = rej; }))
      .mockImplementationOnce(() => new Promise((res) => { resolveBookmark = res; }));

    function SamePostHarness() {
      const reactMut = communityMutations.useToggleReactionMutation();
      return (
        <div>
          <button type="button" onClick={() => reactMut.mutate({ postId: 301, type: 'like' })}>
            like-same
          </button>
          <button type="button" onClick={() => reactMut.mutate({ postId: 301, type: 'bookmark' })}>
            bookmark-same
          </button>
        </div>
      );
    }

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <SamePostHarness />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'like-same' }));
    fireEvent.click(screen.getByRole('button', { name: 'bookmark-same' }));

    await waitFor(() => {
      const cachedFeed = queryClient.getQueryData<{ pages: CommunityFeedResponse[] }>(
        communityKeys.feed('for_you', null),
      );
      expect(cachedFeed?.pages[0].data[0].viewer.liked).toBe(true);
      expect(cachedFeed?.pages[0].data[0].viewer.bookmarked).toBe(true);
      expect(postSpy).toHaveBeenCalledTimes(2);
    });

    rejectLike(new Error('Like failed'));
    resolveBookmark({
      data: { data: { post_id: 301, type: 'bookmark', active: true, likes_count: 4 } },
    });

    await waitFor(() => {
      const cachedFeed = queryClient.getQueryData<{ pages: CommunityFeedResponse[] }>(
        communityKeys.feed('for_you', null),
      );
      expect(cachedFeed?.pages[0].data[0].viewer.liked).toBe(false);
      expect(cachedFeed?.pages[0].data[0].likes_count).toBe(4);
      expect(cachedFeed?.pages[0].data[0].viewer.bookmarked).toBe(true);
    });
  });

  it('syncs defaultTopicSlug when reopening ThreadComposerDialog and blocks duplicate poll options', () => {
    const mutate = vi.fn();
    vi.spyOn(authLib, 'useMe').mockReturnValue({
      data: { id: 1, name: 'Học Viên', email: 'hv@test.com', avatar_url: null },
    } as unknown as ReturnType<typeof authLib.useMe>);
    vi.spyOn(communityMutations, 'useCreatePostMutation').mockReturnValue({
      mutate,
      isPending: false,
    } as unknown as ReturnType<typeof communityMutations.useCreatePostMutation>);

    const topics: CommunityTopicTag[] = [
      { id: 1, slug: 'giao-tiep', name: 'Giao tiếp', description: null, color_token: 'teal', posts_count: 2 },
      { id: 2, slug: 'thuyet-trinh', name: 'Thuyết trình', description: null, color_token: 'amber', posts_count: 3 },
    ];

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ThreadComposerDialog open={false} onOpenChange={vi.fn()} topics={topics} defaultTopicSlug="giao-tiep" />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    rerender(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ThreadComposerDialog open onOpenChange={vi.fn()} topics={topics} defaultTopicSlug="thuyet-trinh" />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Thêm bình chọn/i }));
    fireEvent.change(screen.getByPlaceholderText('Lựa chọn 1'), { target: { value: 'Option A' } });
    fireEvent.change(screen.getByPlaceholderText('Lựa chọn 2'), { target: { value: 'option a' } });
    fireEvent.change(screen.getByPlaceholderText(/Chia sẻ tình huống giao tiếp/i), {
      target: { value: 'Kiểm tra đồng bộ topic và đáp án trùng.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Đăng bài/i }));

    expect(screen.getByText('Các phương án bình chọn không được trùng lặp.')).toBeTruthy();
    expect(mutate).not.toHaveBeenCalled();

    fireEvent.change(screen.getByPlaceholderText('Lựa chọn 2'), { target: { value: 'Option B' } });
    fireEvent.click(screen.getByRole('button', { name: /Đăng bài/i }));

    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate.mock.calls[0][0].topic_tag_id).toBe(2);
  });
});

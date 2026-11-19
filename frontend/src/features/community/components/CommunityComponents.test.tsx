import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PollWidget } from './PollWidget';
import { ThreadPostCard } from './ThreadPostCard';
import { ThreadComposerDialog } from './ThreadComposerDialog';
import { ThreadReplyDialog } from './ThreadReplyDialog';
import { TrendingWidget, formatTrendingPostsCount } from './TrendingWidget';
import * as authLib from '@/features/auth/api/auth';
import { api } from '@/core/api/client';
import { communityKeys } from '../api/communityKeys';
import * as communityMutations from '../api/useCommunityMutations';
import * as threadDetailHooks from '../api/useThreadDetail';
import type {
  CommunityFeedResponse,
  CommunityPoll,
  CommunityPost,
  CommunityTopicTag,
  CommunityTrendingItem,
} from '../types/community';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
};

const basePost: CommunityPost = {
  id: 10,
  root_id: null,
  parent_id: null,
  thread_group_id: 10,
  depth: 0,
  body: 'Khi trình bày trước hội đồng, nên mở đầu bằng câu hỏi hay số liệu?',
  reply_control: 'everyone',
  status: 'published',
  is_hidden_by_author: false,
  likes_count: 5,
  replies_count: 2,
  reposts_count: 1,
  quotes_count: 0,
  hot_score: '12.5000',
  created_at: new Date().toISOString(),
  author: {
    id: 1,
    name: 'Minh Anh',
    username: 'minhanh',
    headline: 'Sinh viên năm 4',
    avatar_url: null,
  },
  topic_tag: {
    id: 1,
    slug: 'thuyet-trinh',
    name: 'Thuyết trình',
    description: null,
    color_token: 'teal',
    posts_count: 3,
  },
  poll: null,
  repost_of: null,
  quote_post: null,
  self_thread_items: [],
  viewer: {
    liked: false,
    bookmarked: false,
    reposted: false,
  },
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Community Threads Components', () => {
  it('renders PollWidget and triggers vote mutation on option click', () => {
    const mutate = vi.fn();
    vi.spyOn(communityMutations, 'useVotePollMutation').mockReturnValue({
      mutate,
      isPending: false,
    } as unknown as ReturnType<typeof communityMutations.useVotePollMutation>);

    const poll: CommunityPoll = {
      id: 7,
      question: 'Bạn chọn cách nào?',
      expires_at: null,
      total_votes: 10,
      viewer_selected_option_id: null,
      options: [
        { id: 101, label: 'Mở đầu bằng câu hỏi', votes_count: 6, sort_order: 0 },
        { id: 102, label: 'Mở đầu bằng số liệu', votes_count: 4, sort_order: 1 },
      ],
    };

    render(<PollWidget poll={poll} />, { wrapper: createWrapper() });

    expect(screen.getByText('Bạn chọn cách nào?')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Mở đầu bằng câu hỏi/ }));
    expect(mutate).toHaveBeenCalledWith({ pollId: 7, optionId: 101 });
  });

  it('renders ThreadPostCard with pure repost header and self-thread continuation parts', () => {
    vi.spyOn(authLib, 'useMe').mockReturnValue({
      data: { id: 99, name: 'Viewer', email: 'viewer@test.com', avatar_url: null },
    } as unknown as ReturnType<typeof authLib.useMe>);

    const repostWrapper: CommunityPost = {
      ...basePost,
      id: 20,
      body: null,
      author: {
        id: 2,
        name: 'Quốc Trung',
        username: 'quoctrung',
        headline: 'Mentor',
        avatar_url: null,
      },
      repost_of: {
        ...basePost,
        likes_count: 1100,
        replies_count: 22,
        reposts_count: 4,
        quotes_count: 20,
        self_thread_items: [
          {
            ...basePost,
            id: 11,
            root_id: 10,
            parent_id: 10,
            thread_group_id: 10,
            depth: 1,
            topic_tag: null,
            body: 'Phần 2: Giữ ánh mắt tương tác trong 30 giây đầu tiên.',
            self_thread_items: [],
          },
        ],
      },
    };

    render(<ThreadPostCard post={repostWrapper} />, { wrapper: createWrapper() });

    expect(screen.getByText('Quốc Trung đã đăng lại')).toBeTruthy();
    expect(screen.getByText(/Khi trình bày trước hội đồng/)).toBeTruthy();
    expect(screen.getByText(/Phần 2: Giữ ánh mắt tương tác/)).toBeTruthy();
    expect(screen.getByText('#Thuyết trình')).toBeTruthy();
    expect(screen.getByText('1,1K')).toBeTruthy();
    expect(screen.getByText('22')).toBeTruthy();
    expect(screen.getByText('20')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Chia sẻ bài viết' }).length).toBeGreaterThan(0);
  });

  it('allows building multi-part self-thread and poll inside ThreadComposerDialog', () => {
    const mutate = vi.fn();
    vi.spyOn(authLib, 'useMe').mockReturnValue({
      data: { id: 1, name: 'Minh Anh', email: 'minh@test.com', avatar_url: null },
    } as unknown as ReturnType<typeof authLib.useMe>);
    vi.spyOn(communityMutations, 'useCreatePostMutation').mockReturnValue({
      mutate,
      isPending: false,
    } as unknown as ReturnType<typeof communityMutations.useCreatePostMutation>);

    const topics: CommunityTopicTag[] = [
      {
        id: 1,
        slug: 'giao-tiep',
        name: 'Giao tiếp',
        description: null,
        color_token: 'teal',
        posts_count: 5,
      },
    ];

    render(
      <ThreadComposerDialog
        open
        onOpenChange={vi.fn()}
        topics={topics}
        defaultTopicSlug="giao-tiep"
      />,
      { wrapper: createWrapper() },
    );

    const firstTextarea = screen.getByPlaceholderText(
      /Chia sẻ tình huống giao tiếp/i,
    );
    fireEvent.change(firstTextarea, { target: { value: 'Đoạn mở đầu chuỗi' } });

    fireEvent.click(screen.getByRole('button', { name: /\+ Thêm vào chuỗi/i }));
    const secondTextarea = screen.getByPlaceholderText(
      /Viết tiếp ý trong chuỗi của bạn/i,
    );
    fireEvent.change(secondTextarea, { target: { value: 'Đoạn thứ hai' } });

    fireEvent.click(screen.getByRole('button', { name: /Đăng bài/i }));

    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate.mock.calls[0][0]).toMatchObject({
      items: [{ body: 'Đoạn mở đầu chuỗi' }, { body: 'Đoạn thứ hai' }],
      topic_tag_id: 1,
      reply_control: 'everyone',
    });
  });

  it('opens ThreadReplyDialog with original post, existing replies, and submits a reply', () => {
    const mutate = vi.fn();
    vi.spyOn(authLib, 'useMe').mockReturnValue({
      data: { id: 99, name: 'Học Viên', email: 'hocvien@test.com', avatar_url: null },
    } as unknown as ReturnType<typeof authLib.useMe>);
    vi.spyOn(communityMutations, 'useCreateReplyMutation').mockReturnValue({
      mutate,
      isPending: false,
    } as unknown as ReturnType<typeof communityMutations.useCreateReplyMutation>);
    vi.spyOn(threadDetailHooks, 'useThreadDetail').mockReturnValue({
      data: {
        post: basePost,
        ancestors: [],
        self_thread_items: [],
        replies: [
          {
            ...basePost,
            id: 55,
            root_id: 10,
            parent_id: 10,
            thread_group_id: null,
            depth: 1,
            topic_tag: null,
            replies_count: 1,
            body: 'Mình thích mở đầu bằng một câu hỏi gợi mở.',
            author: {
              id: 2,
              name: 'Đức Huy',
              username: 'duchuy',
              headline: 'Sinh viên năm 3',
              avatar_url: null,
            },
          },
          {
            ...basePost,
            id: 56,
            root_id: 10,
            parent_id: 55,
            thread_group_id: null,
            depth: 2,
            topic_tag: null,
            replies_count: 1,
            body: 'Ý kiến cấp 2 đồng tình.',
            author: {
              id: 3,
              name: 'Thu Hà',
              username: 'thuha',
              headline: 'Học viên',
              avatar_url: null,
            },
          },
        ],
      },
      isLoading: false,
    } as unknown as ReturnType<typeof threadDetailHooks.useThreadDetail>);
    vi.spyOn(threadDetailHooks, 'useBranchReplies').mockImplementation(
      (parentId, enabled) =>
        ({
          data:
            enabled && parentId === 56
              ? {
                  pages: [
                    {
                      data: [
                        {
                          ...basePost,
                          id: 57,
                          root_id: 10,
                          parent_id: 56,
                          thread_group_id: null,
                          depth: 3,
                          topic_tag: null,
                          replies_count: 0,
                          body: 'Phản hồi cấp 3 bắt đầu nhánh cây.',
                          author: {
                            id: 2,
                            name: 'Đức Huy',
                            username: 'duchuy',
                            headline: 'Sinh viên năm 3',
                            avatar_url: null,
                          },
                        },
                      ],
                    },
                  ],
                }
              : undefined,
          fetchNextPage: vi.fn(),
          hasNextPage: false,
          isFetching: false,
        }) as unknown as ReturnType<typeof threadDetailHooks.useBranchReplies>,
    );

    render(<ThreadReplyDialog post={basePost} onOpenChange={vi.fn()} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText('Bài viết của Minh Anh')).toBeTruthy();
    expect(screen.queryByRole('link', { name: /Chi tiết/i })).toBeNull();
    expect(screen.getByText(/Mình thích mở đầu bằng một câu hỏi gợi mở/)).toBeTruthy();

    // Nested replies are collapsed initially with Facebook-style "Xem X câu trả lời"
    expect(screen.queryByText(/Ý kiến cấp 2 đồng tình/)).toBeNull();
    expect(screen.queryByTestId('comment-spine-connector')).toBeNull();

    // Expand Level 1 -> Level 2 (no tree connector at level 1)
    fireEvent.click(screen.getByRole('button', { name: /Xem 1 câu trả lời/i }));
    expect(screen.getByText(/Ý kiến cấp 2 đồng tình/)).toBeTruthy();
    expect(screen.queryByText(/Phản hồi cấp 3 bắt đầu nhánh cây/)).toBeNull();
    expect(screen.queryByTestId('comment-spine-connector')).toBeNull();
    expect(screen.queryByTestId('nested-tree-connector')).toBeNull();

    // Expand Level 2 -> Level 3 (tree connector starts at level 2)
    fireEvent.click(screen.getByRole('button', { name: /Xem 1 câu trả lời/i }));
    expect(screen.getByText(/Phản hồi cấp 3 bắt đầu nhánh cây/)).toBeTruthy();
    expect(screen.getAllByTestId('comment-spine-connector')).toHaveLength(1);
    expect(screen.getAllByTestId('nested-tree-connector')).toHaveLength(1);

    const textarea = screen.getByPlaceholderText('Bình luận dưới tên Học Viên...');
    fireEvent.change(textarea, { target: { value: 'Rất đồng ý với góc nhìn này!' } });

    // Pressing Enter inserts newline without submitting
    fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter' });
    expect(mutate).not.toHaveBeenCalled();

    // Emoji button inserts selected emoji into draft
    fireEvent.click(screen.getByRole('button', { name: 'Chèn biểu tượng cảm xúc' }));
    fireEvent.click(screen.getByRole('button', { name: '👍' }));

    fireEvent.click(screen.getByRole('button', { name: 'Gửi bình luận' }));

    expect(mutate).toHaveBeenCalledWith(
      { postId: 10, body: 'Rất đồng ý với góc nhìn này!👍' },
      expect.any(Object),
    );

    // Click "Trả lời" on Đức Huy's level-1 comment: highlights bubble in blue without adding level-1 spine
    const replyButtons = screen.getAllByRole('button', { name: /^Trả lời$/ });
    fireEvent.click(replyButtons[0]);

    const highlightedBubble = screen.getByTestId('comment-bubble-55');
    expect(highlightedBubble.getAttribute('data-replying')).toBe('true');
    expect(highlightedBubble.className).toContain('bg-blue-100');
    expect(screen.getAllByTestId('comment-spine-connector')).toHaveLength(1);

    const inlineInput = screen.getByLabelText('Trả lời Đức Huy');
    fireEvent.change(inlineInput, { target: { value: 'Chuẩn luôn bạn ơi!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi phản hồi' }));

    expect(mutate).toHaveBeenCalledWith(
      { postId: 55, body: 'Chuẩn luôn bạn ơi!' },
      expect.any(Object),
    );

    // Click "Trả lời" on Thu Hà's level-2 comment: places inline composer on the level-2 branch with curved connector
    const updatedReplyButtons = screen.getAllByRole('button', { name: /^Trả lời$/ });
    fireEvent.click(updatedReplyButtons[1]);

    expect(screen.getByTestId('comment-bubble-56').getAttribute('data-replying')).toBe('true');
    expect(screen.getByTestId('branch-inline-reply-connector')).toBeTruthy();
    expect(screen.getByLabelText('Trả lời Thu Hà')).toBeTruthy();
  });

  it('renders hydrated following state on ThreadPostCard and toggles follow via mutation', () => {
    const followMutate = vi.fn();
    vi.spyOn(authLib, 'useMe').mockReturnValue({
      data: { id: 99, name: 'Viewer', email: 'viewer@test.com', avatar_url: null },
    } as unknown as ReturnType<typeof authLib.useMe>);
    vi.spyOn(communityMutations, 'useToggleFollowMutation').mockReturnValue({
      mutate: followMutate,
      isPending: false,
    } as unknown as ReturnType<typeof communityMutations.useToggleFollowMutation>);

    const followedPost: CommunityPost = {
      ...basePost,
      viewer: { ...basePost.viewer, following: true },
    };

    render(<ThreadPostCard post={followedPost} />, { wrapper: createWrapper() });

    const followBtn = screen.getByRole('button', { name: 'Đang theo dõi' });
    expect(followBtn.getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(followBtn);
    expect(followMutate).toHaveBeenCalledWith(1);
  });

  it('synchronizes follow and bookmark states across cached community feeds and invalidates feeds on mutation', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    const cachedFeed: { pages: CommunityFeedResponse[]; pageParams: unknown[] } = {
      pages: [
        {
          data: [{ ...basePost, viewer: { ...basePost.viewer, following: false, bookmarked: false } }],
          meta: { next_cursor: null, has_more: false },
        },
      ],
      pageParams: [undefined],
    };

    queryClient.setQueryData(communityKeys.feed('for_you', null), cachedFeed);
    queryClient.setQueryData(communityKeys.feed('following', null), cachedFeed);

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    vi.spyOn(api, 'post')
      .mockResolvedValueOnce({ data: { data: { user_id: 1, following: true } } })
      .mockResolvedValueOnce({
        data: { data: { post_id: 10, type: 'bookmark', active: true, likes_count: 5 } },
      });

    function Harness() {
      const toggleFollow = communityMutations.useToggleFollowMutation();
      const toggleReaction = communityMutations.useToggleReactionMutation();
      return (
        <div>
          <button type="button" onClick={() => toggleFollow.mutate(1)}>
            follow-btn
          </button>
          <button
            type="button"
            onClick={() => toggleReaction.mutate({ postId: 10, type: 'bookmark' })}
          >
            bookmark-btn
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

    fireEvent.click(screen.getByRole('button', { name: 'follow-btn' }));

    await vi.waitFor(() => {
      const updatedForYou = queryClient.getQueryData<{ pages: CommunityFeedResponse[] }>(
        communityKeys.feed('for_you', null),
      );
      const updatedFollowing = queryClient.getQueryData<{ pages: CommunityFeedResponse[] }>(
        communityKeys.feed('following', null),
      );
      expect(updatedForYou?.pages[0].data[0].viewer.following).toBe(true);
      expect(updatedFollowing?.pages[0].data[0].viewer.following).toBe(true);
    });

    fireEvent.click(screen.getByRole('button', { name: 'bookmark-btn' }));

    await vi.waitFor(() => {
      const updatedForYou = queryClient.getQueryData<{ pages: CommunityFeedResponse[] }>(
        communityKeys.feed('for_you', null),
      );
      expect(updatedForYou?.pages[0].data[0].viewer.bookmarked).toBe(true);
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: communityKeys.feeds(),
      refetchType: 'none',
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: communityKeys.threads(),
      refetchType: 'none',
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: communityKeys.searches(),
      refetchType: 'none',
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['community', 'feed', 'following'],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['community', 'feed', 'saved'],
    });
  });
});

describe('TrendingWidget', () => {
  afterEach(() => {
    cleanup();
  });

  const sampleTrends: CommunityTrendingItem[] = [
    {
      id: 'trend-1',
      title: 'Phỏng vấn System Design cho Junior',
      summary: 'Nhiều học viên chia sẻ kinh nghiệm trả lời câu hỏi thiết kế hệ thống.',
      posts_count: 4_000_000,
      topic_slug: 'phong-van',
      post_ids: [1, 2],
    },
    {
      id: 'trend-2',
      title: 'Giao tiếp với PM khi trễ deadline',
      summary: 'Thảo luận cách báo cáo rủi ro sớm để tránh áp lực phút chót.',
      posts_count: 20_000,
      topic_slug: 'giao-tiep',
      post_ids: [3],
    },
    {
      id: 'trend-3',
      title: 'Luyện nói tiếng Anh mỗi ngày',
      summary: 'Mẹo luyện phản xạ 15 phút trước giờ làm việc.',
      posts_count: 18,
      topic_slug: null,
      post_ids: [4, 5],
    },
    {
      id: 'trend-4',
      title: 'Quản lý thời gian kiểu Pomodoro',
      summary: 'So sánh Pomodoro với Time Blocking trong công việc lập trình.',
      posts_count: 9,
      topic_slug: null,
      post_ids: [6],
    },
  ];

  it('formats post counts compactly in Vietnamese', () => {
    expect(formatTrendingPostsCount(18)).toBe('18 bài viết');
    expect(formatTrendingPostsCount(20_000)).toBe('20K bài viết');
    expect(formatTrendingPostsCount(4_000_000)).toBe('4 triệu bài viết');
  });

  it('shows 3 items initially, toggles Hiển thị thêm / Thu gọn, and notifies selection', () => {
    const onSelectTrend = vi.fn();

    render(
      <TrendingWidget
        items={sampleTrends}
        activeTrendId="trend-1"
        onSelectTrend={onSelectTrend}
      />,
    );

    expect(screen.getByText('Đang thịnh hành')).toBeTruthy();
    expect(screen.getByText('Những chủ đề đang được bàn luận nhiều nhất')).toBeTruthy();
    expect(screen.getByText('Phỏng vấn System Design cho Junior')).toBeTruthy();
    expect(screen.getByText('4 triệu bài viết')).toBeTruthy();
    expect(screen.getByText('20K bài viết')).toBeTruthy();
    expect(screen.queryByText('Quản lý thời gian kiểu Pomodoro')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Hiển thị thêm' }));
    expect(screen.getByText('Quản lý thời gian kiểu Pomodoro')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Thu gọn' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Giao tiếp với PM/i }));
    expect(onSelectTrend).toHaveBeenCalledWith(sampleTrends[1]);

    fireEvent.click(screen.getByRole('button', { name: 'Thu gọn' }));
    expect(screen.queryByText('Quản lý thời gian kiểu Pomodoro')).toBeNull();
  });
});

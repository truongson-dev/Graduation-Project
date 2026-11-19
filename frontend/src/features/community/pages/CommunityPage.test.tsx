import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import * as authLib from '@/features/auth/api/auth';
import * as communityFeedHooks from '../api/useCommunityFeed';
import { CommunityPage } from './CommunityPage';

describe('CommunityPage sidebar active state', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('highlights Cộng đồng as the current page in the sidebar', () => {
    vi.spyOn(authLib, 'useMe').mockReturnValue({
      data: { id: 1, name: 'Võ Hoàng Nam', email: 'nam@example.com', avatar_url: null },
    } as unknown as ReturnType<typeof authLib.useMe>);
    vi.spyOn(authLib, 'useLogout').mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof authLib.useLogout>);
    vi.spyOn(communityFeedHooks, 'useCommunityTopics').mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof communityFeedHooks.useCommunityTopics>);
    vi.spyOn(communityFeedHooks, 'useCommunityFeed').mockReturnValue({
      data: { pages: [{ data: [], meta: { has_more: false, next_cursor: null } }] },
      isLoading: false,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: vi.fn(),
    } as unknown as ReturnType<typeof communityFeedHooks.useCommunityFeed>);
    vi.spyOn(communityFeedHooks, 'useCommunitySearch').mockReturnValue({
      data: { people: [], posts: [] },
      isLoading: false,
    } as unknown as ReturnType<typeof communityFeedHooks.useCommunitySearch>);
    vi.spyOn(communityFeedHooks, 'useCommunityTrending').mockReturnValue({
      data: {
        data: [],
        meta: { generated_at: '2026-11-12T00:00:00Z' },
      },
      isLoading: false,
    } as unknown as ReturnType<typeof communityFeedHooks.useCommunityTrending>);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <MemoryRouter initialEntries={['/community']}>
            <CommunityPage />
          </MemoryRouter>
        </TooltipProvider>
      </QueryClientProvider>,
    );

    const communityLink = screen.getByRole('link', { name: /^Cộng đồng$/i });
    expect(communityLink.getAttribute('aria-current')).toBe('page');
    expect(communityLink.parentElement?.className).toContain('bg-blue-700');
    expect(communityLink.parentElement?.className).toContain('text-white');
  });

  it('syncs ?tab=saved and ?tab=liked with feed query and sidebar sub-item active state', () => {
    vi.spyOn(authLib, 'useMe').mockReturnValue({
      data: { id: 1, name: 'Võ Hoàng Nam', email: 'nam@example.com', avatar_url: null },
    } as unknown as ReturnType<typeof authLib.useMe>);
    vi.spyOn(authLib, 'useLogout').mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof authLib.useLogout>);
    vi.spyOn(communityFeedHooks, 'useCommunityTopics').mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof communityFeedHooks.useCommunityTopics>);
    const feedSpy = vi.spyOn(communityFeedHooks, 'useCommunityFeed').mockReturnValue({
      data: { pages: [{ data: [], meta: { has_more: false, next_cursor: null } }] },
      isLoading: false,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: vi.fn(),
    } as unknown as ReturnType<typeof communityFeedHooks.useCommunityFeed>);
    vi.spyOn(communityFeedHooks, 'useCommunitySearch').mockReturnValue({
      data: { people: [], posts: [] },
      isLoading: false,
    } as unknown as ReturnType<typeof communityFeedHooks.useCommunitySearch>);
    vi.spyOn(communityFeedHooks, 'useCommunityTrending').mockReturnValue({
      data: {
        data: [],
        meta: { generated_at: '2026-11-12T00:00:00Z' },
      },
      isLoading: false,
    } as unknown as ReturnType<typeof communityFeedHooks.useCommunityTrending>);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <MemoryRouter initialEntries={['/community?tab=saved']}>
            <CommunityPage />
          </MemoryRouter>
        </TooltipProvider>
      </QueryClientProvider>,
    );

    expect(feedSpy).toHaveBeenCalledWith('saved', null);
    const savedSidebarLink = screen.getByRole('link', { name: 'Đã lưu' });
    expect(savedSidebarLink.getAttribute('aria-current')).toBe('page');
    expect(screen.getByText('Bạn chưa lưu bài viết nào')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Đã thích' }));
    expect(feedSpy).toHaveBeenCalledWith('liked', null);
    expect(screen.getByText('Bạn chưa thích bài viết nào')).toBeTruthy();
  });

  it('renders Threads-style SERP hero card and results when clicking a trending topic', () => {
    vi.spyOn(authLib, 'useMe').mockReturnValue({
      data: { id: 1, name: 'Võ Hoàng Nam', email: 'nam@example.com', avatar_url: null },
    } as unknown as ReturnType<typeof authLib.useMe>);
    vi.spyOn(authLib, 'useLogout').mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof authLib.useLogout>);
    vi.spyOn(communityFeedHooks, 'useCommunityTopics').mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof communityFeedHooks.useCommunityTopics>);
    vi.spyOn(communityFeedHooks, 'useCommunityFeed').mockReturnValue({
      data: { pages: [{ data: [], meta: { has_more: false, next_cursor: null } }] },
      isLoading: false,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: vi.fn(),
    } as unknown as ReturnType<typeof communityFeedHooks.useCommunityFeed>);
    const searchSpy = vi.spyOn(communityFeedHooks, 'useCommunitySearch').mockReturnValue({
      data: {
        people: [
          {
            id: 2,
            name: 'Trần Văn A',
            username: 'vana',
            headline: 'Thực tập sinh',
            avatar_url: null,
            following: false,
          },
        ],
        posts: [],
      },
      isLoading: false,
    } as unknown as ReturnType<typeof communityFeedHooks.useCommunitySearch>);
    vi.spyOn(communityFeedHooks, 'useCommunityTrending').mockReturnValue({
      data: {
        data: [
          {
            id: 'trend-1',
            title: 'Thảo luận về Giao tiếp',
            summary: 'Nhiều học viên chia sẻ cách góp ý mang tính xây dựng.',
            posts_count: 14,
            topic_slug: 'ky-nang-giao-tiep',
            post_ids: [101, 102],
          },
        ],
        meta: { generated_at: '2026-11-12T00:00:00Z' },
      },
      isLoading: false,
    } as unknown as ReturnType<typeof communityFeedHooks.useCommunityTrending>);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <MemoryRouter initialEntries={['/community']}>
            <CommunityPage />
          </MemoryRouter>
        </TooltipProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByText('Đang thịnh hành')).toBeTruthy();
    expect(screen.getByText('Những chủ đề đang được bàn luận nhiều nhất')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Thảo luận về Giao tiếp/i }));

    // Renders Hero card with "Thịnh hành" badge and summary
    expect(screen.getByText('Thịnh hành')).toBeTruthy();
    expect(
      screen.getAllByText('Nhiều học viên chia sẻ cách góp ý mang tính xây dựng.').length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('14 bài viết').length).toBeGreaterThanOrEqual(1);
    expect(searchSpy).toHaveBeenCalledWith('Thảo luận về Giao tiếp', 'top', [101, 102]);

    // Search tabs bar and quick composer bar should not be rendered
    expect(screen.queryByRole('button', { name: 'Liên quan nhất' })).toBeNull();
    expect(screen.queryByText(/Bài viết về Thảo luận về Giao tiếp/i)).toBeNull();

    // Clear search via input clear button returns to normal feed
    fireEvent.click(screen.getByRole('button', { name: 'Xóa tìm kiếm' }));
    expect(screen.queryByText('Thịnh hành')).toBeNull();
  });
});

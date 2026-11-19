import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useLocation, useSearchParams } from 'react-router';
import {
  Bookmark,
  Flame,
  Heart,
  MessageSquarePlus,
  Search,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { StudentPageLayout } from '@/components/layout/StudentPageLayout';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useMe } from '@/features/auth/api/auth';
import { cn } from '@/core/utils/cn';
import {
  useCommunityFeed,
  useCommunitySearch,
  useCommunityTopics,
  useCommunityTrending,
} from '../api/useCommunityFeed';
import { CommunityAuthorAvatar } from '../components/CommunityAuthorAvatar';
import { buildCurrentAuthorSummary } from '../utils/communityAuthor';
import { TopicPillBar } from '../components/TopicPillBar';
import { TrendingHeroCard } from '../components/TrendingHeroCard';
import { TrendingPeopleList } from '../components/TrendingPeopleList';
import { TrendingWidget } from '../components/TrendingWidget';
import { ThreadPostCard } from '../components/ThreadPostCard';
import { ThreadComposerDialog } from '../components/ThreadComposerDialog';
import { ThreadReplyDialog } from '../components/ThreadReplyDialog';
import type {
  CommunityFeedTab,
  CommunityPost,
  CommunitySearchFilter,
  CommunityTrendingItem,
} from '../types/community';

type RoomComment = { author: string; initials: string; text: string };

const rooms = [
  {
    id: 'room-1',
    topic: 'Làm việc từ xa giúp tăng năng suất?',
    category: 'KỸ NĂNG LÀM VIỆC',
    time: 'ĐANG DIỄN RA',
    people: 8,
    sideA: 'Ủng hộ',
    sideB: 'Phản biện',
    color: 'from-blue-700 to-sky-500',
  },
  {
    id: 'room-2',
    topic: 'Sinh viên có nên đi thực tập từ năm nhất?',
    category: 'PHÁT TRIỂN SỰ NGHIỆP',
    time: 'BẮT ĐẦU 20:30',
    people: 12,
    sideA: 'Nên đi sớm',
    sideB: 'Ưu tiên nền tảng',
    color: 'from-blue-700 to-cyan-500',
  },
  {
    id: 'room-3',
    topic: 'AI trong tuyển dụng: công bằng hay thiên kiến?',
    category: 'CÔNG NGHỆ & XÃ HỘI',
    time: 'BẮT ĐẦU 21:00',
    people: 6,
    sideA: 'Cơ hội',
    sideB: 'Rủi ro',
    color: 'from-teal-700 to-cyan-500',
  },
];

const initialRoomComments: RoomComment[] = [
  {
    author: 'Thu Hà',
    initials: 'TH',
    text: 'Mình đồng ý với ý về tính linh hoạt, nhất là khi nhóm có quy ước phối hợp rõ ràng.',
  },
  {
    author: 'Quốc Trung',
    initials: 'QT',
    text: 'Hai bên có thể bổ sung số liệu về năng suất để so sánh khách quan hơn.',
  },
  {
    author: 'Minh Anh',
    initials: 'MA',
    text: 'Cảm ơn mọi người, đội A xin phản hồi ý này ở lượt tiếp theo.',
  },
];

function Icon({ name, className = '' }: { name: string; className?: string }) {
  return (
    <span aria-hidden="true" className={`material-symbols-outlined ${className}`}>
      {name}
    </span>
  );
}

export function CommunityPage() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: currentUser } = useMe();

  const tabParam = searchParams.get('tab');
  const qParam = searchParams.get('q') ?? '';
  const serpTypeParam = searchParams.get('serp_type');
  const trendIdParam = searchParams.get('trend_id');
  const filterParam = (searchParams.get('filter') as CommunitySearchFilter) || 'top';

  const isSerpTrends = serpTypeParam === 'trends' && qParam.trim() !== '';

  const feedTab: CommunityFeedTab =
    tabParam === 'following' || tabParam === 'saved' || tabParam === 'liked'
      ? tabParam
      : 'for_you';

  const [tab, setTab] = useState<'discussions' | 'rooms'>(
    location.pathname.includes('rooms') ? 'rooms' : 'discussions',
  );
  const [selectedTopicSlug, setSelectedTopicSlug] = useState<string | null>(null);
  const [activeTrend, setActiveTrend] = useState<CommunityTrendingItem | null>(null);
  const [searchInput, setSearchInput] = useState(qParam);
  const [debouncedSearch, setDebouncedSearch] = useState(qParam);
  const searchFilter: CommunitySearchFilter = filterParam;
  const [composerOpen, setComposerOpen] = useState(false);
  const [replyDialogPost, setReplyDialogPost] = useState<CommunityPost | null>(null);

  useEffect(() => {
    setSearchInput(qParam);
    setDebouncedSearch(qParam.trim());
  }, [qParam]);

  const setFeedTab = (nextTab: CommunityFeedTab) => {
    setTab('discussions');
    setActiveTrend(null);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('q');
        next.delete('serp_type');
        next.delete('trend_id');
        next.delete('filter');
        if (nextTab === 'for_you') {
          next.delete('tab');
        } else {
          next.set('tab', nextTab);
        }
        return next;
      },
      { replace: true },
    );
  };

  const handleSelectTrend = (trend: CommunityTrendingItem) => {
    setTab('discussions');
    setSelectedTopicSlug(null);
    setActiveTrend(trend);
    setSearchInput(trend.title);
    setDebouncedSearch(trend.title);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('tab');
        next.set('q', trend.title);
        next.set('serp_type', 'trends');
        next.set('trend_id', trend.id);
        next.set('filter', 'top');
        return next;
      },
      { replace: true },
    );
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setActiveTrend(null);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('q');
        next.delete('serp_type');
        next.delete('trend_id');
        next.delete('filter');
        return next;
      },
      { replace: true },
    );
  };

  useEffect(() => {
    if (!location.pathname.includes('rooms')) {
      setTab('discussions');
    }
  }, [location.key, location.pathname, tabParam]);

  // Debate room states (preserved from existing Phòng trực tuyến tab)
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [micOn, setMicOn] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [roomVoteChoice, setRoomVoteChoice] = useState<Record<string, number | undefined>>({});
  const [roomVoteCounts, setRoomVoteCounts] = useState<Record<string, [number, number]>>({
    'room-1': [14, 9],
    'room-2': [19, 15],
    'room-3': [11, 8],
  });
  const [roomCommentsByRoom, setRoomCommentsByRoom] = useState<
    Record<string, RoomComment[]>
  >({});
  const [roomCommentDraft, setRoomCommentDraft] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const { data: topics = [], isLoading: topicsLoading } = useCommunityTopics();
  const trendingQuery = useCommunityTrending();

  // If activeTrend is null but we have trend_id in URL, try finding it in trendingQuery
  const currentTrend =
    activeTrend ??
    trendingQuery.data?.data.find((item) => item.id === trendIdParam) ??
    (isSerpTrends && qParam
      ? {
          id: trendIdParam || 'trend-auto',
          title: qParam,
          summary: `Các thảo luận nổi bật đang diễn ra về chủ đề ${qParam}.`,
          posts_count: 0,
          topic_slug: null,
          post_ids: [],
        }
      : null);

  const effectiveSearchQuery = isSerpTrends ? qParam : debouncedSearch;
  const isSearchActive = effectiveSearchQuery.length >= 2;
  const feedEnabled = tab === 'discussions' && !isSearchActive && !isSerpTrends;
  const feedArgs: Parameters<typeof useCommunityFeed> = feedEnabled
    ? [feedTab, selectedTopicSlug]
    : [feedTab, selectedTopicSlug, null, { enabled: false }];
  const feedQuery = useCommunityFeed(...feedArgs);

  const trendPostIds = isSerpTrends && currentTrend ? currentTrend.post_ids : null;
  const searchQuery = useCommunitySearch(effectiveSearchQuery, searchFilter, trendPostIds);

  const feedPosts = useMemo(
    () => feedQuery.data?.pages.flatMap((page) => page.data) ?? [],
    [feedQuery.data],
  );

  const currentAuthorSummary = buildCurrentAuthorSummary(currentUser);

  const activeRoom = rooms.find((room) => room.id === activeRoomId) ?? null;
  const activeRoomVotes = activeRoom
    ? (roomVoteCounts[activeRoom.id] ?? [10, 10])
    : [0, 0];
  const activeRoomVoteTotal = activeRoomVotes[0] + activeRoomVotes[1];
  const activeRoomComments = activeRoom
    ? (roomCommentsByRoom[activeRoom.id] ?? initialRoomComments)
    : [];

  const voteRoom = (sideIndex: number) => {
    if (!activeRoom) {
      return;
    }
    const prevChoice = roomVoteChoice[activeRoom.id];
    if (prevChoice === sideIndex) {
      return;
    }

    setRoomVoteCounts((prev) => {
      const current = prev[activeRoom.id] ?? [10, 10];
      const next: [number, number] = [current[0], current[1]];
      if (prevChoice !== undefined) {
        next[prevChoice] = Math.max(0, next[prevChoice] - 1);
      }
      next[sideIndex] += 1;
      return { ...prev, [activeRoom.id]: next };
    });
    setRoomVoteChoice((prev) => ({ ...prev, [activeRoom.id]: sideIndex }));
  };

  const submitRoomComment = (e: FormEvent) => {
    e.preventDefault();
    if (!activeRoom || !roomCommentDraft.trim()) {
      return;
    }
    const nextComment: RoomComment = {
      author: currentUser?.name ?? 'Bạn',
      initials: (currentUser?.name ?? 'B').slice(0, 2).toUpperCase(),
      text: roomCommentDraft.trim(),
    };
    setRoomCommentsByRoom((prev) => ({
      ...prev,
      [activeRoom.id]: [...(prev[activeRoom.id] ?? initialRoomComments), nextComment],
    }));
    setRoomCommentDraft('');
  };

  return (
    <StudentPageLayout
      active="/community"
      title="Cộng đồng SoftSkill"
    >
      <div className="space-y-5">
        {/* Top Mode Tabs + Primary Action */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs
            value={tab}
            onValueChange={(value) => setTab(value as 'discussions' | 'rooms')}
          >
            <TabsList className="rounded-xl bg-slate-100 p-1">
              <TabsTrigger
                value="discussions"
                className="rounded-lg px-4 py-1.5 text-xs font-bold cursor-pointer"
              >
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                Thảo luận
              </TabsTrigger>
              <TabsTrigger
                value="rooms"
                className="rounded-lg px-4 py-1.5 text-xs font-bold cursor-pointer"
              >
                <Users className="mr-1.5 h-3.5 w-3.5" />
                Phòng trực tuyến
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {tab === 'discussions' && (
            <Button
              type="button"
              onClick={() => setComposerOpen(true)}
              className="h-9 rounded-full bg-brand-900 px-4 text-xs font-bold text-white shadow-xs hover:bg-brand-800 cursor-pointer"
            >
              <MessageSquarePlus className="mr-1.5 h-4 w-4" />
              Đăng bài mới
            </Button>
          )}
        </div>

        {/* Discussions Feed (Threads-inspired MVP) */}
        {tab === 'discussions' ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,680px)_minmax(0,300px)] lg:items-start">
            <main className="min-w-0 space-y-4">
              {/* Quick Composer Trigger */}
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-2xs">
                <CommunityAuthorAvatar author={currentAuthorSummary} size="md" />
                <button
                  type="button"
                  onClick={() => setComposerOpen(true)}
                  className="flex-1 rounded-full bg-slate-50 px-4 py-2.5 text-left text-xs text-slate-500 transition-colors hover:bg-slate-100 cursor-pointer"
                >
                  Hôm nay bạn gặp tình huống giao tiếp hay thuyết trình nào?
                </button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setComposerOpen(true)}
                  className="hidden rounded-full border-slate-200 text-xs font-semibold text-brand-900 sm:inline-flex cursor-pointer"
                >
                  Viết chuỗi
                </Button>
              </div>

              {/* Feed Switcher + Search */}
              <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <button
                      type="button"
                      onClick={() => setFeedTab('for_you')}
                      className={cn(
                        'inline-flex shrink-0 whitespace-nowrap items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer',
                        feedTab === 'for_you'
                          ? 'bg-white text-brand-950 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900',
                      )}
                    >
                      <Flame className="h-3.5 w-3.5 text-amber-brand" />
                      Dành cho bạn
                    </button>
                    <button
                      type="button"
                      onClick={() => setFeedTab('following')}
                      className={cn(
                        'inline-flex shrink-0 whitespace-nowrap items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer',
                        feedTab === 'following'
                          ? 'bg-white text-brand-950 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900',
                      )}
                    >
                      <Users className="h-3.5 w-3.5 text-teal-brand" />
                      Đang theo dõi
                    </button>
                    <button
                      type="button"
                      onClick={() => setFeedTab('saved')}
                      className={cn(
                        'inline-flex shrink-0 whitespace-nowrap items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer',
                        feedTab === 'saved'
                          ? 'bg-white text-brand-950 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900',
                      )}
                    >
                      <Bookmark className="h-3.5 w-3.5 text-amber-brand" />
                      Đã lưu
                    </button>
                    <button
                      type="button"
                      onClick={() => setFeedTab('liked')}
                      className={cn(
                        'inline-flex shrink-0 whitespace-nowrap items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer',
                        feedTab === 'liked'
                          ? 'bg-white text-brand-950 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900',
                      )}
                    >
                      <Heart className="h-3.5 w-3.5 text-rose-500" />
                      Đã thích
                    </button>
                  </div>

                  <div className="relative w-full sm:w-auto sm:min-w-[200px] sm:max-w-xs">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                      value={searchInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSearchInput(val);
                        if (!val.trim()) {
                          handleClearSearch();
                        }
                      }}
                      placeholder="Tìm kiếm bài viết..."
                      aria-label="Tìm kiếm bài viết cộng đồng"
                      className="w-full rounded-full border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-8 text-xs text-slate-800 outline-none focus:border-brand-700 focus:bg-white"
                    />
                    {searchInput && (
                      <button
                        type="button"
                        onClick={handleClearSearch}
                        aria-label="Xóa tìm kiếm"
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {!isSearchActive && !isSerpTrends && (
                  <TopicPillBar
                    topics={topics}
                    selectedSlug={selectedTopicSlug}
                    onSelect={(slug) => {
                      handleClearSearch();
                      setSelectedTopicSlug(slug);
                    }}
                    isLoading={topicsLoading}
                  />
                )}
              </div>

              {/* Search / Trends SERP Results vs Main Feed */}
              {isSearchActive || isSerpTrends ? (
                <div className="space-y-4">
                  {/* Threads-style Trends Hero Card */}
                  {isSerpTrends && currentTrend && (
                    <TrendingHeroCard trend={currentTrend} />
                  )}

                  {/* Content List by Tab */}
                  <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
                    {searchFilter === 'people' ? (
                      <TrendingPeopleList
                        people={searchQuery.data?.people ?? []}
                        isLoading={searchQuery.isLoading}
                      />
                    ) : searchQuery.isLoading ? (
                      <div className="space-y-4 p-4">
                        {[1, 2, 3].map((idx) => (
                          <Skeleton key={idx} className="h-24 w-full rounded-xl" />
                        ))}
                      </div>
                    ) : (searchQuery.data?.posts.length ?? 0) === 0 ? (
                      <div className="px-6 py-12 text-center text-xs text-slate-500">
                        Không tìm thấy bài viết nào cho chủ đề này.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {searchQuery.data?.posts.map((post) => (
                          <ThreadPostCard
                            key={post.id}
                            post={post}
                            onReplyClick={setReplyDialogPost}
                          />
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              ) : (
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
                  {feedQuery.isLoading ? (
                    <div className="space-y-4 p-5">
                      {[1, 2, 3].map((idx) => (
                        <div key={idx} className="flex gap-3">
                          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-3.5 w-44" />
                            <Skeleton className="h-14 w-full rounded-xl" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : feedPosts.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                      <p className="text-sm font-bold text-slate-800">
                        {
                          {
                            following: 'Bảng tin Đang theo dõi hiện đang trống',
                            saved: 'Bạn chưa lưu bài viết nào',
                            liked: 'Bạn chưa thích bài viết nào',
                            for_you: 'Chưa có bài viết nào trong chủ đề này',
                          }[feedTab]
                        }
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {
                          {
                            following:
                              'Hãy theo dõi các thành viên có chia sẻ hữu ích ở tab Dành cho bạn.',
                            saved:
                              'Mở tùy chọn ⋯ trên bài viết và chọn Lưu bài viết để xem lại sau.',
                            liked:
                              'Hãy thả tim những bài viết hữu ích ở tab Dành cho bạn.',
                            for_you: 'Hãy là người đầu tiên mở một chuỗi thảo luận mới!',
                          }[feedTab]
                        }
                      </p>
                      <div className="mt-4 flex justify-center gap-2">
                        {feedTab !== 'for_you' ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setFeedTab('for_you')}
                            className="rounded-full text-xs font-semibold"
                          >
                            Khám phá Dành cho bạn
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => setComposerOpen(true)}
                            className="rounded-full bg-brand-900 text-xs font-semibold text-white hover:bg-brand-800"
                          >
                            Tạo bài viết đầu tiên
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="divide-y divide-slate-100">
                        {feedPosts.map((post) => (
                          <ThreadPostCard
                            key={post.id}
                            post={post}
                            onReplyClick={setReplyDialogPost}
                          />
                        ))}
                      </div>

                      {feedQuery.hasNextPage && (
                        <div className="border-t border-slate-100 p-4 text-center">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={feedQuery.isFetchingNextPage}
                            onClick={() => void feedQuery.fetchNextPage()}
                            className="rounded-full px-6 text-xs font-semibold text-brand-900 cursor-pointer"
                          >
                            {feedQuery.isFetchingNextPage
                              ? 'Đang tải thêm...'
                              : 'Xem thêm bài viết'}
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </section>
              )}
            </main>

            {/* Right Helpful Info Column */}
            <aside className="hidden space-y-4 lg:block">
              <TrendingWidget
                items={trendingQuery.data?.data ?? []}
                isLoading={trendingQuery.isLoading}
                activeTrendId={currentTrend?.id ?? null}
                onSelectTrend={handleSelectTrend}
              />

              {topics.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                  <h2 className="text-sm font-extrabold text-brand-950">Chủ đề nổi bật</h2>
                  <div className="mt-3 space-y-2">
                    {topics.map((topic) => (
                      <button
                        key={topic.id}
                        type="button"
                        onClick={() => {
                          handleClearSearch();
                          setSelectedTopicSlug((prev) =>
                            prev === topic.slug ? null : topic.slug,
                          );
                        }}
                        className={cn(
                          'flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition-colors cursor-pointer',
                          selectedTopicSlug === topic.slug
                            ? 'bg-brand-50 font-bold text-brand-900'
                            : 'hover:bg-slate-50 text-slate-700',
                        )}
                      >
                        <span>#{topic.name}</span>
                        <span className="tabular-nums text-[11px] text-slate-400">
                          {topic.posts_count}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                <h2 className="text-sm font-extrabold text-brand-950">
                  Nguyên tắc thảo luận văn minh
                </h2>
                <ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate-600">
                  <li>· Chia sẻ tình huống thực tế và bối cảnh rõ ràng.</li>
                  <li>· Phản biện trên tinh thần xây dựng, tôn trọng trải nghiệm cá nhân.</li>
                  <li>· Dùng chuỗi nhiều phần khi cần phân tích sâu theo từng bước.</li>
                </ul>
              </div>
            </aside>
          </div>
        ) : (
          /* Debate Rooms Tab */
          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room) => (
              <article
                key={room.id}
                className="flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs"
              >
                <div className={`bg-gradient-to-br ${room.color} p-4 text-white`}>
                  <div className="flex items-center justify-between gap-2 text-[10px] font-bold">
                    <span className="rounded-full bg-black/25 px-2.5 py-1">
                      {room.category}
                    </span>
                    <span className="rounded-full bg-white/20 px-2.5 py-1">
                      {room.time}
                    </span>
                  </div>
                  <h3 className="mt-3 text-base font-extrabold leading-snug">
                    {room.topic}
                  </h3>
                </div>
                <div className="space-y-3 p-4">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>Đội A: {room.sideA}</span>
                    <span>Đội B: {room.sideB}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <Badge variant="secondary" className="text-[11px]">
                      {room.people} người đang tham gia
                    </Badge>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setActiveRoomId(room.id)}
                      className="rounded-full bg-brand-900 text-xs font-bold text-white hover:bg-brand-800 cursor-pointer"
                    >
                      Vào phòng
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>

      {/* Threads Post Composer Dialog */}
      <ThreadComposerDialog
        open={composerOpen}
        onOpenChange={setComposerOpen}
        topics={topics}
        defaultTopicSlug={
          isSerpTrends ? (currentTrend?.topic_slug ?? selectedTopicSlug) : selectedTopicSlug
        }
      />

      {/* Facebook / Threads-style Comment & Discussion Dialog */}
      <ThreadReplyDialog
        post={replyDialogPost}
        onOpenChange={(open) => {
          if (!open) {
            setReplyDialogPost(null);
          }
        }}
      />

      {/* Live Debate Room Dialog */}
      {activeRoom && (
        <Dialog
          open={Boolean(activeRoom)}
          onOpenChange={(open) => {
            if (!open) {
              setActiveRoomId(null);
            }
          }}
        >
          <DialogContent className="flex max-h-[92dvh] w-full flex-col gap-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-0 sm:max-w-5xl">
            <DialogHeader className="border-b border-slate-200 bg-white px-5 py-3.5 pr-12">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[10px] font-bold text-blue-700">
                  <span>{activeRoom.category}</span>
                  <span>·</span>
                  <span>{activeRoom.time}</span>
                </div>
                <DialogTitle className="mt-0.5 truncate text-sm font-extrabold text-[#213a61] sm:text-base">
                  {activeRoom.topic}
                </DialogTitle>
              </div>
            </DialogHeader>
            <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-3 sm:p-5 lg:grid-cols-[minmax(0,1fr)_350px]">
              <main className="flex min-w-0 flex-col gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <section className="relative flex min-h-52 flex-col items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-blue-950 via-blue-800 to-sky-700 p-5 text-center text-white sm:min-h-64">
                    <span className="absolute left-3 top-3 rounded-full bg-black/25 px-2.5 py-1.5 text-[10px] font-bold">
                      ĐỘI A · {activeRoom.sideA}
                    </span>
                    <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-rose-500/90 px-2 py-1 text-[9px] font-bold">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                      ĐANG NÓI
                    </span>
                    <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/70 bg-white/15 text-xl font-extrabold shadow-lg">
                      MA
                    </span>
                    <p className="mt-2 text-sm font-bold">Minh Anh</p>
                    <p className="text-[11px] text-blue-100">Trình bày luận điểm · Lượt 2</p>
                    <p className="mt-3 max-w-sm text-xs leading-relaxed text-white/90">
                      “{activeRoom.sideA} có thể tạo cơ hội thử sức sớm, học từ công việc thực tế và hiểu rõ hơn hướng phát triển của mình.”
                    </p>
                    <span className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
                      <Icon name="mic" />
                    </span>
                  </section>
                  <section className="relative flex min-h-52 flex-col items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 via-blue-900 to-cyan-800 p-5 text-center text-white sm:min-h-64">
                    <span className="absolute left-3 top-3 rounded-full bg-black/25 px-2.5 py-1.5 text-[10px] font-bold">
                      ĐỘI B · {activeRoom.sideB}
                    </span>
                    <span className="absolute right-3 top-3 rounded-full bg-black/25 px-2 py-1 text-[9px] font-semibold text-white/75">
                      SẮP ĐẾN LƯỢT
                    </span>
                    <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/50 bg-white/10 text-xl font-extrabold">
                      ĐH
                    </span>
                    <p className="mt-2 text-sm font-bold">Đức Huy</p>
                    <p className="text-[11px] text-blue-100">Chuẩn bị phản biện</p>
                    <p className="mt-3 max-w-sm text-xs leading-relaxed text-white/85">
                      “Ưu tiên nền tảng giúp người học có kiến thức vững trước khi chọn môi trường thực tập phù hợp.”
                    </p>
                    <span className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
                      <Icon name="mic_off" />
                    </span>
                  </section>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <span className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    <Icon name="schedule" className="text-blue-700" />
                    Vòng 2 · Phản biện{' '}
                    <span className="font-mono text-slate-500">01:42</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-pressed={micOn}
                      onClick={() => setMicOn((value) => !value)}
                      className={`flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold ${
                        micOn ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Icon name={micOn ? 'mic' : 'mic_off'} />
                      {micOn ? 'Tắt mic' : 'Bật mic'}
                    </button>
                    <button
                      type="button"
                      aria-pressed={cameraOn}
                      onClick={() => setCameraOn((value) => !value)}
                      className={`flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold ${
                        cameraOn ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Icon name={cameraOn ? 'videocam' : 'videocam_off'} />
                      {cameraOn ? 'Tắt camera' : 'Bật camera'}
                    </button>
                  </div>
                </div>
                <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-extrabold text-[#213a61]">
                        Khán giả bình chọn đội thắng
                      </h3>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Bạn có thể đổi lựa chọn trước khi phiên kết thúc.
                      </p>
                    </div>
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700">
                      {activeRoomVoteTotal} lượt bình chọn
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {[activeRoom.sideA, activeRoom.sideB].map((side, index) => {
                      const percent = activeRoomVoteTotal
                        ? Math.round((activeRoomVotes[index] / activeRoomVoteTotal) * 100)
                        : 0;
                      const chosen = roomVoteChoice[activeRoom.id] === index;
                      return (
                        <button
                          key={side}
                          type="button"
                          onClick={() => voteRoom(index)}
                          aria-pressed={chosen}
                          className={`relative overflow-hidden rounded-xl border px-3 py-3 text-left ${
                            chosen
                              ? 'border-blue-400 bg-blue-50'
                              : 'border-slate-200 hover:border-blue-300'
                          }`}
                        >
                          <span className="relative z-10 flex items-center justify-between gap-2 text-xs font-bold text-slate-700">
                            <span>
                              Đội {index === 0 ? 'A' : 'B'} · {side}
                            </span>
                            <span>{percent}%</span>
                          </span>
                          <span
                            aria-hidden="true"
                            className="absolute inset-y-0 left-0 bg-blue-100/80"
                            style={{ width: `${percent}%` }}
                          />
                          {chosen && (
                            <span className="relative z-10 mt-1 block text-[10px] font-semibold text-blue-700">
                              Bạn đã bình chọn
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </section>
              </main>
              <aside className="flex min-h-[420px] min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-[#213a61]">
                      Bình luận trực tiếp
                    </h3>
                    <p className="mt-0.5 text-[10px] text-slate-400">
                      {activeRoom.people} người đang theo dõi
                    </p>
                  </div>
                  <Icon name="forum" className="text-xl text-blue-700" />
                </div>
                <div className="flex-1 space-y-3 overflow-y-auto p-4">
                  {activeRoomComments.map((comment, index) => (
                    <div
                      key={`${comment.author}-${index}`}
                      className="flex items-start gap-2"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100 text-[9px] font-extrabold text-sky-800">
                        {comment.initials}
                      </span>
                      <div className="min-w-0 rounded-2xl bg-slate-50 px-3 py-2">
                        <p className="text-[10px] font-bold text-slate-700">
                          {comment.author}
                        </p>
                        <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                          {comment.text}
                        </p>
                      </div>
                    </div>
                  ))}
                  <p className="flex items-center gap-1.5 text-[10px] text-emerald-700">
                    <Icon name="verified_user" className="text-sm" />
                    Quản trị viên đang điều phối phiên
                  </p>
                </div>
                <form
                  onSubmit={submitRoomComment}
                  className="flex items-center gap-2 border-t border-slate-100 p-3"
                >
                  <input
                    value={roomCommentDraft}
                    onChange={(event) => setRoomCommentDraft(event.target.value)}
                    placeholder="Viết bình luận..."
                    aria-label="Bình luận trong phòng"
                    className="min-w-0 flex-1 rounded-full border border-slate-200 px-4 py-2.5 text-xs outline-none focus:border-blue-300"
                  />
                  <button
                    type="submit"
                    aria-label="Gửi bình luận"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-700 text-white hover:bg-blue-800"
                  >
                    <Icon name="send" className="text-base" />
                  </button>
                </form>
              </aside>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </StudentPageLayout>
  );
}

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type {
  UserProfileData,
  ProfileStats,
  ProfileAchievement,
  ProfilePost,
} from '../types/profile';
import { ProfileHeaderCard } from './ProfileHeaderCard';
import { ProfileStatsCard } from './ProfileStatsCard';
import { ProfileAchievements } from './ProfileAchievements';
import { ProfilePostsList } from './ProfilePostsList';

afterEach(() => {
  cleanup();
});

const mockProfile: UserProfileData = {
  user: {
    id: 1,
    name: 'Nguyễn Văn A',
    email: 'nguyenvana@example.com',
    avatar_url: 'https://example.com/avatar.jpg',
    created_at: '2026-01-15T08:00:00Z',
  },
  community_profile: {
    username: 'nguyenvana',
    headline: 'Sinh viên CNTT - Đam mê thuyết trình',
    bio: 'Luôn tìm kiếm cơ hội cải thiện kỹ năng nói trước đám đông và truyền cảm hứng.',
  },
  stats: {
    presentation_count: 12,
    average_score: 8.5,
    practice_duration_minutes: 180,
    followers_count: 45,
    following_count: 20,
  },
  achievements: [
    {
      id: 'first_speech',
      name: 'Bài nói đầu tiên',
      icon: 'mic',
      unlocked_at: '2026-02-01T10:00:00Z',
    },
    {
      id: 'high_scorer',
      name: 'Bậc thầy thuyết trình',
      icon: 'trophy',
      unlocked_at: '2026-02-10T15:30:00Z',
    },
  ],
  posts: [
    {
      id: 101,
      content: 'Bí quyết để tự tin hơn khi mở đầu bài thuyết trình là gì?',
      topic: 'Kỹ năng mở đầu',
      likes_count: 15,
      replies_count: 4,
      created_at: '2026-03-01T12:00:00Z',
    },
    {
      id: 102,
      content: 'Vừa hoàn thành bài thực hành thứ 10! Điểm số cải thiện rõ rệt.',
      topic: null,
      likes_count: 8,
      replies_count: 2,
      created_at: '2026-03-05T09:30:00Z',
    },
  ],
  is_own_profile: true,
  is_following: false,
};

describe('ProfileHeaderCard', () => {
  it('renders avatar, name, @username, headline, bio, followers and following counts', () => {
    render(<ProfileHeaderCard profile={mockProfile} isOwnProfile={true} />);

    expect(screen.getByText('Nguyễn Văn A')).toBeDefined();
    expect(screen.getByText('@nguyenvana')).toBeDefined();
    expect(screen.getByText('Sinh viên CNTT - Đam mê thuyết trình')).toBeDefined();
    expect(
      screen.getByText('Luôn tìm kiếm cơ hội cải thiện kỹ năng nói trước đám đông và truyền cảm hứng.')
    ).toBeDefined();

    expect(screen.getByText('45')).toBeDefined();
    expect(screen.getByText(/người theo dõi/i)).toBeDefined();
    expect(screen.getByText('20')).toBeDefined();
    expect(screen.getByText(/đang theo dõi/i)).toBeDefined();

    const avatar = screen.getByRole('img', { name: 'Nguyễn Văn A' });
    expect(avatar).toBeDefined();
    expect(avatar.getAttribute('src')).toBe('https://example.com/avatar.jpg');
  });

  it('renders "Chỉnh sửa hồ sơ" button when isOwnProfile is true and omits "Đổi mật khẩu"', () => {
    const handleEdit = vi.fn();

    render(
      <ProfileHeaderCard
        profile={mockProfile}
        isOwnProfile={true}
        onEditProfile={handleEdit}
      />
    );

    const editBtn = screen.getByRole('button', { name: /chỉnh sửa hồ sơ/i });
    expect(editBtn).toBeDefined();
    fireEvent.click(editBtn);
    expect(handleEdit).toHaveBeenCalledTimes(1);

    expect(screen.queryByRole('button', { name: /đổi mật khẩu/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^theo dõi$/i })).toBeNull();
  });

  it('renders "Theo dõi" button when isOwnProfile is false and isFollowing is false', () => {
    const handleToggleFollow = vi.fn();

    render(
      <ProfileHeaderCard
        profile={mockProfile}
        isOwnProfile={false}
        isFollowing={false}
        onToggleFollow={handleToggleFollow}
      />
    );

    expect(screen.queryByRole('button', { name: /chỉnh sửa hồ sơ/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /đổi mật khẩu/i })).toBeNull();

    const followBtn = screen.getByRole('button', { name: /^theo dõi$/i });
    expect(followBtn).toBeDefined();
    fireEvent.click(followBtn);
    expect(handleToggleFollow).toHaveBeenCalledTimes(1);
  });

  it('renders "Đang theo dõi" button when isOwnProfile is false and isFollowing is true', () => {
    render(
      <ProfileHeaderCard
        profile={mockProfile}
        isOwnProfile={false}
        isFollowing={true}
      />
    );

    expect(screen.getByRole('button', { name: /đang theo dõi/i })).toBeDefined();
  });

  it('disables follow button when isFollowPending is true', () => {
    render(
      <ProfileHeaderCard
        profile={mockProfile}
        isOwnProfile={false}
        isFollowing={false}
        isFollowPending={true}
      />
    );

    const followBtn = screen.getByRole('button', { name: /theo dõi/i }) as HTMLButtonElement;
    expect(followBtn.disabled).toBe(true);
  });
});

describe('ProfileStatsCard', () => {
  const stats: ProfileStats = {
    presentation_count: 25,
    average_score: 9.2,
    practice_duration_minutes: 450,
    followers_count: 80,
    following_count: 30,
  };

  it('renders 3 metrics: average score, sessions count, and practice duration', () => {
    render(<ProfileStatsCard stats={stats} />);

    expect(screen.getByText('9.2 / 10')).toBeDefined();
    expect(screen.getByText('25 bài')).toBeDefined();
    expect(screen.getByText('450 phút')).toBeDefined();

    expect(screen.getByText(/điểm trung bình/i)).toBeDefined();
    expect(screen.getByText(/bài thuyết trình/i)).toBeDefined();
    expect(screen.getByText(/thời lượng luyện tập/i)).toBeDefined();
  });
});

describe('ProfileAchievements', () => {
  const achievements: ProfileAchievement[] = [
    {
      id: 'badge-1',
      name: 'Diễn giả tiềm năng',
      icon: 'mic',
      unlocked_at: '2026-01-20T10:00:00Z',
    },
    {
      id: 'badge-2',
      name: 'Ngôi sao tự tin',
      icon: 'star',
      unlocked_at: '2026-02-15T14:00:00Z',
    },
  ];

  it('renders unlocked badges with names and link to /achievements', () => {
    render(
      <MemoryRouter>
        <ProfileAchievements achievements={achievements} />
      </MemoryRouter>
    );

    expect(screen.getByText('Diễn giả tiềm năng')).toBeDefined();
    expect(screen.getByText('Ngôi sao tự tin')).toBeDefined();

    const link = screen.getByRole('link', { name: /xem tất cả/i });
    expect(link).toBeDefined();
    expect(link.getAttribute('href')).toBe('/achievements');
  });

  it('renders empty state when achievements array is empty', () => {
    render(
      <MemoryRouter>
        <ProfileAchievements achievements={[]} />
      </MemoryRouter>
    );

    expect(screen.getByText(/chưa có huy hiệu nào/i)).toBeDefined();
  });
});

describe('ProfilePostsList', () => {
  const posts: ProfilePost[] = [
    {
      id: 1,
      content: 'Làm thế nào để duy trì giao tiếp mắt tự nhiên?',
      topic: 'Eye Contact',
      likes_count: 24,
      replies_count: 7,
      created_at: '2026-03-01T08:00:00Z',
    },
    {
      id: 2,
      content: 'Chia sẻ slide thuyết trình môn Quản trị kinh doanh.',
      topic: null,
      likes_count: 5,
      replies_count: 0,
      created_at: '2026-03-02T10:00:00Z',
    },
  ];

  it('renders post items with content, topic tag, likes, and replies', () => {
    render(<ProfilePostsList posts={posts} />);

    expect(screen.getByText('Làm thế nào để duy trì giao tiếp mắt tự nhiên?')).toBeDefined();
    expect(screen.getByText('Eye Contact')).toBeDefined();
    expect(screen.getByText('24')).toBeDefined();
    expect(screen.getByText('7')).toBeDefined();

    expect(screen.getByText('Chia sẻ slide thuyết trình môn Quản trị kinh doanh.')).toBeDefined();
    expect(screen.getByText('5')).toBeDefined();
    expect(screen.getByText('0')).toBeDefined();
  });

  it('renders empty state when posts array is empty', () => {
    render(<ProfilePostsList posts={[]} />);

    expect(screen.getByText(/chưa có bài viết nào/i)).toBeDefined();
  });
});

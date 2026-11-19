import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '../ui/tooltip';
import { StudentPageLayout } from './StudentPageLayout';

function renderLayout(
  initialCollapsed = false,
  {
    active = '/home',
    initialEntries = ['/home'],
  }: { active?: string; initialEntries?: string[] } = {},
) {
  if (initialCollapsed) {
    window.localStorage.setItem('softskill_sidebar_collapsed', 'true');
  } else {
    window.localStorage.removeItem('softskill_sidebar_collapsed');
  }

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <MemoryRouter initialEntries={initialEntries}>
          <StudentPageLayout active={active}>
            <div>Nội dung trang test</div>
          </StudentPageLayout>
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

describe('StudentPageLayout', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it('renders navigation items and content in expanded mode', () => {
    renderLayout(false);

    expect(screen.getByText('Nội dung trang test')).toBeTruthy();
    expect(screen.getByText('Trang chủ')).toBeTruthy();
    expect(screen.getByText('Lộ trình học')).toBeTruthy();
    expect(screen.getByText('Luyện thuyết trình với AI')).toBeTruthy();
    expect(screen.getByText('Thành tích')).toBeTruthy();
    expect(screen.getByText('Cộng đồng')).toBeTruthy();
  });

  it('renders sidebar with collapsed state and tooltip structure when collapsed', () => {
    const { container } = renderLayout(true);

    const aside = container.querySelector('aside');
    expect(aside).toBeTruthy();
    expect(aside?.className).toContain('w-[76px]');

    // Navigation links are rendered as tooltip triggers
    const nav = screen.getByRole('navigation', { name: /Điều hướng chính/i });
    expect(nav).toBeTruthy();

    const homeLink = screen.getByRole('link', { name: /^Trang chủ$/i });
    expect(homeLink).toBeTruthy();
    expect(homeLink.getAttribute('href')).toBe('/home');
    expect(homeLink.getAttribute('data-slot')).toBe('tooltip-trigger');

    // Expand button is present when collapsed with tooltip trigger
    const expandBtn = screen.getByRole('button', { name: 'Mở rộng thanh bên' });
    expect(expandBtn).toBeTruthy();
    expect(expandBtn.getAttribute('data-slot')).toBe('tooltip-trigger');

    // User avatar trigger is present in collapsed footer
    const userMenuBtn = within(aside!).getByRole('button', { name: 'Menu tài khoản' });
    expect(userMenuBtn).toBeTruthy();
  });

  it('toggles collapse state smoothly without showing expand button over logo when not hovered', () => {
    const { container } = renderLayout(false);

    const aside = container.querySelector('aside')!;
    expect(aside.className).toContain('w-[260px]');

    // Find and click the desktop collapse button
    const collapseBtn = within(aside).getByRole('button', { name: 'Thu gọn thanh bên' });
    expect(collapseBtn).toBeTruthy();
    fireEvent.click(collapseBtn);

    // Sidebar should be collapsed
    expect(aside.className).toContain('w-[76px]');

    // Logo link should be rendered
    const logoLink = within(aside).getByRole('link', { name: 'SoftSkill AI - Trang chủ' });
    expect(logoLink).toBeTruthy();

    // Expand button should be hidden by default (opacity-0, no lingering focus-within)
    const expandBtn = within(aside).getByRole('button', { name: 'Mở rộng thanh bên' });
    expect(expandBtn.className).toContain('opacity-0');
    expect(expandBtn.className).not.toContain('group-focus-within');

    // Clicking expand button re-expands the sidebar
    fireEvent.click(expandBtn);
    expect(aside.className).toContain('w-[260px]');
  });

  it('renders sidebar user menu trigger and opens dropdown with user options', async () => {
    const { container } = renderLayout(false);

    const aside = container.querySelector('aside')!;
    const userMenuBtn = within(aside).getByRole('button', { name: 'Menu tài khoản' });
    expect(userMenuBtn).toBeTruthy();
    expect(userMenuBtn.textContent).toContain('Học viên');

    // Click to open user menu dropdown
    fireEvent.click(userMenuBtn);

    expect(await screen.findByText('Nâng cấp Pro')).toBeTruthy();
    expect(screen.getByText('Tài khoản')).toBeTruthy();
    expect(screen.getByText('Gói học & Thanh toán')).toBeTruthy();
    expect(screen.getByText('Thông báo')).toBeTruthy();
    expect(screen.getByText('Đăng xuất')).toBeTruthy();
  });

  it('renders header user menu trigger and opens synchronized dropdown with user options', async () => {
    const { container } = renderLayout(false);

    const header = container.querySelector('header')!;
    const headerUserMenuBtn = within(header).getByRole('button', { name: 'Menu tài khoản' });
    expect(headerUserMenuBtn).toBeTruthy();
    expect(headerUserMenuBtn.textContent).toContain('Học viên');

    // Click to open header user menu dropdown
    fireEvent.click(headerUserMenuBtn);

    expect(await screen.findByText('Nâng cấp Pro')).toBeTruthy();
    expect(screen.getByText('Tài khoản')).toBeTruthy();
    expect(screen.getByText('Gói học & Thanh toán')).toBeTruthy();
    expect(screen.getByText('Thông báo')).toBeTruthy();
    expect(screen.getByText('Đăng xuất')).toBeTruthy();
  });

  it('renders mobile navigation drawer with synchronized user profile menu', async () => {
    renderLayout(false);

    // Open mobile sidebar drawer
    const mobileTrigger = screen.getByRole('button', { name: 'Mở điều hướng' });
    fireEvent.click(mobileTrigger);

    // Inside the mobile drawer, the close button and user menu button are present
    const closeBtn = screen.getByRole('button', { name: 'Thu gọn thanh bên' });
    expect(closeBtn).toBeTruthy();

    const mobileUserMenuBtn = screen.getByRole('button', { name: 'Menu tài khoản' });
    expect(mobileUserMenuBtn).toBeTruthy();
    expect(mobileUserMenuBtn.textContent).toContain('Học viên');

    // Click mobile user menu to open dropdown
    fireEvent.click(mobileUserMenuBtn);

    expect(await screen.findByText('Nâng cấp Pro')).toBeTruthy();
    expect(screen.getByText('Tài khoản')).toBeTruthy();
    expect(screen.getByText('Gói học & Thanh toán')).toBeTruthy();
    expect(screen.getByText('Thông báo')).toBeTruthy();
    expect(screen.getByText('Đăng xuất')).toBeTruthy();
  });

  it('expands community dropdown submenu and highlights active child route', () => {
    const { container } = renderLayout(false, {
      active: '/home',
      initialEntries: ['/home'],
    });
    const aside = container.querySelector('aside')!;

    // Closed by default when not on /community
    expect(within(aside).queryByRole('link', { name: 'Đã lưu' })).toBeNull();

    const toggleBtn = within(aside).getByRole('button', { name: 'Mở rộng menu Cộng đồng' });
    fireEvent.click(toggleBtn);

    const savedLink = within(aside).getByRole('link', { name: 'Đã lưu' });
    const likedLink = within(aside).getByRole('link', { name: 'Đã thích' });
    const followingLink = within(aside).getByRole('link', { name: 'Đang theo dõi' });

    expect(savedLink.getAttribute('href')).toBe('/community?tab=saved');
    expect(likedLink.getAttribute('href')).toBe('/community?tab=liked');
    expect(followingLink.getAttribute('href')).toBe('/community?tab=following');
  });

  it('auto-opens community submenu and highlights active sub-item when on /community?tab=saved', () => {
    const { container } = renderLayout(false, {
      active: '/community',
      initialEntries: ['/community?tab=saved'],
    });
    const aside = container.querySelector('aside')!;

    const communityLink = within(aside).getByRole('link', { name: /^Cộng đồng$/i });
    const savedLink = within(aside).getByRole('link', { name: 'Đã lưu' });

    expect(communityLink.getAttribute('aria-current')).toBeNull();
    expect(communityLink.parentElement?.className).toContain('bg-blue-50');
    expect(savedLink.getAttribute('aria-current')).toBe('page');
    expect(savedLink.className).toContain('bg-blue-700');
  });

  it('opens community popover dropdown menu when sidebar is collapsed', async () => {
    const { container } = renderLayout(true, {
      active: '/community',
      initialEntries: ['/community?tab=liked'],
    });
    const aside = container.querySelector('aside')!;

    const communityTrigger = within(aside).getByRole('button', { name: 'Cộng đồng' });
    fireEvent.click(communityTrigger);

    expect(await screen.findByText('Bảng tin Cộng đồng')).toBeTruthy();
    expect(screen.getByText('Đã lưu')).toBeTruthy();
    expect(screen.getByText('Đã thích')).toBeTruthy();
    expect(screen.getByText('Đang theo dõi')).toBeTruthy();
  });
});

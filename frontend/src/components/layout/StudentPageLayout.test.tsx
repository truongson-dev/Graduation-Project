import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '../ui/tooltip';
import { StudentPageLayout } from './StudentPageLayout';

function renderLayout(initialCollapsed = false) {
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
        <MemoryRouter>
          <StudentPageLayout active="/home">
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
});

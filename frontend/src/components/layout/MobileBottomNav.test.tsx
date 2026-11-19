import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { MobileBottomNav } from './MobileBottomNav';

describe('MobileBottomNav', () => {
  const originalInnerWidth = window.innerWidth;

  beforeEach(() => {
    // Default to mobile width for mobile nav testing
    window.innerWidth = 390;
  });

  afterEach(() => {
    cleanup();
    window.innerWidth = originalInnerWidth;
  });

  it('renders all 5 mobile navigation tabs on mobile viewport', () => {
    render(
      <MemoryRouter initialEntries={['/home']}>
        <MobileBottomNav active="/home" />
      </MemoryRouter>
    );

    const nav = screen.getByRole('navigation', { name: 'Thanh điều hướng dưới' });
    expect(nav).toBeTruthy();

    expect(screen.getByText('Trang chủ')).toBeTruthy();
    expect(screen.getByText('Lộ trình')).toBeTruthy();
    expect(screen.getByText('Luyện AI')).toBeTruthy();
    expect(screen.getByText('Thành tích')).toBeTruthy();
    expect(screen.getByText('Cộng đồng')).toBeTruthy();
  });

  it('highlights the active item and sets aria-current="page"', () => {
    render(
      <MemoryRouter initialEntries={['/practice/setup']}>
        <MobileBottomNav active="/practice/setup" />
      </MemoryRouter>
    );

    const practiceLink = screen.getByRole('link', { name: 'Chuyển đến Luyện AI' });
    expect(practiceLink).toBeTruthy();
    expect(practiceLink.getAttribute('aria-current')).toBe('page');

    const homeLink = screen.getByRole('link', { name: 'Chuyển đến Trang chủ' });
    expect(homeLink.getAttribute('aria-current')).toBeNull();
  });

  it('returns null on desktop viewport (>= 1024px)', () => {
    window.innerWidth = 1200;

    render(
      <MemoryRouter initialEntries={['/home']}>
        <MobileBottomNav active="/home" />
      </MemoryRouter>
    );

    expect(screen.queryByRole('navigation', { name: 'Thanh điều hướng dưới' })).toBeNull();
  });
});

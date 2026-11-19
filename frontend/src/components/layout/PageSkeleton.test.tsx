import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { PageSkeleton } from './PageSkeleton';

describe('PageSkeleton (shadcn pattern)', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders accessible loading status container with aria attributes', () => {
    render(<PageSkeleton />);

    const container = screen.getByRole('status', { name: 'Đang tải trang...' });
    expect(container).toBeTruthy();
    expect(container.getAttribute('aria-busy')).toBe('true');
    expect(screen.getByText('Đang tải nội dung trang...')).toBeTruthy();
  });

  it('renders skeleton items inside shadcn card containers', () => {
    const { container } = render(<PageSkeleton />);

    const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(10);

    const cards = container.querySelectorAll('[data-slot="card"]');
    expect(cards.length).toBeGreaterThanOrEqual(4);
  });
});

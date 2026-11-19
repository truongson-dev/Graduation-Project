import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RouteErrorBoundary } from './RouteErrorBoundary';

const mockUseRouteError = vi.fn();
const mockIsRouteErrorResponse = vi.fn();
const mockNavigate = vi.fn();

vi.mock('react-router', () => ({
  useRouteError: () => mockUseRouteError(),
  isRouteErrorResponse: (err: unknown) => mockIsRouteErrorResponse(err),
  useNavigate: () => mockNavigate,
}));

describe('RouteErrorBoundary', () => {
  it('renders 404 message when status is 404', () => {
    mockUseRouteError.mockReturnValue({ status: 404 });
    mockIsRouteErrorResponse.mockReturnValue(true);

    render(<RouteErrorBoundary />);

    expect(screen.getByText('404 - Không tìm thấy trang')).toBeTruthy();
    expect(
      screen.getByText('Trang bạn đang tìm kiếm không tồn tại hoặc đã được di chuyển.')
    ).toBeTruthy();
  });

  it('renders generic Error message when standard Error is thrown', () => {
    mockUseRouteError.mockReturnValue(new Error('Lỗi kết nối máy chủ'));
    mockIsRouteErrorResponse.mockReturnValue(false);

    render(<RouteErrorBoundary />);

    expect(screen.getByText('Đã xảy ra lỗi không mong muốn')).toBeTruthy();
    expect(screen.getByText('Lỗi kết nối máy chủ')).toBeTruthy();
  });
});

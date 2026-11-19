import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { NotFoundPage } from './NotFoundPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockNavigate = vi.fn();
let mockMeData: unknown = null;

vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('@/features/auth/api/auth', () => ({
  useMe: () => ({ data: mockMeData, isPending: false, isError: false }),
}));

function renderNotFoundPage(props = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <NotFoundPage {...props} />
    </QueryClientProvider>
  );
}

describe('NotFoundPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMeData = null;
  });

  afterEach(() => {
    cleanup();
  });

  it('renders illustration, Page Not Found title, and description correctly', () => {
    renderNotFoundPage();

    expect(screen.getByRole('main')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1, name: /page not found/i })).toBeTruthy();
    expect(screen.getByText("We couldn't find the page you are looking for")).toBeTruthy();
    expect(screen.getByRole('button', { name: /back to home page/i })).toBeTruthy();
    const image = screen.getByRole('img', { name: /404 - cat/i });
    expect(image).toBeTruthy();
  });

  it('navigates to / when user is not authenticated and clicks "Back to home page"', () => {
    mockMeData = null;
    renderNotFoundPage();

    const homeButton = screen.getByRole('button', { name: /back to home page/i });
    fireEvent.click(homeButton);

    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('navigates to /home when user is authenticated and clicks "Back to home page"', () => {
    mockMeData = { id: 1, name: 'Student Test' };
    renderNotFoundPage();

    const homeButton = screen.getByRole('button', { name: /back to home page/i });
    fireEvent.click(homeButton);

    expect(mockNavigate).toHaveBeenCalledWith('/home');
  });

  it('calls onHome callback when provided', () => {
    const onHome = vi.fn();
    renderNotFoundPage({ onHome });

    const homeButton = screen.getByRole('button', { name: /back to home page/i });
    fireEvent.click(homeButton);

    expect(onHome).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PracticeSetupPage } from './PracticeSetupPage';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/practice/setup']}>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
};

afterEach(() => {
  cleanup();
});

describe('PracticeSetupPage Language Selection', () => {
  it('renders presentation language selector with Vietnamese selected by default', () => {
    render(<PracticeSetupPage />, { wrapper: createWrapper() });

    expect(screen.getByText('Ngôn ngữ thuyết trình')).toBeTruthy();

    const viButton = screen.getByRole('button', { name: /tiếng việt/i });
    const enButton = screen.getByRole('button', { name: /tiếng anh/i });

    expect(viButton).toBeTruthy();
    expect(enButton).toBeTruthy();
    expect(viButton.getAttribute('aria-pressed')).toBe('true');
    expect(enButton.getAttribute('aria-pressed')).toBe('false');

    // Checklist also reflects selected language
    expect(screen.getAllByText('Tiếng Việt').length).toBeGreaterThanOrEqual(1);
  });

  it('allows user to switch language between Vietnamese and English', () => {
    render(<PracticeSetupPage />, { wrapper: createWrapper() });

    const viButton = screen.getByRole('button', { name: /tiếng việt/i });
    const enButton = screen.getByRole('button', { name: /tiếng anh/i });

    // Click English
    fireEvent.click(enButton);

    expect(enButton.getAttribute('aria-pressed')).toBe('true');
    expect(viButton.getAttribute('aria-pressed')).toBe('false');
    expect(screen.getAllByText('Tiếng Anh').length).toBeGreaterThanOrEqual(1);

    // Click Vietnamese back
    fireEvent.click(viButton);

    expect(viButton.getAttribute('aria-pressed')).toBe('true');
    expect(enButton.getAttribute('aria-pressed')).toBe('false');
  });
});

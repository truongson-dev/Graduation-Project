import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { TopProgressBar } from './TopProgressBar';

describe('TopProgressBar', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders progress bar element with aria-hidden on initial navigation', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/home']}>
        <TopProgressBar />
      </MemoryRouter>
    );

    const progressBar = container.querySelector('[aria-hidden="true"]');
    expect(progressBar).toBeTruthy();
  });
});

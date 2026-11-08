import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { UserAvatar } from './UserAvatar';

afterEach(() => {
  cleanup();
});

describe('UserAvatar', () => {
  it('renders Google avatar image when avatarUrl is provided', () => {
    render(
      <UserAvatar
        avatarUrl="https://lh3.googleusercontent.com/test-avatar"
        name="Nguyen Van A"
        initials="NA"
      />
    );

    const img = screen.getByRole('img', { name: 'Nguyen Van A' });
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBe('https://lh3.googleusercontent.com/test-avatar');
  });

  it('renders initials letter avatar when avatarUrl is null (email registration)', () => {
    render(
      <UserAvatar
        avatarUrl={null}
        name="Tran Thi B"
        initials="TB"
      />
    );

    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText('TB')).toBeTruthy();
  });

  it('falls back to initials letter avatar when image loading fails', () => {
    render(
      <UserAvatar
        avatarUrl="https://invalid-domain.test/broken.png"
        name="Le Van C"
        initials="LC"
      />
    );

    const img = screen.getByRole('img', { name: 'Le Van C' });
    fireEvent.error(img);

    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText('LC')).toBeTruthy();
  });
});

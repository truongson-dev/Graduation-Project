import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { EditProfileDialog } from './EditProfileDialog';
import { ChangePasswordDialog } from './ChangePasswordDialog';

afterEach(() => {
  cleanup();
});

describe('EditProfileDialog', () => {
  const initialData = {
    name: 'Nguyễn Văn A',
    username: 'nguyenvana',
    avatar_url: 'https://example.com/avatar.jpg',
    headline: 'Sinh viên CNTT',
    bio: 'Đam mê thuyết trình và kỹ năng mềm.',
  };

  it('renders with prefilled data', () => {
    render(
      <EditProfileDialog
        open={true}
        onOpenChange={vi.fn()}
        initialData={initialData}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByRole('heading', { name: /chỉnh sửa hồ sơ/i })).toBeDefined();
    expect((screen.getByLabelText(/họ và tên/i) as HTMLInputElement).value).toBe('Nguyễn Văn A');
    expect((screen.getByLabelText(/tên người dùng|username/i) as HTMLInputElement).value).toBe('nguyenvana');
    expect((screen.getByLabelText(/ảnh đại diện|avatar/i) as HTMLInputElement).value).toBe(
      'https://example.com/avatar.jpg'
    );
    expect((screen.getByLabelText(/chức danh|giới thiệu ngắn|headline/i) as HTMLInputElement).value).toBe('Sinh viên CNTT');
    expect((screen.getByLabelText(/tiểu sử|bio/i) as HTMLTextAreaElement).value).toBe(
      'Đam mê thuyết trình và kỹ năng mềm.'
    );
  });

  it('validates name is not empty and shows error message', async () => {
    const handleSubmit = vi.fn();
    render(
      <EditProfileDialog
        open={true}
        onOpenChange={vi.fn()}
        initialData={initialData}
        onSubmit={handleSubmit}
      />
    );

    const nameInput = screen.getByLabelText(/họ và tên/i);
    fireEvent.change(nameInput, { target: { value: '   ' } });

    const submitBtn = screen.getByRole('button', { name: /lưu thay đổi/i });
    fireEvent.click(submitBtn);

    const errorMsg = await screen.findByText(/tên không được để trống/i);
    expect(errorMsg).toBeDefined();
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it('validates username format and length', async () => {
    const handleSubmit = vi.fn();
    render(
      <EditProfileDialog
        open={true}
        onOpenChange={vi.fn()}
        initialData={initialData}
        onSubmit={handleSubmit}
      />
    );

    const usernameInput = screen.getByLabelText(/tên người dùng|username/i);
    fireEvent.change(usernameInput, { target: { value: '_bad' } });

    const submitBtn = screen.getByRole('button', { name: /lưu thay đổi/i });
    fireEvent.click(submitBtn);

    const errorMsg = await screen.findByText(/tên người dùng chỉ được chứa chữ cái/i);
    expect(errorMsg).toBeDefined();
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it('submits valid inputs including username to onSubmit', async () => {
    const handleSubmit = vi.fn();
    const handleOpenChange = vi.fn();

    render(
      <EditProfileDialog
        open={true}
        onOpenChange={handleOpenChange}
        initialData={initialData}
        onSubmit={handleSubmit}
      />
    );

    const nameInput = screen.getByLabelText(/họ và tên/i);
    const usernameInput = screen.getByLabelText(/tên người dùng|username/i);
    const headlineInput = screen.getByLabelText(/chức danh|giới thiệu ngắn|headline/i);
    const bioInput = screen.getByLabelText(/tiểu sử|bio/i);

    fireEvent.change(nameInput, { target: { value: 'Trần Văn B' } });
    fireEvent.change(usernameInput, { target: { value: 'tranvanb' } });
    fireEvent.change(headlineInput, { target: { value: 'Kỹ sư phần mềm' } });
    fireEvent.change(bioInput, { target: { value: 'Thích học hỏi công nghệ mới' } });

    const submitBtn = screen.getByRole('button', { name: /lưu thay đổi/i });
    fireEvent.click(submitBtn);

    expect(handleSubmit).toHaveBeenCalledTimes(1);
    expect(handleSubmit).toHaveBeenCalledWith({
      name: 'Trần Văn B',
      username: 'tranvanb',
      avatar_url: 'https://example.com/avatar.jpg',
      headline: 'Kỹ sư phần mềm',
      bio: 'Thích học hỏi công nghệ mới',
    });
  });

  it('displays serverError when provided', () => {
    render(
      <EditProfileDialog
        open={true}
        onOpenChange={vi.fn()}
        initialData={initialData}
        onSubmit={vi.fn()}
        serverError="Tên người dùng này đã được sử dụng."
      />
    );

    expect(screen.getByText('Tên người dùng này đã được sử dụng.')).toBeDefined();
  });

  it('disables buttons when isPending is true', () => {
    render(
      <EditProfileDialog
        open={true}
        onOpenChange={vi.fn()}
        initialData={initialData}
        onSubmit={vi.fn()}
        isPending={true}
      />
    );

    const submitBtn = screen.getByRole('button', { name: /đang lưu|lưu thay đổi/i }) as HTMLButtonElement;
    const cancelBtn = screen.getByRole('button', { name: /hủy/i }) as HTMLButtonElement;

    expect(submitBtn.disabled).toBe(true);
    expect(cancelBtn.disabled).toBe(true);
  });

  it('calls onOpenChange(false) when cancel button is clicked', () => {
    const handleOpenChange = vi.fn();
    render(
      <EditProfileDialog
        open={true}
        onOpenChange={handleOpenChange}
        initialData={initialData}
        onSubmit={vi.fn()}
      />
    );

    const cancelBtn = screen.getByRole('button', { name: /hủy/i });
    fireEvent.click(cancelBtn);

    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });
});

describe('ChangePasswordDialog', () => {
  it('renders current_password, new_password, and new_password_confirmation inputs', () => {
    render(
      <ChangePasswordDialog
        open={true}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByRole('heading', { name: /đổi mật khẩu/i })).toBeDefined();
    expect(screen.getByLabelText(/mật khẩu hiện tại/i)).toBeDefined();
    expect(screen.getByLabelText(/^mật khẩu mới/i)).toBeDefined();
    expect(screen.getByLabelText(/xác nhận mật khẩu mới/i)).toBeDefined();
  });

  it('validates current password is not empty', async () => {
    const handleSubmit = vi.fn();
    render(
      <ChangePasswordDialog
        open={true}
        onOpenChange={vi.fn()}
        onSubmit={handleSubmit}
      />
    );

    fireEvent.change(screen.getByLabelText(/^mật khẩu mới/i), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText(/xác nhận mật khẩu mới/i), {
      target: { value: 'password123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /cập nhật mật khẩu/i }));

    const errorMsg = await screen.findByText(/vui lòng nhập mật khẩu hiện tại/i);
    expect(errorMsg).toBeDefined();
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it('validates new password length is at least 8 characters', async () => {
    const handleSubmit = vi.fn();
    render(
      <ChangePasswordDialog
        open={true}
        onOpenChange={vi.fn()}
        onSubmit={handleSubmit}
      />
    );

    fireEvent.change(screen.getByLabelText(/mật khẩu hiện tại/i), {
      target: { value: 'OldPassword123' },
    });
    fireEvent.change(screen.getByLabelText(/^mật khẩu mới/i), {
      target: { value: 'short' },
    });
    fireEvent.change(screen.getByLabelText(/xác nhận mật khẩu mới/i), {
      target: { value: 'short' },
    });

    fireEvent.click(screen.getByRole('button', { name: /cập nhật mật khẩu/i }));

    const errorMsg = await screen.findByText(/mật khẩu mới phải có ít nhất 8 ký tự/i);
    expect(errorMsg).toBeDefined();
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it('validates password confirmation matches new password', async () => {
    const handleSubmit = vi.fn();
    render(
      <ChangePasswordDialog
        open={true}
        onOpenChange={vi.fn()}
        onSubmit={handleSubmit}
      />
    );

    fireEvent.change(screen.getByLabelText(/mật khẩu hiện tại/i), {
      target: { value: 'OldPassword123' },
    });
    fireEvent.change(screen.getByLabelText(/^mật khẩu mới/i), {
      target: { value: 'NewPassword123' },
    });
    fireEvent.change(screen.getByLabelText(/xác nhận mật khẩu mới/i), {
      target: { value: 'DifferentPassword123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /cập nhật mật khẩu/i }));

    const errorMsg = await screen.findByText(/mật khẩu xác nhận không khớp/i);
    expect(errorMsg).toBeDefined();
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it('displays serverError message if provided', () => {
    render(
      <ChangePasswordDialog
        open={true}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
        serverError="Mật khẩu hiện tại không chính xác."
      />
    );

    expect(screen.getByText('Mật khẩu hiện tại không chính xác.')).toBeDefined();
  });

  it('submits valid inputs to onSubmit', async () => {
    const handleSubmit = vi.fn();
    render(
      <ChangePasswordDialog
        open={true}
        onOpenChange={vi.fn()}
        onSubmit={handleSubmit}
      />
    );

    fireEvent.change(screen.getByLabelText(/mật khẩu hiện tại/i), {
      target: { value: 'OldPass123' },
    });
    fireEvent.change(screen.getByLabelText(/^mật khẩu mới/i), {
      target: { value: 'NewPass456' },
    });
    fireEvent.change(screen.getByLabelText(/xác nhận mật khẩu mới/i), {
      target: { value: 'NewPass456' },
    });

    fireEvent.click(screen.getByRole('button', { name: /cập nhật mật khẩu/i }));

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledTimes(1);
    });
    expect(handleSubmit).toHaveBeenCalledWith({
      current_password: 'OldPass123',
      new_password: 'NewPass456',
      new_password_confirmation: 'NewPass456',
    });
  });

  it('disables buttons when isPending is true', () => {
    render(
      <ChangePasswordDialog
        open={true}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn()}
        isPending={true}
      />
    );

    const submitBtn = screen.getByRole('button', { name: /đang cập nhật|cập nhật mật khẩu/i }) as HTMLButtonElement;
    const cancelBtn = screen.getByRole('button', { name: /hủy/i }) as HTMLButtonElement;

    expect(submitBtn.disabled).toBe(true);
    expect(cancelBtn.disabled).toBe(true);
  });

  it('calls onOpenChange(false) when cancel button is clicked', () => {
    const handleOpenChange = vi.fn();
    render(
      <ChangePasswordDialog
        open={true}
        onOpenChange={handleOpenChange}
        onSubmit={vi.fn()}
      />
    );

    const cancelBtn = screen.getByRole('button', { name: /hủy/i });
    fireEvent.click(cancelBtn);

    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });
});

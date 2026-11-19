import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ChangePasswordPayload } from '../types/profile';
import {
  changePasswordSchema,
  type ChangePasswordFormValues,
} from '../schemas/changePasswordSchema';

export interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ChangePasswordPayload) => Promise<void> | void;
  isPending?: boolean;
  serverError?: string | null;
}

export const ChangePasswordDialog: React.FC<ChangePasswordDialogProps> = ({
  open,
  onOpenChange,
  onSubmit,
  isPending = false,
  serverError = null,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      current_password: '',
      new_password: '',
      new_password_confirmation: '',
    },
  });

  useEffect(() => {
    if (open) {
      reset();
    }
  }, [open, reset]);

  const onFormSubmit = (data: ChangePasswordFormValues) => {
    onSubmit({
      current_password: data.current_password,
      new_password: data.new_password,
      new_password_confirmation: data.new_password_confirmation,
    });
  };

  const clientError =
    errors.current_password?.message ||
    errors.new_password?.message ||
    errors.new_password_confirmation?.message;
  const displayError = clientError || serverError;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Đổi mật khẩu</DialogTitle>
          <DialogDescription>
            Cập nhật mật khẩu để bảo vệ an toàn cho tài khoản của bạn.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4 py-2" noValidate>
          {displayError && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm font-medium text-destructive">
              {displayError}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="current-password">
              Mật khẩu hiện tại <span className="text-destructive">*</span>
            </Label>
            <Input
              id="current-password"
              type="password"
              placeholder="Nhập mật khẩu hiện tại"
              disabled={isPending}
              autoComplete="current-password"
              {...register('current_password')}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new-password">
              Mật khẩu mới <span className="text-destructive">*</span>
            </Label>
            <Input
              id="new-password"
              type="password"
              placeholder="Tối thiểu 8 ký tự"
              disabled={isPending}
              autoComplete="new-password"
              {...register('new_password')}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm-new-password">
              Xác nhận mật khẩu mới <span className="text-destructive">*</span>
            </Label>
            <Input
              id="confirm-new-password"
              type="password"
              placeholder="Nhập lại mật khẩu mới"
              disabled={isPending}
              autoComplete="new-password"
              {...register('new_password_confirmation')}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

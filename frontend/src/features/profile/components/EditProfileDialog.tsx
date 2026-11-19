import React, { useState, useEffect, useRef } from 'react';
import { Camera, Trash2, Upload } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import type { UpdateProfilePayload } from '../types/profile';

export interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData: {
    name: string;
    username?: string | null;
    avatar_url?: string | null;
    headline?: string | null;
    bio?: string | null;
  };
  onSubmit: (data: UpdateProfilePayload, avatarFile?: File | null, isAvatarDeleted?: boolean) => Promise<void> | void;
  isPending?: boolean;
  serverError?: string | null;
}

export const EditProfileDialog: React.FC<EditProfileDialogProps> = ({
  open,
  onOpenChange,
  initialData,
  onSubmit,
  isPending = false,
  serverError = null,
}) => {
  const [name, setName] = useState(initialData.name || '');
  const [username, setUsername] = useState(initialData.username || '');
  const [avatarUrl, setAvatarUrl] = useState(initialData.avatar_url || '');
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(initialData.avatar_url || null);
  const [isAvatarDeleted, setIsAvatarDeleted] = useState(false);
  const [headline, setHeadline] = useState(initialData.headline || '');
  const [bio, setBio] = useState(initialData.bio || '');
  const [error, setError] = useState<string | null>(null);

  const prevOpenRef = useRef(open);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Only reset form fields when dialog opens (flips from false to true)
  // to avoid wiping user edits if parent component re-renders while typing
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setName(initialData.name || '');
      setUsername(initialData.username || '');
      setAvatarUrl(initialData.avatar_url || '');
      setAvatarPreviewUrl(initialData.avatar_url || null);
      setSelectedAvatarFile(null);
      setIsAvatarDeleted(false);
      setHeadline(initialData.headline || '');
      setBio(initialData.bio || '');
      setError(null);
    }
    prevOpenRef.current = open;
  }, [open, initialData.name, initialData.username, initialData.avatar_url, initialData.headline, initialData.bio]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chọn một file hình ảnh hợp lệ (JPG, PNG, WEBP, GIF).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Kích thước ảnh đại diện không được vượt quá 5MB.');
      return;
    }

    setError(null);
    setSelectedAvatarFile(file);
    setIsAvatarDeleted(false);
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreviewUrl(objectUrl);
  };

  const handleRemoveAvatar = () => {
    setSelectedAvatarFile(null);
    setAvatarPreviewUrl(null);
    setAvatarUrl('');
    setIsAvatarDeleted(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Tên không được để trống.');
      return;
    }

    const trimmedUsername = username.trim().toLowerCase();
    if (trimmedUsername) {
      if (trimmedUsername.length < 3 || trimmedUsername.length > 30) {
        setError('Tên người dùng phải có ít nhất 3 ký tự và tối đa 30 ký tự.');
        return;
      }
      const usernameRegex = /^[a-z0-9][a-z0-9_]{1,28}[a-z0-9]$/;
      if (!usernameRegex.test(trimmedUsername)) {
        setError('Tên người dùng chỉ được chứa chữ cái, chữ số, gạch dưới (_) và không được bắt đầu hoặc kết thúc bằng gạch dưới.');
        return;
      }
    }

    const payload = {
      name: trimmedName,
      username: trimmedUsername || null,
      avatar_url: isAvatarDeleted ? null : (avatarUrl.trim() || null),
      headline: headline.trim() || null,
      bio: bio.trim() || null,
    };

    if (selectedAvatarFile || isAvatarDeleted) {
      onSubmit(payload, selectedAvatarFile, isAvatarDeleted);
    } else {
      onSubmit(payload);
    }
  };

  const activeError = error || serverError;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa hồ sơ</DialogTitle>
          <DialogDescription>
            Cập nhật thông tin công khai và hồ sơ cá nhân của bạn.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {activeError && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm font-medium text-destructive">
              {activeError}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="edit-profile-name">
              Họ và tên <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nhập họ và tên"
              disabled={isPending}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-profile-username">
              Tên người dùng (Username)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm select-none">
                @
              </span>
              <Input
                id="edit-profile-username"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="hoanganh_99"
                className="pl-7"
                disabled={isPending}
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Định danh trên cộng đồng: 3–30 ký tự (chữ thường, số, gạch dưới).
            </p>
          </div>

          {/* Facebook-style Avatar Upload */}
          <div className="space-y-2 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-slate-700">
                Ảnh đại diện
              </Label>
              {selectedAvatarFile && (
                <span className="text-[11px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                  Đã chọn ảnh mới
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              <div className="relative shrink-0 group">
                <div className="h-16 w-16 sm:h-18 sm:w-18 rounded-full overflow-hidden border-2 border-white shadow-sm bg-slate-200 flex items-center justify-center ring-2 ring-slate-200/60">
                  {avatarPreviewUrl ? (
                    <img
                      src={avatarPreviewUrl}
                      alt="Ảnh đại diện xem trước"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-lg font-bold text-slate-600">
                      {name.trim() ? name.trim().charAt(0).toUpperCase() : 'U'}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isPending}
                  className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-white shadow-md hover:bg-slate-800 transition cursor-pointer"
                  title="Chọn ảnh khác"
                  aria-label="Chọn ảnh khác"
                >
                  <Camera className="size-3" />
                </button>
              </div>

              <div className="flex-1 space-y-1.5">
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isPending}
                    className="h-8 rounded-lg text-xs font-medium border-slate-200 hover:bg-white cursor-pointer"
                  >
                    <Upload className="size-3.5 mr-1.5" />
                    Tải ảnh từ máy
                  </Button>
                  {(avatarPreviewUrl || selectedAvatarFile) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveAvatar}
                      disabled={isPending}
                      className="h-8 rounded-lg text-xs text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                    >
                      <Trash2 className="size-3.5 mr-1.5" />
                      Gỡ ảnh
                    </Button>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  Hỗ trợ định dạng JPG, PNG, WEBP, GIF (tối đa 5MB).
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {/* Accessible fallback link input for compatibility */}
            <div className="pt-1 border-t border-slate-200/60">
              <details className="text-[11px] text-slate-500 cursor-pointer">
                <summary className="hover:text-slate-700 select-none py-0.5">
                  Tùy chọn: Nhập link ảnh trực tiếp (URL)
                </summary>
                <div className="mt-1.5 space-y-1">
                  <Label htmlFor="edit-profile-avatar" className="sr-only">
                    Ảnh đại diện (URL)
                  </Label>
                  <Input
                    id="edit-profile-avatar"
                    value={avatarUrl}
                    onChange={(e) => {
                      setAvatarUrl(e.target.value);
                      if (e.target.value.trim()) {
                        setAvatarPreviewUrl(e.target.value.trim());
                        setSelectedAvatarFile(null);
                        setIsAvatarDeleted(false);
                      }
                    }}
                    placeholder="https://example.com/avatar.jpg"
                    disabled={isPending}
                    className="h-7 text-xs bg-white"
                  />
                </div>
              </details>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-profile-headline">Chức danh / Giới thiệu ngắn</Label>
            <Input
              id="edit-profile-headline"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="VD: Sinh viên năm 3 CNTT, Thực tập sinh, Đam mê thuyết trình..."
              disabled={isPending}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-profile-bio">Tiểu sử (Bio)</Label>
            <Textarea
              id="edit-profile-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Giới thiệu đôi nét về bản thân và kinh nghiệm của bạn..."
              rows={3}
              disabled={isPending}
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
              {isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Bell,
  Check,
  ChevronDown,
  CreditCard,
  Loader2,
  Lock,
  Monitor,
  Palette,
  Shield,
  Trash2,
  User,
} from 'lucide-react';
import { StudentPageLayout } from '@/components/layout/StudentPageLayout';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/core/utils/cn';
import { getApiError } from '@/core/api/client';
import {
  changePasswordSchema,
  type ChangePasswordFormValues,
} from '../schemas/changePasswordSchema';
import {
  useMyProfileQuery,
  useUpdateProfileMutation,
  useUploadAvatarMutation,
  useDeleteAvatarMutation,
  useChangePasswordMutation,
} from '../api/useProfile';

type SettingsTab = 'profile' | 'account' | 'billing' | 'appearance' | 'notifications' | 'display';

interface NavItem {
  id: SettingsTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { id: 'profile', label: 'Hồ sơ', icon: User },
  { id: 'account', label: 'Bảo mật', icon: Shield },
  { id: 'billing', label: 'Gói dịch vụ', icon: CreditCard },
  { id: 'appearance', label: 'Giao diện', icon: Palette },
  { id: 'notifications', label: 'Thông báo', icon: Bell },
  { id: 'display', label: 'Hiển thị', icon: Monitor },
];

export function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = (searchParams.get('tab') as SettingsTab) || 'profile';
  const currentTab = rawTab === ('security' as SettingsTab) ? 'account' : rawTab;

  const activeTab: SettingsTab = [
    'profile',
    'account',
    'billing',
    'appearance',
    'notifications',
    'display',
  ].includes(currentTab)
    ? currentTab
    : 'profile';

  const handleTabChange = (tab: SettingsTab) => {
    setSearchParams({ tab });
  };

  const { data: profile, isLoading } = useMyProfileQuery();
  const updateProfileMutation = useUpdateProfileMutation();
  const uploadAvatarMutation = useUploadAvatarMutation();
  const deleteAvatarMutation = useDeleteAvatarMutation();
  const changePasswordMutation = useChangePasswordMutation();

  // Profile Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password Change State (React Hook Form + Zod)
  const [passwordServerFeedback, setPasswordServerFeedback] = useState<string | null>(null);
  const passwordForm = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      current_password: '',
      new_password: '',
      new_password_confirmation: '',
    },
  });

  // Billing State
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const handleSelectPlan = (planName: string) => {
    toast.info(`Bạn đã chọn gói ${planName} (${billingCycle === 'yearly' ? 'hàng năm' : 'hàng tháng'}). Tính năng thanh toán sẽ sớm ra mắt!`);
  };

  useEffect(() => {
    if (profile) {
      setName(profile.user.name || '');
      setEmail(profile.user.email || '');
      setUsername(profile.community_profile?.username || '');
      setHeadline(profile.community_profile?.headline || '');
      setBio(profile.community_profile?.bio || '');
      setAvatarPreview(profile.user.avatar_url || null);
    }
  }, [profile]);

  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file hình ảnh hợp lệ (JPG, PNG, WEBP, GIF).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Kích thước ảnh đại diện không được vượt quá 5MB.');
      return;
    }

    setAvatarPreview(URL.createObjectURL(file));

    try {
      const res = await uploadAvatarMutation.mutateAsync(file);
      if (res.avatar_url) {
        setAvatarPreview(res.avatar_url);
      }
      toast.success('Cập nhật ảnh đại diện thành công');
    } catch (err: unknown) {
      const errorInfo = getApiError(err, 'Không thể tải lên ảnh đại diện.');
      toast.error(errorInfo.message);
      setAvatarPreview(profile?.user.avatar_url || null);
    } finally {
      e.target.value = '';
    }
  };

  const handleDeleteAvatar = async () => {
    try {
      await deleteAvatarMutation.mutateAsync();
      setAvatarPreview(null);
      toast.success('Đã xóa ảnh đại diện');
    } catch (err: unknown) {
      const errorInfo = getApiError(err, 'Không thể xóa ảnh đại diện.');
      toast.error(errorInfo.message);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setProfileError('Họ và tên không được để trống.');
      return;
    }

    const trimmedUsername = username.trim().toLowerCase();
    if (trimmedUsername) {
      if (trimmedUsername.length < 3 || trimmedUsername.length > 30) {
        setProfileError('Username phải từ 3 đến 30 ký tự.');
        return;
      }
      const usernameRegex = /^[a-z0-9][a-z0-9_]{1,28}[a-z0-9]$/;
      if (!usernameRegex.test(trimmedUsername)) {
        setProfileError('Username chỉ chứa chữ cái thường, số và dấu gạch dưới (_).');
        return;
      }
    }

    try {
      await updateProfileMutation.mutateAsync({
        name: trimmedName,
        username: trimmedUsername || null,
        headline: headline.trim() || null,
        bio: bio.trim() || null,
      });
      toast.success('Cập nhật hồ sơ thành công');
    } catch (err: unknown) {
      const errorInfo = getApiError(err, 'Không thể lưu hồ sơ. Vui lòng thử lại.');
      setProfileError(errorInfo.message);
    }
  };

  const onPasswordSubmit = async (values: ChangePasswordFormValues) => {
    setPasswordServerFeedback(null);

    try {
      await changePasswordMutation.mutateAsync({
        current_password: values.current_password,
        new_password: values.new_password,
        new_password_confirmation: values.new_password_confirmation,
      });
      toast.success('Đổi mật khẩu thành công');
      passwordForm.reset();
    } catch (err: unknown) {
      const errorInfo = getApiError(err, 'Không thể đổi mật khẩu. Vui lòng kiểm tra lại.');
      if (errorInfo.fields?.current_password) {
        passwordForm.setError('current_password', { message: errorInfo.fields.current_password });
      }
      if (errorInfo.fields?.new_password) {
        passwordForm.setError('new_password', { message: errorInfo.fields.new_password });
      }
      setPasswordServerFeedback(errorInfo.message);
    }
  };

  return (
    <StudentPageLayout active="/settings" title="Cài đặt" bgClassName="bg-white">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Cài đặt</h1>
          <p className="text-sm text-neutral-500">
            Quản lý thông tin tài khoản và tùy chọn cài đặt của bạn.
          </p>
        </div>

        {/* Two-Card Layout */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8 pt-2">
          {/* Left Card: Navigation Card */}
          <aside className="w-full lg:w-56 shrink-0 rounded-2xl border border-neutral-200/90 bg-white p-2.5 shadow-2xs">
            <nav aria-label="Các mục cài đặt" className="flex space-x-1 overflow-x-auto pb-1 lg:flex-col lg:space-x-0 lg:space-y-1 lg:pb-0">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleTabChange(item.id)}
                    className={cn(
                      'flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors text-left shrink-0 cursor-pointer',
                      isActive
                        ? 'bg-neutral-100 text-neutral-900 font-semibold'
                        : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                    )}
                  >
                    <Icon className="size-4 shrink-0 text-neutral-600" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Right Card: Content Card */}
          <div className="flex-1 rounded-2xl border border-neutral-200/90 bg-white p-6 sm:p-8 lg:p-9 shadow-2xs min-w-0">
            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
              <form onSubmit={handleSaveProfile} className="space-y-6">
                {profileError && (
                  <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3.5 text-xs font-medium text-destructive">
                    {profileError}
                  </div>
                )}

                {/* Avatar Section */}
                <div className="flex items-center gap-4">
                  <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-neutral-100 border border-neutral-200 overflow-hidden">
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="Avatar preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User className="size-10 text-neutral-400 stroke-[1.5]" />
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadAvatarMutation.isPending}
                      className="rounded-lg bg-neutral-900 px-4 py-2 text-xs font-medium text-white hover:bg-black transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                    >
                      {uploadAvatarMutation.isPending ? (
                        <span className="flex items-center gap-1.5">
                          <Loader2 className="size-3.5 animate-spin" />
                          Đang tải lên...
                        </span>
                      ) : (
                        'Tải ảnh lên'
                      )}
                    </button>

                    {avatarPreview && (
                      <button
                        type="button"
                        onClick={handleDeleteAvatar}
                        disabled={deleteAvatarMutation.isPending || uploadAvatarMutation.isPending}
                        className="rounded-lg px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                      >
                        <Trash2 className="size-3.5 mr-1 inline" />
                        Gỡ ảnh
                      </button>
                    )}
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                    className="hidden"
                    onChange={handleAvatarFileSelect}
                  />
                </div>

                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium text-neutral-900">
                    Họ và tên
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nhập họ và tên của bạn"
                    className="rounded-lg border-neutral-200 h-10 text-sm focus-visible:ring-1 focus-visible:ring-neutral-400"
                  />
                </div>

                {/* Username */}
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-sm font-medium text-neutral-900">
                    Tên người dùng (Username)
                  </Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="username"
                    className="rounded-lg border-neutral-200 h-10 text-sm focus-visible:ring-1 focus-visible:ring-neutral-400"
                  />
                  <p className="text-xs text-neutral-500 leading-normal">
                    Đây là tên hiển thị công khai của bạn. Bạn chỉ có thể thay đổi tên này một lần mỗi 30 ngày.
                  </p>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-neutral-900">
                    Email
                  </Label>
                  <div className="relative">
                    <Input
                      id="email"
                      value={email}
                      readOnly
                      placeholder="Chọn email đã xác thực để hiển thị"
                      className="rounded-lg border-neutral-200 h-10 pr-10 text-sm bg-neutral-50/50 text-neutral-700 cursor-not-allowed"
                    />
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
                  </div>
                  <p className="text-xs text-neutral-500 leading-normal">
                    Bạn có thể quản lý các địa chỉ email đã xác thực trong phần cài đặt tài khoản.
                  </p>
                </div>

                {/* Headline */}
                <div className="space-y-2">
                  <Label htmlFor="headline" className="text-sm font-medium text-neutral-900">
                    Chức danh / Tiêu đề
                  </Label>
                  <Input
                    id="headline"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="Sinh viên CNTT / Kỹ sư phần mềm..."
                    className="rounded-lg border-neutral-200 h-10 text-sm focus-visible:ring-1 focus-visible:ring-neutral-400"
                  />
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <Label htmlFor="bio" className="text-sm font-medium text-neutral-900">
                    Tiểu sử
                  </Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Giới thiệu đôi nét về bản thân bạn..."
                    className="rounded-lg border-neutral-200 min-h-[90px] text-sm focus-visible:ring-1 focus-visible:ring-neutral-400"
                  />
                  <p className="text-xs text-neutral-500 leading-normal">
                    Bạn có thể sử dụng @tag để nhắc đến các học viên khác.
                  </p>
                </div>

                {/* Update Profile Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={updateProfileMutation.isPending || isLoading}
                    className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-black transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                  >
                    {updateProfileMutation.isPending ? (
                      <span className="flex items-center gap-1.5">
                        <Loader2 className="size-4 animate-spin" />
                        Đang lưu...
                      </span>
                    ) : (
                      'Cập nhật hồ sơ'
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* SECURITY TAB */}
            {activeTab === 'account' && (
              <div className="space-y-8">
                {/* Password Change Section */}
                <form
                  onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
                  className="space-y-6"
                  noValidate
                >
                  <div>
                    <h3 className="text-base font-semibold text-neutral-900">Đổi mật khẩu</h3>
                    <p className="text-xs text-neutral-500 mt-1">
                      Cập nhật mật khẩu để bảo vệ an toàn cho tài khoản của bạn.
                    </p>
                  </div>

                  {passwordServerFeedback && (
                    <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3.5 text-xs font-medium text-destructive">
                      {passwordServerFeedback}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="current_password" className="text-sm font-medium text-neutral-900">
                      Mật khẩu hiện tại
                    </Label>
                    <div className="relative">
                      <Input
                        id="current_password"
                        type="password"
                        placeholder="••••••••"
                        className="rounded-lg border-neutral-200 h-10 pl-10 text-sm focus-visible:ring-1 focus-visible:ring-neutral-400"
                        {...passwordForm.register('current_password')}
                      />
                      <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
                    </div>
                    {passwordForm.formState.errors.current_password && (
                      <p className="text-xs text-destructive">
                        {passwordForm.formState.errors.current_password.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new_password" className="text-sm font-medium text-neutral-900">
                      Mật khẩu mới
                    </Label>
                    <div className="relative">
                      <Input
                        id="new_password"
                        type="password"
                        placeholder="Ít nhất 8 ký tự"
                        className="rounded-lg border-neutral-200 h-10 pl-10 text-sm focus-visible:ring-1 focus-visible:ring-neutral-400"
                        {...passwordForm.register('new_password')}
                      />
                      <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
                    </div>
                    {passwordForm.formState.errors.new_password && (
                      <p className="text-xs text-destructive">
                        {passwordForm.formState.errors.new_password.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new_password_confirmation" className="text-sm font-medium text-neutral-900">
                      Xác nhận mật khẩu mới
                    </Label>
                    <div className="relative">
                      <Input
                        id="new_password_confirmation"
                        type="password"
                        placeholder="Nhập lại mật khẩu mới"
                        className="rounded-lg border-neutral-200 h-10 pl-10 text-sm focus-visible:ring-1 focus-visible:ring-neutral-400"
                        {...passwordForm.register('new_password_confirmation')}
                      />
                      <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
                    </div>
                    {passwordForm.formState.errors.new_password_confirmation && (
                      <p className="text-xs text-destructive">
                        {passwordForm.formState.errors.new_password_confirmation.message}
                      </p>
                    )}
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={changePasswordMutation.isPending}
                      className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-black transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                    >
                      {changePasswordMutation.isPending ? (
                        <span className="flex items-center gap-1.5">
                          <Loader2 className="size-4 animate-spin" />
                          Đang cập nhật...
                        </span>
                      ) : (
                        'Cập nhật mật khẩu'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* BILLING TAB (Matching Reference Image) */}
            {activeTab === 'billing' && (
              <div className="space-y-6">
                {/* Header with Monthly / Yearly toggle */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-neutral-900">
                      Choose Your Plan
                    </h2>
                    <p className="text-xs text-neutral-500 mt-1">
                      Chọn gói dịch vụ phù hợp nhất với nhu cầu học tập và rèn luyện của bạn.
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 text-sm font-medium">
                    <span
                      className={cn(
                        'text-xs transition-colors',
                        billingCycle === 'monthly' ? 'font-semibold text-neutral-900' : 'text-neutral-500'
                      )}
                    >
                      Monthly
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={billingCycle === 'yearly'}
                      onClick={() => setBillingCycle((prev) => (prev === 'monthly' ? 'yearly' : 'monthly'))}
                      className={cn(
                        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900',
                        billingCycle === 'yearly' ? 'bg-neutral-900' : 'bg-neutral-200'
                      )}
                    >
                      <span
                        className={cn(
                          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out',
                          billingCycle === 'yearly' ? 'translate-x-5' : 'translate-x-0'
                        )}
                      />
                    </button>
                    <span
                      className={cn(
                        'text-xs transition-colors flex items-center gap-1.5',
                        billingCycle === 'yearly' ? 'font-semibold text-neutral-900' : 'text-neutral-500'
                      )}
                    >
                      Yearly
                      {billingCycle === 'yearly' && (
                        <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                          -20%
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                {/* 3 Pricing Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5 pt-2">
                  {/* Card 1: Basic */}
                  <div className="flex flex-col justify-between rounded-2xl border border-neutral-200/90 bg-white p-5 sm:p-6 shadow-2xs hover:border-neutral-300 transition-all">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-base font-bold text-neutral-900">Basic</h3>
                        <p className="text-xs text-neutral-500 mt-1 min-h-[32px]">
                          Essential features for individuals
                        </p>
                      </div>

                      <div className="pt-3 border-t border-neutral-100">
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-extrabold tracking-tight text-neutral-900">
                            {billingCycle === 'yearly' ? '$7.99' : '$9.99'}
                          </span>
                          <span className="text-xs font-medium text-neutral-500">/month</span>
                        </div>
                        {billingCycle === 'yearly' && (
                          <p className="text-[11px] text-neutral-400 mt-0.5">Thanh toán $95.88/năm</p>
                        )}
                      </div>

                      <ul className="space-y-2.5 pt-2">
                        {[
                          '1 user',
                          '5GB storage',
                          'Basic support',
                          'Limited integrations',
                        ].map((feature) => (
                          <li key={feature} className="flex items-center gap-2.5 text-xs text-neutral-700">
                            <Check className="size-4 text-emerald-500 shrink-0 stroke-[2.5]" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSelectPlan('Basic')}
                      className="mt-6 w-full rounded-xl bg-neutral-900 py-2.5 text-xs font-semibold text-white hover:bg-black transition-colors cursor-pointer shadow-2xs"
                    >
                      Choose Basic
                    </button>
                  </div>

                  {/* Card 2: Pro */}
                  <div className="relative flex flex-col justify-between rounded-2xl border-2 border-neutral-900 bg-white p-5 sm:p-6 shadow-xs transition-all">
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between">
                          <h3 className="text-base font-bold text-neutral-900">Pro</h3>
                          <span className="rounded-full bg-neutral-900 text-white text-[10px] font-semibold px-2 py-0.5">
                            Phổ biến
                          </span>
                        </div>
                        <p className="text-xs text-neutral-500 mt-1 min-h-[32px]">
                          Advanced features for professionals
                        </p>
                      </div>

                      <div className="pt-3 border-t border-neutral-100">
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-extrabold tracking-tight text-neutral-900">
                            {billingCycle === 'yearly' ? '$15.99' : '$19.99'}
                          </span>
                          <span className="text-xs font-medium text-neutral-500">/month</span>
                        </div>
                        {billingCycle === 'yearly' && (
                          <p className="text-[11px] text-neutral-400 mt-0.5">Thanh toán $191.88/năm</p>
                        )}
                      </div>

                      <ul className="space-y-2.5 pt-2">
                        {[
                          '5 users',
                          '50GB storage',
                          'Priority support',
                          'Advanced integrations',
                          'Analytics',
                        ].map((feature) => (
                          <li key={feature} className="flex items-center gap-2.5 text-xs text-neutral-700">
                            <Check className="size-4 text-emerald-500 shrink-0 stroke-[2.5]" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSelectPlan('Pro')}
                      className="mt-6 w-full rounded-xl bg-neutral-900 py-2.5 text-xs font-semibold text-white hover:bg-black transition-colors cursor-pointer shadow-2xs"
                    >
                      Choose Pro
                    </button>
                  </div>

                  {/* Card 3: Enterprise */}
                  <div className="flex flex-col justify-between rounded-2xl border border-neutral-200/90 bg-white p-5 sm:p-6 shadow-2xs hover:border-neutral-300 transition-all">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-base font-bold text-neutral-900">Enterprise</h3>
                        <p className="text-xs text-neutral-500 mt-1 min-h-[32px]">
                          Comprehensive solution for teams
                        </p>
                      </div>

                      <div className="pt-3 border-t border-neutral-100">
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-extrabold tracking-tight text-neutral-900">
                            {billingCycle === 'yearly' ? '$39.99' : '$49.99'}
                          </span>
                          <span className="text-xs font-medium text-neutral-500">/month</span>
                        </div>
                        {billingCycle === 'yearly' && (
                          <p className="text-[11px] text-neutral-400 mt-0.5">Thanh toán $479.88/năm</p>
                        )}
                      </div>

                      <ul className="space-y-2.5 pt-2">
                        {[
                          'Unlimited users',
                          '500GB storage',
                          '24/7 premium support',
                          'Custom integrations',
                          'Advanced analytics',
                          'API access',
                        ].map((feature) => (
                          <li key={feature} className="flex items-center gap-2.5 text-xs text-neutral-700">
                            <Check className="size-4 text-emerald-500 shrink-0 stroke-[2.5]" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSelectPlan('Enterprise')}
                      className="mt-6 w-full rounded-xl bg-neutral-900 py-2.5 text-xs font-semibold text-white hover:bg-black transition-colors cursor-pointer shadow-2xs"
                    >
                      Choose Enterprise
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* APPEARANCE TAB */}
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-neutral-900">Giao diện</h3>
                  <p className="text-sm text-neutral-500">
                    Tùy chỉnh giao diện ứng dụng. Bạn có thể chọn giữa chế độ sáng và chế độ tối.
                  </p>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4 max-w-md">
                  <div className="cursor-pointer rounded-xl border-2 border-neutral-900 p-4 space-y-2">
                    <div className="h-20 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center text-xs font-semibold text-neutral-700">
                      Giao diện sáng (Mặc định)
                    </div>
                    <p className="text-xs font-medium text-center text-neutral-900">Sáng</p>
                  </div>
                  <div className="cursor-pointer rounded-xl border border-neutral-200 p-4 space-y-2 opacity-60 hover:opacity-100 transition-opacity">
                    <div className="h-20 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center text-xs font-semibold text-neutral-300">
                      Giao diện tối (Sắp ra mắt)
                    </div>
                    <p className="text-xs font-medium text-center text-neutral-600">Tối</p>
                  </div>
                </div>
              </div>
            )}

            {/* NOTIFICATIONS TAB */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-neutral-900">Thông báo</h3>
                  <p className="text-sm text-neutral-500">
                    Cấu hình phương thức nhận cảnh báo, email và lịch nhắc học tập.
                  </p>
                </div>
                <Separator />
                <div className="space-y-4">
                  <label className="flex items-start gap-3 rounded-xl border border-neutral-200/80 p-3.5 hover:bg-neutral-50/50 cursor-pointer">
                    <input type="checkbox" defaultChecked className="mt-1 rounded text-neutral-900" />
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium text-neutral-800">Email nhắc lịch luyện thuyết trình</p>
                      <p className="text-xs text-neutral-500">
                        Nhận email nhắc nhở trước phiên luyện tập 30 phút.
                      </p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 rounded-xl border border-neutral-200/80 p-3.5 hover:bg-neutral-50/50 cursor-pointer">
                    <input type="checkbox" defaultChecked className="mt-1 rounded text-neutral-900" />
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium text-neutral-800">Thông báo từ cộng đồng học tập</p>
                      <p className="text-xs text-neutral-500">
                        Nhận thông báo khi có học viên bình luận hoặc thích bài viết của bạn.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* DISPLAY TAB */}
            {activeTab === 'display' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-neutral-900">Hiển thị</h3>
                  <p className="text-sm text-neutral-500">
                    Bật hoặc tắt các tùy chọn để quản lý những gì được hiển thị công khai trên ứng dụng.
                  </p>
                </div>
                <Separator />
                <div className="space-y-4">
                  <label className="flex items-start gap-3 rounded-xl border border-neutral-200/80 p-3.5 hover:bg-neutral-50/50 cursor-pointer">
                    <input type="checkbox" defaultChecked className="mt-1 rounded text-neutral-900" />
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium text-neutral-800">Hiển thị huy hiệu thành tích trên hồ sơ</p>
                      <p className="text-xs text-neutral-500">
                        Cho phép các học viên khác thấy các huy hiệu kỹ năng bạn đã mở khóa.
                      </p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 rounded-xl border border-neutral-200/80 p-3.5 hover:bg-neutral-50/50 cursor-pointer">
                    <input type="checkbox" defaultChecked className="mt-1 rounded text-neutral-900" />
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium text-neutral-800">Thống kê điểm trung bình công khai</p>
                      <p className="text-xs text-neutral-500">
                        Hiển thị số điểm thuyết trình trung bình trên trang cá nhân của bạn.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </StudentPageLayout>
  );
}

export default SettingsPage;

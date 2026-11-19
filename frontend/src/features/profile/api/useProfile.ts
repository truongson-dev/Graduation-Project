import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, endpoints } from '@/core/api/client';
import type {
  UserProfileData,
  UpdateProfilePayload,
  ChangePasswordPayload,
  ChangePasswordResponse,
} from '../types/profile';

export const profileKeys = {
  all: ['profile'] as const,
  me: () => ['profile', 'me'] as const,
  user: (userId?: number | string) => ['profile', userId] as const,
};

export function useMyProfileQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: profileKeys.me(),
    queryFn: async () => {
      const response = await apiClient.get<UserProfileData>(endpoints.profile.me);
      return response.data;
    },
    ...options,
  });
}

export function useUserProfileQuery(userId?: number | string) {
  return useQuery({
    queryKey: profileKeys.user(userId),
    queryFn: async () => {
      const response = await apiClient.get<UserProfileData>(endpoints.profile.show(userId!));
      return response.data;
    },
    enabled: Boolean(userId),
  });
}

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateProfilePayload) => {
      const response = await apiClient.put<
        UserProfileData | { user: { id: number; name: string }; message?: string }
      >(endpoints.profile.update, payload);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: profileKeys.all });
      queryClient.invalidateQueries({ queryKey: profileKeys.me() });
      if (data && 'user' in data && data.user?.id) {
        queryClient.invalidateQueries({ queryKey: profileKeys.user(data.user.id) });
      }
    },
  });
}

export function useChangePasswordMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ChangePasswordPayload) => {
      const response = await apiClient.put<ChangePasswordResponse>(
        endpoints.profile.updatePassword,
        payload
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.me() });
    },
  });
}

export function useToggleFollow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: number | string) => {
      const response = await apiClient.post<{ data: { user_id: number; following: boolean } }>(
        endpoints.community.userFollow(userId)
      );
      return response.data;
    },
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: profileKeys.all });
      queryClient.invalidateQueries({ queryKey: profileKeys.user(userId) });
    },
  });
}

export function useUploadAvatarMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('avatar', file);
      const response = await apiClient.post<{
        message: string;
        avatar_url: string;
        thumb_url?: string;
        user: { id: number; name: string; email: string; avatar_url: string };
      }>(endpoints.profile.avatarUpload, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: profileKeys.all });
      queryClient.invalidateQueries({ queryKey: profileKeys.me() });
      if (data?.user?.id) {
        queryClient.invalidateQueries({ queryKey: profileKeys.user(data.user.id) });
      }
    },
  });
}

export function useDeleteAvatarMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.delete<{
        message: string;
        avatar_url: null;
        user: { id: number; name: string; email: string; avatar_url: null };
      }>(endpoints.profile.avatarDelete);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: profileKeys.all });
      queryClient.invalidateQueries({ queryKey: profileKeys.me() });
      if (data?.user?.id) {
        queryClient.invalidateQueries({ queryKey: profileKeys.user(data.user.id) });
      }
    },
  });
}

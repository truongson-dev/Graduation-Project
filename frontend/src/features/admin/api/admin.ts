import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, endpoints } from '@/core/api/client';

export interface AdminDashboardData {
  users: { total: number; active_today: number };
  exercises?: { active: number; total?: number };
  presentations: { total: number; completed: number };
  ai: {
    average_score: number;
    average_words_per_minute: number;
    average_fillers: number;
    average_eye_contact: number;
    average_posture: number;
  };
  pending_feedback: number;
  activity: Array<{ date: string; sessions: number; active_users: number }>;
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  avatar_url?: string | null;
  roles: string[];
  status: 'active' | 'suspended';
  email_verified_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface AdminLearningPath {
  id: number;
  title: string;
  subtitle: string | null;
  lessons: Array<{ title: string; sort_order: number }>;
}

export function useAdminLearningPaths() {
  return useQuery({
    queryKey: ['admin', 'learning-paths'],
    queryFn: async () => (await api.get<{ data: AdminLearningPath[] }>(endpoints.admin.learningPaths)).data.data,
  });
}

export function useUpdateAdminLearningPath() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, lessons, title, subtitle }: { id: number; lessons: AdminLearningPath['lessons']; title?: string; subtitle?: string | null }) =>
      (await api.patch<{ data: AdminLearningPath }>(endpoints.admin.learningPath(id), { lessons, title, subtitle })).data.data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'learning-paths'] });
      queryClient.invalidateQueries({ queryKey: ['learning-paths'] });
    },
  });
}

export function useAdminDashboard() {
  return useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: async () => (await api.get<{ data: AdminDashboardData }>(endpoints.admin.dashboard)).data.data,
    staleTime: 30_000,
  });
}

export function useAdminUsers(params: { search?: string; status?: string; page?: number } = {}) {
  return useQuery({
    queryKey: ['admin', 'users', params],
    queryFn: async () => (await api.get<{ data: AdminUser[]; meta: Record<string, unknown> }>(endpoints.admin.users, { params })).data,
    staleTime: 30_000,
  });
}

export function useUpdateAdminUserStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: AdminUser['status'] }) =>
      (await api.patch<{ data: AdminUser }>(endpoints.admin.userStatus(id), { status })).data.data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
  });
}

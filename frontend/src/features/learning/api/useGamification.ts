import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, endpoints } from '@/core/api/client';
import type { GamificationData, LeaderboardData, StreakData } from '../types';
import { learningKeys } from './useLearningPath';

export function useGamificationQuery() {
  return useQuery({
    queryKey: learningKeys.gamification(),
    queryFn: async () => {
      const response = await apiClient.get<{ data: GamificationData }>(endpoints.learning.gamification);
      return response.data.data;
    },
  });
}

export function useConsumeLifeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post<{ data: { lives_count: number; lives_max: number; lives_refill_at?: string | null } }>(
        endpoints.learning.consumeLife
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: learningKeys.gamification() });
    },
  });
}

export function useStreakQuery() {
  return useQuery({
    queryKey: learningKeys.streak(),
    queryFn: async () => {
      const response = await apiClient.get<{ data: StreakData }>(endpoints.learning.streak);
      return response.data.data;
    },
  });
}

export function useLeaderboardQuery() {
  return useQuery({
    queryKey: learningKeys.leaderboard(),
    queryFn: async () => {
      const response = await apiClient.get<{ data: LeaderboardData }>(endpoints.learning.leaderboard);
      return response.data.data;
    },
  });
}

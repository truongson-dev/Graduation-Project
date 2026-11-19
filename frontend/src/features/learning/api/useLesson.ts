import { useQuery } from '@tanstack/react-query';
import { apiClient, endpoints } from '@/core/api/client';
import type { LessonDetail } from '../types';
import { learningKeys } from './useLearningPath';

export function useLessonQuery(lessonId: number | string | undefined) {
  return useQuery({
    queryKey: learningKeys.lesson(lessonId ?? ''),
    queryFn: async () => {
      const response = await apiClient.get<{ data: LessonDetail }>(endpoints.learning.lesson(lessonId!));
      return response.data.data;
    },
    enabled: Boolean(lessonId),
  });
}

export function useLessonAttemptsQuery(lessonId: number | string | undefined) {
  return useQuery({
    queryKey: learningKeys.attempts(lessonId ?? ''),
    queryFn: async () => {
      const response = await apiClient.get<{ data: unknown[] }>(endpoints.learning.attempts(lessonId!));
      return response.data.data;
    },
    enabled: Boolean(lessonId),
  });
}

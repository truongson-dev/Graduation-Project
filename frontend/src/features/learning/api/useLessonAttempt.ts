import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, endpoints } from '@/core/api/client';
import type { AttemptResult, AttemptSubmission } from '../types';
import { learningKeys } from './useLearningPath';

export function useLessonAttemptMutation(lessonId: number | string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AttemptSubmission) => {
      const response = await apiClient.post<{ data: AttemptResult }>(
        endpoints.learning.attempt(lessonId!),
        payload
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: learningKeys.all });
    },
  });
}

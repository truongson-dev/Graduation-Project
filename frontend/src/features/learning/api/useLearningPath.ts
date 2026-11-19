import { useQuery } from '@tanstack/react-query';
import { apiClient, endpoints } from '@/core/api/client';
import type {
  LearningPathDetail,
  LearningPathSummary,
  SectionDetail,
} from '../types';

export const learningKeys = {
  all: ['learning'] as const,
  paths: () => ['learning', 'paths'] as const,
  path: (slug: string) => ['learning', 'path', slug] as const,
  section: (id: number | string) => ['learning', 'section', id] as const,
  lesson: (id: number | string) => ['learning', 'lesson', id] as const,
  attempts: (id: number | string) => ['learning', 'lesson', id, 'attempts'] as const,
  progress: () => ['learning', 'progress'] as const,
  gamification: () => ['learning', 'gamification'] as const,
  streak: () => ['learning', 'streak'] as const,
  leaderboard: () => ['learning', 'leaderboard'] as const,
};

export function useLearningPathsQuery() {
  return useQuery({
    queryKey: learningKeys.paths(),
    queryFn: async () => {
      const response = await apiClient.get<{ data: LearningPathSummary[] }>(endpoints.learning.paths);
      return response.data.data;
    },
  });
}

export function useLearningPathQuery(slug = 'ky-nang-mem') {
  return useQuery({
    queryKey: learningKeys.path(slug),
    queryFn: async () => {
      const response = await apiClient.get<{ data: LearningPathDetail }>(endpoints.learning.path(slug));
      return response.data.data;
    },
    enabled: Boolean(slug),
  });
}

export function useSectionQuery(sectionId: number | string | undefined) {
  return useQuery({
    queryKey: learningKeys.section(sectionId ?? ''),
    queryFn: async () => {
      const response = await apiClient.get<{ data: SectionDetail }>(endpoints.learning.section(sectionId!));
      return response.data.data;
    },
    enabled: Boolean(sectionId),
  });
}

export function useLearningProgressQuery() {
  return useQuery({
    queryKey: learningKeys.progress(),
    queryFn: async () => {
      const response = await apiClient.get<{ data: Record<string, unknown> }>(endpoints.learning.progress);
      return response.data.data;
    },
  });
}

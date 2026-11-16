import { useQuery } from '@tanstack/react-query';
import { api, endpoints } from '@/core/api/client';

export interface LearningPathRecord {
  id: number;
  slug: string;
  title: string;
  subtitle: string | null;
  icon: string;
  lessons: Array<{ title: string; sort_order: number }>;
}

export function useLearningPaths() {
  return useQuery({
    queryKey: ['learning-paths'],
    queryFn: async () => (await api.get<{ data: LearningPathRecord[] }>(endpoints.learning.paths)).data.data,
    staleTime: 60_000,
  });
}

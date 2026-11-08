import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, endpoints, API_BASE_URL } from '@/core/api/client';

export interface PresentationSessionDto {
  id: string;
  user_id: number;
  status: 'processing' | 'completed' | 'failed';
  error_message: string | null;
  title: string | null;
  slide_content: string | null;
  duration_seconds: number;
  audio_path: string | null;
  overall_score: number | null;
  words_per_minute: number | null;
  fillers_count: number | null;
  eye_contact_percent: number;
  posture_score: number;
  slide_coverage_score: number | null;
  is_reading_slides: boolean | null;
  elaboration_quality: string | null;
  voice_feedback: string | null;
  body_language_feedback: string | null;
  transcript: string | null;
  strengths: string[] | null;
  improvements: string[] | null;
  actionable_tips: string[] | null;
  language: string;
  created_at: string;
  updated_at: string;
}

export interface PaginatedSessionsResponse {
  data: PresentationSessionDto[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface SubmitPresentationResponse {
  message: string;
  data: {
    id: string;
    status: 'processing';
    created_at: string;
  };
}

export const presentationSessionsQueryKey = ['presentation', 'sessions'] as const;
export const presentationSessionQueryKey = (id: string) => ['presentation', 'sessions', id] as const;

/**
 * Fetch all presentation sessions for current user.
 */
export function usePresentationSessions(page = 1, perPage = 15) {
  return useQuery({
    queryKey: [...presentationSessionsQueryKey, { page, perPage }],
    queryFn: async () => {
      const response = await api.get<PaginatedSessionsResponse>(endpoints.presentation.sessions, {
        params: { page, per_page: perPage },
      });
      return response.data;
    },
  });
}

/**
 * Fetch details of a specific presentation session with polling if still processing.
 */
export function usePresentationSession(id: string | undefined | null) {
  return useQuery({
    queryKey: presentationSessionQueryKey(id ?? 'none'),
    queryFn: async () => {
      if (!id) throw new Error('Session ID is required');
      const response = await api.get<{ data: PresentationSessionDto }>(endpoints.presentation.session(id));
      return response.data.data;
    },
    enabled: Boolean(id),
    refetchInterval: (query) => {
      const data = query.state.data;
      return data?.status === 'processing' ? 2500 : false;
    },
  });
}

/**
 * Submit a presentation practice session to be processed asynchronously by AI queue.
 */
export function useSubmitPresentation() {
  const queryClient = useQueryClient();

  return useMutation<SubmitPresentationResponse, Error, FormData>({
    mutationFn: async (formData) => {
      const response = await api.post<SubmitPresentationResponse>(
        endpoints.ai.presentationEvaluate,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: presentationSessionsQueryKey });
    },
  });
}

/**
 * Retry evaluation for a failed presentation session.
 */
export function useRetryPresentation() {
  const queryClient = useQueryClient();

  return useMutation<{ message: string; data: PresentationSessionDto }, Error, string>({
    mutationFn: async (id) => {
      const response = await api.post<{ message: string; data: PresentationSessionDto }>(
        endpoints.presentation.retry(id)
      );
      return response.data;
    },
    onSuccess: (_, id) => {
      void queryClient.invalidateQueries({ queryKey: presentationSessionQueryKey(id) });
      void queryClient.invalidateQueries({ queryKey: presentationSessionsQueryKey });
    },
  });
}

/**
 * Delete a presentation session.
 */
export function useDeletePresentation() {
  const queryClient = useQueryClient();

  return useMutation<{ message: string }, Error, string>({
    mutationFn: async (id) => {
      const response = await api.delete<{ message: string }>(endpoints.presentation.session(id));
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: presentationSessionsQueryKey });
    },
  });
}

/**
 * Helper to get the stream audio URL for a session.
 */
export function getPresentationAudioUrl(sessionId: string): string {
  return `${API_BASE_URL}${endpoints.presentation.audio(sessionId)}`;
}

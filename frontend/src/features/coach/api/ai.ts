import { useMutation, useQuery } from '@tanstack/react-query';
import { api, endpoints } from '@/core/api/client';

export interface ConversationSummary {
  id: string;
  title: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface StoredMessage {
  id: string;
  role: string;
  content: string;
  status: string;
  created_at: string | null;
}

/** Shapes returned by POST /v1/ai/feedback (see FeedbackController). */
export interface GradeFeedback {
  score: number;
  summary: string;
  strengths: string[];
  improvements: string[];
}

export interface GradeAnswerInput {
  skill: string;
  question: string;
  answer: string;
  context?: string | null;
}

interface CursorPage<T> {
  data: T[];
  meta: {
    next_cursor: string | null;
    prev_cursor: string | null;
    per_page: number;
  };
}

export const conversationsQueryKey = ['ai', 'conversations'] as const;

export const messagesQueryKey = (conversationId: string) =>
  ['ai', 'conversations', conversationId, 'messages'] as const;

/** Recent conversations of the signed-in user, newest first. */
export function useConversations() {
  return useQuery({
    queryKey: conversationsQueryKey,
    queryFn: async () => {
      const response = await api.get<CursorPage<ConversationSummary>>(
        endpoints.ai.conversations
      );

      return response.data.data;
    },
  });
}

/** Stored messages of one conversation; disabled until a conversation is chosen. */
export function useConversationMessages(conversationId: string | null) {
  return useQuery({
    queryKey: messagesQueryKey(conversationId ?? 'none'),
    queryFn: async () => {
      const response = await api.get<CursorPage<StoredMessage>>(
        endpoints.ai.conversationMessages(conversationId as string)
      );

      return response.data.data;
    },
    enabled: conversationId !== null,
  });
}

/** Grade one learner answer with the AnswerGrader agent. */
export function useGradeAnswer() {
  return useMutation({
    mutationFn: async (input: GradeAnswerInput) => {
      const response = await api.post<{ data: GradeFeedback }>(
        endpoints.ai.feedback,
        input
      );

      return response.data.data;
    },
  });
}

export interface PresentationEvaluationPayload {
  slide_content: string;
  transcript: string;
  duration: string;
  words_per_minute: number;
  fillers_count: number;
  eye_contact_percent: number;
  posture_score: number;
  language?: 'vi' | 'en';
}

export interface PresentationEvaluationFeedback {
  transcript: string;
  words_per_minute: number;
  fillers_count: number;
  overall_score: number;
  is_reading_slides: boolean;
  slide_coverage_score: number;
  elaboration_quality: string;
  voice_feedback: string;
  body_language_feedback: string;
  strengths: string[];
  improvements: string[];
  actionable_tips: string[];
}

/** Evaluate a presentation practice session against slide content and speech metrics. */
export function useEvaluatePresentation() {
  return useMutation<PresentationEvaluationFeedback, Error, FormData | PresentationEvaluationPayload>({
    mutationFn: async (payload) => {
      const isFormData = typeof FormData !== 'undefined' && payload instanceof FormData;
      const response = await api.post<{ data: PresentationEvaluationFeedback }>(
        endpoints.ai.presentationEvaluate,
        payload,
        isFormData
          ? {
              headers: {
                'Content-Type': 'multipart/form-data',
              },
            }
          : undefined
      );
      return response.data.data;
    },
  });
}

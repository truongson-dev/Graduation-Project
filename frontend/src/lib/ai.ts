import { useMutation, useQuery } from '@tanstack/react-query';
import { api, endpoints } from './api';

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

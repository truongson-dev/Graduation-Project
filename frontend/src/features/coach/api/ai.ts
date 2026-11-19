import { useMutation } from '@tanstack/react-query';
import { api, endpoints } from '@/core/api/client';

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

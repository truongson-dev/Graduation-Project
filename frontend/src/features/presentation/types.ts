import type { PresentationEvaluationFeedback } from '@/features/coach/api/ai';

export interface PresentationReview {
  id?: string;
  audioBlob?: Blob | File;
  slideContent?: string;
  transcript: string;
  duration: string;
  wordsPerMinute: number;
  fillers: number;
  eyeContact: number;
  posture: number;
  confidence: number | null;
  fileName: string;
  language?: 'vi' | 'en';
  feedback?: PresentationEvaluationFeedback;
}

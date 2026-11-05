import type { PresentationReview } from '../components/Coach/GradePanel';

const STORAGE_KEY = 'softskill.presentation-history.v1';
const MAX_ENTRIES = 10;
const MAX_TEXT_LENGTH = 40_000;

export interface PresentationHistoryEntry {
  id: string;
  createdAt: string;
  review: PresentationReview;
}

function isReview(value: unknown): value is PresentationReview {
  if (!value || typeof value !== 'object') return false;
  const review = value as Partial<PresentationReview>;
  return typeof review.fileName === 'string'
    && typeof review.duration === 'string'
    && typeof review.transcript === 'string'
    && typeof review.wordsPerMinute === 'number'
    && typeof review.fillers === 'number'
    && typeof review.eyeContact === 'number'
    && typeof review.posture === 'number';
}

export function getPresentationHistory(): PresentationHistoryEntry[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is PresentationHistoryEntry => (
      Boolean(entry)
      && typeof entry.id === 'string'
      && typeof entry.createdAt === 'string'
      && isReview(entry.review)
    )).slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

export function savePresentationHistory(review: PresentationReview): boolean {
  try {
    const entry: PresentationHistoryEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      review: {
        ...review,
        transcript: review.transcript.slice(0, MAX_TEXT_LENGTH),
        slideContent: review.slideContent?.slice(0, MAX_TEXT_LENGTH),
      },
    };
    const entries = [entry, ...getPresentationHistory()].slice(0, MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    return true;
  } catch {
    return false;
  }
}

import type { PresentationReview } from '@/features/coach/components/GradePanel';

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
    if (typeof localStorage === 'undefined') return [];
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is PresentationHistoryEntry => (
      Boolean(entry)
      && typeof entry.id === 'string'
      && typeof entry.createdAt === 'string'
      && isReview(entry.review)
    )).map((entry) => {
      // Discard invalid / serialized non-Blob audio references
      if (entry.review.audioBlob && !(entry.review.audioBlob instanceof Blob)) {
        delete entry.review.audioBlob;
      }
      // Populate missing metrics from saved AI feedback if available
      if (entry.review.feedback) {
        if (!entry.review.wordsPerMinute && entry.review.feedback.words_per_minute) {
          entry.review.wordsPerMinute = entry.review.feedback.words_per_minute;
        }
        if (!entry.review.fillers && entry.review.feedback.fillers_count) {
          entry.review.fillers = entry.review.feedback.fillers_count;
        }
        if (!entry.review.transcript && entry.review.feedback.transcript) {
          entry.review.transcript = entry.review.feedback.transcript;
        }
      }
      return entry;
    }).slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

export function savePresentationHistory(review: PresentationReview, entryId?: string): boolean {
  try {
    if (typeof localStorage === 'undefined') return false;
    const { audioBlob: _discardedAudio, ...cleanReview } = review;
    const currentHistory = getPresentationHistory();

    const targetId = entryId || review.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const existingIndex = currentHistory.findIndex((e) => e.id === targetId);

    const entry: PresentationHistoryEntry = {
      id: targetId,
      createdAt: existingIndex >= 0 ? currentHistory[existingIndex].createdAt : new Date().toISOString(),
      review: {
        ...cleanReview,
        id: targetId,
        transcript: cleanReview.transcript ? cleanReview.transcript.slice(0, MAX_TEXT_LENGTH) : '',
        slideContent: cleanReview.slideContent ? cleanReview.slideContent.slice(0, MAX_TEXT_LENGTH) : undefined,
      },
    };

    let updatedEntries: PresentationHistoryEntry[];
    if (existingIndex >= 0) {
      updatedEntries = [...currentHistory];
      updatedEntries[existingIndex] = entry;
    } else {
      updatedEntries = [entry, ...currentHistory].slice(0, MAX_ENTRIES);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedEntries));
    return true;
  } catch {
    return false;
  }
}

export function deletePresentationHistoryEntry(id: string): boolean {
  try {
    if (typeof localStorage === 'undefined') return false;
    const filtered = getPresentationHistory().filter((e) => e.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch {
    return false;
  }
}

export function clearPresentationHistory(): boolean {
  try {
    if (typeof localStorage === 'undefined') return false;
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

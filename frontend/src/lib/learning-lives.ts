const STORAGE_KEY = 'softskill.learning-lives.v1';
export const MAX_LEARNING_LIVES = 5;
export const LIFE_REFILL_MS = 24 * 60 * 60 * 1000;

export type LearningLives = { count: number; refillAt: number | null };

export function readLearningLives(now = Date.now()): LearningLives {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return { count: MAX_LEARNING_LIVES, refillAt: null };
    const parsed = JSON.parse(saved) as Partial<LearningLives>;
    const count = Math.max(0, Math.min(MAX_LEARNING_LIVES, Number(parsed.count) || 0));
    const refillAt = typeof parsed.refillAt === 'number' ? parsed.refillAt : null;
    if (count === 0 && refillAt !== null && refillAt <= now) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ count: MAX_LEARNING_LIVES, refillAt: null }));
      } catch {
        // Returning full lives is still valid for this session.
      }
      return { count: MAX_LEARNING_LIVES, refillAt: null };
    }
    return { count, refillAt };
  } catch {
    return { count: MAX_LEARNING_LIVES, refillAt: null };
  }
}

export function consumeLearningLife(now = Date.now()): LearningLives {
  const current = readLearningLives(now);
  if (current.count === 0) return current;
  const count = current.count - 1;
  const next = { count, refillAt: count === 0 ? now + LIFE_REFILL_MS : null };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Keep the current session usable if browser storage is unavailable.
  }
  return next;
}

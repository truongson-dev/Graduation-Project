const DAILY_LEARNING_STORAGE_PREFIX = 'softskill:daily-learning';

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function storageKey(date = new Date()) {
  return `${DAILY_LEARNING_STORAGE_PREFIX}:${localDateKey(date)}`;
}

export function hasCompletedLearningToday() {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(storageKey()) === 'completed';
}

export function markLearningCompletedToday() {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(storageKey(), 'completed');
}

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
  return window.localStorage.getItem(storageKey()) === 'completed';
}

export function markLearningCompletedToday() {
  window.localStorage.setItem(storageKey(), 'completed');
}

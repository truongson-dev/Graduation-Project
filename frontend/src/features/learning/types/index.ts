export type LessonType = 'theory' | 'quiz' | 'writing';

export type LessonProgressStatus = 'locked' | 'unlocked' | 'in_progress' | 'passed' | 'failed';

export type SectionStatus = 'complete' | 'current' | 'locked';

export interface QuizQuestion {
  text: string;
  options: string[];
}

export interface QuizResult {
  question_index: number;
  correct: boolean;
  correct_answer?: number;
  explanation?: string;
}

export interface AiFeedback {
  summary: string;
  strengths: string[];
  improvements: string[];
}

export interface LessonContent {
  markdown?: string;
  images?: Array<{ url: string; alt: string }>;
  questions?: QuizQuestion[];
  prompt?: string;
  rubric?: string;
  sample_answer?: string;
}

export interface LessonSummary {
  id: number;
  title: string;
  type: LessonType;
  sort_order: number;
  pass_threshold: number;
  xp_reward: number;
  status: LessonProgressStatus;
  best_score?: number | null;
  completed_at?: string | null;
}

export interface SectionSummary {
  id: number;
  title: string;
  subtitle?: string | null;
  icon: string;
  sort_order: number;
  lessons_count: number;
  status: SectionStatus;
  progress: {
    completed: number;
    total: number;
  };
}

export interface LearningPathSummary {
  id: number;
  title: string;
  slug: string;
  description?: string | null;
  sections_count: number;
  user_progress: {
    completed_sections: number;
    total_sections: number;
    percentage: number;
  };
}

export interface LearningPathDetail {
  id: number;
  title: string;
  slug: string;
  description?: string | null;
  sections: SectionSummary[];
  summary: {
    completed_sections: number;
    total_sections: number;
    completed_lessons: number;
    total_lessons: number;
    percentage: number;
    next_lesson?: {
      id: number;
      title: string;
      section: string;
    } | null;
  };
}

export interface SectionDetail {
  id: number;
  learning_path_id: number;
  title: string;
  subtitle?: string | null;
  icon: string;
  sort_order: number;
  lessons: LessonSummary[];
}

export interface LessonDetail {
  id: number;
  title: string;
  type: LessonType;
  pass_threshold: number;
  xp_reward: number;
  section: {
    id: number;
    title: string;
  };
  status: LessonProgressStatus;
  best_score?: number | null;
  content: LessonContent;
}

export interface AttemptSubmission {
  answers?: number[];
  content?: string;
  completed?: boolean;
}

export interface AttemptResult {
  attempt_id: number;
  score: number;
  passed: boolean;
  xp_earned: number;
  results?: QuizResult[] | null;
  ai_feedback?: AiFeedback | null;
  next_lesson?: {
    id: number;
    title: string;
  } | null;
}

export interface GamificationData {
  total_xp: number;
  current_streak: number;
  longest_streak: number;
  lives_count: number;
  lives_max: number;
  lives_refill_at?: string | null;
  tournament_tier: string;
  tournament_rank?: number | null;
}

export interface DailyStreakDay {
  day: string;
  date: string;
  completed: boolean;
  xp: number;
}

export interface StreakData {
  current_streak: number;
  longest_streak: number;
  this_week: DailyStreakDay[];
  completed_today: boolean;
}

export interface LeaderboardRanking {
  rank: number;
  user_id: number;
  user_name: string;
  avatar_url?: string | null;
  xp_this_week: number;
}

export interface LeaderboardData {
  tier: string;
  week_start: string;
  rankings: LeaderboardRanking[];
  user_rank: number;
  user_xp_this_week: number;
}
